import { Skeleton } from "@/components/ui/skeleton";

export default function GalleryLoading() {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Filters bar skeleton */}
      <div className="shrink-0 border-b px-4 py-2 flex items-center gap-2">
        <Skeleton className="h-5 w-12 rounded" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
        <div className="w-px h-4 bg-border mx-1" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Grid skeleton */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
          {[160, 220, 180, 200, 240, 170, 190, 210, 165, 230, 185, 195].map((h, i) => (
            <div key={i} className="break-inside-avoid mb-3">
              <div className="rounded-xl border bg-muted overflow-hidden">
                <Skeleton className="w-full rounded-none" style={{ height: h }} />
                <div className="p-2.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-4 w-10 rounded-full" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-3 w-12 rounded ml-auto" />
                  </div>
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-4/5 rounded" />
                  <div className="flex gap-1 pt-0.5">
                    <Skeleton className="h-6 w-12 rounded" />
                    <Skeleton className="h-6 w-10 rounded" />
                    <Skeleton className="h-6 w-14 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
