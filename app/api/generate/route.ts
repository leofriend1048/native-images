import { streamText, UIMessage, convertToModelMessages, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import Replicate from "replicate";
import { z } from "zod/v4";
import { getSession } from "@/lib/auth";
import { mirrorUrlToStorage, uploadDataUrlToStorage } from "@/lib/storage";
import { insertGeneratedImage, initSchema } from "@/lib/db";
import { nanoid } from "nanoid";

export const maxDuration = 300;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const SYSTEM_PROMPT = `You are a native advertising creative expert and quality reviewer. Your job has two phases:

PHASE 1 — IMAGE GENERATION
The user will provide either a fresh concept prompt OR feedback on a previously generated image (e.g. "brighten it up", "move the product to the left", "make it more dramatic"). 
- For fresh concepts: rewrite the prompt using the IPHONE SNAPSHOT FORMULA below, then call generateImage.
- For feedback/refinement: take the last generated image's prompt from conversation history, apply the user's requested changes while keeping the iPhone aesthetic, and call generateImage with the refined prompt.
- Always call generateImage — never just respond with text.
- If the user has attached reference images (visible as images in their message), pass their URLs as the image_input array when calling generateImage.

CRITICAL IMAGE RULES — these MUST be followed or the image fails:
- NO text overlays, captions, titles, or watermarks in the image
- NO timestamps, date stamps, or clock overlays (never include "timestamp" or "date" in the prompt)
- NO artificial UI elements or borders
- Prompts must be purely visual and scene-descriptive

THE SINGLE MOST IMPORTANT RULE:
The image must be completely indistinguishable from a genuine casual photo taken on an iPhone by a real person who is NOT a photographer. If it looks like professional photography, a lifestyle brand shoot, a stock photo, or a DSLR shot with a filter — it has FAILED. Think: the kind of photo someone takes quickly and sends in a group chat without editing.

WHAT MAKES IT LOOK PROFESSIONAL — NEVER DO THESE:
- Professionally arranged or soft-box lighting
- Smooth optical DSLR-style bokeh
- Perfect exposure with balanced shadows and highlights
- Lifestyle/editorial composition (intentional rule of thirds, clean negative space)
- Post-processing: color grading, vignette, contrast curves, skin retouching
- Art-directed, staged environments
- Subject looking like they're posing for a professional shoot

WHAT MAKES IT LOOK LIKE A REAL IPHONE — ALWAYS DO THESE:
- Auto-exposure: sometimes slightly bright, highlights can clip
- Apple Smart HDR: punchy, slightly saturated straight-from-camera colors
- Computational focus: subject razor-sharp, slightly digital-looking sharpness
- If background is blurred: iPhone Portrait Mode only — computational bokeh, abrupt edges, slight halo around subject boundary, NOT smooth optical bokeh
- Slight ISO noise in shadow areas from the small iPhone sensor
- Slightly imperfect, casual framing — quick shot, not composed
- Available/ambient light only — window, ceiling lamp, outdoors
- Real skin: visible pores, slight redness, uneven texture, iPhone cameras don't flatter

IPHONE SNAPSHOT FORMULA — build every prompt with all 7 layers:

1. SHOT TYPE: "Close-up", "Medium shot waist-up", "Bird's eye overhead", "POV first-person looking down", "Over-the-shoulder", or "Slightly high angle looking down at subject"

2. SUBJECT + ACTION: Specific person doing a specific thing. Ordinary everyday clothing — NOT styled.
   Bad: "woman in pain" — Good: "early-30s woman in a faded grey cotton t-shirt pressing two fingers to her jaw, eyes slightly squinted"

3. SUBJECT REALISM — always include ALL for human subjects:
   - Skin: "real skin texture with visible pores, slight unevenness, natural redness" — NOT retouched
   - Expression: "natural, unstaged — genuine [emotion], not posing for a camera"
   - Hands: exactly what each hand is doing — "right hand loosely gripping product, fingers slightly curled"
   - Posture: real person's posture — "slightly slouched", "weight on one hip", "leaning on the counter"

4. SCENE DEPTH — three layers:
   - FOREGROUND: 1-2 ordinary props partially in frame, slightly blurred — "edge of a coffee mug", "corner of a phone face-down"
   - MIDGROUND: subject + their interaction with the problem/product
   - BACKGROUND: lived-in real space — "blurred bathroom doorway", "out-of-focus kitchen counter clutter", "window with ordinary curtains"

5. LIGHTING — available/ambient light only, describe what's naturally present:
   Name the real-world source only — "morning light through a frosted bathroom window", "overhead kitchen fluorescent", "bedside lamp"
   Describe the natural uneven effect: "slightly harsh overhead shadow under chin", "window light washing out one side of face"
   NO soft-boxes, NO reflectors, NO professionally balanced lighting.

6. TECHNICAL BLOCK — iPhone-specific only, not photography-direction language:
   "genuine iPhone snapshot, NOT professional photography — Apple 26mm main camera, auto-exposure, auto-white-balance, Apple Smart HDR, punchy colors, slight highlight clipping in bright areas, subject sharp from computational focus, [if background is blurred: iPhone Portrait Mode — computational bokeh, abrupt edges, slight halo at subject boundary, NOT smooth DSLR bokeh], slight ISO noise in shadows, slightly casual imperfect framing, looks completely unedited"

7. POST-PROCESSING: "straight-out-of-iPhone — no color grading, no vignette, no skin retouching, Apple's native processing only, looks like someone took it and immediately texted it without editing"

CLEAN ENVIRONMENT RULES:
- All environments must be CLEAN and LIVED-IN — a real person's tidy home, bathroom, car, or workspace
- NEVER include: dirty surfaces, stains, grime, water spots, mold, dust buildup, worn/damaged/peeling items

PHASE 2 — QUALITY REVIEW
After receiving the image URL from generateImage, you MUST call reviewImage.
Examine the image carefully against the Native Ad Performance Checklist.

NATIVE AD PERFORMANCE CHECKLIST:
1. Does NOT look like professional photography — fails if it looks like a lifestyle shoot, stock photo, DSLR shot, or directed photo session
2. Looks like a genuine casual iPhone snapshot — quick, slightly imperfect framing, available light, unedited
3. iPhone technical markers present: Apple Smart HDR punch, slight highlight clipping, slight sensor noise in shadows, computational focus sharpness, any bokeh is Portrait Mode (abrupt/computational) not smooth optical
4. Subject skin looks real — visible pores, natural texture, NOT airbrushed, NOT retouched
5. Scene has genuine depth — foreground props, subject in midground, lived-in background
6. Emotional hook is clear and visceral — scroll-stopping, relatable, genuine
7. No text overlays, timestamps, watermarks, or obvious AI artifacts (extra fingers, impossible geometry)

SCORING: Rate each criterion 0 or 1. Total score out of 7.
- Score 6-7: PASSES — call reviewImage with passes=true
- Score 4-5: MARGINAL — call reviewImage with passes=false, provide refined_prompt
- Score 0-3: FAILS — call reviewImage with passes=false, provide refined_prompt

When writing a refined_prompt after a failure: if the image looks too professional, explicitly add "NOT professional photography, NOT stock photo, NOT lifestyle brand" and replace any lighting direction with available-light description. Remove any mention of color grading or vignette.

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
- The image is already displayed via the tool result UI — do NOT include the image URL in your text response.
- Never write URLs, links, or "Your image is ready at: ..." in your text.
- After a passing review, write 1-2 sentences MAX on why this image works as a native ad. Nothing more.
- After a failed review with max retries, briefly note what the issue was in 1 sentence.`;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Ensure schema exists (safe no-op if tables already present)
  await initSchema().catch(() => {});

  const {
    messages,
    settings,
  }: {
    messages: UIMessage[];
    settings: {
      model?: string;
      aspect_ratio: string;
      batch_count?: number;
      // Google
      resolution: string;
      output_format: string;
      safety_filter_level: string;
      // Seedream
      size?: string;
      // Ideogram
      magic_prompt_option?: string;
      // Chat context for image persistence
      chatId?: string | null;
    };
  } = await req.json();

  const batchCount = Math.min(Math.max(settings.batch_count ?? 1, 1), 4);

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
  // After uploading, replace the base64 data: blobs in the messages with their
  // Supabase HTTP URLs so that (a) convertToModelMessages doesn't forward huge
  // base64 strings to Claude and (b) the in-memory footprint stays small.
  const referenceImages: string[] = [];
  const cleanedMessages: UIMessage[] = messages.map((m) => ({ ...m, parts: [...(m.parts ?? [])] }));

  for (let i = cleanedMessages.length - 1; i >= 0; i--) {
    const msg = cleanedMessages[i];
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

      // Swap data: blobs → Supabase HTTP URLs in the cleaned message copy
      // so Claude receives lightweight image URLs instead of raw base64.
      msg.parts = (msg.parts ?? []).map((p) => {
        if (
          p.type === "file" &&
          typeof (p as Record<string, unknown>).url === "string" &&
          (p as unknown as { url: string }).url.startsWith("data:")
        ) {
          const idx = fileParts.findIndex((fp) => fp.url === (p as unknown as { url: string }).url);
          const supabaseUrl = idx >= 0 ? uploaded[idx] : (p as unknown as { url: string }).url;
          return { ...p, url: supabaseUrl } as typeof p;
        }
        return p;
      });

      break; // only use the most recent user message that has attachments
    }
  }

  const modelMessages = await convertToModelMessages(cleanedMessages, {
    // Drop any tool call that has no result yet (e.g. approveRetry still
    // awaiting user input) instead of forwarding an incomplete call to Claude,
    // which would throw "Tool result is missing".
    ignoreIncompleteToolCalls: true,
  });
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
          "Generate a native-style ad image using the provided prompt via Replicate",
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
            const allImages = [
              ...(image_input ?? []).filter((url) => url.startsWith("data:")),
              ...referenceImages,
            ].filter((url, idx, arr) => arr.indexOf(url) === idx);

            const buildInput = (aspectRatio?: string): Record<string, unknown> => {
              if (modelId === "bytedance/seedream-4.5") {
                const seedreamValidRatios = ["match_input_image","1:1","4:3","3:4","16:9","9:16","3:2","2:3","21:9"];
                const seedreamRatio = seedreamValidRatios.includes(aspectRatio ?? settings.aspect_ratio)
                  ? (aspectRatio ?? settings.aspect_ratio)
                  : "4:3";
                const inp: Record<string, unknown> = {
                  prompt,
                  aspect_ratio: seedreamRatio,
                  size: settings.size || "2K",
                  max_images: 1,
                  sequential_image_generation: "disabled",
                };
                if (allImages.length > 0) inp.image_input = allImages.slice(0, 14);
                return inp;
              } else if (modelId === "ideogram-ai/ideogram-v3-turbo") {
                const inp: Record<string, unknown> = {
                  prompt,
                  aspect_ratio: aspectRatio ?? settings.aspect_ratio ?? "4:5",
                  magic_prompt_option: settings.magic_prompt_option || "Auto",
                };
                if (allImages.length > 0) inp.style_reference_images = allImages.slice(0, 3);
                return inp;
              } else {
                // Google Nano Banana Pro / NB2
                const isNB2 = modelId === "google/nano-banana-2";
                // NB2 only supports up to 2K — clamp silently to avoid "Prediction failed"
                const rawRes = settings.resolution || "1K";
                const resolution = isNB2 && rawRes === "4K" ? "2K" : rawRes;
                const inp: Record<string, unknown> = {
                  prompt,
                  aspect_ratio: aspectRatio ?? settings.aspect_ratio ?? "4:5",
                  resolution,
                  output_format: settings.output_format || "jpg",
                };
                if (!isNB2) {
                  inp.safety_filter_level = settings.safety_filter_level || "block_only_high";
                }
                if (allImages.length > 0) inp.image_input = allImages.slice(0, 14);
                return inp;
              }
            };

            input = buildInput();

            // Run batchCount generations in parallel
            const runs = Array.from({ length: batchCount }, () =>
              replicate.run(modelId as `${string}/${string}`, { input })
            );
            const outputs = await Promise.all(runs);

            const replicateUrls = outputs.map((output) =>
              Array.isArray(output)
                ? (output as string[])[0]
                : typeof output === "string"
                ? output
                : String(output)
            );

            // Mirror all to Supabase in parallel
            const ext = (input.output_format as string | undefined) ?? "jpg";
            const mirroredUrls = await Promise.all(
              replicateUrls.map(async (url, idx) => {
                const storagePath = `generated/${session.userId}/${Date.now()}-${idx}.${ext}`;
                try {
                  return await mirrorUrlToStorage(url, storagePath);
                } catch (err) {
                  console.error("Failed to mirror image to Supabase:", err);
                  return url;
                }
              })
            );

            // Persist all generated images to the DB (non-blocking, best effort)
            Promise.all(
              mirroredUrls.map((url) =>
                insertGeneratedImage({
                  id: nanoid(),
                  user_id: session.userId,
                  chat_id: settings.chatId ?? null,
                  url,
                  prompt,
                  model: modelId,
                  aspect_ratio: (input.aspect_ratio as string) ?? settings.aspect_ratio,
                }).catch((err) => console.error("Failed to persist generated image:", err))
              )
            );

            return {
              success: true,
              imageUrl: mirroredUrls[0],
              imageUrls: mirroredUrls,
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
