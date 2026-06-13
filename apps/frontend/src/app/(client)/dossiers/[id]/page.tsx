"use client";

import { use, useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import { StatusBadge } from "@/components/metier/StatusBadge";
import { CaseTimeline } from "@/components/metier/CaseTimeline";
import {
  casesDuSyndicQuery,
  documentsDuDossierAction,
  telechargerDocumentAction,
  type CaseDoc,
  type DocumentContent,
  type GatewayResponse,
  type SecibDocumentEntry,
} from "@/lib/convexApi";

function fmtDate(ms?: number) {
  return ms ? new Date(ms).toLocaleDateString("fr-FR") : "—";
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

// Tab Documents — fetch à l'ouverture (action scopée auditée côté Convex).
function DocumentsTab({ caseId }: { caseId: string }) {
  const fetchDocs = useAction(documentsDuDossierAction);
  const download = useAction(telechargerDocumentAction);
  const [docs, setDocs] = useState<SecibDocumentEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocs({ caseId })
      .then((res) => {
        const payload = res as GatewayResponse<SecibDocumentEntry[]>;
        setDocs(payload.data ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // fetchDocs est stable (useAction) ; caseId est la seule vraie dep.
  }, [caseId, fetchDocs]);

  const onDownload = async (doc: SecibDocumentEntry) => {
    try {
      const content = (await download({
        caseId,
        documentId: doc.DocumentId,
      })) as DocumentContent;
      const bytes = Uint8Array.from(atob(content.contentBase64), (ch) =>
        ch.charCodeAt(0),
      );
      const blob = new Blob([bytes], { type: content.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = content.fileName || `${doc.Libelle ?? "document"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Téléchargement impossible");
    }
  };

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (docs === null) {
    return <Skeleton className="h-40" />;
  }
  if (docs.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun document.</p>;
  }

  const byRepertoire = new Map<string, SecibDocumentEntry[]>();
  for (const d of docs) {
    const key = d.RepertoireLibelle ?? "Autres";
    byRepertoire.set(key, [...(byRepertoire.get(key) ?? []), d]);
  }

  return (
    <div className="space-y-6">
      {[...byRepertoire.entries()].map(([repertoire, entries]) => (
        <div key={repertoire}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            {repertoire}
          </h3>
          <div className="divide-y divide-border rounded-lg border border-border">
            {entries.map((d) => (
              <div
                key={d.DocumentId}
                className="flex items-center justify-between gap-4 px-4 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{d.Libelle ?? d.DocumentId}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.Extension ?? ""}{" "}
                    {d.DateCreation
                      ? new Date(d.DateCreation).toLocaleDateString("fr-FR")
                      : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onDownload(d)}>
                  <Download className="mr-1 h-4 w-4" /> Télécharger
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const cases = useQuery(casesDuSyndicQuery) as CaseDoc[] | undefined;

  if (cases === undefined) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const caseDoc = cases.find((c) => c._id === id);
  if (!caseDoc) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Dossier introuvable ou n&apos;appartenant pas à votre organisation.
        </p>
      </div>
    );
  }

  const events = [
    {
      id: "created",
      date: caseDoc.createdAt,
      title: "Dossier créé",
      description: caseDoc.secibSnapshotAt ? "Importé depuis SECIB" : undefined,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{caseDoc.secibLibelle ?? "Dossier"}</h1>
        <StatusBadge status={caseDoc.status} />
      </div>

      <Tabs defaultValue="infos">
        <TabsList>
          <TabsTrigger value="infos">Infos</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="suivi">Suivi</TabsTrigger>
        </TabsList>

        <TabsContent value="infos">
          <Card>
            <CardContent className="pt-6">
              <InfoRow label="Matière" value={caseDoc.secibMatiereLibelle ?? "—"} />
              <InfoRow label="Responsable" value={caseDoc.secibResponsableNom ?? "—"} />
              <InfoRow label="Date d&apos;ouverture" value={fmtDate(caseDoc.secibDateOuverture)} />
              <InfoRow label="Référence SECIB" value={caseDoc.secibDossierId ?? "—"} />
              <InfoRow
                label="Montant principal"
                value={
                  caseDoc.principalCents !== undefined
                    ? `${(caseDoc.principalCents / 100).toLocaleString("fr-FR")} €`
                    : "À renseigner"
                }
              />
              <InfoRow label="Dernière mise à jour" value={fmtDate(caseDoc.updatedAt)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          {caseDoc.secibDossierId ? (
            <DocumentsTab caseId={caseDoc._id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Pas encore lié à SECIB.
            </p>
          )}
        </TabsContent>

        <TabsContent value="suivi">
          <CaseTimeline events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
