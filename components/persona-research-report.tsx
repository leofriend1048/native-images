"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDownIcon, QuoteIcon, SearchIcon, Loader2, RefreshCwIcon, ExternalLinkIcon, GlobeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonaResearch {
  demographics: {
    age_range: string;
    gender: string;
    marital_status: string;
    life_stage: string;
    geography: string;
    household_income: string;
    employment: string;
    education: string;
    spending_style: string;
  };
  desire_mapping: {
    primary_desire: string;
    urgency: number;
    staying_power: number;
    scope: number;
    driving_force: string;
    surface_desire_voc: string;
    deeper_desire: string;
    core_desire: string;
    competitor_desire_gap: string;
    competing_desires: string[];
    lead_desire: string;
    secondary_benefits: string[];
  };
  awareness: {
    stage: number;
    stage_label: string;
    current_beliefs_voc: string;
    knows_root_cause: boolean;
    believes_solution_possible_voc: string;
    state_of_mind: string;
    headline_entry_point: string;
  };
  sophistication: {
    stage: number;
    stage_label: string;
    claims_heard_voc: string[];
    mechanisms_introduced: string[];
    broken_promises_voc: string[];
    bold_claim_still_works: boolean;
    strategy: string;
  };
  psychological_elements: {
    desires: {
      surface_voc: string;
      deeper: string;
      core_voc: string;
      urgency_triggers: string[];
    };
    identifications: {
      demographic_identity: string;
      situational_identity: string;
      aspirational_identity_voc: string;
      tribal_identity: string;
      shadow_identity_voc: string;
      before_identity_voc: string;
      after_identity_voc: string;
      people_like_me_signals_voc: string[];
      repelling_identity_claims: string[];
      sees_self_as_buyer: string;
    };
    beliefs: {
      about_problem_voc: string;
      about_solutions_voc: string;
      about_category_voc: string;
      about_self_voc: string;
      about_deserving: string;
      supporting_beliefs: string[];
      blocking_beliefs: string[];
      first_belief_to_change: string;
      belief_change_sequence: string[];
    };
  };
  pain_architecture: {
    problem_in_her_words_voc: string;
    onset_and_cause: string;
    aware_of_root_cause: boolean;
    her_word_for_it_voc: string;
    mirror_moment_voc: string;
    mirror_moment_details: string;
    immediate_reaction: string;
    duration: string;
    accepted_as_permanent_voc: string;
    getting_worse_or_numb: string;
    coping_self_talk_voc: string;
    primary_emotion_voc: string;
    secondary_emotions: string[];
    self_perception_voc: string;
    avoidance_behaviors_voc: string[];
    guilt_about_others: string;
    physical_manifestations_voc: string[];
    daily_routine_impact_voc: string;
    hiding_compensating_voc: string;
    social_avoidance_voc: string[];
    talks_openly_or_silent: string;
    what_others_say_voc: string;
    feels_alone_or_validated: string;
  };
  failed_solutions: {
    tried_list_voc: string[];
    why_each_failed_voc: string[];
    money_spent: string;
    time_spent: string;
    failure_impact_on_self_belief_voc: string;
    willingness_to_try_again_voc: string;
    serial_skeptic_or_hopeful: string;
    why_keeps_trying_voc: string;
    instant_dismissal_triggers_voc: string[];
    what_feels_different_voc: string;
  };
  enemy_construction: {
    external_enemy_voc: string;
    internal_enemy_voc: string;
    specific_villains_voc: string[];
    felt_injustice_voc: string;
    angrier_at_self_or_external: string;
    validating_conspiracy: string;
    betrayal_experience_voc: string;
  };
  fear_mapping: {
    fear_of_trying_again_voc: string;
    fear_of_wasting_money_voc: string;
    fear_of_judgment: string;
    fear_of_being_sucker_voc: string;
    fear_wont_work_for_me_voc: string;
    fear_if_nothing_works_voc: string;
    existential_fear: string;
    worst_case_outcome: string;
    nightmare_future_voc: string;
  };
  desire_outcomes: {
    immediate_7_day_voc: string;
    visible_30_day_voc: string;
    life_change_90_day_voc: string;
    ultimate_dream_1_year_voc: string;
    first_time_it_works_voc: string;
    relationship_moment: string;
    feeling_like_herself_voc: string;
    primary_desire_type: string;
  };
  forces_of_change: {
    permanent_force: string;
    force_of_change: string;
    search_trigger: string;
    timing_type: string;
    cultural_urgency: string;
  };
  language_and_voice: {
    problem_words_voc: string[];
    outcome_words_voc: string[];
    failure_phrases_voc: string[];
    vocabulary_level: string;
    humor_style: string;
    gets_me_phrases_voc: string[];
    condescending_words_voc: string[];
    tuned_out_words_voc: string[];
    lowest_moment_self_talk_voc: string;
    when_it_works_voc: string;
  };
  proof_triggers: {
    trusted_proof_types: string[];
    distrusted_proof_voc: string[];
    trusted_sources: string[];
    needs_mechanism_or_just_proof: string;
    testimonial_must_say_voc: string;
    proof_points_needed: string;
    guarantee_language_voc: string;
    scarcity_response: string;
    research_or_emotion: string;
  };
  market_competition: {
    competitors_encountered: string[];
    claims_exposed_to: string[];
    mechanisms_explained: string[];
    tuned_out_tactics: string[];
    white_space: string;
    genuinely_new_angle: string;
  };
  _sources?: { url: string; title: string }[];
  _search_count?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function VOCQuote({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="flex gap-2.5 py-2 px-3 rounded-lg bg-amber-500/[0.04] border border-amber-500/10">
      <QuoteIcon className="h-3 w-3 mt-0.5 shrink-0 text-amber-500/50" />
      <p className="text-[13px] italic text-foreground/75 leading-relaxed">{text}</p>
    </div>
  );
}

function VOCList({ items, label }: { items: string[]; label?: string }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-1.5">
      {label && <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">{label}</span>}
      {items.map((item, i) => (
        <VOCQuote key={i} text={item} />
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | boolean | undefined }) {
  if (value === undefined || value === null || value === "") return null;
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">{label}</span>
      <span className="text-[13px] text-foreground/85 leading-relaxed">{display}</span>
    </div>
  );
}

function ScoreBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-foreground/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full bg-foreground/60"
        />
      </div>
      <span className="text-xs tabular-nums font-medium text-foreground/50 w-6 text-right">{value}</span>
    </div>
  );
}

function StageIndicator({ stage, label }: { stage: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <motion.div
            key={s}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: s * 0.05, duration: 0.2 }}
            className={`w-7 h-1.5 rounded-full transition-colors ${
              s <= stage ? "bg-foreground/60" : "bg-foreground/[0.06]"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-foreground/60 font-medium">{label}</span>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-semibold pt-2 pb-0.5">{children}</p>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

const SECTION_COLORS: Record<number, string> = {
  1: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  2: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  3: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  4: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  5: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  6: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  7: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  8: "bg-red-500/10 text-red-600 dark:text-red-400",
  9: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  10: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  11: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  12: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  13: "bg-lime-500/10 text-lime-700 dark:text-lime-400",
  14: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

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
  const colorClass = SECTION_COLORS[number] || "bg-foreground/10 text-foreground/60";

  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 py-4 text-left hover:bg-accent/20 transition-colors rounded-lg px-2 -mx-2"
      >
        <span className={`flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold shrink-0 ${colorClass}`}>
          {number}
        </span>
        <span className="text-sm font-medium text-foreground/85 flex-1">{title}</span>
        <ChevronDownIcon className={`h-4 w-4 text-muted-foreground/40 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
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
            <div className="pb-5 px-1 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

export function PersonaResearchSkeleton() {
  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Researching persona — searching reviews, forums, social media...</span>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-12 w-full rounded-lg" />
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
  if (status === "researching") {
    return <PersonaResearchSkeleton />;
  }

  if (status === "failed") {
    return (
      <div className="py-16 flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
          <SearchIcon className="h-4 w-4 text-destructive" />
        </div>
        <p className="text-sm font-medium text-foreground/70">Research failed</p>
        <p className="text-xs text-muted-foreground mt-1">Something went wrong during the research process</p>
        {onRegenerate && (
          <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onRegenerate}>
            <RefreshCwIcon className="h-3 w-3" />
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (!research || status === "none") {
    return (
      <div className="py-16 flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-xl bg-foreground/[0.03] border border-border/60 flex items-center justify-center mb-3">
          <SearchIcon className="h-4 w-4 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-foreground/70">No research yet</p>
        <p className="text-xs text-muted-foreground mt-1">Generate a research report to understand this persona</p>
        {onRegenerate && (
          <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onRegenerate}>
            <SearchIcon className="h-3 w-3" />
            Generate research
          </Button>
        )}
      </div>
    );
  }

  // Parse the research JSON
  let data: PersonaResearch;
  try {
    data = JSON.parse(research);
  } catch {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Research Report</p>
          {onRegenerate && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onRegenerate}>Regenerate</Button>
          )}
        </div>
        <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{research}</div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Section 1: Demographics */}
      <Section title="Demographics" number={1} defaultOpen>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
          <Field label="Age" value={data.demographics?.age_range} />
          <Field label="Gender" value={data.demographics?.gender} />
          <Field label="Marital Status" value={data.demographics?.marital_status} />
          <Field label="Life Stage" value={data.demographics?.life_stage} />
          <Field label="Geography" value={data.demographics?.geography} />
          <Field label="Income" value={data.demographics?.household_income} />
          <Field label="Employment" value={data.demographics?.employment} />
          <Field label="Spending Style" value={data.demographics?.spending_style} />
        </div>
      </Section>

      {/* Section 2: Desire Mapping */}
      <Section title="Desire Mapping" number={2}>
        <Field label="Primary Desire" value={data.desire_mapping?.primary_desire} />
        <div className="space-y-2 pt-2">
          <ScoreBar label="Urgency" value={data.desire_mapping?.urgency ?? 0} />
          <ScoreBar label="Staying Power" value={data.desire_mapping?.staying_power ?? 0} />
          <ScoreBar label="Scope" value={data.desire_mapping?.scope ?? 0} />
        </div>
        <Field label="Driving Force" value={data.desire_mapping?.driving_force} />
        <VOCQuote text={data.desire_mapping?.surface_desire_voc} />
        <Field label="Deeper Desire" value={data.desire_mapping?.deeper_desire} />
        <Field label="Core Desire" value={data.desire_mapping?.core_desire} />
        <Field label="Competitor Gap" value={data.desire_mapping?.competitor_desire_gap} />
      </Section>

      {/* Section 3: Awareness */}
      <Section title="Awareness Mapping" number={3}>
        <StageIndicator stage={data.awareness?.stage ?? 0} label={data.awareness?.stage_label ?? ""} />
        <VOCQuote text={data.awareness?.current_beliefs_voc} />
        <Field label="Knows Root Cause" value={data.awareness?.knows_root_cause} />
        <VOCQuote text={data.awareness?.believes_solution_possible_voc} />
        <Field label="State of Mind" value={data.awareness?.state_of_mind} />
        <Field label="Entry Point" value={data.awareness?.headline_entry_point} />
      </Section>

      {/* Section 4: Sophistication */}
      <Section title="Sophistication Mapping" number={4}>
        <StageIndicator stage={data.sophistication?.stage ?? 0} label={data.sophistication?.stage_label ?? ""} />
        <VOCList items={data.sophistication?.claims_heard_voc} label="Claims heard" />
        <VOCList items={data.sophistication?.broken_promises_voc} label="Broken promises" />
        <Field label="Bold Claim Works" value={data.sophistication?.bold_claim_still_works} />
        <Field label="Strategy" value={data.sophistication?.strategy} />
      </Section>

      {/* Section 5: Psychological Elements */}
      <Section title="Psychological Elements" number={5}>
        <SubHeading>Desires</SubHeading>
        <VOCQuote text={data.psychological_elements?.desires?.surface_voc} />
        <Field label="Deeper" value={data.psychological_elements?.desires?.deeper} />
        <VOCQuote text={data.psychological_elements?.desires?.core_voc} />

        <SubHeading>Identity</SubHeading>
        <VOCQuote text={data.psychological_elements?.identifications?.aspirational_identity_voc} />
        <VOCQuote text={data.psychological_elements?.identifications?.shadow_identity_voc} />
        <VOCQuote text={data.psychological_elements?.identifications?.before_identity_voc} />
        <VOCQuote text={data.psychological_elements?.identifications?.after_identity_voc} />
        <VOCList items={data.psychological_elements?.identifications?.people_like_me_signals_voc} label="&quot;People like me&quot; signals" />

        <SubHeading>Beliefs</SubHeading>
        <VOCQuote text={data.psychological_elements?.beliefs?.about_problem_voc} />
        <VOCQuote text={data.psychological_elements?.beliefs?.about_solutions_voc} />
        <VOCQuote text={data.psychological_elements?.beliefs?.about_self_voc} />
        <Field label="First Belief to Change" value={data.psychological_elements?.beliefs?.first_belief_to_change} />
      </Section>

      {/* Section 6: Pain Architecture */}
      <Section title="Pain Architecture" number={6} defaultOpen>
        <VOCQuote text={data.pain_architecture?.problem_in_her_words_voc} />
        <VOCQuote text={data.pain_architecture?.her_word_for_it_voc} />
        <VOCQuote text={data.pain_architecture?.mirror_moment_voc} />
        <Field label="Mirror Moment Details" value={data.pain_architecture?.mirror_moment_details} />
        <VOCQuote text={data.pain_architecture?.coping_self_talk_voc} />
        <VOCQuote text={data.pain_architecture?.primary_emotion_voc} />
        <VOCQuote text={data.pain_architecture?.self_perception_voc} />
        <VOCList items={data.pain_architecture?.avoidance_behaviors_voc} label="Avoidance behaviors" />
        <VOCList items={data.pain_architecture?.physical_manifestations_voc} label="Physical manifestations" />
        <VOCList items={data.pain_architecture?.social_avoidance_voc} label="Social avoidance" />
      </Section>

      {/* Section 7: Failed Solutions */}
      <Section title="Failed Solutions History" number={7}>
        <VOCList items={data.failed_solutions?.tried_list_voc} label="Tried" />
        <VOCList items={data.failed_solutions?.why_each_failed_voc} label="Why they failed" />
        <Field label="Money Spent" value={data.failed_solutions?.money_spent} />
        <VOCQuote text={data.failed_solutions?.failure_impact_on_self_belief_voc} />
        <VOCQuote text={data.failed_solutions?.willingness_to_try_again_voc} />
        <VOCList items={data.failed_solutions?.instant_dismissal_triggers_voc} label="Instant dismissal triggers" />
        <VOCQuote text={data.failed_solutions?.what_feels_different_voc} />
      </Section>

      {/* Section 8: Enemy Construction */}
      <Section title="Enemy Construction" number={8}>
        <VOCQuote text={data.enemy_construction?.external_enemy_voc} />
        <VOCQuote text={data.enemy_construction?.internal_enemy_voc} />
        <VOCList items={data.enemy_construction?.specific_villains_voc} label="Specific villains" />
        <VOCQuote text={data.enemy_construction?.felt_injustice_voc} />
        <VOCQuote text={data.enemy_construction?.betrayal_experience_voc} />
      </Section>

      {/* Section 9: Fear Mapping */}
      <Section title="Deep Fear Mapping" number={9}>
        <VOCQuote text={data.fear_mapping?.fear_of_trying_again_voc} />
        <VOCQuote text={data.fear_mapping?.fear_of_wasting_money_voc} />
        <VOCQuote text={data.fear_mapping?.fear_of_being_sucker_voc} />
        <VOCQuote text={data.fear_mapping?.fear_wont_work_for_me_voc} />
        <VOCQuote text={data.fear_mapping?.fear_if_nothing_works_voc} />
        <Field label="Existential Fear" value={data.fear_mapping?.existential_fear} />
        <VOCQuote text={data.fear_mapping?.nightmare_future_voc} />
      </Section>

      {/* Section 10: Desire Outcomes */}
      <Section title="Desired Outcomes" number={10}>
        <VOCQuote text={data.desire_outcomes?.immediate_7_day_voc} />
        <VOCQuote text={data.desire_outcomes?.visible_30_day_voc} />
        <VOCQuote text={data.desire_outcomes?.life_change_90_day_voc} />
        <VOCQuote text={data.desire_outcomes?.ultimate_dream_1_year_voc} />
        <VOCQuote text={data.desire_outcomes?.first_time_it_works_voc} />
        <VOCQuote text={data.desire_outcomes?.feeling_like_herself_voc} />
        <Field label="Desire Type" value={data.desire_outcomes?.primary_desire_type} />
      </Section>

      {/* Section 11: Forces of Change */}
      <Section title="Forces of Change" number={11}>
        <Field label="Permanent Force" value={data.forces_of_change?.permanent_force} />
        <Field label="Force of Change" value={data.forces_of_change?.force_of_change} />
        <Field label="Search Trigger" value={data.forces_of_change?.search_trigger} />
        <Field label="Timing" value={data.forces_of_change?.timing_type} />
        <Field label="Cultural Urgency" value={data.forces_of_change?.cultural_urgency} />
      </Section>

      {/* Section 12: Language and Voice */}
      <Section title="Language & Voice" number={12} defaultOpen>
        <VOCList items={data.language_and_voice?.problem_words_voc} label="Problem words" />
        <VOCList items={data.language_and_voice?.outcome_words_voc} label="Outcome words" />
        <VOCList items={data.language_and_voice?.failure_phrases_voc} label="Failure phrases" />
        <VOCList items={data.language_and_voice?.gets_me_phrases_voc} label="&quot;Gets me&quot; phrases" />
        <VOCList items={data.language_and_voice?.condescending_words_voc} label="Condescending words" />
        <VOCList items={data.language_and_voice?.tuned_out_words_voc} label="Tuned-out words" />
        <VOCQuote text={data.language_and_voice?.lowest_moment_self_talk_voc} />
        <VOCQuote text={data.language_and_voice?.when_it_works_voc} />
      </Section>

      {/* Section 13: Proof Triggers */}
      <Section title="Proof & Persuasion" number={13}>
        <Field label="Trusted Proof" value={data.proof_triggers?.trusted_proof_types?.join(", ")} />
        <VOCList items={data.proof_triggers?.distrusted_proof_voc} label="Distrusted proof" />
        <Field label="Trusted Sources" value={data.proof_triggers?.trusted_sources?.join(", ")} />
        <VOCQuote text={data.proof_triggers?.testimonial_must_say_voc} />
        <VOCQuote text={data.proof_triggers?.guarantee_language_voc} />
        <Field label="Decision Style" value={data.proof_triggers?.research_or_emotion} />
      </Section>

      {/* Section 14: Market Competition */}
      <Section title="Market Competition" number={14}>
        <Field label="Competitors" value={data.market_competition?.competitors_encountered?.join(", ")} />
        <Field label="Claims Exposed To" value={data.market_competition?.claims_exposed_to?.join(", ")} />
        <Field label="Tuned Out" value={data.market_competition?.tuned_out_tactics?.join(", ")} />
        <Field label="White Space" value={data.market_competition?.white_space} />
        <Field label="New Angle" value={data.market_competition?.genuinely_new_angle} />
      </Section>

      {/* Sources */}
      {data._sources && data._sources.length > 0 && (
        <div className="border-t border-border/40 pt-5 mt-1">
          <div className="flex items-center gap-2 mb-3">
            <GlobeIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
              Sources ({data._sources.length})
            </span>
          </div>
          <div className="grid gap-1.5">
            {data._sources.map((src, i) => {
              let domain = "";
              try { domain = new URL(src.url).hostname.replace("www.", ""); } catch {}
              return (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg hover:bg-accent/30 transition-colors group"
                >
                  <span className="text-[10px] text-muted-foreground/40 tabular-nums w-5 shrink-0">{i + 1}</span>
                  <span className="text-xs text-foreground/70 truncate flex-1 group-hover:text-foreground transition-colors">
                    {src.title || domain}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40 shrink-0 hidden sm:inline">{domain}</span>
                  <ExternalLinkIcon className="h-3 w-3 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground transition-colors" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
