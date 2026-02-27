"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import type { ReasoningUIPart, UIMessage } from "ai";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

// AI Elements
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorDialog,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
} from "@/components/ai-elements/model-selector";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputHeader,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from "@/components/ai-elements/checkpoint";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
} from "@/components/ai-elements/attachments";
import {
  Queue,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
  QueueList,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
  QueueItemActions,
  QueueItemAction,
} from "@/components/ai-elements/queue";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CopyIcon,
  DownloadIcon,
  ImageIcon,
  RefreshCcwIcon,
  UserCircleIcon,
  ShieldIcon,
  Maximize2Icon,
  XIcon,
  SparklesIcon,
  PlusIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ListIcon,
  XCircleIcon,
  PanelLeftIcon,
  TrashIcon,
  MessageSquareIcon,
  BookOpenIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApprovalInput {
  failureReason: string;
  refinedPrompt: string;
  attemptNumber: number;
}

interface ImageResult {
  success: boolean;
  imageUrl?: string;
  enhancedPrompt?: string;
  settings?: {
    aspect_ratio: string;
    resolution: string;
    output_format: string;
  };
  error?: string;
}

interface ReviewResult {
  image_url: string;
  passes: boolean;
  score: number;
  issues: string[];
  refined_prompt?: string;
}

interface GenerationSettings {
  model: "google/nano-banana-pro" | "google/nano-banana-2" | "bytedance/seedream-4.5" | "ideogram-ai/ideogram-v3-turbo";
  aspect_ratio: string;
  // Google models
  resolution: string;
  output_format: string;
  safety_filter_level: string;
  // Seedream
  size: string;
  // Ideogram
  magic_prompt_option: string;
}

interface ClarificationQuestion {
  id: string;
  question: string;
  options: string[];
}

interface ClarificationResult {
  type: "clarify";
  questions: ClarificationQuestion[];
}

interface IdeationResult {
  type: "ideate";
  primaryPrompt: string;
  variations: string[];
  additionalConcepts: string[];
}

type IdeationResponse = IdeationResult | ClarificationResult;

type Phase = "idle" | "ideating" | "clarifying" | "awaiting" | "generating";

interface ChatSummary {
  id: string;
  title: string;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AnyToolPart = {
  type: string;
  toolCallId: string;
  toolName?: string;
  state:
    | "input-streaming"
    | "input-available"
    | "approval-requested"
    | "approval-responded"
    | "output-available"
    | "output-error"
    | "output-denied";
  input?: unknown;
  output?: ImageResult | ReviewResult;
  errorText?: string;
};

function extractTitle(msgs: UIMessage[]): string {
  for (const m of msgs) {
    if (m.role !== "user") continue;
    for (const p of m.parts) {
      if (p.type === "text" && p.text.trim()) {
        return p.text.trim().slice(0, 100);
      }
    }
  }
  return "Untitled chat";
}

function extractThumbnail(msgs: UIMessage[]): string | null {
  for (const m of msgs) {
    for (const p of m.parts) {
      const tp = p as AnyToolPart;
      const name = tp.toolName ?? tp.type?.replace(/^tool-/, "") ?? "";
      if (name === "generateImage" && tp.state === "output-available") {
        const r = tp.output as ImageResult | undefined;
        if (r?.success && r.imageUrl) return r.imageUrl;
      }
    }
  }
  return null;
}

function relativeTime(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const EXAMPLE_CONCEPTS = [
  { text: "Irritated jawline skin — red, bumpy, the aftermath" },
  { text: "Before/after teeth whitening, stark contrast" },
  { text: "Bloated stomach vs. flat stomach, side by side" },
  { text: "Puffy under-eye bags, close-up, morning light" },
  { text: "Dry, cracked heels on bathroom floor" },
  { text: "Thinning hair visible on scalp, overhead shot" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ImageDisplay({
  imageUrl,
  prompt,
}: {
  imageUrl: string;
  prompt?: string;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  const handleDownload = async () => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `native-ad-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download image");
    }
  };

  return (
    <>
      <div className="mt-3 space-y-2">
        <div
          className="relative group overflow-hidden rounded-xl border bg-muted cursor-zoom-in w-full max-w-sm"
          onClick={() => setFullscreen(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={prompt || "Generated native ad"}
            className="w-full max-h-[70vh] object-cover transition-transform group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Badge variant="secondary" className="text-xs gap-1">
              <Maximize2Icon className="h-3 w-3" />
              View
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleDownload}
          >
            <DownloadIcon className="h-3 w-3" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => {
              navigator.clipboard.writeText(imageUrl);
              toast.success("Image URL copied");
            }}
          >
            <CopyIcon className="h-3 w-3" />
            Copy URL
          </Button>
        </div>
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setFullscreen(false)}
          >
            <XIcon className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={prompt || "Generated native ad"}
            className="max-h-full max-w-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function ReviewDisplay({ result }: { result: ReviewResult }) {
  const scoreColor =
    result.score >= 6
      ? "text-green-600 bg-green-50 border-green-200"
      : result.score >= 4
      ? "text-yellow-600 bg-yellow-50 border-yellow-200"
      : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        {result.passes ? (
          <CheckCircleIcon className="h-4 w-4 text-green-600" />
        ) : (
          <AlertCircleIcon className="h-4 w-4 text-red-500" />
        )}
        <span className="text-xs font-medium">
          {result.passes ? "Passes quality check" : "Quality check failed"}
        </span>
        <Badge
          variant="outline"
          className={`text-xs px-1.5 py-0 h-5 font-mono ${scoreColor}`}
        >
          {result.score}/7
        </Badge>
      </div>
      {result.issues.length > 0 && (
        <ul className="space-y-0.5">
          {result.issues.map((issue, i) => (
            <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
              <span className="mt-0.5 shrink-0">·</span>
              {issue}
            </li>
          ))}
        </ul>
      )}
      {!result.passes && result.refined_prompt && (
        <div className="rounded-md bg-muted px-3 py-2">
          <p className="text-xs text-muted-foreground mb-1 font-medium">
            Refined prompt:
          </p>
          <p className="text-xs font-mono leading-relaxed">
            {result.refined_prompt}
          </p>
        </div>
      )}
    </div>
  );
}

// Approval card — shown when approveRetry is in input-available state (paused).
// Approve  → addToolResult({ approved: true })  → Claude generates the retry.
// Skip     → addToolResult({ approved: false }) → Claude stops retrying.
function ApprovalCard({
  part,
  onApprove,
  onReject,
}: {
  part: AnyToolPart;
  onApprove: () => void;
  onReject: () => void;
}) {
  const input = part.input as ApprovalInput | undefined;

  return (
    <Tool defaultOpen>
      <ToolHeader
        type="tool-approveRetry"
        state={part.state}
        title={`Retry attempt ${input?.attemptNumber ?? "?"} — approve?`}
      />
      <ToolContent>
        <div className="space-y-3">
          {input?.failureReason && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Why it failed
              </p>
              <p className="text-sm leading-relaxed">{input.failureReason}</p>
            </div>
          )}
          {input?.refinedPrompt && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Refined prompt for retry
              </p>
              <p className="text-xs font-mono bg-muted rounded-md px-3 py-2 leading-relaxed">
                {input.refinedPrompt}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onApprove}>
              <RefreshCcwIcon className="h-3.5 w-3.5" />
              Generate retry
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={onReject}
            >
              Skip
            </Button>
          </div>
        </div>
      </ToolContent>
    </Tool>
  );
}

function ToolResult({
  part,
  onAddToolResult,
}: {
  part: AnyToolPart;
  onAddToolResult: (toolCallId: string, result: unknown) => void;
}) {
  // Named ToolUIParts encode the tool name inside `type` ("tool-reviewImage"),
  // while DynamicToolUIParts use a separate `toolName` field. Support both.
  const resolvedName = part.toolName ?? part.type.replace(/^tool-/, "");
  const isReview = resolvedName === "reviewImage";
  const isApproval = resolvedName === "approveRetry";

  const isComplete =
    part.state === "output-available" || part.state === "output-error";
  const isRunning =
    part.state === "input-available" || part.state === "input-streaming";
  const result = isComplete ? part.output : undefined;
  const errorText = part.state === "output-error" ? part.errorText : undefined;

  // ── approveRetry tool ──────────────────────────────────────────────────────

  if (isApproval) {
    // Parameters still streaming in — show shimmer
    if (part.state === "input-streaming") {
      return (
        <div className="flex items-center gap-2 py-1">
          <Shimmer className="h-5 w-52 rounded-md text-xs px-2">
            Preparing retry options…
          </Shimmer>
        </div>
      );
    }

    // Waiting for user response — show the approval card
    if (part.state === "input-available") {
      return (
        <ApprovalCard
          part={part}
          onApprove={() =>
            onAddToolResult(part.toolCallId, { approved: true })
          }
          onReject={() =>
            onAddToolResult(part.toolCallId, { approved: false })
          }
        />
      );
    }

    // User has responded — show compact status line
    const approved = (result as { approved?: boolean } | undefined)?.approved;
    return (
      <div className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground">
        {approved ? (
          <>
            <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" />
            Retry approved — generating…
          </>
        ) : (
          <>
            <XCircleIcon className="h-3.5 w-3.5 text-orange-500" />
            Retry skipped
          </>
        )}
      </div>
    );
  }

  // ── Running shimmer (for generateImage / reviewImage) ─────────────────────

  if (isRunning) {
    return (
      <div className="flex items-center gap-2 py-1">
        <Shimmer className="h-5 w-52 rounded-md text-xs px-2">
          {isReview ? "Reviewing quality…" : "Generating image…"}
        </Shimmer>
      </div>
    );
  }

  // ── reviewImage ────────────────────────────────────────────────────────────

  if (isReview) {
    const reviewResult = result as ReviewResult | undefined;
    return (
      <Tool defaultOpen={false}>
        <ToolHeader
          type="tool-reviewImage"
          state={part.state}
          title="Quality review"
        />
        <ToolContent>
          {reviewResult ? (
            <>
              {reviewResult.image_url && (
                <ImageDisplay
                  imageUrl={reviewResult.image_url}
                  prompt="Reviewed image"
                />
              )}
              <ReviewDisplay result={reviewResult} />
            </>
          ) : errorText ? (
            <ToolOutput output={result} errorText={errorText} />
          ) : null}
        </ToolContent>
      </Tool>
    );
  }

  // ── generateImage ──────────────────────────────────────────────────────────

  const imageResult = result as ImageResult | undefined;
  return (
    <Tool defaultOpen={false}>
      <ToolHeader
        type="tool-generateImage"
        state={part.state}
        title="Generate native ad image"
      />
      <ToolContent>
        {imageResult?.success && imageResult.imageUrl ? (
          <ImageDisplay
            imageUrl={imageResult.imageUrl}
            prompt={imageResult.enhancedPrompt}
          />
        ) : result != null || errorText != null ? (
          <ToolOutput output={result} errorText={errorText} />
        ) : null}
      </ToolContent>
    </Tool>
  );
}

function AttachmentPreviewsInInput() {
  const { files, remove } = usePromptInputAttachments();
  if (files.length === 0) return null;

  return (
    <Attachments variant="inline" className="flex-wrap gap-1.5 px-3 pt-2.5">
      {files.map((file) => (
        <Attachment
          key={file.id}
          data={file}
          onRemove={() => remove(file.id)}
        >
          <AttachmentPreview />
          <AttachmentInfo />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
}

// ─── Clarification Panel ──────────────────────────────────────────────────────

const OTHER_OPTION = "Other / something else";

function ClarificationPanel({
  concept,
  questions,
  onSubmit,
}: {
  concept: string;
  questions: ClarificationQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);

  const current = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isOther = selected === OTHER_OPTION;
  const effectiveValue = isOther ? customText.trim() : selected;
  const canProceed = isOther ? customText.trim().length > 0 : !!selected;

  // Focus the text input when "Other" is selected
  useEffect(() => {
    if (isOther) {
      setTimeout(() => customInputRef.current?.focus(), 50);
    }
  }, [isOther]);

  const handleSelect = (option: string) => {
    setSelected(option);
    if (option !== OTHER_OPTION) setCustomText("");
  };

  const handleNext = () => {
    if (!canProceed) return;
    const newAnswers = { ...answers, [current.id]: effectiveValue! };
    setAnswers(newAnswers);
    setSelected(null);
    setCustomText("");

    if (isLast) {
      onSubmit(newAnswers);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleSkip = () => {
    onSubmit(answers);
  };

  return (
    <div className="space-y-3">
      <Message from="user">
        <MessageContent>{concept}</MessageContent>
      </Message>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        {/* Progress dots */}
        {questions.length > 1 && (
          <div className="flex items-center gap-1.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= currentIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              {currentIndex + 1} of {questions.length}
            </span>
          </div>
        )}

        <p className="text-sm font-medium leading-snug">{current.question}</p>

        <div className="flex flex-col gap-1.5">
          {current.options.map((option) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`text-left text-sm px-3 py-2.5 rounded-lg border transition-all duration-150 ${
                selected === option
                  ? "border-primary bg-primary/5 text-foreground font-medium"
                  : "border-border bg-background hover:bg-accent hover:border-accent text-foreground"
              }`}
            >
              {option}
            </button>
          ))}

          {/* Text input revealed when "Other" is selected */}
          {isOther && (
            <input
              ref={customInputRef}
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canProceed) handleNext();
              }}
              placeholder="Type your answer…"
              className="mt-1 w-full text-sm px-3 py-2.5 rounded-lg border border-primary bg-primary/5 outline-none placeholder:text-muted-foreground"
            />
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={!canProceed}
            onClick={handleNext}
          >
            {isLast ? (
              <>
                <SparklesIcon className="h-3.5 w-3.5" />
                Generate concepts
              </>
            ) : (
              <>
                Next
                <span className="opacity-60">→</span>
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground"
            onClick={handleSkip}
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Ideation Panel ───────────────────────────────────────────────────────────

function IdeationPanel({
  concept,
  ideation,
  onGenerate,
  onAddToQueue,
}: {
  concept: string;
  ideation: IdeationResult | null;
  onGenerate: (prompt: string) => void;
  onAddToQueue: (prompt: string) => void;
}) {
  if (!ideation) {
    return (
      <div className="space-y-3">
        <Message from="user">
          <MessageContent>{concept}</MessageContent>
        </Message>
        <div className="flex items-center gap-2 py-2">
          <Shimmer className="h-5 w-52 rounded-md text-xs px-2">{"Ideating concepts…"}</Shimmer>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Message from="user">
        <MessageContent>{concept}</MessageContent>
      </Message>

      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Enhanced prompt
            </span>
          </div>
          <p className="text-sm font-mono leading-relaxed">
            {ideation.primaryPrompt}
          </p>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => onGenerate(ideation.primaryPrompt)}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Generate this
          </Button>
        </div>

        {ideation.variations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground px-0.5">
              Variations
            </p>
            <div className="flex flex-col gap-1.5">
              {ideation.variations.map((v, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <button
                    onClick={() => onGenerate(v)}
                    className="flex-1 text-left text-xs px-3 py-2 rounded-lg border bg-background hover:bg-accent hover:border-accent transition-colors leading-relaxed"
                  >
                    {v}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 mt-0.5"
                    title="Add to queue"
                    onClick={() => onAddToQueue(v)}
                  >
                    <PlusIcon className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {ideation.additionalConcepts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground px-0.5">
              More concepts to explore
            </p>
            <Suggestions className="flex-wrap">
              {ideation.additionalConcepts.map((c, i) => (
                <Suggestion
                  key={i}
                  suggestion={c}
                  onClick={() => onGenerate(c)}
                  className="text-xs"
                >
                  {c}
                </Suggestion>
              ))}
            </Suggestions>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chat Sidebar ─────────────────────────────────────────────────────────────

function ChatSidebar({
  activeChatId,
  chats,
  onSelect,
  onNew,
  onDelete,
}: {
  activeChatId: string | null;
  chats: ChatSummary[];
  onSelect: (chatId: string) => void;
  onNew: () => void;
  onDelete: (chatId: string) => void;
}) {
  return (
    <aside className="flex flex-col h-full border-r bg-background w-64 shrink-0 overflow-hidden">
      {/* New chat button */}
      <div className="p-3 border-b">
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 gap-1.5 text-xs justify-start"
          onClick={onNew}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          New chat
        </Button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto py-2">
        {(chats ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
            <MessageSquareIcon className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              Your generated chats will appear here
            </p>
          </div>
        ) : (
          (chats ?? []).map((chat) => (
            <ChatSidebarItem
              key={chat.id}
              chat={chat}
              isActive={chat.id === activeChatId}
              onSelect={() => onSelect(chat.id)}
              onDelete={() => onDelete(chat.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function ChatSidebarItem({
  chat,
  isActive,
  onSelect,
  onDelete,
}: {
  chat: ChatSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`group relative flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted/60 text-foreground"
      }`}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div className="shrink-0 w-9 h-9 rounded-md overflow-hidden bg-muted border flex items-center justify-center">
        {chat.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chat.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>

      {/* Title + date */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate leading-snug">
          {chat.title}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {relativeTime(chat.updated_at)}
        </p>
      </div>

      {/* Delete button — visible on hover */}
      {hovered && (
        <button
          className="shrink-0 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete chat"
        >
          <TrashIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── Chat Session ─────────────────────────────────────────────────────────────
// Receives a stable key from the parent so it remounts cleanly on chat switch.

function ChatSession({
  chatId,
  preloadedMessages,
  onChatSaved,
  onRefreshSidebar,
}: {
  chatId: string | null;
  // Renamed from initialMessages — AI SDK v6 Chat constructor uses `messages`
  // not `initialMessages`. Passing the wrong key silently ignores the data.
  preloadedMessages: UIMessage[];
  onChatSaved: (id: string) => void;
  onRefreshSidebar: () => void;
}) {
  const [settings, setSettings] = useState<GenerationSettings>({
    model: "google/nano-banana-2",
    aspect_ratio: "4:5",
    resolution: "1K",
    output_format: "jpg",
    safety_filter_level: "block_only_high",
    size: "2K",
    magic_prompt_option: "Auto",
  });
  const [checkpoints, setCheckpoints] = useState<Set<string>>(new Set());
  const lastSuccessId = useRef<string | null>(null);

  // Agentic pipeline state
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentConcept, setCurrentConcept] = useState("");
  const [ideation, setIdeation] = useState<IdeationResult | null>(null);
  const [clarification, setClarification] = useState<ClarificationResult | null>(null);
  const [queue, setQueue] = useState<string[]>([]);

  const queueRef = useRef<string[]>([]);
  const settingsRef = useRef(settings);
  const processNextRef = useRef<(() => void) | null>(null);
  const chatIdRef = useRef<string | null>(chatId);
  const messagesRef = useRef<UIMessage[]>(preloadedMessages);
  // Holds any images the user attached so they reach Replicate even when
  // generation is triggered after ideation (where the original PromptInput
  // message object is no longer in scope).
  const pendingFilesRef = useRef<{ type: "file"; mediaType: string; url: string; filename?: string }[]>([]);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // ── Save chat to DB ────────────────────────────────────────────────────────

  const saveChat = useCallback(
    async (msgs: UIMessage[]) => {
      if (msgs.length === 0) return;
      try {
        // Strip file parts (data: URL blobs) before saving — they can be
        // several MB each and will truncate the JSON payload, causing a
        // "Unexpected end of JSON input" 500 on the /api/chats route.
        // Reference images are only needed for the current generation; they
        // don't need to be persisted in chat history.
        const msgsForSave = msgs.map((m) => ({
          ...m,
          parts: m.parts.filter((p) => p.type !== "file"),
        }));

        const res = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: chatIdRef.current ?? undefined,
            title: extractTitle(msgs),
            thumbnail_url: extractThumbnail(msgs),
            messages: msgsForSave,
          }),
        });
        if (res.ok) {
          const { id } = await res.json();
          if (!chatIdRef.current) {
            chatIdRef.current = id;
            onChatSaved(id);
          }
          onRefreshSidebar();
        }
      } catch {
        // non-critical — silent fail
      }
    },
    [onChatSaved, onRefreshSidebar]
  );

  // ── useChat ────────────────────────────────────────────────────────────────

  // Abort controller for the in-flight /api/ideate fetch so cancel works mid-ideation.
  const ideationAbortRef = useRef<AbortController | null>(null);

  const { messages, sendMessage, status, stop, regenerate, addToolResult } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/generate",
      body: { settings },
    }),
    // AI SDK v6 Chat constructor uses `messages` (not `initialMessages`).
    // This populates the session with history when a saved chat is loaded.
    messages: preloadedMessages,
    // Resume the stream automatically once all tool results are ready.
    // The built-in helper handles approveRetry (human-in-the-loop) and any
    // other tool that produces a result, preventing "Tool result is missing"
    // errors caused by the previous narrow per-tool predicate.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (err) => {
      toast.error(err.message || "Something went wrong");
      setPhase("idle");
    },
    onFinish: () => {
      saveChat(messagesRef.current);
      processNextRef.current?.();
    },
  });

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── Checkpoint detection ───────────────────────────────────────────────────

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const hasPassing = last.parts.some((p) => {
      const tp = p as AnyToolPart;
      if (tp.type !== "tool-invocation" && !tp.type.startsWith("tool-"))
        return false;
      if (tp.toolName === "reviewImage" && tp.state === "output-available") {
        return (tp.output as ReviewResult | undefined)?.passes === true;
      }
      if (tp.toolName === "generateImage" && tp.state === "output-available") {
        return (tp.output as ImageResult | undefined)?.success === true;
      }
      return false;
    });
    if (hasPassing && last.id !== lastSuccessId.current) {
      lastSuccessId.current = last.id;
      setCheckpoints((prev) => new Set([...prev, last.id]));
    }
  }, [messages]);

  // ── Queue processing ───────────────────────────────────────────────────────

  const triggerGeneration = useCallback(
    (prompt: string) => {
      setPhase("generating");
      setIdeation(null);
      setCurrentConcept("");
      // Consume any reference images the user attached (cleared after use so
      // subsequent retries / queue items don't incorrectly reuse them).
      const files = pendingFilesRef.current.splice(0);
      sendMessage(
        files.length ? { text: prompt, files } : { text: prompt },
        { body: { settings } },
      );
    },
    [sendMessage, settings]
  );

  const processNextInQueue = useCallback(() => {
    const next = queueRef.current[0];
    if (!next) { setPhase("idle"); return; }
    setQueue((prev) => prev.slice(1));
    setPhase("generating");
    sendMessage({ text: next }, { body: { settings: settingsRef.current } });
  }, [sendMessage]);

  useEffect(() => { processNextRef.current = processNextInQueue; }, [processNextInQueue]);

  const handleAddToQueue = useCallback((prompt: string) => {
    setQueue((prev) => [...prev, prompt]);
    toast.success("Added to queue");
  }, []);

  // ── Shared ideation runner ─────────────────────────────────────────────────

  // Fetches /api/ideate and handles both the clarification and ideation paths.
  // Pass `answers` when re-running after the user has answered clarifying questions.
  const runIdeation = useCallback(
    async (concept: string, answers?: Record<string, string>) => {
      setCurrentConcept(concept);
      setIdeation(null);
      setClarification(null);
      setPhase("ideating");

      const abortController = new AbortController();
      ideationAbortRef.current = abortController;

      try {
        const res = await fetch("/api/ideate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concept, answers }),
          signal: abortController.signal,
        });
        if (!res.ok) throw new Error("Ideation failed");
        const result: IdeationResponse = await res.json();

        if (result.type === "clarify") {
          setClarification(result);
          setPhase("clarifying");
        } else {
          setIdeation(result);
          setPhase("awaiting");
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Ideation error:", err);
        toast.error("Failed to ideate — generating directly");
        triggerGeneration(concept);
      } finally {
        ideationAbortRef.current = null;
      }
    },
    [triggerGeneration]
  );

  // Called when the user submits answers to clarifying questions.
  const handleClarificationSubmit = useCallback(
    (answers: Record<string, string>) => {
      runIdeation(currentConcept, answers);
    },
    [currentConcept, runIdeation]
  );

  // ── Submit / suggestion handlers ───────────────────────────────────────────

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const hasText = message.text.trim().length > 0;
      const hasFiles = message.files.length > 0;
      if (!hasText && !hasFiles) return;
      if (phase !== "idle") return;

      const concept = message.text.trim();

      // Always stash uploaded files so triggerGeneration can pass them to
      // sendMessage → server → Replicate, regardless of which code path runs.
      if (hasFiles) {
        pendingFilesRef.current = message.files;
      }

      // Follow-up message in an existing chat — skip ideation, go straight to generation.
      if (messages.length > 0) {
        triggerGeneration(concept || "Refine or generate a new native ad");
        return;
      }

      // No concept text — just images attached; generate directly without ideating.
      if (!concept) {
        triggerGeneration("Generate a native ad with the attached images");
        return;
      }

      runIdeation(concept);
    },
    [phase, messages.length, triggerGeneration, runIdeation]
  );

  const handleSuggestion = useCallback(
    async (text: string) => {
      if (phase !== "idle") return;
      runIdeation(text);
    },
    [phase, runIdeation]
  );

  const handleCancel = useCallback(() => {
    ideationAbortRef.current?.abort();
    ideationAbortRef.current = null;
    stop();
    setPhase("idle");
    setIdeation(null);
    setClarification(null);
    setCurrentConcept("");
  }, [stop]);

  // Re-run ideation on an existing conversation so the user can explore fresh
  // variations or additional concepts without starting a new chat.
  const handleReideate = useCallback(async () => {
    if (phase !== "idle" || status === "streaming" || status === "submitted") return;

    // Use the stored concept if available; otherwise extract it from the
    // first user text message in the conversation.
    let concept = currentConcept;
    if (!concept) {
      outer: for (const msg of messages) {
        if (msg.role !== "user") continue;
        for (const p of msg.parts) {
          if (p.type === "text" && p.text.trim()) {
            concept = p.text.trim();
            break outer;
          }
        }
      }
    }
    if (!concept) return;

    runIdeation(concept);
  }, [phase, status, currentConcept, messages, runIdeation]);

  const isStreaming = status === "streaming" || status === "submitted";
  const isInputDisabled = phase !== "idle" || isStreaming;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Conversation */}
      <div className="flex-1 overflow-hidden">
        <Conversation className="h-full">
          <ConversationContent className="max-w-3xl mx-auto px-4 py-6 gap-6">
            {messages.length === 0 && phase === "idle" ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[40vh] gap-6 text-center">
                <div className="space-y-2">
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-foreground mx-auto mb-2">
                    <ImageIcon className="h-6 w-6 text-background" />
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    Native Ad Generator
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Describe your ad concept. The brain will ideate variations, then
                    generate and quality-check the image.
                  </p>
                </div>
                <Suggestions className="max-w-xl justify-center">
                  {EXAMPLE_CONCEPTS.map(({ text }) => (
                    <Suggestion
                      key={text}
                      suggestion={text}
                      onClick={() => handleSuggestion(text)}
                      className="text-xs"
                    >
                      {text}
                    </Suggestion>
                  ))}
                </Suggestions>
              </div>
            ) : (
              <Fragment>
                {/* Show clarification / ideation panel at the TOP only when there
                    are no messages yet (first ideation on a fresh chat). For
                    re-ideation on an existing conversation it is rendered at the
                    BOTTOM so it doesn't push the whole history out of view. */}
                {messages.length === 0 && phase === "clarifying" && clarification && (
                  <ClarificationPanel
                    concept={currentConcept}
                    questions={clarification.questions}
                    onSubmit={handleClarificationSubmit}
                  />
                )}
                {messages.length === 0 && (phase === "ideating" || phase === "awaiting") && (
                  <IdeationPanel
                    concept={currentConcept}
                    ideation={ideation}
                    onGenerate={triggerGeneration}
                    onAddToQueue={handleAddToQueue}
                  />
                )}

                {messages.map((message, messageIndex) => (
                  <Fragment key={message.id}>
                    {message.role === "user" &&
                      message.parts.some((p) => p.type === "file") && (
                        <Message from="user" key={`${message.id}-attachments`}>
                          <MessageContent>
                            <Attachments variant="grid">
                              {message.parts
                                .filter((p) => p.type === "file")
                                .map((p, i) => {
                                  const fp = p as {
                                    type: "file";
                                    mediaType: string;
                                    url: string;
                                    filename?: string;
                                  };
                                  return (
                                    <Attachment
                                      key={i}
                                      data={{ ...fp, id: `${message.id}-f-${i}` }}
                                    >
                                      <AttachmentPreview />
                                      <AttachmentInfo />
                                    </Attachment>
                                  );
                                })}
                            </Attachments>
                          </MessageContent>
                        </Message>
                      )}

                    {/* Consolidate ALL reasoning parts into one block (per docs
                        recommendation — avoids multiple "Thinking…" headers). */}
                    {(() => {
                      const reasoningParts = message.parts.filter(
                        (p) => p.type === "reasoning"
                      ) as ReasoningUIPart[];
                      if (reasoningParts.length === 0) return null;

                      const combinedText = reasoningParts
                        .map((p) => p.text)
                        .join("\n\n");

                      // Still streaming if the last part of the last message is reasoning
                      const lastPart = message.parts.at(-1);
                      const isReasoningStreaming =
                        isStreaming &&
                        messageIndex === messages.length - 1 &&
                        lastPart?.type === "reasoning";

                      return (
                        <Reasoning
                          key={`${message.id}-reasoning`}
                          className="w-full"
                          isStreaming={isReasoningStreaming}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{combinedText}</ReasoningContent>
                        </Reasoning>
                      );
                    })()}

                    {message.parts.map((part, i) => {
                      if (part.type === "file" || part.type === "reasoning")
                        return null;

                      if (part.type === "text") {
                        return (
                          <Message from={message.role} key={`${message.id}-text-${i}`}>
                            <MessageContent>
                              <MessageResponse>{part.text}</MessageResponse>
                            </MessageContent>
                            {message.role === "assistant" &&
                              messageIndex === messages.length - 1 &&
                              !isStreaming && (
                                <MessageActions>
                                  <MessageAction
                                    onClick={() => regenerate()}
                                    label="Regenerate"
                                  >
                                    <RefreshCcwIcon className="size-3" />
                                  </MessageAction>
                                  <MessageAction
                                    onClick={() => navigator.clipboard.writeText(part.text)}
                                    label="Copy"
                                  >
                                    <CopyIcon className="size-3" />
                                  </MessageAction>
                                </MessageActions>
                              )}
                          </Message>
                        );
                      }

                      if (
                        part.type === "tool-invocation" ||
                        part.type.startsWith("tool-")
                      ) {
                        return (
                          <ToolResult
                            key={`${message.id}-tool-${i}`}
                            part={part as AnyToolPart}
                            onAddToolResult={(toolCallId, result) => {
                              const tp = part as AnyToolPart;
                              const toolName = tp.toolName ?? tp.type.replace(/^tool-/, "");
                              addToolResult({ tool: toolName, toolCallId, output: result });
                            }}
                          />
                        );
                      }

                      return null;
                    })}

                    {checkpoints.has(message.id) && (
                      <Checkpoint key={`checkpoint-${message.id}`}>
                        <CheckpointIcon />
                        <CheckpointTrigger tooltip="Image passed quality check">
                          Ad approved
                        </CheckpointTrigger>
                      </Checkpoint>
                    )}
                  </Fragment>
                ))}

                {/* Re-ideation panel — appears at the bottom after existing messages */}
                {messages.length > 0 && phase === "clarifying" && clarification && (
                  <ClarificationPanel
                    concept={currentConcept}
                    questions={clarification.questions}
                    onSubmit={handleClarificationSubmit}
                  />
                )}
                {messages.length > 0 && (phase === "ideating" || phase === "awaiting") && (
                  <IdeationPanel
                    concept={currentConcept}
                    ideation={ideation}
                    onGenerate={triggerGeneration}
                    onAddToQueue={handleAddToQueue}
                  />
                )}

                {status === "submitted" && (
                  <Shimmer className="h-5 w-52 mt-2 rounded-md text-xs px-2">
                    {"Generating…"}
                  </Shimmer>
                )}
              </Fragment>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t bg-background">
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick-action to re-run ideation on an existing conversation */}
            {messages.length > 0 && phase === "idle" && !isStreaming && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-muted-foreground"
                onClick={handleReideate}
              >
                <SparklesIcon className="h-3.5 w-3.5" />
                More ideas
              </Button>
            )}

            <div className="flex items-center gap-2 flex-wrap">
                {/* Model selector */}
                <ModelSelector>
                  <ModelSelectorTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 font-normal">
                      <ModelSelectorLogo
                        provider={
                          settings.model.startsWith("google/") ? "google"
                          : settings.model.startsWith("bytedance/") ? "bytedance"
                          : "ideogram"
                        }
                        className="size-3.5"
                      />
                      {settings.model === "google/nano-banana-2" ? "Nano Banana 2"
                        : settings.model === "bytedance/seedream-4.5" ? "Seedream 4.5"
                        : settings.model === "ideogram-ai/ideogram-v3-turbo" ? "Ideogram v3 Turbo"
                        : "Nano Banana Pro"}
                    </Button>
                  </ModelSelectorTrigger>
                  <ModelSelectorContent title="Select model">
                    <ModelSelectorDialog title="Select model" description="Choose an image generation model">
                      <ModelSelectorInput placeholder="Search models…" />
                      <ModelSelectorList>
                        <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                        <ModelSelectorGroup heading="Google">
                          <ModelSelectorItem
                            value="nano-banana-pro"
                            selected={settings.model === "google/nano-banana-pro"}
                            onSelect={() => setSettings((s) => ({
                              ...s,
                              model: "google/nano-banana-pro",
                              resolution: s.resolution === "512px" ? "1K" : s.resolution,
                            }))}
                          >
                            <ModelSelectorLogoGroup>
                              <ModelSelectorLogo provider="google" />
                              <ModelSelectorName>Nano Banana Pro</ModelSelectorName>
                            </ModelSelectorLogoGroup>
                          </ModelSelectorItem>
                          <ModelSelectorItem
                            value="nano-banana-2"
                            selected={settings.model === "google/nano-banana-2"}
                            onSelect={() => setSettings((s) => ({ ...s, model: "google/nano-banana-2" }))}
                          >
                            <ModelSelectorLogoGroup>
                              <ModelSelectorLogo provider="google" />
                              <ModelSelectorName>Nano Banana 2</ModelSelectorName>
                            </ModelSelectorLogoGroup>
                          </ModelSelectorItem>
                        </ModelSelectorGroup>
                        <ModelSelectorGroup heading="Bytedance">
                          <ModelSelectorItem
                            value="seedream-4.5"
                            selected={settings.model === "bytedance/seedream-4.5"}
                            onSelect={() => setSettings((s) => ({
                              ...s,
                              model: "bytedance/seedream-4.5",
                              // 4:5 is not supported by Seedream; nearest valid ratio is 4:3
                              aspect_ratio: s.aspect_ratio === "4:5" ? "4:3" : s.aspect_ratio,
                            }))}
                          >
                            <ModelSelectorLogoGroup>
                              <ModelSelectorLogo provider="bytedance" />
                              <ModelSelectorName>Seedream 4.5</ModelSelectorName>
                            </ModelSelectorLogoGroup>
                          </ModelSelectorItem>
                        </ModelSelectorGroup>
                        <ModelSelectorGroup heading="Ideogram">
                          <ModelSelectorItem
                            value="ideogram-v3-turbo"
                            selected={settings.model === "ideogram-ai/ideogram-v3-turbo"}
                            onSelect={() => setSettings((s) => ({ ...s, model: "ideogram-ai/ideogram-v3-turbo" }))}
                          >
                            <ModelSelectorLogoGroup>
                              <ModelSelectorLogo provider="ideogram" />
                              <ModelSelectorName>Ideogram v3 Turbo</ModelSelectorName>
                            </ModelSelectorLogoGroup>
                          </ModelSelectorItem>
                        </ModelSelectorGroup>
                      </ModelSelectorList>
                    </ModelSelectorDialog>
                  </ModelSelectorContent>
                </ModelSelector>

                {/* Aspect ratio — all models */}
                <Select
                  value={settings.aspect_ratio}
                  onValueChange={(v) =>
                    setSettings((s) => ({ ...s, aspect_ratio: v }))
                  }
                >
                  <SelectTrigger className="h-7 text-xs w-auto min-w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* 4:5 is only valid for Google models */}
                    {settings.model !== "bytedance/seedream-4.5" && (
                      <SelectItem value="4:5">4:5 (native)</SelectItem>
                    )}
                    <SelectItem value="1:1">1:1 (square)</SelectItem>
                    <SelectItem value="3:4">3:4</SelectItem>
                    <SelectItem value="9:16">9:16 (story)</SelectItem>
                    <SelectItem value="16:9">16:9 (wide)</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="3:2">3:2</SelectItem>
                    <SelectItem value="2:3">2:3</SelectItem>
                  </SelectContent>
                </Select>

                {/* Google models: resolution + output format */}
                {settings.model.startsWith("google/") && (
                  <>
                    <Select
                      value={settings.resolution}
                      onValueChange={(v) =>
                        setSettings((s) => ({ ...s, resolution: v }))
                      }
                    >
                      <SelectTrigger className="h-7 text-xs w-auto min-w-[70px]">
                        <span className="text-muted-foreground">Res:&nbsp;</span><SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.model === "google/nano-banana-2" && (
                          <SelectItem value="512px">512px</SelectItem>
                        )}
                        <SelectItem value="1K">1K</SelectItem>
                        <SelectItem value="2K">2K</SelectItem>
                        <SelectItem value="4K">4K</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={settings.output_format}
                      onValueChange={(v) =>
                        setSettings((s) => ({ ...s, output_format: v }))
                      }
                    >
                      <SelectTrigger className="h-7 text-xs w-auto min-w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jpg">JPEG</SelectItem>
                        <SelectItem value="png">PNG</SelectItem>
                      </SelectContent>
                    </Select>
                    {settings.model === "google/nano-banana-pro" && (
                      <Select
                        value={settings.safety_filter_level}
                        onValueChange={(v) =>
                          setSettings((s) => ({ ...s, safety_filter_level: v }))
                        }
                      >
                        <SelectTrigger className="h-7 text-xs w-auto min-w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="block_only_high">Safety: Low block</SelectItem>
                          <SelectItem value="block_medium_and_above">Safety: Med block</SelectItem>
                          <SelectItem value="block_low_and_above">Safety: High block</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </>
                )}

                {/* Seedream: size (2K / 4K) */}
                {settings.model === "bytedance/seedream-4.5" && (
                  <Select
                    value={settings.size}
                    onValueChange={(v) =>
                      setSettings((s) => ({ ...s, size: v }))
                    }
                  >
                    <SelectTrigger className="h-7 text-xs w-auto min-w-[60px]">
                      <span className="text-muted-foreground">Res:&nbsp;</span><SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2K">2K</SelectItem>
                      <SelectItem value="4K">4K</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Ideogram: magic prompt */}
                {settings.model === "ideogram-ai/ideogram-v3-turbo" && (
                  <Select
                    value={settings.magic_prompt_option}
                    onValueChange={(v) =>
                      setSettings((s) => ({ ...s, magic_prompt_option: v }))
                    }
                  >
                    <SelectTrigger className="h-7 text-xs w-auto min-w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auto">Magic Prompt: Auto</SelectItem>
                      <SelectItem value="On">Magic Prompt: On</SelectItem>
                      <SelectItem value="Off">Magic Prompt: Off</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

            {queue.length > 0 && (
              <div className="w-full mt-1">
                <Queue>
                  <QueueSection defaultOpen>
                    <QueueSectionTrigger>
                      <QueueSectionLabel
                        count={queue.length}
                        label={queue.length === 1 ? "concept queued" : "concepts queued"}
                        icon={<ListIcon className="size-3.5" />}
                      />
                    </QueueSectionTrigger>
                    <QueueSectionContent>
                      <QueueList>
                        {queue.map((prompt, i) => (
                          <QueueItem key={i}>
                            <div className="flex items-start gap-2 w-full">
                              <QueueItemIndicator className="mt-1" />
                              <QueueItemContent className="text-xs">
                                {prompt.length > 80
                                  ? prompt.slice(0, 80) + "…"
                                  : prompt}
                              </QueueItemContent>
                              <QueueItemActions>
                                <QueueItemAction
                                  onClick={() =>
                                    setQueue((prev) =>
                                      prev.filter((_, idx) => idx !== i)
                                    )
                                  }
                                  title="Remove from queue"
                                >
                                  <XCircleIcon className="size-3.5" />
                                </QueueItemAction>
                              </QueueItemActions>
                            </div>
                          </QueueItem>
                        ))}
                      </QueueList>
                    </QueueSectionContent>
                  </QueueSection>
                </Queue>
              </div>
            )}
          </div>

          <PromptInput
            onSubmit={handleSubmit}
            className="rounded-2xl border shadow-sm"
            multiple
            maxFiles={14}
            accept="image/*"
          >
            <PromptInputHeader>
              <AttachmentPreviewsInInput />
            </PromptInputHeader>
            <PromptInputTextarea
              placeholder={
                isInputDisabled
                  ? phase === "ideating"
                    ? "Ideating concepts — check above…"
                    : phase === "clarifying"
                    ? "Answer the questions above to continue…"
                    : phase === "awaiting"
                    ? "Choose a concept above or type a new one…"
                    : "Generating…"
                  : messages.length > 0
                  ? "Refine the image or describe a new concept…"
                  : "Describe your concept — AI will ideate variations first…"
              }
              className="px-4 pt-3 text-sm min-h-[52px] max-h-40 resize-none"
              disabled={isInputDisabled}
            />
            <PromptInputFooter className="p-2.5 pt-1.5">
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-muted-foreground rounded-full"
                    tooltip="Attach reference images (up to 14)"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>Reference images</span>
                  </PromptInputActionMenuTrigger>
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments label="Add reference images (up to 14)" />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
              </PromptInputTools>
              <PromptInputSubmit
                status={isInputDisabled ? "streaming" : "ready"}
                disabled={false}
                onStop={isInputDisabled ? handleCancel : undefined}
                className="rounded-full h-8 w-8"
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

// ─── Page (root) ──────────────────────────────────────────────────────────────

export default function ChatPage({
  initialChatId,
  initialMessages,
}: {
  initialChatId?: string;
  initialMessages?: UIMessage[];
} = {}) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    name: string | null;
    email: string;
    isAdmin: boolean;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [savedChats, setSavedChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId ?? null);
  // chatKey is a monotonic counter used as the ChatSession `key`. It is ONLY
  // incremented on explicit user navigation (new chat / sidebar click). It must
  // NOT change when a chat is saved for the first time — that would remount the
  // session and clear the conversation.
  const [chatKey, setChatKey] = useState(0);
  const [loadedMessages, setLoadedMessages] = useState<UIMessage[]>(initialMessages ?? []);

  // Handle same-segment navigations (e.g. /chat/id1 → /chat/id2) where the
  // component stays mounted but receives new props from the server component.
  const prevInitialChatIdRef = useRef(initialChatId);
  useEffect(() => {
    if (prevInitialChatIdRef.current !== initialChatId) {
      prevInitialChatIdRef.current = initialChatId;
      setActiveChatId(initialChatId ?? null);
      setLoadedMessages(initialMessages ?? []);
      setChatKey((k) => k + 1);
    }
  }, [initialChatId, initialMessages]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setCurrentUser(d.user); })
      .catch(() => {});
  }, []);

  const refreshSidebar = useCallback(async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json();
        // Guard against null/undefined in case the API returns an unexpected shape
        setSavedChats(Array.isArray(data.chats) ? data.chats : []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { refreshSidebar(); }, [refreshSidebar]);

  const handleSelectChat = useCallback((chatId: string) => {
    router.push(`/chat/${chatId}`);
  }, [router]);

  const handleNewChat = useCallback(() => {
    router.push("/chat");
  }, [router]);

  const handleChatSaved = useCallback((id: string) => {
    // Only update sidebar highlight — do NOT touch chatKey so the live
    // session is never remounted just because the chat was persisted.
    setActiveChatId(id);
    refreshSidebar();
    // Silently update the URL bar so the current URL is bookmarkable and
    // survives a refresh, without triggering a Next.js navigation that
    // would remount the live session.
    window.history.replaceState(null, "", `/chat/${id}`);
  }, [refreshSidebar]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      if (activeChatId === chatId) router.push("/chat");
      refreshSidebar();
    } catch {
      toast.error("Failed to delete chat");
    }
  }, [activeChatId, router, refreshSidebar]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b bg-background/95 backdrop-blur-sm z-10">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <PanelLeftIcon className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-foreground">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-background"
                >
                  <rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor" />
                  <rect x="11" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.4" />
                  <rect x="2" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.4" />
                  <rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor" />
                </svg>
              </div>
              <span className="font-semibold text-sm tracking-tight">Native Ads</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {currentUser?.isAdmin && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                  <ShieldIcon className="h-3.5 w-3.5" />
                  Admin
                </Button>
              </Link>
            )}
            <Link href="/docs">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                <BookOpenIcon className="h-3.5 w-3.5" />
                Docs
              </Button>
            </Link>
            <Link href="/account">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-semibold shrink-0">
                  {currentUser?.name
                    ? currentUser.name.trim().charAt(0).toUpperCase()
                    : <UserCircleIcon className="h-3 w-3" />}
                </div>
                {currentUser?.name
                  ? currentUser.name.trim().split(/\s+/)[0]
                  : "Account"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`overflow-hidden transition-all duration-200 ${
            sidebarOpen ? "w-64" : "w-0"
          }`}
        >
          <ChatSidebar
            activeChatId={activeChatId}
            chats={savedChats}
            onSelect={handleSelectChat}
            onNew={handleNewChat}
            onDelete={handleDeleteChat}
          />
        </div>

        {/* Chat session — key forces full remount on chat switch */}
        <ChatSession
          key={chatKey}
          chatId={activeChatId}
          preloadedMessages={loadedMessages}
          onChatSaved={handleChatSaved}
          onRefreshSidebar={refreshSidebar}
        />
      </div>
    </div>
  );
}
