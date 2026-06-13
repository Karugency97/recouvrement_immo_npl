"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/metier/StatusBadge";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { AdminMessageThread } from "@/components/admin/AdminMessageThread";
import { PushSecibPanel } from "@/components/admin/PushSecibPanel";
import { getByIdForCabinetQuery, type CabinetCaseDoc } from "@/lib/convexApi";

export default function AdminDossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const caseDoc = useQuery(getByIdForCabinetQuery, { caseId: id }) as
    | CabinetCaseDoc
    | null
    | undefined;

  if (caseDoc === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (caseDoc === null) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Dossier introuvable.</p>
        <Button asChild variant="outline">
          <Link href="/admin/dossiers" prefetch={false}>
            Retour aux dossiers
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {caseDoc.secibLibelle ?? caseDoc.debiteur?.nom ?? "Dossier"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {caseDoc.organizationName} · <StatusBadge status={caseDoc.status} />
          </p>
        </div>
        <StatusSelect caseId={caseDoc._id} status={caseDoc.status} />
      </div>

      <Tabs defaultValue="infos">
        <TabsList>
          <TabsTrigger value="infos">Infos</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="secib">SECIB</TabsTrigger>
        </TabsList>

        <TabsContent value="infos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Débiteur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {caseDoc.debiteur ? (
                <>
                  <p>
                    <span className="text-muted-foreground">Nom : </span>
                    {caseDoc.debiteur.nom} ({caseDoc.debiteur.type})
                  </p>
                  {caseDoc.debiteur.adresse && (
                    <p>
                      <span className="text-muted-foreground">Adresse : </span>
                      {caseDoc.debiteur.adresse}
                    </p>
                  )}
                  {caseDoc.debiteur.lotDescription && (
                    <p>
                      <span className="text-muted-foreground">Lot : </span>
                      {caseDoc.debiteur.lotDescription}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Pas de débiteur structuré (dossier importé de SECIB).
                </p>
              )}
              {caseDoc.principalCents !== undefined && (
                <p>
                  <span className="text-muted-foreground">Principal : </span>
                  {(caseDoc.principalCents / 100).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </p>
              )}
            </CardContent>
          </Card>

          {caseDoc.pieces && caseDoc.pieces.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pièces</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {caseDoc.pieces.map((p, i) => (
                  <p key={i} className="flex items-center justify-between">
                    <span>{p.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.requirement} · {p.status}
                    </span>
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardContent className="pt-6">
              <AdminMessageThread caseId={caseDoc._id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="secib">
          <PushSecibPanel
            caseId={caseDoc._id}
            pendingSecibPush={caseDoc.pendingSecibPush ?? false}
            secibDossierId={caseDoc.secibDossierId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
