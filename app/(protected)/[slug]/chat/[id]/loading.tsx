import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-hidden px-4 py-6 space-y-6">
        {/* User message */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-56 rounded-2xl rounded-br-sm" />
        </div>
        {/* AI message with image placeholder */}
        <div className="flex flex-col gap-3 max-w-lg">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded-full shrink-0" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          <Skeleton className="w-64 h-80 rounded-2xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
        </div>
        {/* Another user message */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-40 rounded-2xl rounded-br-sm" />
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 px-4 pb-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-28 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
        <Skeleton className="w-full h-[76px] rounded-2xl" />
      </div>
    </div>
  );
}
