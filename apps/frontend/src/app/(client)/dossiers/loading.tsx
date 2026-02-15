import {
  SkeletonPageHeader,
  SkeletonDossierCards,
} from "@/components/shared/PageSkeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function DossiersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SkeletonPageHeader />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <SkeletonDossierCards count={5} />
    </div>
  );
}
