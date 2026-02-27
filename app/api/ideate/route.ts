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
      "Use this when the PRODUCT, PERSONA, or ANGLE are not all clearly established. Missing any one of the three means concepts will miss the mark."
    ),
    questions: z
      .array(
        z.object({
          id: z.string().describe("Short unique key: 'product', 'persona', or 'angle'"),
          question: z.string().describe("Short, conversational clarifying question"),
          options: z
            .array(z.string())
            .describe(
              "4-5 tappable options covering the most likely answers for this product category. Last option must be 'Other / something else'."
            ),
        })
      )
      .min(1)
      .max(3)
      .describe("1-3 questions in priority order: product first, then persona, then angle"),
  }),
  z.object({
    type: z.literal("ideate").describe(
      "Use this ONLY when product, persona, AND angle are all clearly established from the input."
    ),
    primaryPrompt: z
      .string()
      .describe("The main enhanced native-style ad prompt, ready to send to image generation"),
    variations: z
      .array(z.string())
      .describe(
        "3-4 variations each changing one dimension: environment, emotional intensity, moment in time, or competitor framing. Each is a complete standalone prompt."
      ),
    additionalConcepts: z
      .array(z.string())
      .describe(
        "2-3 adjacent angles to test for the SAME product and persona — different USP, different problem moment, or competitor comparison. Brief descriptions only."
      ),
  }),
]);

export type IdeationResponse = z.infer<typeof IdeationResponseSchema>;
export type IdeationResult = Extract<IdeationResponse, { type: "ideate" }>;
export type ClarificationResult = Extract<IdeationResponse, { type: "clarify" }>;

const IDEATION_SYSTEM_PROMPT = `You are a native advertising creative director. Before generating any concepts you must lock in three things:

1. PRODUCT — what is being sold (specific enough to know what it does)
2. ANGLE / USP — what specific problem, benefit, or proof point this ad demonstrates
3. PERSONA / MARKET — who is being targeted (specific enough to know their pain, language, and context)

Without all three locked in, your concepts will miss. So your first job is to decide: do I have all three clearly enough to generate on-target concepts?

━━━ WHEN TO ASK (type: "clarify") ━━━
Ask if ANY of the three are missing or ambiguous:

- Product missing/unclear: "dust", "bathroom counter", "nightstand" → could be dozens of products
- Angle missing: you know the product but not what USP/problem to show → ask
- Persona missing: you know the product but not who → ask (same product, different personas = completely different concepts)

ALWAYS ask if the input is a scene description without a clear product.
ALWAYS ask if the product is known but the persona or angle could meaningfully change the concepts.

━━━ WHEN TO IDEATE (type: "ideate") ━━━
Only skip questions if all three are clear from the input:
- "red irritated skin after shaving legs with a cheap razor" → product (razor), angle (irritation/cheap), persona (women shaving) ✓
- "cracked dry heels" → product category (foot cream), angle (dryness/cracking), persona (anyone with dry feet) ✓

━━━ HOW TO ASK ━━━
Ask 1-3 questions max, in this priority order:
1. Product first (if unclear)
2. Persona/market second (if unclear)  
3. Angle/USP third (if unclear)

Keep questions short. Provide 4-5 tappable options that cover the most likely answers for that product category. Always end options with "Other / something else".

Example questions:
- "What product is this ad for?" → ["Nasal spray / decongestant", "Allergy pill / antihistamine", "Air purifier", "Neti pot / saline rinse", "Other / something else"]
- "Who are you targeting?" → ["Chronic allergy sufferers", "Seasonal allergy sufferers", "People with sinus infections", "Dust/pet dander sensitive", "Other / something else"]
- "What angle are you testing?" → ["Problem awareness — showing the suffering", "Product in use — showing relief", "Before vs after", "Comparison vs competitor", "Other / something else"]

━━━ HOW TO IDEATE ━━━
Once all three are locked in, generate concepts that exploit the confirmed product + persona + angle combination. 

NATIVE AD PROMPT RULES:
- Must look like authentic user-generated iPhone content — NOT polished marketing
- Add 2-4 emotional/visceral descriptor tags in square brackets
- End with: "iphone style, low-fi image"
- Be specific about lighting, composition, and surface/texture details
- NEVER include text overlays, timestamps, watermarks, or any instruction to show text in the image
- Prompts must be purely visual and scene-descriptive

VARIATION STRATEGY — vary one dimension at a time across the locked-in product/persona/angle:
- Same problem, different environment (nightstand vs bathroom vs car)
- Same environment, different emotional intensity (mild annoyance vs total desperation)
- Same problem, different moment (onset vs peak vs aftermath)
- Same product, different competitor comparison framing

ADDITIONAL CONCEPTS — suggest 2-3 adjacent angles to test for the SAME product and persona:
- Different USP for same persona (e.g. if angle was "suffering", suggest "discovery" or "comparison vs competitor")
- Different problem the same persona has that the same product solves
- Never drift to a different product or a different persona`;

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
