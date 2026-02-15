import {
  SkeletonPageHeader,
  SkeletonTasksList,
} from "@/components/shared/PageSkeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function TachesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonPageHeader />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <SkeletonTasksList count={6} />
    </div>
  );
}
