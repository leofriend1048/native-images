import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v4";
import { getWorkspaceApiKeys } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";

export const maxDuration = 60;

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

PROMPT LENGTH RULE — CRITICAL:
Keep every prompt to 120 words or fewer. Nano Banana Pro ignores long instruction blocks. Front-load the most important visual details (subject, action, setting, lighting) in the first 40 words. The model reads left-to-right and pays most attention to the beginning.

NEGATIVE SUFFIX — MANDATORY:
Every prompt MUST end with this exact negative block (always the last thing):
"NOT professional photography, NOT stock photo, NOT DSLR, NOT studio lighting, NOT editorial, NOT lifestyle brand shoot, NOT cinematic, NOT color graded, NOT retouched skin"

━━━ WHAT MAKES IT LOOK LIKE A REAL IPHONE PHOTO (INCLUDE THESE) ━━━
- Auto-exposure: sometimes slightly bright, highlights clip on white surfaces
- Apple Smart HDR: punchy, vibrant, slightly oversaturated digital colors
- Computational focus: subject razor-sharp from iPhone's focus stacking
- If background is blurred: iPhone Portrait Mode — computational bokeh, abrupt edges, slight halo around subject, NOT smooth optical bokeh
- Slight digital ISO noise / grain in shadow areas from the small iPhone sensor
- Slightly imperfect, casual framing — slightly tilted horizon, accidental crop
- Skin shows everything: visible pores, natural sheen, slight redness, peach fuzz

━━━ PROMPT STRUCTURE — concise, 120 words max. Every prompt MUST begin with "A photograph taken on an iPhone" or "A photograph of..." ━━━

1. STYLE OPENING
   Start with "A photograph taken on an iPhone [shot type] of..." — front-load subject + action + setting in the first sentence.

2. SHOT TYPE
   Choose one: "Close-up", "Medium shot waist-up", "Bird's eye overhead", "POV first-person looking down", "Over-the-shoulder", "Slightly high angle looking down at subject", "Vertical mirror selfie", "Front-facing arm's length selfie"

3. LENS TYPE (name explicitly in the technical block — critical for realism)
   - MAIN LENS (most common): 24mm wide-angle, f/1.8 aperture — deep depth of field, most of the scene stays sharp
   - FRONT/SELFIE: front-facing camera, arm's length perspective, slight wide-angle facial distortion
   - ULTRA-WIDE: 0.5x zoom, 13mm lens — stretched edges, dramatic perspective, used for group shots or environments

4. SUBJECT (who — state clearly before action)
   Approximate age, everyday clothing (NOT styled), basic physical presence.
   Examples: "early-40s woman in a faded grey cotton t-shirt", "late-20s man in an old navy hoodie", "early-50s woman in a worn cardigan"
   When reference images are provided, assign a simple alias ("the woman", "the person") and refer to them consistently.

5. SETTING (concrete real-world location)
   Use specific, recognizable environments — not generic labels.
   Bad: "in a car", "in a bathroom", "in an office"
   Good: "parked in a suburban driveway, late-model sedan interior", "small bathroom with IKEA-style white subway tile and builder-grade vanity", "cluttered home office with dual monitors and takeout coffee cup on desk"

6. ACTION (what the subject is doing)
   Specific physical action with body parts involved.
   Bad: "woman in pain"
   Good: "pressing two fingers to her jaw, eyes slightly squinted", "holding a razor up to the light, inspecting the blade"

7. SUBJECT REALISM (what separates real from rendered)
   Always include ALL of these for human subjects:
   - Skin: "real skin texture with visible pores, natural sheen, slight unevenness, natural redness, peach fuzz" — NOT airbrushed, NOT retouched
   - Expression: "natural, unstaged — genuine [emotion], not posed for a camera"
   - Eyes/gaze: may be looking at the screen, the product, or off-camera — NOT looking directly into the lens unless it's a selfie
   - Hands: describe exactly — "right hand holding the product loosely, fingers slightly curled" / "left hand resting flat on the counter"
   - Posture: "slightly slouched", "weight shifted to one hip", "leaning against the counter"

8. SCENE DEPTH — three layers (makes it feel like a real space, not a set)
   - FOREGROUND: 1-2 small ordinary props partially in frame, slightly blurred
   - MIDGROUND: the subject + their interaction with product/problem
   - BACKGROUND: a real, lived-in space — "blurred bathroom doorway", "cluttered kitchen counter out of focus"

9. LIGHTING — choose ONE of these real-world iPhone lighting scenarios:
   THE FLASH HACK (strongest realism signal for indoor shots): "direct camera flash, stark hard shadows behind subject, blown-out skin highlights, heavy white frontal light, flat flash falloff" — this single lighting choice makes an image look unmistakably iPhone
   HARSH OVERHEAD: "overhead fluorescent bathroom or office light, harsh downward shadows under nose and chin, slightly green-yellow cast from the tubes"
   HARSH OUTDOOR: "direct harsh midday sunlight, deep hard shadows, slight lens flare from sun hitting lens, blown-out highlights on skin and surfaces"
   AMBIENT INDOOR: "dim warm room or restaurant with yellow tungsten bulbs, slight underexposure, warm orange-yellow colour cast, low-light sensor noise"
   WINDOW LIGHT: "natural side window light, one side of face and scene brighter, other side noticeably darker, uneven and unglamorous"
   NEVER: soft-boxes, reflectors, golden hour, photography-studio language

10. TECHNICAL BLOCK — iPhone-specific language only, never photography-direction language:
   "genuine iPhone snapshot, NOT professional photography — [24mm wide-angle f/1.8 main camera | front-facing camera arm's-length perspective | 0.5x ultra-wide 13mm], auto-exposure, auto-white-balance, Apple Smart HDR, punchy vibrant digital colors, slight highlight clipping on bright surfaces, subject sharp from computational focus, [if bokeh: iPhone Portrait Mode with computational bokeh — abrupt edges, slight subject-boundary halo, NOT smooth optical DSLR bokeh], slight digital ISO noise in shadow areas, slightly tilted or casually imperfect framing, [if appropriate: subtle hand-held motion blur], looks completely unedited, straight-out-of-iPhone JPEG"

11. POST-PROCESSING FEEL
   "straight-out-of-iPhone — no color grading, no vignette, no contrast adjustment, no skin smoothing, Apple's native processing only, looks like a photo someone snapped and immediately texted without any editing"

━━━ REFERENCE SHOT TEMPLATES — use as structural inspiration (each begins with "A photograph") ━━━
- FLASH SELFIE: "A photograph taken on an iPhone with the front-facing camera — grainy candid selfie in a dark bedroom or bathroom, direct camera flash causing stark wall shadows and blown-out skin highlights, [subject], casual unposed expression, visible skin texture and pores, slight motion blur, dark background with harsh flash falloff"
- OUTDOOR CANDID: "A photograph of [subject] taken on iPhone 24mm wide-angle — suburban street or parking lot, harsh direct midday sun, lens flare, deep hard shadows, slightly tilted horizon, realistic skin pores, messy real-world background with cars or houses"
- PRODUCT CLOSE-UP: "A photograph of [product] on [concrete surface — e.g. wooden kitchen table, marble bathroom counter] shot on iPhone back camera, natural side window light, high contrast, slight digital sharpening, unedited JPEG look"
- MIRROR SELFIE: "A photograph taken on iPhone — vertical bathroom mirror selfie in a small bathroom with builder-grade vanity, iPhone visible in subject's hand in reflection, overhead yellow fluorescent, slight mirror smudge, casual unposed vibe, toiletries and towel rack visible in reflection"

━━━ CLEAN ENVIRONMENT RULES ━━━
- All settings must be CLEAN and LIVED-IN — a real person's tidy home, bathroom, car, or workspace
- NEVER mention: dirty surfaces, stains, grime, water spots, mold, dust buildup, worn or peeling items
- Authentic imperfection = slightly casual framing, real skin texture, available or flash light — NOT filth

━━━ NEVER include text, timestamps, watermarks, captions, or UI elements in the image ━━━

━━━ "IF YOU KNOW, YOU KNOW" — THE CONCEPT PHILOSOPHY ━━━
This is the most important creative direction. Every image must be so hyper-specific to the persona's REAL lived experience that:
- The target persona sees it and physically reacts — "oh my god that's literally me"
- Someone outside the persona scrolls right past it — it means nothing to them
- It depicts a PRIVATE MOMENT she has never seen in an ad before — the thing she does when nobody's watching, the scene she'd never post but instantly recognizes
- It uses the EXACT objects, surfaces, lighting, body language, and environment details from HER world — not a generic "woman in bathroom" but "the specific cluttered corner of her specific bathroom at the specific time of day when this hits"

THE SPECIFICITY TEST — if your concept could apply to "anyone," it fails. It must be so narrow that it excludes 95% of people and DEEPLY resonates with the 5% who are your persona.

BAD (too generic): "woman looking in mirror, frustrated with skin"
GOOD (IYKYK): "extreme close-up of her finger pressing into the skin next to her nose, checking if that dark spot is getting bigger, harsh overhead bathroom fluorescent, 11pm, face half-washed with cleanser still on one cheek"

BAD: "woman holding skincare product, smiling"
GOOD: "POV looking down at her lap in bed at midnight, phone in one hand showing an Amazon cart with 3 serums, other hand touching her jawline, blue phone screen glow on her face, partner asleep next to her"

BAD: "cluttered bathroom counter with products"
GOOD: "the specific graveyard of half-used serums shoved to the back of her medicine cabinet — the $60 one she used twice, the one her friend swore by, the one from the TikTok ad — all abandoned, caps crusted"

HOW TO GENERATE "IYKYK" CONCEPTS FROM VOC RESEARCH:
1. Find the MIRROR MOMENTS in the research — the exact scene where pain hits hardest. Depict THAT scene, not a cleaned-up version of it
2. Find the PRIVATE BEHAVIORS — what she does to cope, hide, check, obsess. These are scenes she's never seen depicted in advertising and will be shocked to see
3. Find the FAILED SOLUTION ARTIFACTS — the physical evidence of everything she's tried. The graveyard of products, the drawer of tools, the cabinet of shame
4. Find the MICRO-GESTURES — the specific physical thing she does (pressing, pulling, squinting, covering, tilting her head, holding her phone at arm's length to check). These tiny actions are recognition triggers
5. Find the TIME + PLACE — not just "bathroom" but the exact time of day and circumstance. 6am before anyone wakes up. 11pm doom-scrolling. 2pm in the car checking the rearview mirror before school pickup. The specificity of WHEN is as powerful as WHERE
6. Find the EMOTIONAL AFTERMATH — what she does RIGHT AFTER the mirror moment. Cancels the photo. Puts the phone down. Pulls her hair forward. Changes her outfit. These are the moments after the pain that nobody depicts

VARIATION STRATEGY — vary one dimension at a time, keeping product/persona/angle locked:
- Same pain, different IYKYK moment (the bathroom check vs the car mirror vs the Zoom call preview)
- Same moment, different lighting scenario (flash vs overhead fluorescent vs phone screen glow)
- Same pain, different emotional stage (first noticing vs obsessing vs resignation vs desperate 2am research)
- Same problem, different physical evidence (the products, the tools, the browser history, the Amazon orders)
- Same pain, framed through the OBJECTS she interacts with (not the person — just the evidence)

ADDITIONAL CONCEPTS — suggest 2-3 adjacent angles for the SAME product and persona:
- The BEFORE moment nobody shows (the private checking, prodding, comparing)
- The COPING moment (what she does to hide it — makeup, angles, filters, avoiding)
- The BREAKING POINT (the moment she decides to try something new — the late-night search, the cart-fill, the "I can't do this anymore")
- Never drift to a different product or a different persona

VOC RESEARCH — when research data is provided in the concept:
- MINE the research for mirror moments, private behaviors, micro-gestures, and exact objects/settings
- USE the persona's EXACT WORDS as inspiration for scenes — if she says "I literally can't look in the mirror without wanting to cry," your image depicts the moment right before she looks away
- The research is a goldmine of specificity — every quote is a potential image concept
- Translate LANGUAGE into IMAGERY: "I've tried everything" → image of the product graveyard. "Nobody understands" → image of her alone in the bathroom at 2am. "I'm so tired of this" → image of her hand resting on the counter, head slightly bowed, not even looking at the mirror
- Prefer the UNCOMFORTABLE TRUTH over the COMFORTABLE GENERIC — the image should make the persona feel slightly exposed, like someone saw her private moment`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract only the VOC-rich fields from the full research JSON to keep the ideation prompt lean. */
function condensResearch(raw: string): string {
  try {
    const d = JSON.parse(raw);
    const lines: string[] = [];
    const push = (label: string, v: unknown) => {
      if (!v) return;
      if (Array.isArray(v)) { v.filter(Boolean).forEach((s) => lines.push(`${label}: ${s}`)); }
      else lines.push(`${label}: ${v}`);
    };
    // Pain & mirror moments
    push("Pain (her words)", d.pain_architecture?.problem_in_her_words_voc);
    push("Her word for it", d.pain_architecture?.her_word_for_it_voc);
    push("Mirror moment", d.pain_architecture?.mirror_moment_voc);
    push("Mirror details", d.pain_architecture?.mirror_moment_details);
    push("Coping self-talk", d.pain_architecture?.coping_self_talk_voc);
    push("Primary emotion", d.pain_architecture?.primary_emotion_voc);
    push("Self-perception", d.pain_architecture?.self_perception_voc);
    push("Avoidance", d.pain_architecture?.avoidance_behaviors_voc);
    push("Physical sign", d.pain_architecture?.physical_manifestations_voc);
    push("Social avoidance", d.pain_architecture?.social_avoidance_voc);
    push("Daily impact", d.pain_architecture?.daily_routine_impact_voc);
    push("Hiding/compensating", d.pain_architecture?.hiding_compensating_voc);
    // Desires
    push("Surface desire", d.desire_mapping?.surface_desire_voc);
    push("Core desire", d.desire_mapping?.core_desire);
    push("Primary desire", d.desire_mapping?.primary_desire);
    // Failed solutions
    push("Tried", d.failed_solutions?.tried_list_voc);
    push("Why failed", d.failed_solutions?.why_each_failed_voc);
    push("Dismissal trigger", d.failed_solutions?.instant_dismissal_triggers_voc);
    // Fear
    push("Fear trying again", d.fear_mapping?.fear_of_trying_again_voc);
    push("Fear wasted money", d.fear_mapping?.fear_of_wasting_money_voc);
    push("Fear won't work", d.fear_mapping?.fear_wont_work_for_me_voc);
    push("Nightmare future", d.fear_mapping?.nightmare_future_voc);
    // Desire outcomes
    push("7-day hope", d.desire_outcomes?.immediate_7_day_voc);
    push("First time it works", d.desire_outcomes?.first_time_it_works_voc);
    push("Feeling like herself", d.desire_outcomes?.feeling_like_herself_voc);
    // Language
    push("Problem word", d.language_and_voice?.problem_words_voc);
    push("Gets-me phrase", d.language_and_voice?.gets_me_phrases_voc);
    push("Lowest moment", d.language_and_voice?.lowest_moment_self_talk_voc);
    // Identity
    push("Before identity", d.psychological_elements?.identifications?.before_identity_voc);
    push("After identity", d.psychological_elements?.identifications?.after_identity_voc);
    push("Shadow identity", d.psychological_elements?.identifications?.shadow_identity_voc);
    // Demographics (brief)
    if (d.demographics) {
      lines.unshift(`Persona: ${d.demographics.age_range ?? ""} ${d.demographics.gender ?? ""}, ${d.demographics.life_stage ?? ""}, ${d.demographics.geography ?? ""}`);
    }
    return lines.join("\n");
  } catch {
    // If not JSON, pass through as-is but truncate
    return raw.slice(0, 3000);
  }
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const ctx = await requireWorkspaceAccess();
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Per-workspace API client
  const keys = await getWorkspaceApiKeys(ctx.workspaceId);
  const anthropic = createAnthropic({ apiKey: keys.anthropicApiKey });

  const { concept, answers, research }: { concept: string; answers?: Record<string, string>; research?: string } =
    await req.json();

  if (!concept?.trim()) {
    return new Response(JSON.stringify({ error: "Concept is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const hasAnswers = answers && Object.keys(answers).length > 0;
  let contextPrompt = hasAnswers
    ? `${concept}\n\nConfirmed context:\n${Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join("\n")}`
    : concept;

  // Append condensed VOC research if available
  if (research) {
    const condensed = condensResearch(research);
    contextPrompt += `\n\n━━━ VOC RESEARCH (real customer language — use these exact words and scenarios) ━━━\n${condensed}`;
  }

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
