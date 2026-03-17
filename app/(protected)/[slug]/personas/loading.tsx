import { Skeleton } from "@/components/ui/skeleton";

export default function PersonasLoading() {
  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full pt-8">
      <div className="flex items-end justify-between mb-8">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-xl p-5 flex items-start gap-4">
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-full" />
              <div className="flex items-center gap-4 pt-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
