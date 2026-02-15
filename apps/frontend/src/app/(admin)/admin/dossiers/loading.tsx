import {
  SkeletonPageHeader,
  SkeletonTableRows,
} from "@/components/shared/PageSkeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDossiersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonPageHeader />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-10" />
      </div>
      <SkeletonTableRows rows={8} cols={7} />
    </div>
  );
}
