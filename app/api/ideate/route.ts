import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";
import { getSession } from "@/lib/auth";

export const maxDuration = 30;

// ─── Schemas ──────────────────────────────────────────────────────────────────

const QuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
});

// Step 1: dedicated call that ONLY decides what questions to ask.
// Returning an empty array means all three axes are already clear.
const ClarificationSchema = z.object({
  questions: z
    .array(QuestionSchema)
    .describe(
      "Questions needed to establish product, persona, and angle (max 3, in priority order). " +
      "Return EMPTY array only if ALL THREE are unmistakably clear — " +
      "meaning a copywriter could start writing immediately with no assumptions."
    ),
});

// Step 2: ideation — only called once all three axes are confirmed.
const IdeationSchema = z.object({
  primaryPrompt: z.string(),
  variations: z.array(z.string()),
  additionalConcepts: z.array(z.string()),
});

export type IdeationResult = { type: "ideate" } & z.infer<typeof IdeationSchema>;
export type ClarificationResult = {
  type: "clarify";
  questions: z.infer<typeof QuestionSchema>[];
};
export type IdeationResponse = IdeationResult | ClarificationResult;

// ─── Prompts ──────────────────────────────────────────────────────────────────

const CLARIFICATION_SYSTEM_PROMPT = `You are a native advertising creative director. Your ONLY job right now is to identify what information is missing before concepts can be generated.

Every native ad requires THREE axes to be locked in:
1. PRODUCT — what is being sold (specific enough to know what it does)
2. PERSONA — who is being targeted (specific enough to know their pain and context)
3. ANGLE / USP — what specific problem, benefit, or proof point this ad demonstrates

Assess the concept and return questions for any axes that are missing or ambiguous. Return questions in priority order: product first, then persona, then angle. Max 3 questions total.

RETURN EMPTY questions array ONLY if a professional copywriter could start writing immediately — all three axes clear with zero assumptions needed. This bar is high. When in doubt, ask.

Rules for questions:
- Each question gets 4-5 tappable options tailored to what the concept is likely about
- Last option is always "Other / something else"
- Keep questions short and conversational

━━━ MUST ask (empty array would be wrong) ━━━
"dust" → product unknown (cleaning spray? vacuum? air purifier? allergy pill?) → ask product, then persona
"cluttered nightstand" → product unknown → ask product
"nasal spray bottles" → product known, but persona and angle both unclear → ask both
"bathroom counter" → product unknown → ask
"tired person waking up" → product unknown → ask

━━━ Can return empty (rare — all three truly obvious) ━━━
"red irritated skin after shaving legs with a cheap drugstore razor" → product=razor, persona=women shaving legs, angle=irritation ✓
"cracked painful dry heels" → product=foot cream, persona=dry skin sufferers, angle=severity ✓
"someone squinting at phone screen in direct sunlight" → product=screen protector/app, persona=outdoor phone users, angle=visibility problem ✓

━━━ Question option format ━━━
For "nasal spray": product options → ["Nasal spray / decongestant", "Allergy pill / antihistamine", "Air purifier / humidifier", "Saline rinse / neti pot", "Other / something else"]
For "razor": persona options → ["Women shaving legs", "Women shaving underarms", "Men shaving face", "People with sensitive skin", "Other / something else"]
Angle options are always: ["Problem — showing the suffering", "Relief — product working", "Before vs after", "Comparison vs competitor", "Other / something else"]`;

const IDEATION_SYSTEM_PROMPT = `You are a native advertising creative director. Generate highly targeted native ad image prompts for the confirmed product + persona + angle combination.

NATIVE AD PROMPT RULES:
- Must look like authentic user-generated iPhone content — NOT polished marketing
- Add 2-4 emotional/visceral descriptor tags in square brackets
- End with: "iphone style, low-fi image"
- Be specific about lighting, composition, and surface/texture details
- NEVER include text overlays, timestamps, watermarks, or any instruction to show text in the image
- Prompts must be purely visual and scene-descriptive

VARIATION STRATEGY — vary one dimension at a time, keeping product/persona/angle locked:
- Same problem, different environment (nightstand vs bathroom vs car vs office)
- Same environment, different emotional intensity (mild annoyance vs total desperation)
- Same problem, different moment in time (onset vs peak suffering vs aftermath)
- Same product/problem, framed as competitor comparison

ADDITIONAL CONCEPTS — suggest 2-3 adjacent angles for the SAME product and persona:
- Different USP for same persona (if angle was "suffering", suggest "discovery" or "competitor comparison")
- Different problem the same persona faces that the same product solves
- Never drift to a different product or a different persona`;

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { concept, answers }: { concept: string; answers?: Record<string, string> } =
    await req.json();

  if (!concept?.trim()) {
    return new Response(JSON.stringify({ error: "Concept is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const hasAnswers = answers && Object.keys(answers).length > 0;
  const contextPrompt = hasAnswers
    ? `${concept}\n\nConfirmed context:\n${Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join("\n")}`
    : concept;

  // ── Step 1: clarification check ──────────────────────────────────────────────
  // Dedicated call whose only job is deciding what questions are needed.
  // Separating this prevents Claude from "helpfully" skipping to content.
  // Only run when `answers` is absent entirely — if the user explicitly
  // skipped (answers = {}), we still bypass clarification and go straight
  // to ideation so "Skip" doesn't loop back to the same question.
  if (answers === undefined) {
    const { object: clarification } = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      system: CLARIFICATION_SYSTEM_PROMPT,
      prompt: contextPrompt,
      schema: ClarificationSchema,
    });

    if (clarification.questions.length > 0) {
      const response: ClarificationResult = {
        type: "clarify",
        questions: clarification.questions,
      };
      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // ── Step 2: ideation ─────────────────────────────────────────────────────────
  const { object: ideation } = await generateObject({
    model: anthropic("claude-sonnet-4-5"),
    system: IDEATION_SYSTEM_PROMPT,
    prompt: contextPrompt,
    schema: IdeationSchema,
  });

  const response: IdeationResult = { type: "ideate", ...ideation };
  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json" },
  });
}
