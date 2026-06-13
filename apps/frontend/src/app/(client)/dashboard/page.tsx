"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/metier/StatusBadge";
import {
  casesDuSyndicQuery,
  type CaseDoc,
  type CaseStatus,
} from "@/lib/convexApi";

// Dashboard syndic — minimal honnête (décision Q3 S3a) : compteurs par
// statut + derniers dossiers mis à jour. Une seule query realtime.
export default function DashboardPage() {
  const cases = useQuery(casesDuSyndicQuery) as CaseDoc[] | undefined;

  if (cases === undefined) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const byStatus = new Map<CaseStatus, number>();
  for (const c of cases) byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1);
  const recent = [...cases].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <Button asChild>
          <Link href="/dossiers" prefetch={false}>Voir tous les dossiers ({cases.length})</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...byStatus.entries()].map(([status, count]) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <StatusBadge status={status} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{count}</p>
              <p className="text-xs text-muted-foreground">
                dossier{count > 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Derniers dossiers mis à jour</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {recent.map((c) => (
            <Link
              key={c._id}
              href={`/dossiers/${c._id}`}
              prefetch={false}
              className="flex items-center justify-between gap-4 py-3 hover:bg-muted/50"
            >
              <span className="truncate text-sm">{c.secibLibelle ?? "Dossier"}</span>
              <StatusBadge status={c.status} />
            </Link>
          ))}
          {recent.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">Aucun dossier.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
