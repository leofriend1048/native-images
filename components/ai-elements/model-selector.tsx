"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

// ─── Sub-components (match elements.ai-sdk.dev/components/model-selector API) ─

export const ModelSelector = Dialog;
export const ModelSelectorTrigger = DialogTrigger;

export function ModelSelectorContent({
  title = "Model Selector",
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent> & { title?: string }) {
  return (
    <DialogContent
      className={cn("overflow-hidden p-0 shadow-lg", className)}
      showCloseButton={false}
      {...props}
    >
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      {children}
    </DialogContent>
  );
}

export function ModelSelectorDialog({
  title,
  description,
  className,
  ...props
}: React.ComponentProps<typeof Command> & { title?: string; description?: string }) {
  return (
    <Command
      className={cn(
        "[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5",
        className
      )}
      {...props}
    />
  );
}

export const ModelSelectorInput = CommandInput;
export const ModelSelectorList = CommandList;
export const ModelSelectorEmpty = CommandEmpty;
export const ModelSelectorGroup = CommandGroup;
export const ModelSelectorSeparator = CommandSeparator;
export const ModelSelectorShortcut = CommandShortcut;

export function ModelSelectorItem({
  className,
  selected,
  children,
  ...props
}: React.ComponentProps<typeof CommandItem> & { selected?: boolean }) {
  return (
    <CommandItem
      className={cn("flex items-center justify-between gap-2", className)}
      {...props}
    >
      <span className="flex items-center gap-2 min-w-0">{children}</span>
      {selected && <CheckIcon className="size-4 shrink-0 text-primary" />}
    </CommandItem>
  );
}

export function ModelSelectorLogoGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center gap-1.5", className)} {...props} />
  );
}

const PROVIDER_LOGOS: Record<string, string> = {
  openai: "https://cdn.brandfetch.io/openai.com/icon",
  anthropic: "https://cdn.brandfetch.io/anthropic.com/icon",
  google: "https://cdn.brandfetch.io/google.com/icon",
  mistral: "https://cdn.brandfetch.io/mistral.ai/icon",
  meta: "https://cdn.brandfetch.io/meta.com/icon",
  cohere: "https://cdn.brandfetch.io/cohere.com/icon",
  replicate: "https://cdn.brandfetch.io/replicate.com/icon",
  bytedance: "https://cdn.brandfetch.io/bytedance.com/icon",
  ideogram: "https://cdn.brandfetch.io/ideogram.ai/icon",
};

export function ModelSelectorLogo({
  provider,
  className,
  ...props
}: Omit<React.ComponentProps<"img">, "src" | "alt"> & { provider: string }) {
  const src = PROVIDER_LOGOS[provider.toLowerCase()];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={provider}
      className={cn("size-4 rounded-sm object-contain", className)}
      {...props}
    />
  );
}

export function ModelSelectorName({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span className={cn("truncate text-sm", className)} {...props} />
  );
}
