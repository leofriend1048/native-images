import { streamText, UIMessage, convertToModelMessages, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import Replicate from "replicate";
import { z } from "zod/v4";
import { getSession } from "@/lib/auth";
import { mirrorUrlToStorage, uploadDataUrlToStorage } from "@/lib/storage";

export const maxDuration = 300;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const SYSTEM_PROMPT = `You are a native advertising creative expert and quality reviewer. Your job has two phases:

PHASE 1 — IMAGE GENERATION
The user will provide either a fresh concept prompt OR feedback on a previously generated image (e.g. "brighten it up", "move the product to the left", "make it more dramatic"). 
- For fresh concepts: call generateImage immediately with the provided prompt.
- For feedback/refinement: look at the conversation history, take the last generated image's prompt, apply the user's requested changes, and call generateImage with the refined prompt.
- Always call generateImage — never just respond with text.
- If the user has attached reference images (visible as images in their message), pass their URLs as the image_input array when calling generateImage. Reference images guide the style, composition, and subject for the generated output.

CRITICAL IMAGE RULES — these MUST be followed or the image fails:
- NO text overlays, captions, titles, or watermarks added to the image
- NO timestamps, date stamps, or clock overlays (do NOT include "timestamp" or "date" in the prompt)
- NO artificial UI elements or borders added
- Prompts must be purely visual and descriptive — never include instructions to add text

PROMPT QUALITY RULES:
- Be specific about lighting: "soft window light", "natural morning light", "golden hour sunlight", "bright bathroom overhead light", etc.
- Be specific about composition: "extreme close-up", "bird's eye view", "45-degree angle", "slightly out of focus background"
- Be specific about surface/environment details that ground the scene — clean and tidy, not dirty or grimy
- The iPhone/lo-fi quality comes from LIGHTING and FRAMING, not filth: slight motion blur, natural shadows, candid angle, real depth of field
- Environments must be CLEAN and PRESENTABLE — a real person's tidy home, not a dingy or neglected space
- NEVER include: dirty surfaces, stains, grime, water spots, mold, dust buildup, worn/damaged items, or anything that reads as unsanitary
- Imperfection means: slightly off-center framing, natural skin, authentic expressions, real hand-held camera shake — NOT dirt or decay

PHASE 2 — QUALITY REVIEW
After receiving the image URL from generateImage, you MUST review it by calling the reviewImage tool.
Examine the image carefully against the Native Ad Performance Checklist.

NATIVE AD PERFORMANCE CHECKLIST:
1. Looks like authentic UGC — NOT polished, branded, or stock-photo aesthetic
2. iPhone/lo-fi aesthetic is visible (natural light, candid framing, real environment) — clean and presentable, not dirty or grimy
3. Clear emotional hook present — visceral, relatable, or genuinely scroll-stopping
4. Subject directly and clearly matches the requested concept
5. No text overlays, timestamps, or watermarks added to the image
6. No obvious AI artifacts (mangled objects, impossible geometry, garbled text)
7. Would a real person plausibly post this exact photo on their social feed?

SCORING: Rate each criterion 0 or 1. Total score out of 7.
- Score 6-7: PASSES — call reviewImage with passes=true
- Score 4-5: MARGINAL — call reviewImage with passes=false, provide refined_prompt
- Score 0-3: FAILS — call reviewImage with passes=false, provide refined_prompt

Always be honest in your review — do not pass an image just to finish early.

RETRY APPROVAL RULES (strictly enforced):
- The FIRST generateImage call always proceeds immediately — no approval needed.
- After reviewImage returns passes=false with fewer than 3 total generateImage calls:
    1. Call approveRetry with failureReason (1–2 sentences on what failed) and refinedPrompt.
    2. WAIT for the result before doing anything else.
    3. If result.approved === true  → call generateImage with the refinedPrompt.
    4. If result.approved === false → stop and acknowledge the user skipped the retry.
- After 3 total generateImage calls with failures, stop and note max retries reached.
- NEVER call generateImage a second time without first calling approveRetry and receiving approved=true.

FINAL TEXT RESPONSE RULES (critical):
- The image is already displayed to the user via the tool result UI — do NOT include the image URL anywhere in your text response.
- Never write URLs, links, or "Your image is ready at: ..." in your text.
- After a passing review, write 1-2 sentences MAX explaining why this image works as a native ad. Nothing more.
- After a failed review with max retries, briefly note what the issue was in 1 sentence.`;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    messages,
    settings,
  }: {
    messages: UIMessage[];
    settings: {
      model?: string;
      aspect_ratio: string;
      // Google
      resolution: string;
      output_format: string;
      safety_filter_level: string;
      // Seedream
      size?: string;
      // Ideogram
      magic_prompt_option?: string;
    };
  } = await req.json();

  // Extract reference image URLs attached by the user (most recent message with files).
  // We do this server-side so Replicate always receives them even if Claude forgets to
  // include them in the generateImage tool call's image_input argument.
  //
  // IMPORTANT: Only accept data: URLs here. HTTP URLs from user-provided sources (e.g.
  // images dragged from an email client, which may originate from Sendgrid CDN or
  // other gated origins) return 403 Forbidden when Replicate's servers try to fetch
  // them. Legitimate file uploads go through the PromptInput which always converts
  // blob: → data:, so filtering to data: URLs is both safe and correct.
  // Extract reference images from the most recent user message that has attachments.
  // Upload each data: URL to Supabase so Replicate can fetch them as stable HTTP URLs.
  const referenceImages: string[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    const fileParts = (msg.parts ?? []).filter(
      (p): p is { type: "file"; mediaType: string; url: string } =>
        p.type === "file" &&
        typeof (p as Record<string, unknown>).url === "string" &&
        (p as unknown as { url: string }).url.startsWith("data:")
    );
    if (fileParts.length > 0) {
      const uploaded = await Promise.all(
        fileParts.map(async (p, idx) => {
          const ext = p.mediaType.split("/")[1]?.split("+")[0] ?? "jpg";
          const path = `references/${session.userId}/${Date.now()}-${idx}.${ext}`;
          try {
            return await uploadDataUrlToStorage(p.url, path);
          } catch (err) {
            console.error("Failed to upload reference image to Supabase:", err);
            return p.url; // fall back to data: URL if upload fails
          }
        })
      );
      referenceImages.push(...uploaded);
      break; // only use the most recent user message that has attachments
    }
  }

  const modelMessages = await convertToModelMessages(messages);
  console.log("[generate] model messages:", JSON.stringify(
    modelMessages.map((m) => ({
      role: m.role,
      tools: (m as { content?: unknown[] }).content
        ? (m as { content: Array<{ type: string; toolCallId?: string; toolName?: string }> }).content
            .filter((c) => c.type === "tool-call" || c.type === "tool-result")
            .map((c) => `${c.type}:${c.toolName ?? ""}(${c.toolCallId ?? ""})`)
        : [],
    })),
    null, 2
  ));

  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    // Extended thinking surfaces Claude's reasoning in the UI via the
    // Reasoning component. Budget of 8 000 tokens is enough for the
    // image-review steps without noticeably slowing the pipeline.
    providerOptions: {
      anthropic: {
        thinking: { type: "enabled", budgetTokens: 8000 },
      },
    },
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    // Allow up to 10 steps: up to 3x (approveRetry + generateImage + reviewImage) + 1 final text
    stopWhen: stepCountIs(10),
    // After each generateImage call, inject the resulting image URL as a vision
    // message so Claude can actually SEE the image before scoring it.
    prepareStep: async ({ steps, messages: currentMessages }) => {
      const lastStep = steps[steps.length - 1];
      if (!lastStep?.toolResults?.length) return undefined;

      for (const toolResult of lastStep.toolResults) {
        const r = toolResult as unknown as {
          toolName: string;
          result: { success?: boolean; imageUrl?: string };
        };
        if (r.toolName !== "generateImage") continue;
        if (!r.result?.success || !r.result?.imageUrl) continue;

        return {
          messages: [
            ...currentMessages,
            {
              role: "user" as const,
              content: [
                {
                  type: "image" as const,
                  image: new URL(r.result.imageUrl),
                },
                {
                  type: "text" as const,
                  text: "This is the generated image. Please examine it carefully and call the reviewImage tool with your quality assessment based on the Native Ad Performance Checklist.",
                },
              ],
            },
          ],
        };
      }

      return undefined;
    },
    tools: {
      generateImage: {
        description:
          "Generate a native-style ad image using the provided prompt via Replicate Nano Banana Pro",
        inputSchema: z.object({
          prompt: z
            .string()
            .describe("The native ad image prompt to generate"),
          image_input: z
            .array(z.string())
            .optional()
            .describe("Optional reference image URLs (up to 14)"),
        }),
        execute: async ({
          prompt,
          image_input,
        }: {
          prompt: string;
          image_input?: string[];
        }) => {
          const modelId = settings.model || "google/nano-banana-2";
          let input: Record<string, unknown> = {};
          try {

            // Merge Claude-provided URLs with server-extracted reference images.
            // Only accept data: URLs from Claude — HTTP URLs it hallucinates or
            // infers from image metadata (e.g. CDN origins) will 404 when
            // Replicate tries to fetch them. Our server-extracted referenceImages
            // are always data: URLs so they are unconditionally trusted.
            const allImages = [
              ...(image_input ?? []).filter((url) => url.startsWith("data:")),
              ...referenceImages,
            ].filter((url, idx, arr) => arr.indexOf(url) === idx);

            if (modelId === "bytedance/seedream-4.5") {
              const seedreamValidRatios = ["match_input_image","1:1","4:3","3:4","16:9","9:16","3:2","2:3","21:9"];
              const seedreamRatio = seedreamValidRatios.includes(settings.aspect_ratio)
                ? settings.aspect_ratio
                : "4:3"; // fallback: nearest to 4:5
              input = {
                prompt,
                aspect_ratio: seedreamRatio,
                size: settings.size || "2K",
                max_images: 1,
                sequential_image_generation: "disabled",
              };
              if (allImages.length > 0) {
                input.image_input = allImages.slice(0, 14);
              }
            } else if (modelId === "ideogram-ai/ideogram-v3-turbo") {
              input = {
                prompt,
                aspect_ratio: settings.aspect_ratio || "4:5",
                magic_prompt_option: settings.magic_prompt_option || "Auto",
              };
              // Ideogram uses style_reference_images, not image_input
              if (allImages.length > 0) {
                input.style_reference_images = allImages.slice(0, 3);
              }
            } else {
              // Google Nano Banana Pro / NB2
              const isNB2 = modelId === "google/nano-banana-2";
              input = {
                prompt,
                aspect_ratio: settings.aspect_ratio || "4:5",
                resolution: settings.resolution || "1K",
                output_format: settings.output_format || "jpg",
              };
              if (!isNB2) {
                input.safety_filter_level =
                  settings.safety_filter_level || "block_only_high";
              }
              if (allImages.length > 0) {
                input.image_input = allImages.slice(0, 14);
              }
            }

            const output = await replicate.run(modelId as `${string}/${string}`, {
              input,
            });

            // Seedream returns an array of URLs; all other models return a string
            const replicateUrl = Array.isArray(output)
              ? (output as string[])[0]
              : typeof output === "string"
              ? output
              : String(output);

            // Mirror to Supabase so the URL never expires
            const ext = (input.output_format as string | undefined) ?? "jpg";
            const storagePath = `generated/${session.userId}/${Date.now()}.${ext}`;
            let imageUrl = replicateUrl;
            try {
              imageUrl = await mirrorUrlToStorage(replicateUrl, storagePath);
            } catch (err) {
              console.error("Failed to mirror image to Supabase, using Replicate URL:", err);
            }

            return {
              success: true,
              imageUrl,
              enhancedPrompt: prompt,
              settings: {
                aspect_ratio: input.aspect_ratio as string,
                resolution: input.resolution as string,
                output_format: input.output_format as string,
              },
            };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`Replicate error [${modelId}]:`, message, "\nInput:", JSON.stringify(input, null, 2));
            return {
              success: false,
              error: message || "Image generation failed",
            };
          }
        },
      },

      reviewImage: {
        description:
          "Review the generated image against the Native Ad Performance Checklist and return a structured quality assessment",
        inputSchema: z.object({
          image_url: z.string().describe("The URL of the generated image"),
          passes: z
            .boolean()
            .describe("Whether the image passes the quality checklist"),
          score: z
            .number()
            .describe("Quality score out of 7 based on the checklist"),
          issues: z
            .array(z.string())
            .describe(
              "List of specific issues found, empty array if none"
            ),
          refined_prompt: z
            .string()
            .optional()
            .describe(
              "Improved prompt addressing the issues, provided only when passes=false"
            ),
        }),
        // Pass-through: Claude owns the judgment, we just surface it in the UI
        execute: async (review) => review,
      },

      // No execute function — this intentionally pauses the agentic loop so the
      // client can show an approval card and call addToolResult to resume.
      approveRetry: {
        description:
          "Request user approval before retrying image generation. MUST be called before every 2nd, 3rd, or 4th generateImage attempt.",
        inputSchema: z.object({
          failureReason: z
            .string()
            .describe("1–2 sentence explanation of why the image failed review"),
          refinedPrompt: z
            .string()
            .describe("The improved prompt that will be used if the retry is approved"),
          attemptNumber: z
            .number()
            .int()
            .describe("Which generation attempt this will be (2, 3, or 4)"),
        }),
      },
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
