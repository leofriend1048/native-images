import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";
import { getSession } from "@/lib/auth";

export const maxDuration = 30;

const IdeationSchema = z.object({
  primaryPrompt: z
    .string()
    .describe(
      "The main enhanced native-style ad prompt, ready to send directly to image generation"
    ),
  variations: z
    .array(z.string())
    .describe(
      "3-4 tight variations of the primary concept: different angle, lighting, emotion tag, cropping, or before/after framing. Each is a complete standalone prompt."
    ),
  additionalConcepts: z
    .array(z.string())
    .describe(
      "2-3 related but distinct ad concepts the user may not have considered. Each is a brief concept description (not yet a full prompt) that could be submitted as a new idea."
    ),
});

export type IdeationResult = z.infer<typeof IdeationSchema>;

const IDEATION_SYSTEM_PROMPT = `You are a native advertising creative strategist. Given a raw ad concept, you:

1. Craft a single primary enhanced prompt in native ad style
2. Generate tight variations of that concept
3. Suggest related concepts the user might not have considered

NATIVE AD PROMPT RULES:
- Must look like authentic user-generated iPhone content — NOT polished marketing
- Add 2-4 emotional/visceral descriptor tags in square brackets
- End with: "iphone style, low-fi image"
- Be specific about lighting, composition, and surface/texture details
- NEVER include text overlays, timestamps, watermarks, or any instruction to show text in the image
- Prompts must be purely visual and scene-descriptive

VARIATION TYPES (use a mix):
- Different lighting context: "harsh bathroom fluorescent" vs "soft window light at 7am"
- Different composition: "extreme close-up filling the frame" vs "45-degree overhead angle"
- Different emotional context: used/aftermath vs in-use moment
- Before/after framing of the same subject
- Different environmental detail: bathroom counter vs nightstand vs medicine cabinet

ADDITIONAL CONCEPTS: Think about what product category this ad serves, then suggest 2-3 adjacent problem-states that the same product might solve. These should be brief concept descriptions (not full prompts), like "Week-old nail polish chipping off on fingertips" or "Red, blotchy skin after shaving legs".

Each variation and additional concept must be immediately usable — no placeholders.`;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { concept }: { concept: string } = await req.json();

  if (!concept?.trim()) {
    return new Response(JSON.stringify({ error: "Concept is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5"),
    system: IDEATION_SYSTEM_PROMPT,
    prompt: concept,
    schema: IdeationSchema,
  });

  return new Response(JSON.stringify(object), {
    headers: { "Content-Type": "application/json" },
  });
}
