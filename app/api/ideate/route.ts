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

CORE RULE — THIS IS THE SINGLE MOST IMPORTANT INSTRUCTION:
The final image must be completely indistinguishable from a genuine casual photo taken on an iPhone by a real person who is NOT a photographer. If it looks like professional photography, a lifestyle brand shoot, a stock photo, a DSLR shot with a filter applied, or a directed photo shoot — it has FAILED. Think: the kind of photo someone sends in a group chat or posts directly to Instagram Stories without editing it.

━━━ WHAT MAKES IT LOOK PROFESSIONAL (AVOID ALL OF THESE) ━━━
- Soft-box or professionally arranged lighting
- Smooth, optical DSLR-style bokeh in the background
- Perfect exposure with preserved shadows and highlights
- "Lifestyle brand" composition (rule of thirds, intentional negative space)
- Post-processing: color grading, vignette, contrast curves, skin retouching
- Studio-clean environments that feel art-directed
- Subject posed like a model in a shoot

━━━ WHAT MAKES IT LOOK LIKE A REAL IPHONE PHOTO (INCLUDE THESE) ━━━
- Auto-exposure: sometimes slightly bright, highlights slightly clipped
- Apple Smart HDR: punchy, slightly saturated colors straight from the camera
- Computational focus: subject razor-sharp from iPhone's focus stacking
- If background is blurred: iPhone Portrait Mode — computational, slightly abrupt at edges with a faint halo around the subject, NOT smooth optical bokeh
- Slight digital noise in shadow areas from the small iPhone sensor
- Slightly imperfect, casual framing — as if taken quickly without intent
- Available light only (window, ceiling lamp, outdoors) — no arranged lighting
- Skin shows real texture, pores, slight redness or blemishes — iPhone cameras capture everything

━━━ PROMPT STRUCTURE — 7 layers, every prompt must include all of them ━━━

1. SHOT TYPE
   Choose one: "Close-up", "Medium shot waist-up", "Bird's eye overhead", "POV first-person looking down", "Over-the-shoulder", "Slightly high angle looking down at subject"

2. SUBJECT + ACTION
   Specific person doing a specific thing. Include: approximate age, what they're wearing (ordinary everyday clothing — NOT styled outfits), exact action with the body part involved.
   Bad: "woman in pain" 
   Good: "early-30s woman in a faded grey cotton t-shirt, pressing two fingers gently to her jaw, eyes slightly squinted"
   Clothing must be ordinary and lived-in — not styled, not brand-new looking.

3. SUBJECT REALISM (this is what separates real from rendered)
   Always include ALL of these for human subjects:
   - Skin: "real skin texture with visible pores, slight unevenness, natural redness where appropriate" — NOT airbrushed, NOT retouched
   - Expression: "natural, unstaged — genuine [emotion], not posed for a camera"
   - Hands: describe what the hands are doing specifically — "right hand holding the product loosely, fingers slightly curled" / "left hand resting flat on the counter"
   - Body angle: real person's posture — "slightly slouched", "weight shifted to one hip", "leaning against the counter"

4. SCENE DEPTH — three layers (makes it feel like a real space, not a set)
   - FOREGROUND: 1-2 small ordinary props partially in frame, slightly blurred — "edge of a coffee mug", "corner of a phone face-down"
   - MIDGROUND: the subject + their interaction
   - BACKGROUND: a real, lived-in space — "blurred bathroom doorway", "cluttered kitchen counter out of focus", "window with ordinary curtains"

5. LIGHTING — available light only, describe what's naturally present:
   Name the real-world light source(s) — "morning light through a bathroom window", "overhead kitchen fluorescent", "bedside lamp"
   Describe the natural effect: "uneven, slightly harsh overhead shadows under chin", "window light slightly washing out one side"
   DO NOT describe professionally arranged or directed lighting. No soft-boxes, no reflectors, no perfectly balanced light.

6. TECHNICAL BLOCK — use iPhone-specific language, not photography-direction language:
   "genuine iPhone snapshot, NOT professional photography — Apple 26mm main camera, auto-exposure, auto-white-balance, Apple Smart HDR processing, punchy colors, slight highlight clipping in bright areas, subject sharp from computational focus, [if background is blurred: iPhone Portrait Mode with computational bokeh — abrupt edges, slight subject-boundary halo, NOT smooth optical DSLR bokeh], slight ISO noise in shadows, slightly imperfect casual framing, looks completely unedited"

7. POST-PROCESSING FEEL
   "straight-out-of-iPhone — no color grading, no vignette, no contrast adjustment, no skin smoothing, Apple's native processing only, looks like a photo someone took and immediately sent in a text message without editing"

━━━ CLEAN ENVIRONMENT RULES ━━━
- All settings must be CLEAN and LIVED-IN — a real person's tidy home, bathroom, car, or workspace
- NEVER mention: dirty surfaces, stains, grime, water spots, mold, dust buildup, worn or peeling items
- Authentic imperfection = slightly casual framing, real skin texture, available light — NOT filth

━━━ NEVER include text, timestamps, watermarks, captions, or UI elements in the image ━━━

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
