import {
  SkeletonPageHeader,
  SkeletonStatsGrid,
  SkeletonTableRows,
  SkeletonTasksList,
} from "@/components/shared/PageSkeletons";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonStatsGrid count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-24" />
          </CardHeader>
          <SkeletonTableRows rows={5} cols={5} />
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-24" />
          </CardHeader>
          <SkeletonTasksList count={4} />
        </Card>
      </div>
    </div>
  );
}
