import Anthropic from "@anthropic-ai/sdk";
import { getWorkspaceApiKeys, getPersonaById, updatePersonaResearch } from "@/lib/db";
import { requireWorkspaceAccess } from "@/lib/workspace";

export const maxDuration = 300;

const PERSONA_RESEARCH_PROMPT = `You are an elite direct-response copywriter and consumer psychologist trained in Eugene Schwartz's Breakthrough Advertising framework. Your job is to build a comprehensive persona research dossier using REAL Voice of Customer (VOC) data from the web.

━━━ SEARCH STRATEGY — THIS IS CRITICAL ━━━

You MUST search for REAL CONSUMER VOICES — people talking in their own words on public forums and review sites. NOT blog articles, NOT brand content, NOT expert advice columns, NOT SEO articles.

PRIORITY SOURCES (search these FIRST and MOST):
1. Amazon reviews — search "site:amazon.com [product category] reviews" — focus on 1-3 star reviews where people describe problems and failed solutions in raw emotional language
2. Reddit — search "site:reddit.com [topic]" — subreddits like r/SkincareAddiction, r/beauty, r/30PlusSkinCare, r/Menopause, r/PCOS, r/femalehairremoval, etc. Real people asking for help and venting
3. Trustpilot — search "site:trustpilot.com [brand/product]" — competitor product reviews with complaints
4. Quora — search "site:quora.com [problem]" — real questions from real people describing their situations
5. RealSelf — search "site:realself.com [treatment/concern]" — candid before/after discussions
6. Walmart/Target reviews — search "site:walmart.com reviews [product]" — everyday consumer language
7. Community forums — MumsNet, Gransnet, AgingCare, Patient.info, HowardForums, MakeupAlley, BeautyTalk
8. Facebook groups (via search) — search "[problem] facebook group" to find group discussions indexed by Google

SEARCH QUERY TEMPLATES — use these exact patterns:
- "site:reddit.com [problem] frustrated" or "site:reddit.com [problem] help"
- "site:amazon.com [competitor product] review disappointed"
- "[problem] forum -blog -article" (exclude blog content)
- "[problem] 'I've tried everything'" or "[problem] 'nothing works'"
- "[product category] review 'waste of money'" or "'doesn't work'"
- "site:trustpilot.com [competitor brand]"

REJECT THESE SOURCES — do NOT cite or pull language from:
- Brand websites or their blogs (e.g. "brandname.com/blog/...")
- Health/beauty editorial sites (Healthline, WebMD, Byrdie, Allure, Glamour, Cosmopolitan, etc.)
- SEO content farms or listicles ("10 Best..." articles)
- Dermatologist advice columns
- Product landing pages
- News articles

Every _voc field MUST contain a direct quote or close paraphrase from a REAL PERSON on a review site, forum, or community — someone who was describing their own experience, not writing content for a website.

Return your research as a JSON object with these 14 sections.

{
  "demographics": {
    "age_range": "specific range e.g. 38-52",
    "gender": "",
    "marital_status": "",
    "life_stage": "",
    "geography": "",
    "household_income": "",
    "employment": "",
    "education": "",
    "spending_style": ""
  },
  "desire_mapping": {
    "primary_desire": "",
    "urgency": 0,
    "staying_power": 0,
    "scope": 0,
    "driving_force": "permanent or change",
    "surface_desire_voc": "",
    "deeper_desire": "",
    "core_desire": "",
    "competitor_desire_gap": "",
    "competing_desires": [],
    "lead_desire": "",
    "secondary_benefits": []
  },
  "awareness": {
    "stage": 0,
    "stage_label": "",
    "current_beliefs_voc": "",
    "knows_root_cause": false,
    "believes_solution_possible_voc": "",
    "state_of_mind": "",
    "headline_entry_point": ""
  },
  "sophistication": {
    "stage": 0,
    "stage_label": "",
    "claims_heard_voc": [],
    "mechanisms_introduced": [],
    "broken_promises_voc": [],
    "bold_claim_still_works": false,
    "strategy": ""
  },
  "psychological_elements": {
    "desires": {
      "surface_voc": "",
      "deeper": "",
      "core_voc": "",
      "urgency_triggers": []
    },
    "identifications": {
      "demographic_identity": "",
      "situational_identity": "",
      "aspirational_identity_voc": "",
      "tribal_identity": "",
      "shadow_identity_voc": "",
      "before_identity_voc": "",
      "after_identity_voc": "",
      "people_like_me_signals_voc": [],
      "repelling_identity_claims": [],
      "sees_self_as_buyer": ""
    },
    "beliefs": {
      "about_problem_voc": "",
      "about_solutions_voc": "",
      "about_category_voc": "",
      "about_self_voc": "",
      "about_deserving": "",
      "supporting_beliefs": [],
      "blocking_beliefs": [],
      "first_belief_to_change": "",
      "belief_change_sequence": []
    }
  },
  "pain_architecture": {
    "problem_in_her_words_voc": "",
    "onset_and_cause": "",
    "aware_of_root_cause": false,
    "her_word_for_it_voc": "",
    "mirror_moment_voc": "",
    "mirror_moment_details": "",
    "immediate_reaction": "",
    "duration": "",
    "accepted_as_permanent_voc": "",
    "getting_worse_or_numb": "",
    "coping_self_talk_voc": "",
    "primary_emotion_voc": "",
    "secondary_emotions": [],
    "self_perception_voc": "",
    "avoidance_behaviors_voc": [],
    "guilt_about_others": "",
    "physical_manifestations_voc": [],
    "daily_routine_impact_voc": "",
    "hiding_compensating_voc": "",
    "social_avoidance_voc": [],
    "talks_openly_or_silent": "",
    "what_others_say_voc": "",
    "feels_alone_or_validated": ""
  },
  "failed_solutions": {
    "tried_list_voc": [],
    "why_each_failed_voc": [],
    "money_spent": "",
    "time_spent": "",
    "failure_impact_on_self_belief_voc": "",
    "willingness_to_try_again_voc": "",
    "serial_skeptic_or_hopeful": "",
    "why_keeps_trying_voc": "",
    "instant_dismissal_triggers_voc": [],
    "what_feels_different_voc": ""
  },
  "enemy_construction": {
    "external_enemy_voc": "",
    "internal_enemy_voc": "",
    "specific_villains_voc": [],
    "felt_injustice_voc": "",
    "angrier_at_self_or_external": "",
    "validating_conspiracy": "",
    "betrayal_experience_voc": ""
  },
  "fear_mapping": {
    "fear_of_trying_again_voc": "",
    "fear_of_wasting_money_voc": "",
    "fear_of_judgment": "",
    "fear_of_being_sucker_voc": "",
    "fear_wont_work_for_me_voc": "",
    "fear_if_nothing_works_voc": "",
    "existential_fear": "",
    "worst_case_outcome": "",
    "nightmare_future_voc": ""
  },
  "desire_outcomes": {
    "immediate_7_day_voc": "",
    "visible_30_day_voc": "",
    "life_change_90_day_voc": "",
    "ultimate_dream_1_year_voc": "",
    "first_time_it_works_voc": "",
    "relationship_moment": "",
    "feeling_like_herself_voc": "",
    "primary_desire_type": ""
  },
  "forces_of_change": {
    "permanent_force": "",
    "force_of_change": "",
    "search_trigger": "",
    "timing_type": "",
    "cultural_urgency": ""
  },
  "language_and_voice": {
    "problem_words_voc": [],
    "outcome_words_voc": [],
    "failure_phrases_voc": [],
    "vocabulary_level": "",
    "humor_style": "",
    "gets_me_phrases_voc": [],
    "condescending_words_voc": [],
    "tuned_out_words_voc": [],
    "lowest_moment_self_talk_voc": "",
    "when_it_works_voc": ""
  },
  "proof_triggers": {
    "trusted_proof_types": [],
    "distrusted_proof_voc": [],
    "trusted_sources": [],
    "needs_mechanism_or_just_proof": "",
    "testimonial_must_say_voc": "",
    "proof_points_needed": "",
    "guarantee_language_voc": "",
    "scarcity_response": "",
    "research_or_emotion": ""
  },
  "market_competition": {
    "competitors_encountered": [],
    "claims_exposed_to": [],
    "mechanisms_explained": [],
    "tuned_out_tactics": [],
    "white_space": "",
    "genuinely_new_angle": ""
  }
}

CRITICAL RULES:
1. Use at least 10 different search queries — at least 6 MUST use site: operators targeting Amazon, Reddit, Trustpilot, Quora, or review sites
2. Every _voc field MUST be a direct quote or close paraphrase from a real consumer on a review/forum — NOT from a blog, article, or brand website
3. For array _voc fields, include 3-5 real quotes each, each from a different source
4. If a search returns mostly blogs/articles, REFINE the query with site: operators or add "forum" / "review" / "reddit" to the search
5. Be specific and concrete, never generic
6. Return ONLY the JSON object, no markdown, no code fences, no explanation text`;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspaceAccess();
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;
  const persona = await getPersonaById(id);
  if (!persona || persona.user_id !== ctx.session.userId) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const keys = await getWorkspaceApiKeys(ctx.workspaceId);
  const { product } = await req.json();

  // Mark as researching
  await updatePersonaResearch(id, "", "researching");

  const client = new Anthropic({ apiKey: keys.anthropicApiKey });

  const userPrompt = `PERSONA: ${persona.name} — ${persona.description}
${product ? `PRODUCT/BRAND: ${product}` : ""}

Research this persona using web search. You MUST prioritize real consumer voices from:
- Amazon reviews (use "site:amazon.com [product] review")
- Reddit threads (use "site:reddit.com [problem/topic]")
- Trustpilot reviews of competitor brands
- Quora questions (use "site:quora.com [problem]")
- Community forums: RealSelf, MakeupAlley, Gransnet, AgingCare, Patient.info, MumsNet

DO NOT pull quotes from blog posts, brand websites, or editorial health/beauty articles. I need the raw, unfiltered words of real people describing their own experiences — from reviews, forums, and Q&A sites only.

Search for their pain points, failed solutions, emotional triggers, fears, desires, and the language they use. Build the complete 14-section research dossier.`;

  try {
    // Use multi-turn to handle pause_turn stop reason
    let messages: Anthropic.MessageParam[] = [
      { role: "user", content: userPrompt },
    ];
    let finalResponse: Anthropic.Message | null = null;

    for (let turn = 0; turn < 5; turn++) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 16000,
        system: PERSONA_RESEARCH_PROMPT,
        messages,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 15,
          },
        ],
      });

      if (response.stop_reason === "pause_turn") {
        // Continue the conversation
        messages.push({ role: "assistant", content: response.content });
        messages.push({
          role: "user",
          content: "Continue your research and complete the full JSON dossier.",
        });
        continue;
      }

      finalResponse = response;
      break;
    }

    if (!finalResponse) {
      throw new Error("Research did not complete after maximum turns");
    }

    // Collect citations from all turns — web search results contain URLs
    const citations: { url: string; title: string }[] = [];
    for (const msg of messages) {
      if (msg.role !== "assistant" || !Array.isArray(msg.content)) continue;
      for (const block of msg.content) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const b = block as any;
        if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
          for (const r of b.content) {
            if (r.type === "web_search_result" && r.url) {
              citations.push({ url: r.url, title: r.title ?? "" });
            }
          }
        }
      }
    }
    // Also check the final response
    for (const block of finalResponse.content) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = block as any;
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const r of b.content) {
          if (r.type === "web_search_result" && r.url) {
            citations.push({ url: r.url, title: r.title ?? "" });
          }
        }
      }
    }

    // Deduplicate citations by URL
    const seen = new Set<string>();
    const uniqueCitations = citations.filter((c) => {
      if (seen.has(c.url)) return false;
      seen.add(c.url);
      return true;
    });

    // Extract the text content
    const textBlocks = finalResponse.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    const rawText = textBlocks.map((b) => b.text).join("\n\n");

    // Try to parse as JSON, attach sources
    let research: string;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        parsed._sources = uniqueCitations;
        parsed._search_count = uniqueCitations.length;
        research = JSON.stringify(parsed);
      } catch {
        research = rawText;
      }
    } else {
      research = rawText;
    }

    await updatePersonaResearch(id, research, "complete");

    return new Response(
      JSON.stringify({ success: true, research }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Persona research error:", err);
    await updatePersonaResearch(id, "", "failed");
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// GET — fetch existing research
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireWorkspaceAccess();
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;
  const persona = await getPersonaById(id);
  if (!persona || persona.user_id !== ctx.session.userId) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      research: persona.research,
      research_status: persona.research_status,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
