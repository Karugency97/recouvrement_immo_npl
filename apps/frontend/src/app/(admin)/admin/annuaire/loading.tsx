import {
  SkeletonPageHeader,
  SkeletonTableRows,
} from "@/components/shared/PageSkeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnnuaireLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <Skeleton className="h-10 w-full max-w-sm" />
      <SkeletonTableRows rows={8} cols={5} />
    </div>
  );
}
