import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b bg-background/95 z-10">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Logo */}
            <Skeleton className="w-7 h-7 rounded-lg" />
            <Skeleton className="w-20 h-4 rounded" />
            <div className="flex items-center gap-1 ml-2">
              <Skeleton className="w-16 h-8 rounded-md" />
              <Skeleton className="w-16 h-8 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar skeleton */}
        <aside className="hidden sm:flex flex-col w-56 shrink-0 border-r bg-muted/20 p-3 gap-2">
          <Skeleton className="w-full h-8 rounded-lg" />
          <div className="mt-2 space-y-1.5">
            {[80, 64, 72, 68, 76, 60].map((w, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
                <Skeleton className="w-5 h-5 rounded shrink-0" />
                <Skeleton className={`h-3.5 rounded`} style={{ width: w }} />
              </div>
            ))}
          </div>
        </aside>

        {/* Main chat area */}
        <div className="flex flex-col flex-1 min-w-0">
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
            {/* Settings bar */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-28 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
            {/* Prompt input */}
            <Skeleton className="w-full h-[76px] rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
