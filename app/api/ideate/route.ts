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

const IDEATION_SYSTEM_PROMPT = `You are a native advertising creative strategist. Your job is to generate highly targeted native ad concepts.

CRITICAL RULE: You MUST ask clarifying questions (type: "clarify") unless the concept passes ALL THREE of the following tests:
1. The specific product or solution being advertised is named or unmistakably obvious
2. The target persona / condition is named or unmistakably obvious  
3. You could not accidentally generate concepts for a completely different product category

Examples that MUST trigger clarification (type: "clarify"):
- "dust" → could be cleaning product, air purifier, allergy medication, vacuum — must ask
- "cluttered nightstand" → could be sleep aid, organizer, cleaning product, medication — must ask
- "cluttered nightstand with nasal spray bottles" → product is nasal spray but persona unclear (allergy? sinus infection? deviated septum?) — must ask
- "bathroom counter" → must ask
- "tired person in bed" → must ask
- "messy kitchen" → must ask

Examples that can skip clarification (type: "ideate"):
- "red irritated skin after shaving legs with a cheap razor" → clear product (razor/shaving), clear persona (women shaving legs), clear problem
- "close-up of cracked dry heels" → clear condition, clear product category (foot cream)
- "someone squinting at their phone screen in bright sunlight" → clear problem (screen visibility)

When you ask (type: "clarify"), ask 1-3 questions. The MOST IMPORTANT question is always: what product or solution is being advertised? Second most important: who is the target persona / what condition do they have?

Good question examples:
- "What product is this ad for?" → ["Nasal spray / decongestant", "Allergy medication", "Air purifier / humidifier", "Cleaning product", "Other"]
- "Who are you targeting?" → ["Allergy / sinus sufferers", "People with colds", "Dust-sensitive / asthma", "General cleaning audience", "Other"]
- "What's the emotional angle?" → ["Desperation / tried everything", "Embarrassment / neglect", "Discovery / finally works", "Before vs after", "Other"]

When you ideate (type: "ideate"), follow these rules exactly:

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

ADDITIONAL CONCEPTS: Suggest 2-3 adjacent problem-states for the SAME confirmed persona and product. Do NOT drift into unrelated conditions or product categories.`;

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
