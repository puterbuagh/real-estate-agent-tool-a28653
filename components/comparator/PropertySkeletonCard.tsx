import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

function PropertySkeletonCard() {
  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="relative h-44 w-full bg-muted">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
      <div className="flex-1 p-5 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
        <div className="space-y-2 pt-2 border-t border-border">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </Card>
  );
}

export { PropertySkeletonCard };
export default PropertySkeletonCard;
