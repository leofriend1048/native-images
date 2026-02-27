import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";
import { getSession } from "@/lib/auth";

export const maxDuration = 30;

// Single discriminated schema — the `type` field forces Claude to explicitly
// choose a path rather than defaulting to whichever union branch comes first.
const IdeationResponseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("clarify").describe(
      "Use this when the target audience, product, or emotional angle are unclear enough that guessing would produce off-target concepts."
    ),
    questions: z
      .array(
        z.object({
          id: z.string().describe("Short unique key, e.g. 'target_audience'"),
          question: z.string().describe("The clarifying question to ask the user"),
          options: z
            .array(z.string())
            .describe(
              "3-5 short answer options the user can tap. Always include 'Other / not sure' last."
            ),
        })
      )
      .min(1)
      .max(3)
      .describe("1-3 clarifying questions ordered by importance"),
  }),
  z.object({
    type: z.literal("ideate").describe(
      "Use this when you have enough context to generate accurate, on-target native ad concepts."
    ),
    primaryPrompt: z
      .string()
      .describe("The main enhanced native-style ad prompt, ready to send to image generation"),
    variations: z
      .array(z.string())
      .describe(
        "3-4 tight variations: different angle, lighting, emotion tag, cropping, or before/after framing. Each is a complete standalone prompt."
      ),
    additionalConcepts: z
      .array(z.string())
      .describe(
        "2-3 related but distinct ad concepts for the same persona. Brief descriptions, not full prompts."
      ),
  }),
]);

export type IdeationResponse = z.infer<typeof IdeationResponseSchema>;
export type IdeationResult = Extract<IdeationResponse, { type: "ideate" }>;
export type ClarificationResult = Extract<IdeationResponse, { type: "clarify" }>;

const IDEATION_SYSTEM_PROMPT = `You are a native advertising creative strategist. Given a raw ad concept you must decide:

STEP 1 — ASSESS CLARITY
Ask yourself: do I know (a) the target audience / persona, (b) the product category or problem being solved, and (c) the emotional angle? If ANY of these are genuinely unclear AND getting them wrong would produce off-target concepts, return clarifying questions instead of ideating.

WHEN TO ASK (return needsClarification: true):
- The concept is a generic scene with no clear product or problem (e.g. "cluttered nightstand", "bathroom counter")
- The target persona is ambiguous and would meaningfully change the concepts (sinus sufferer vs migraine sufferer vs skincare user are very different)
- The emotional angle is missing and guessing wrong would waste the user's time

WHEN NOT TO ASK (return ideation directly):
- The product, problem, or persona is clear enough from context
- The concept already contains specific product names, body parts, or conditions
- Asking would add friction without meaningfully improving accuracy

STEP 2A — IF ASKING: Return 1-3 questions max, ordered by importance. Each question needs 3-5 tappable options. Keep questions short and conversational. Good examples:
- "Who are you targeting?" → ["Sinus/allergy sufferers", "Migraine sufferers", "Skincare concerns", "Sleep issues", "Other"]
- "What's the product?" → ["Nasal spray / decongestant", "Supplement / vitamin", "Device (humidifier etc)", "Not sure yet"]
- "What's the emotional hook?" → ["Desperation / tried everything", "Discovery / finally found it", "Comparison / before vs after", "Other"]

STEP 2B — IF IDEATING: Follow these rules exactly.

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

ADDITIONAL CONCEPTS: Think about what product category this ad serves and the specific persona, then suggest 2-3 adjacent problem-states that the same product might solve for that same persona. Keep concepts tightly scoped to the confirmed audience — do NOT drift into unrelated conditions.

Each variation and additional concept must be immediately usable — no placeholders.`;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { concept, answers }: { concept: string; answers?: Record<string, string> } = await req.json();

  if (!concept?.trim()) {
    return new Response(JSON.stringify({ error: "Concept is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build the prompt — append any clarification answers so Claude has full context
  let prompt = concept;
  if (answers && Object.keys(answers).length > 0) {
    const answerLines = Object.entries(answers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    prompt = `${concept}\n\nClarification answers:\n${answerLines}`;
  }

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5"),
    system: IDEATION_SYSTEM_PROMPT,
    prompt,
    schema: IdeationResponseSchema,
  });

  return new Response(JSON.stringify(object), {
    headers: { "Content-Type": "application/json" },
  });
}
