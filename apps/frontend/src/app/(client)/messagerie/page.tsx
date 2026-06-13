"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/metier/StatusBadge";
import { messagerieInboxQuery, type InboxEntry } from "@/lib/convexApi";

export default function MessageriePage() {
  const inbox = useQuery(messagerieInboxQuery) as InboxEntry[] | undefined;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Messagerie</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversations</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {inbox === undefined ? (
            <Skeleton className="h-24" />
          ) : inbox.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              {"Aucune conversation. Ouvrez un dossier pour écrire au cabinet."}
            </p>
          ) : (
            inbox.map((c) => (
              <Link
                key={c.caseId}
                href={`/dossiers/${c.caseId}`}
                prefetch={false}
                className="flex items-center justify-between gap-4 py-3 hover:bg-muted/50"
              >
                <span className="truncate text-sm">
                  {c.secibLibelle ?? "Dossier"}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.lastMessageAt).toLocaleDateString("fr-FR")}
                  </span>
                  <StatusBadge status={c.status} />
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
