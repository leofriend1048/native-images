"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDownIcon, QuoteIcon, SearchIcon, Loader2, RefreshCwIcon, ExternalLinkIcon, GlobeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonaResearch {
  demographics: {
    age_range: string; gender: string; marital_status: string; life_stage: string;
    geography: string; household_income: string; employment: string; education: string; spending_style: string;
  };
  desire_mapping: {
    primary_desire: string; urgency: number; staying_power: number; scope: number;
    driving_force: string; surface_desire_voc: string; deeper_desire: string; core_desire: string;
    competitor_desire_gap: string; competing_desires: string[]; lead_desire: string; secondary_benefits: string[];
  };
  awareness: {
    stage: number; stage_label: string; current_beliefs_voc: string; knows_root_cause: boolean;
    believes_solution_possible_voc: string; state_of_mind: string; headline_entry_point: string;
  };
  sophistication: {
    stage: number; stage_label: string; claims_heard_voc: string[]; mechanisms_introduced: string[];
    broken_promises_voc: string[]; bold_claim_still_works: boolean; strategy: string;
  };
  psychological_elements: {
    desires: { surface_voc: string; deeper: string; core_voc: string; urgency_triggers: string[]; };
    identifications: {
      demographic_identity: string; situational_identity: string; aspirational_identity_voc: string;
      tribal_identity: string; shadow_identity_voc: string; before_identity_voc: string;
      after_identity_voc: string; people_like_me_signals_voc: string[];
      repelling_identity_claims: string[]; sees_self_as_buyer: string;
    };
    beliefs: {
      about_problem_voc: string; about_solutions_voc: string; about_category_voc: string;
      about_self_voc: string; about_deserving: string; supporting_beliefs: string[];
      blocking_beliefs: string[]; first_belief_to_change: string; belief_change_sequence: string[];
    };
  };
  pain_architecture: {
    problem_in_her_words_voc: string; onset_and_cause: string; aware_of_root_cause: boolean;
    her_word_for_it_voc: string; mirror_moment_voc: string; mirror_moment_details: string;
    immediate_reaction: string; duration: string; accepted_as_permanent_voc: string;
    getting_worse_or_numb: string; coping_self_talk_voc: string; primary_emotion_voc: string;
    secondary_emotions: string[]; self_perception_voc: string; avoidance_behaviors_voc: string[];
    guilt_about_others: string; physical_manifestations_voc: string[];
    daily_routine_impact_voc: string; hiding_compensating_voc: string;
    social_avoidance_voc: string[]; talks_openly_or_silent: string;
    what_others_say_voc: string; feels_alone_or_validated: string;
  };
  failed_solutions: {
    tried_list_voc: string[]; why_each_failed_voc: string[]; money_spent: string;
    time_spent: string; failure_impact_on_self_belief_voc: string;
    willingness_to_try_again_voc: string; serial_skeptic_or_hopeful: string;
    why_keeps_trying_voc: string; instant_dismissal_triggers_voc: string[];
    what_feels_different_voc: string;
  };
  enemy_construction: {
    external_enemy_voc: string; internal_enemy_voc: string; specific_villains_voc: string[];
    felt_injustice_voc: string; angrier_at_self_or_external: string;
    validating_conspiracy: string; betrayal_experience_voc: string;
  };
  fear_mapping: {
    fear_of_trying_again_voc: string; fear_of_wasting_money_voc: string; fear_of_judgment: string;
    fear_of_being_sucker_voc: string; fear_wont_work_for_me_voc: string;
    fear_if_nothing_works_voc: string; existential_fear: string;
    worst_case_outcome: string; nightmare_future_voc: string;
  };
  desire_outcomes: {
    immediate_7_day_voc: string; visible_30_day_voc: string; life_change_90_day_voc: string;
    ultimate_dream_1_year_voc: string; first_time_it_works_voc: string;
    relationship_moment: string; feeling_like_herself_voc: string; primary_desire_type: string;
  };
  forces_of_change: {
    permanent_force: string; force_of_change: string; search_trigger: string;
    timing_type: string; cultural_urgency: string;
  };
  language_and_voice: {
    problem_words_voc: string[]; outcome_words_voc: string[]; failure_phrases_voc: string[];
    vocabulary_level: string; humor_style: string; gets_me_phrases_voc: string[];
    condescending_words_voc: string[]; tuned_out_words_voc: string[];
    lowest_moment_self_talk_voc: string; when_it_works_voc: string;
  };
  proof_triggers: {
    trusted_proof_types: string[]; distrusted_proof_voc: string[]; trusted_sources: string[];
    needs_mechanism_or_just_proof: string; testimonial_must_say_voc: string;
    proof_points_needed: string; guarantee_language_voc: string;
    scarcity_response: string; research_or_emotion: string;
  };
  market_competition: {
    competitors_encountered: string[]; claims_exposed_to: string[];
    mechanisms_explained: string[]; tuned_out_tactics: string[];
    white_space: string; genuinely_new_angle: string;
  };
  _sources?: { url: string; title: string }[];
  _search_count?: number;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function PullQuote({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="relative pl-4 py-1">
      <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full bg-foreground/10" />
      <p className="text-[13px] italic text-foreground/65 leading-[1.7]">{text}</p>
    </div>
  );
}

function QuoteStack({ items, label }: { items: string[]; label?: string }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      {items.filter(Boolean).map((item, i) => (
        <PullQuote key={i} text={item} />
      ))}
    </div>
  );
}

function Datum({ label, value }: { label: string; value: string | number | boolean | undefined }) {
  if (value === undefined || value === null || value === "") return null;
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <div>
      <Label>{label}</Label>
      <p className="text-[13px] text-foreground/80 leading-relaxed mt-0.5">{display}</p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/40">
      {children}
    </span>
  );
}

function Meter({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-muted-foreground/50 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-[5px] rounded-full bg-foreground/[0.05] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="h-full rounded-full bg-foreground/50"
        />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground/40 w-5 text-right">{value}</span>
    </div>
  );
}

function Stage({ stage, label }: { stage: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-[3px]">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`w-6 h-[5px] rounded-full transition-colors ${
              s <= stage ? "bg-foreground/50" : "bg-foreground/[0.05]"
            }`}
          />
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground/50">{label}</span>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  title,
  number,
  children,
  defaultOpen = false,
}: {
  title: string;
  number: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 py-5 text-left group"
      >
        <span className="text-[11px] tabular-nums text-muted-foreground/30 w-5 text-right shrink-0 group-hover:text-muted-foreground/50 transition-colors">
          {String(number).padStart(2, "0")}
        </span>
        <span className="text-sm font-medium text-foreground/80 flex-1 group-hover:text-foreground transition-colors">
          {title}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-muted-foreground/25 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-8 pl-9 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

export function PersonaResearchSkeleton() {
  return (
    <div className="space-y-8 py-4">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground/60">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Researching — scanning reviews, forums, and social media...</span>
      </div>
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Report ──────────────────────────────────────────────────────────────

export function PersonaResearchReport({
  research,
  status,
  onRegenerate,
}: {
  research: string | null;
  status: string;
  onRegenerate?: () => void;
}) {
  if (status === "researching") return <PersonaResearchSkeleton />;

  if (status === "failed") {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <p className="text-sm text-foreground/60">Research failed</p>
        <p className="text-xs text-muted-foreground/40 mt-1">Something went wrong during the research process</p>
        {onRegenerate && (
          <Button variant="outline" size="sm" className="mt-5 gap-1.5 text-xs" onClick={onRegenerate}>
            <RefreshCwIcon className="h-3 w-3" />
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (!research || status === "none") {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <p className="text-sm text-foreground/60">No research yet</p>
        <p className="text-xs text-muted-foreground/40 mt-1">Generate a research report to understand this persona</p>
        {onRegenerate && (
          <Button variant="outline" size="sm" className="mt-5 gap-1.5 text-xs" onClick={onRegenerate}>
            <SearchIcon className="h-3 w-3" />
            Generate research
          </Button>
        )}
      </div>
    );
  }

  let data: PersonaResearch;
  try {
    data = JSON.parse(research);
  } catch {
    return (
      <div className="space-y-4">
        <Label>Research Report</Label>
        <div className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{research}</div>
      </div>
    );
  }

  return (
    <div>
      {/* 01 Demographics */}
      <Section title="Demographics" number={1} defaultOpen>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
          <Datum label="Age" value={data.demographics?.age_range} />
          <Datum label="Gender" value={data.demographics?.gender} />
          <Datum label="Marital Status" value={data.demographics?.marital_status} />
          <Datum label="Life Stage" value={data.demographics?.life_stage} />
          <Datum label="Geography" value={data.demographics?.geography} />
          <Datum label="Income" value={data.demographics?.household_income} />
          <Datum label="Employment" value={data.demographics?.employment} />
          <Datum label="Spending Style" value={data.demographics?.spending_style} />
        </div>
      </Section>

      {/* 02 Desire Mapping */}
      <Section title="Desire Mapping" number={2}>
        <Datum label="Primary Desire" value={data.desire_mapping?.primary_desire} />
        <div className="space-y-2 pt-1">
          <Meter label="Urgency" value={data.desire_mapping?.urgency ?? 0} />
          <Meter label="Staying Power" value={data.desire_mapping?.staying_power ?? 0} />
          <Meter label="Scope" value={data.desire_mapping?.scope ?? 0} />
        </div>
        <Datum label="Driving Force" value={data.desire_mapping?.driving_force} />
        <PullQuote text={data.desire_mapping?.surface_desire_voc} />
        <Datum label="Deeper Desire" value={data.desire_mapping?.deeper_desire} />
        <Datum label="Core Desire" value={data.desire_mapping?.core_desire} />
        <Datum label="Competitor Gap" value={data.desire_mapping?.competitor_desire_gap} />
      </Section>

      {/* 03 Awareness */}
      <Section title="Awareness Mapping" number={3}>
        <Stage stage={data.awareness?.stage ?? 0} label={data.awareness?.stage_label ?? ""} />
        <PullQuote text={data.awareness?.current_beliefs_voc} />
        <Datum label="Knows Root Cause" value={data.awareness?.knows_root_cause} />
        <PullQuote text={data.awareness?.believes_solution_possible_voc} />
        <Datum label="State of Mind" value={data.awareness?.state_of_mind} />
        <Datum label="Entry Point" value={data.awareness?.headline_entry_point} />
      </Section>

      {/* 04 Sophistication */}
      <Section title="Sophistication Mapping" number={4}>
        <Stage stage={data.sophistication?.stage ?? 0} label={data.sophistication?.stage_label ?? ""} />
        <QuoteStack items={data.sophistication?.claims_heard_voc} label="Claims Heard" />
        <QuoteStack items={data.sophistication?.broken_promises_voc} label="Broken Promises" />
        <Datum label="Bold Claim Works" value={data.sophistication?.bold_claim_still_works} />
        <Datum label="Strategy" value={data.sophistication?.strategy} />
      </Section>

      {/* 05 Psychological Elements */}
      <Section title="Psychological Elements" number={5}>
        <Label>Desires</Label>
        <PullQuote text={data.psychological_elements?.desires?.surface_voc} />
        <Datum label="Deeper" value={data.psychological_elements?.desires?.deeper} />
        <PullQuote text={data.psychological_elements?.desires?.core_voc} />

        <div className="pt-2"><Label>Identity</Label></div>
        <PullQuote text={data.psychological_elements?.identifications?.aspirational_identity_voc} />
        <PullQuote text={data.psychological_elements?.identifications?.shadow_identity_voc} />
        <PullQuote text={data.psychological_elements?.identifications?.before_identity_voc} />
        <PullQuote text={data.psychological_elements?.identifications?.after_identity_voc} />
        <QuoteStack items={data.psychological_elements?.identifications?.people_like_me_signals_voc} label="&ldquo;People Like Me&rdquo; Signals" />

        <div className="pt-2"><Label>Beliefs</Label></div>
        <PullQuote text={data.psychological_elements?.beliefs?.about_problem_voc} />
        <PullQuote text={data.psychological_elements?.beliefs?.about_solutions_voc} />
        <PullQuote text={data.psychological_elements?.beliefs?.about_self_voc} />
        <Datum label="First Belief to Change" value={data.psychological_elements?.beliefs?.first_belief_to_change} />
      </Section>

      {/* 06 Pain Architecture */}
      <Section title="Pain Architecture" number={6} defaultOpen>
        <PullQuote text={data.pain_architecture?.problem_in_her_words_voc} />
        <PullQuote text={data.pain_architecture?.her_word_for_it_voc} />
        <PullQuote text={data.pain_architecture?.mirror_moment_voc} />
        <Datum label="Mirror Moment" value={data.pain_architecture?.mirror_moment_details} />
        <PullQuote text={data.pain_architecture?.coping_self_talk_voc} />
        <PullQuote text={data.pain_architecture?.primary_emotion_voc} />
        <PullQuote text={data.pain_architecture?.self_perception_voc} />
        <QuoteStack items={data.pain_architecture?.avoidance_behaviors_voc} label="Avoidance" />
        <QuoteStack items={data.pain_architecture?.physical_manifestations_voc} label="Physical Signs" />
        <QuoteStack items={data.pain_architecture?.social_avoidance_voc} label="Social Avoidance" />
      </Section>

      {/* 07 Failed Solutions */}
      <Section title="Failed Solutions" number={7}>
        <QuoteStack items={data.failed_solutions?.tried_list_voc} label="Tried" />
        <QuoteStack items={data.failed_solutions?.why_each_failed_voc} label="Why They Failed" />
        <Datum label="Money Spent" value={data.failed_solutions?.money_spent} />
        <PullQuote text={data.failed_solutions?.failure_impact_on_self_belief_voc} />
        <PullQuote text={data.failed_solutions?.willingness_to_try_again_voc} />
        <QuoteStack items={data.failed_solutions?.instant_dismissal_triggers_voc} label="Instant Dismissals" />
        <PullQuote text={data.failed_solutions?.what_feels_different_voc} />
      </Section>

      {/* 08 Enemy Construction */}
      <Section title="Enemy Construction" number={8}>
        <PullQuote text={data.enemy_construction?.external_enemy_voc} />
        <PullQuote text={data.enemy_construction?.internal_enemy_voc} />
        <QuoteStack items={data.enemy_construction?.specific_villains_voc} label="Villains" />
        <PullQuote text={data.enemy_construction?.felt_injustice_voc} />
        <PullQuote text={data.enemy_construction?.betrayal_experience_voc} />
      </Section>

      {/* 09 Fear Mapping */}
      <Section title="Deep Fear Mapping" number={9}>
        <PullQuote text={data.fear_mapping?.fear_of_trying_again_voc} />
        <PullQuote text={data.fear_mapping?.fear_of_wasting_money_voc} />
        <PullQuote text={data.fear_mapping?.fear_of_being_sucker_voc} />
        <PullQuote text={data.fear_mapping?.fear_wont_work_for_me_voc} />
        <PullQuote text={data.fear_mapping?.fear_if_nothing_works_voc} />
        <Datum label="Existential Fear" value={data.fear_mapping?.existential_fear} />
        <PullQuote text={data.fear_mapping?.nightmare_future_voc} />
      </Section>

      {/* 10 Desired Outcomes */}
      <Section title="Desired Outcomes" number={10}>
        <PullQuote text={data.desire_outcomes?.immediate_7_day_voc} />
        <PullQuote text={data.desire_outcomes?.visible_30_day_voc} />
        <PullQuote text={data.desire_outcomes?.life_change_90_day_voc} />
        <PullQuote text={data.desire_outcomes?.ultimate_dream_1_year_voc} />
        <PullQuote text={data.desire_outcomes?.first_time_it_works_voc} />
        <PullQuote text={data.desire_outcomes?.feeling_like_herself_voc} />
        <Datum label="Desire Type" value={data.desire_outcomes?.primary_desire_type} />
      </Section>

      {/* 11 Forces of Change */}
      <Section title="Forces of Change" number={11}>
        <Datum label="Permanent Force" value={data.forces_of_change?.permanent_force} />
        <Datum label="Force of Change" value={data.forces_of_change?.force_of_change} />
        <Datum label="Search Trigger" value={data.forces_of_change?.search_trigger} />
        <Datum label="Timing" value={data.forces_of_change?.timing_type} />
        <Datum label="Cultural Urgency" value={data.forces_of_change?.cultural_urgency} />
      </Section>

      {/* 12 Language & Voice */}
      <Section title="Language & Voice" number={12} defaultOpen>
        <QuoteStack items={data.language_and_voice?.problem_words_voc} label="Problem Words" />
        <QuoteStack items={data.language_and_voice?.outcome_words_voc} label="Outcome Words" />
        <QuoteStack items={data.language_and_voice?.failure_phrases_voc} label="Failure Phrases" />
        <QuoteStack items={data.language_and_voice?.gets_me_phrases_voc} label="&ldquo;Gets Me&rdquo; Phrases" />
        <QuoteStack items={data.language_and_voice?.condescending_words_voc} label="Condescending Words" />
        <QuoteStack items={data.language_and_voice?.tuned_out_words_voc} label="Tuned-Out Words" />
        <PullQuote text={data.language_and_voice?.lowest_moment_self_talk_voc} />
        <PullQuote text={data.language_and_voice?.when_it_works_voc} />
      </Section>

      {/* 13 Proof & Persuasion */}
      <Section title="Proof & Persuasion" number={13}>
        <Datum label="Trusted Proof" value={data.proof_triggers?.trusted_proof_types?.join(", ")} />
        <QuoteStack items={data.proof_triggers?.distrusted_proof_voc} label="Distrusted" />
        <Datum label="Trusted Sources" value={data.proof_triggers?.trusted_sources?.join(", ")} />
        <PullQuote text={data.proof_triggers?.testimonial_must_say_voc} />
        <PullQuote text={data.proof_triggers?.guarantee_language_voc} />
        <Datum label="Decision Style" value={data.proof_triggers?.research_or_emotion} />
      </Section>

      {/* 14 Market Competition */}
      <Section title="Market Competition" number={14}>
        <Datum label="Competitors" value={data.market_competition?.competitors_encountered?.join(", ")} />
        <Datum label="Claims Exposed To" value={data.market_competition?.claims_exposed_to?.join(", ")} />
        <Datum label="Tuned Out" value={data.market_competition?.tuned_out_tactics?.join(", ")} />
        <Datum label="White Space" value={data.market_competition?.white_space} />
        <Datum label="New Angle" value={data.market_competition?.genuinely_new_angle} />
      </Section>

      {/* Sources */}
      {data._sources && data._sources.length > 0 && (
        <div className="pt-8 mt-4 border-t border-border/30">
          <div className="flex items-center gap-2 mb-4">
            <GlobeIcon className="h-3.5 w-3.5 text-muted-foreground/30" />
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/40">
              Sources ({data._sources.length})
            </span>
          </div>
          <div className="columns-1 sm:columns-2 gap-6">
            {data._sources.map((src, i) => {
              let domain = "";
              try { domain = new URL(src.url).hostname.replace("www.", ""); } catch {}
              return (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 py-1.5 break-inside-avoid group"
                >
                  <span className="text-[10px] tabular-nums text-muted-foreground/25 mt-px w-4 shrink-0 text-right">
                    {i + 1}
                  </span>
                  <span className="text-[12px] text-muted-foreground/50 group-hover:text-foreground/70 transition-colors leading-snug truncate">
                    {src.title || domain}
                  </span>
                  <ExternalLinkIcon className="h-3 w-3 text-muted-foreground/20 shrink-0 mt-px opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
