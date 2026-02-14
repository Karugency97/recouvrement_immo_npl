import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  FileText,
  Eye,
  MapPin,
  Mail,
  Phone,
  Euro,
  Scale,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, DocumentTypeBadge } from "@/components/shared/StatusBadge";
import { Timeline } from "@/components/timeline/Timeline";
import { MessageSender } from "@/components/messaging/MessageSender";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format-currency";
import { formatDate } from "@/lib/utils/format-date";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_CATEGORIES, CREANCE_TYPE_LABELS } from "@/lib/utils/constants";
import { requireAuth, getAuthToken } from "@/lib/dal";
import { getDossierById } from "@/lib/api/dossiers";
import { getCreances } from "@/lib/api/creances";
import { getDocuments } from "@/lib/api/documents";
import { getEvenements } from "@/lib/api/evenements";
import { getMessages } from "@/lib/api/messages";

/* -------------------------------------------------------------------------- */
/*  Info row helper                                                           */
/* -------------------------------------------------------------------------- */

function InfoRow({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-medium text-foreground", valueClassName)}>
          {value}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page component (Server Component — async)                                 */
/* -------------------------------------------------------------------------- */

export default async function DossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAuth();
  const token = (await getAuthToken())!;

  // Fetch dossier with relations
  let dossierRaw: Record<string, unknown>;
  try {
    dossierRaw = await getDossierById(token, id) as Record<string, unknown>;
  } catch {
    redirect("/dossiers");
  }

  const dossier = dossierRaw;
  const debiteur = dossier.debiteur_id as Record<string, unknown> | null;
  const copro = dossier.copropriete_id as Record<string, unknown> | null;
  const syndic = dossier.syndic_id as Record<string, unknown> | null;

  // Fetch related data in parallel
  const [creancesRaw, documentsRaw, evenementsRaw, messagesRaw] = await Promise.all([
    getCreances(token, id).catch(() => []),
    getDocuments(token, id).catch(() => []),
    getEvenements(token, id).catch(() => []),
    getMessages(token, id).catch(() => []),
  ]);

  const creances = creancesRaw as Record<string, unknown>[];
  const documents = documentsRaw as Record<string, unknown>[];
  const evenements = evenementsRaw as Record<string, unknown>[];
  const messages = messagesRaw as Record<string, unknown>[];

  const montantTotal = Number(dossier.montant_initial) || 0;
  const montantRecouvre = Number(dossier.montant_recouvre) || 0;
  const pourcentage =
    montantTotal > 0 ? Math.round((montantRecouvre / montantTotal) * 100) : 0;

  // Map evenements to timeline format
  const timelineEvents = evenements.map((evt, index) => ({
    id: evt.id as string,
    titre: (evt.titre as string) || "—",
    description: evt.description as string | null,
    date_evenement: evt.date_evenement as string,
    type: evt.type as string,
    state: (index === 0 ? "current" : "completed") as "completed" | "current" | "upcoming",
  }));

  // Map messages for MessageThread
  const mappedMessages = messages.map((msg) => {
    const expediteur = msg.expediteur_id as Record<string, unknown> | null;
    const pj = msg.piece_jointe as Record<string, unknown> | null;
    return {
      id: msg.id as string,
      contenu: (msg.contenu as string) || "",
      date_created: msg.date_created as string,
      expediteur_id: (expediteur?.id as string) || (msg.expediteur_id as string) || "",
      expediteur_nom: expediteur
        ? `${expediteur.first_name || ""} ${expediteur.last_name || ""}`.trim()
        : "—",
      expediteur_role: ((expediteur?.role as Record<string, unknown>)?.name as string)?.toLowerCase().includes("syndic")
        ? ("syndic" as const)
        : ("avocat" as const),
      piece_jointe: pj ? {
        id: pj.id as string,
        filename_download: pj.filename_download as string,
        type: pj.type as string,
      } : null,
    };
  });

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back link + header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
          <Link href="/dossiers">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour aux dossiers
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {(dossier.reference as string) || "—"}
              </h1>
              <StatusBadge status={(dossier.statut as string) || "nouveau"} />
            </div>
            <p className="text-muted-foreground mt-1">
              {debiteur
                ? `${debiteur.prenom || ""} ${debiteur.nom || ""}`.trim()
                : "—"}{" "}
              — {(copro?.nom as string) || "—"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(montantTotal)}
            </p>
            <p
              className={cn(
                "text-sm",
                pourcentage === 100 ? "text-emerald-600" : "text-muted-foreground"
              )}
            >
              {pourcentage > 0
                ? `${formatCurrency(montantRecouvre)} recouvre (${pourcentage}%)`
                : "Aucun recouvrement"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="apercu">
        <TabsList>
          <TabsTrigger value="apercu">Apercu</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>
        </TabsList>

        {/* ----- Tab: Apercu ----- */}
        <TabsContent value="apercu" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Debiteur info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Debiteur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow
                  icon={User}
                  label="Nom"
                  value={
                    debiteur
                      ? `${debiteur.prenom || ""} ${debiteur.nom || ""}`.trim()
                      : "—"
                  }
                />
                <InfoRow
                  icon={Building2}
                  label="Type"
                  value={
                    (debiteur?.type as string) === "personne_morale"
                      ? "Personne morale"
                      : "Personne physique"
                  }
                />
                {(debiteur?.adresse as string) ? (
                  <InfoRow
                    icon={MapPin}
                    label="Adresse"
                    value={`${debiteur!.adresse as string}${debiteur!.code_postal ? `, ${debiteur!.code_postal}` : ""} ${(debiteur!.ville as string) || ""}`}
                  />
                ) : null}
                {(debiteur?.email as string) ? (
                  <InfoRow icon={Mail} label="Email" value={debiteur!.email as string} />
                ) : null}
                {(debiteur?.telephone as string) ? (
                  <InfoRow icon={Phone} label="Telephone" value={debiteur!.telephone as string} />
                ) : null}
              </CardContent>
            </Card>

            {/* Dossier info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  Informations du dossier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow
                  icon={Building2}
                  label="Copropriete"
                  value={(copro?.nom as string) || "—"}
                />
                {(dossier.lot_description as string) ? (
                  <InfoRow
                    icon={MapPin}
                    label="Lot"
                    value={dossier.lot_description as string}
                  />
                ) : null}
                {(dossier.date_created as string) ? (
                  <InfoRow
                    icon={Calendar}
                    label="Date de creation"
                    value={formatDate(dossier.date_created as string)}
                  />
                ) : null}
                {(dossier.date_updated as string) ? (
                  <InfoRow
                    icon={Clock}
                    label="Derniere mise a jour"
                    value={formatDate(dossier.date_updated as string)}
                  />
                ) : null}
                {(syndic?.raison_sociale as string) ? (
                  <InfoRow
                    icon={Building2}
                    label="Syndic"
                    value={syndic!.raison_sociale as string}
                  />
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Creances */}
          {creances.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  Detail des creances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0 divide-y divide-border">
                  {creances.map((creance) => (
                    <div
                      key={creance.id as string}
                      className="flex items-center justify-between py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {CREANCE_TYPE_LABELS[(creance.type as string)] || (creance.type as string)}
                        </p>
                        {(creance.periode as string) ? (
                          <p className="text-xs text-muted-foreground">
                            {creance.periode as string}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency((creance.montant as number) || 0)}
                      </p>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Total</p>
                  <p className="text-base font-bold text-foreground">
                    {formatCurrency(montantTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {timelineEvents.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Historique
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline events={timelineEvents} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ----- Tab: Documents ----- */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Documents ({documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Aucun document
                </p>
              ) : (
                <div className="space-y-0 divide-y divide-border">
                  {documents.map((doc) => {
                    const docType = (doc.type as string) || "autre";
                    return (
                      <div
                        key={doc.id as string}
                        className="flex items-center justify-between py-3 gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-red-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {(doc.nom as string) || "Document"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <DocumentTypeBadge
                                category={DOCUMENT_CATEGORIES[docType] || "correspondance"}
                                label={DOCUMENT_TYPE_LABELS[docType] || docType}
                              />
                              {(doc.date_created as string) ? (
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(doc.date_created as string)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        {((doc.fichier as string) || (doc.fichier_id as string)) ? (
                          <Button variant="ghost" size="icon" className="shrink-0" asChild>
                            <a href={`/api/files/${(doc.fichier as string) || (doc.fichier_id as string)}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="shrink-0" disabled>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----- Tab: Messages ----- */}
        <TabsContent value="messages" className="mt-4">
          <MessageSender
            dossierId={id}
            messages={mappedMessages}
            currentUserId={user.id}
            currentUserName={[user.first_name, user.last_name].filter(Boolean).join(" ") || user.email}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
