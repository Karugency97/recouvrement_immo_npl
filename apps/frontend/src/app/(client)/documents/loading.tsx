import {
  SkeletonPageHeader,
  SkeletonTableRows,
} from "@/components/shared/PageSkeletons";

export default function DocumentsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonTableRows rows={6} cols={4} />
    </div>
  );
}
