import {
  SkeletonPageHeader,
  SkeletonStatsGrid,
  SkeletonDossierCards,
} from "@/components/shared/PageSkeletons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonStatsGrid count={4} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-20" />
        </CardHeader>
        <CardContent>
          <SkeletonDossierCards count={3} />
        </CardContent>
      </Card>
    </div>
  );
}
