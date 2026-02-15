import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  FileText,
  MessageSquare,
  StickyNote,
  Eye,
  CalendarDays,
  Building2,
  User,
  MapPin,
  Phone,
  Mail,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Timeline } from "@/components/timeline/Timeline";
import { MessageSender } from "@/components/messaging/MessageSender";
import { MarkAsReadTrigger } from "@/components/messaging/MarkAsReadTrigger";
import { AddHeureDialog } from "@/components/admin/AddHeureDialog";
import { AddNoteDialog } from "@/components/admin/AddNoteDialog";
import { DossierStatusSelect } from "@/components/admin/DossierStatusSelect";
import { requireAuth, getAuthToken } from "@/lib/dal";
import { getDossierById } from "@/lib/api/dossiers";
import { getCreances } from "@/lib/api/creances";
import { getDocuments } from "@/lib/api/documents";
import { getEvenements } from "@/lib/api/evenements";
import { getMessages } from "@/lib/api/messages";
import { getHeures } from "@/lib/api/heures";
import { getNotes } from "@/lib/api/notes";
import { formatCurrency } from "@/lib/utils/format-currency";
import { formatDate } from "@/lib/utils/format-date";
import { CREANCE_TYPE_LABELS, DOCUMENT_TYPE_LABELS } from "@/lib/utils/constants";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminDossierDetailPage({ params }: PageProps) {
  const user = await requireAuth();
  const token = (await getAuthToken())!;
  const { id } = await params;

  const [dossierRaw, creancesRaw, documentsRaw, evenementsRaw, messagesRaw, heuresRaw, notesRaw] =
    await Promise.all([
      getDossierById(token, id).catch(() => null),
      getCreances(token, id).catch(() => []),
      getDocuments(token, id).catch(() => []),
      getEvenements(token, id).catch(() => []),
      getMessages(token, id).catch(() => []),
      getHeures(token, { dossier_id: { _eq: id } }).catch(() => []),
      getNotes(token, id).catch(() => []),
    ]);

  if (!dossierRaw) {
    return (
      <div className="animate-fade-in space-y-6">
        <Link
          href="/admin/dossiers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux dossiers
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Dossier introuvable
          </CardContent>
        </Card>
      </div>
    );
  }

  const dossier = dossierRaw as Record<string, unknown>;
  const creances = creancesRaw as Record<string, unknown>[];
  const documents = documentsRaw as Record<string, unknown>[];
  const evenements = evenementsRaw as Record<string, unknown>[];
  const messagesData = messagesRaw as Record<string, unknown>[];
  const heures = heuresRaw as Record<string, unknown>[];
  const notes = notesRaw as Record<string, unknown>[];

  // Extract nested relations
  const debiteur = dossier.debiteur_id as Record<string, unknown> | null;
  const syndic = dossier.syndic_id as Record<string, unknown> | null;
  const copropriete = dossier.copropriete_id as Record<string, unknown> | null;
  const statut = (dossier.statut as string) || "nouveau";

  // Calculate totals from creances
  const totalCreances = creances.reduce(
    (sum, c) => sum + (Number(c.montant) || 0),
    0
  );

  // Map evenements to timeline events
  const timelineEvents = evenements.map((e, idx) => ({
    id: (e.id as string) || `e-${idx}`,
    titre: (e.titre as string) || "Evenement",
    description: (e.description as string) || null,
    date_evenement: (e.date_evenement as string) || (e.date_created as string) || "",
    type: (e.type as string) || "autre",
    state: (idx === 0 ? "current" : "completed") as "completed" | "current" | "upcoming",
  }));

  // Map messages for MessageSender
  const formattedMessages = messagesData.map((m) => {
    const exp = m.expediteur_id as Record<string, unknown> | null;
    const expRole = (exp?.role as Record<string, unknown>)?.name as string | undefined;
    const isAvocat =
      expRole?.toLowerCase().includes("avocat") ||
      expRole?.toLowerCase().includes("admin");
    const pj = m.piece_jointe as Record<string, unknown> | null;
    return {
      id: (m.id as string) || "",
      contenu: (m.contenu as string) || "",
      date_created: (m.date_created as string) || "",
      expediteur_id: (exp?.id as string) || (m.expediteur_id as string) || "",
      expediteur_nom: exp
        ? `${(exp.first_name as string) || ""} ${(exp.last_name as string) || ""}`.trim()
        : "Inconnu",
      expediteur_role: (isAvocat ? "avocat" : "syndic") as "avocat" | "syndic",
      piece_jointe: pj ? {
        id: pj.id as string,
        filename_download: pj.filename_download as string,
        type: pj.type as string,
      } : null,
    };
  });

  const currentUserName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back link */}
      <Link
        href="/admin/dossiers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux dossiers
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {(dossier.reference as string) || "Sans reference"}
            </h1>
            <StatusBadge status={statut} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {debiteur
              ? `${(debiteur.prenom as string) || ""} ${(debiteur.nom as string) || ""}`.trim()
              : "—"}
            {" — "}
            {(copropriete?.nom as string) || "—"}
          </p>
        </div>
        <DossierStatusSelect dossierId={id} currentStatus={statut} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="apercu" className="space-y-4">
        <TabsList>
          <TabsTrigger value="apercu" className="gap-1.5">
            <Eye className="h-4 w-4" />
            Apercu
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Timeline
            {timelineEvents.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {timelineEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="heures" className="gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Heures
            {heures.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {heures.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <StickyNote className="h-4 w-4" />
            Notes
            {notes.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {notes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Documents
            {documents.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {documents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Messages
            {formattedMessages.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {formattedMessages.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ---- Apercu ---- */}
        <TabsContent value="apercu">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dossier info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4 text-indigo-600" />
                  Informations du Dossier
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Reference</p>
                    <p className="text-sm font-medium">
                      {(dossier.reference as string) || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date de creation</p>
                    <p className="text-sm font-medium">
                      {dossier.date_created
                        ? formatDate(dossier.date_created as string)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Statut</p>
                    <StatusBadge status={statut} className="mt-0.5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phase</p>
                    <p className="text-sm font-medium capitalize">
                      {((dossier.phase as string) || "—").replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                <Separator />
                {/* Creances breakdown */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Creances</p>
                  {creances.length > 0 ? (
                    <div className="space-y-2">
                      {creances.map((c, idx) => (
                        <div
                          key={(c.id as string) || idx}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {CREANCE_TYPE_LABELS[(c.type as string)] || (c.type as string) || "Creance"}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(Number(c.montant) || 0)}
                          </span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Total</span>
                        <span className="text-red-600">
                          {formatCurrency(
                            totalCreances || Number(dossier.montant_initial) || 0
                          )}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total</span>
                      <span className="text-red-600">
                        {formatCurrency(Number(dossier.montant_initial) || 0)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Parties */}
            <div className="space-y-6">
              {/* Debiteur */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-red-600" />
                    Debiteur
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {debiteur ? (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {`${(debiteur.prenom as string) || ""} ${(debiteur.nom as string) || ""}`.trim() || "—"}
                        </span>
                        <span className="text-muted-foreground">
                          ({(debiteur.type as string) === "personne_morale"
                            ? "Personne morale"
                            : "Personne physique"})
                        </span>
                      </div>
                      {(debiteur.adresse as string) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span>{debiteur.adresse as string}</span>
                        </div>
                      )}
                      {(debiteur.email as string) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4 shrink-0" />
                          <span>{debiteur.email as string}</span>
                        </div>
                      )}
                      {(debiteur.telephone as string) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4 shrink-0" />
                          <span>{debiteur.telephone as string}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun debiteur associe</p>
                  )}
                </CardContent>
              </Card>

              {/* Syndic / Copropriete */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Syndic / Copropriete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">
                      {(syndic?.raison_sociale as string) || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(copropriete?.nom as string) || "—"}
                    </p>
                  </div>
                  {(copropriete?.adresse as string) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{copropriete?.adresse as string}</span>
                    </div>
                  )}
                  {(syndic?.email as string) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span>{syndic?.email as string}</span>
                    </div>
                  )}
                  {(syndic?.telephone as string) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{syndic?.telephone as string}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ---- Timeline ---- */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique du dossier</CardTitle>
            </CardHeader>
            <CardContent>
              {timelineEvents.length > 0 ? (
                <Timeline events={timelineEvents} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun evenement
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Heures ---- */}
        <TabsContent value="heures">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Heures enregistrees</CardTitle>
              <AddHeureDialog dossierId={id} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Duree</TableHead>
                    <TableHead>Avocat</TableHead>
                    <TableHead>Facture</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {heures.map((h) => {
                    const minutes = Number(h.duree_minutes) || 0;
                    const dureeStr = `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
                    const avocat = h.avocat_id as Record<string, unknown> | null;
                    const avocatNom = avocat
                      ? `${(avocat.first_name as string) || ""} ${(avocat.last_name as string) || ""}`.trim()
                      : "—";
                    const isFacture = !!(h.facture_id as string | null);
                    return (
                      <TableRow key={h.id as string} className="table-row-hover">
                        <TableCell className="pl-6 text-sm">
                          {h.date ? formatDate(h.date as string) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {(h.description as string) || "—"}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{dureeStr}</TableCell>
                        <TableCell className="text-sm">{avocatNom}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
                              isFacture
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            )}
                          >
                            {isFacture ? "Facturee" : "Non facturee"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {heures.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucune heure enregistree
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Notes ---- */}
        <TabsContent value="notes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Notes internes</CardTitle>
              <AddNoteDialog dossierId={id} />
            </CardHeader>
            <CardContent>
              {notes.length > 0 ? (
                <div className="space-y-4">
                  {notes.map((n) => {
                    const auteur = n.auteur_id as Record<string, unknown> | null;
                    const auteurNom = auteur
                      ? `${(auteur.first_name as string) || ""} ${(auteur.last_name as string) || ""}`.trim()
                      : "—";
                    return (
                      <div
                        key={n.id as string}
                        className="rounded-lg border bg-muted/30 p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {auteurNom}
                            </p>
                            {(n.type as string) && (n.type as string) !== "interne" && (
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                {(n.type as string)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {n.date_created
                              ? formatDate(n.date_created as string)
                              : "—"}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {(n.contenu as string) || "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune note
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Documents ---- */}
        <TabsContent value="documents">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Nom du fichier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => {
                    const typeDoc = (doc.type as string) || "autre";
                    const fileId = (doc.fichier as string) || (doc.fichier_id as string) || null;
                    const viewUrl = fileId ? `/api/files/${fileId}` : null;
                    return (
                      <TableRow key={doc.id as string} className="table-row-hover">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium">
                              {(doc.nom as string) || (doc.titre as string) || "Document"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200">
                            {DOCUMENT_TYPE_LABELS[typeDoc] || typeDoc}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {doc.date_created
                            ? formatDate(doc.date_created as string)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {viewUrl ? (
                            <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </a>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {documents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Aucun document
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Messages ---- */}
        <TabsContent value="messages">
          <MarkAsReadTrigger dossierId={id} />
          <MessageSender
            dossierId={id}
            messages={formattedMessages}
            currentUserId={user.id}
            currentUserName={currentUserName}
            senderRole="avocat"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
