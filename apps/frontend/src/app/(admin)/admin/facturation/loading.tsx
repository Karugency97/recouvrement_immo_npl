import {
  SkeletonPageHeader,
  SkeletonTableRows,
} from "@/components/shared/PageSkeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function FacturationLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonPageHeader />
        <Skeleton className="h-10 w-40" />
      </div>
      <SkeletonTableRows rows={6} cols={6} />
    </div>
  );
}
