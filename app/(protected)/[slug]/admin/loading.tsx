import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Left panel */}
        <div className="lg:w-96 shrink-0 space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-4 w-24 rounded" />
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16 rounded" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border">
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-px w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border">
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            ))}
          </div>
        </div>
        {/* Right panel */}
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-4 w-24 rounded mx-auto" />
            <Skeleton className="h-3 w-48 rounded mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
