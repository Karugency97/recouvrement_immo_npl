import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  FileText,
  Download,
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
import { MessageThread } from "@/components/messaging/MessageThread";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format-currency";
import { formatDate } from "@/lib/utils/format-date";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_CATEGORIES } from "@/lib/utils/constants";

/* -------------------------------------------------------------------------- */
/*  Placeholder data (will be replaced by Directus API calls)                 */
/* -------------------------------------------------------------------------- */

const dossier = {
  id: "1",
  reference: "LR-2026-042",
  statut: "mise_en_demeure",
  phase: "pre_contentieux",
  date_created: "2026-02-10T10:30:00",
  date_updated: "2026-02-11T16:00:00",
  debiteur: {
    nom: "SCI Les Tilleuls",
    type: "personne_morale",
    adresse: "12 rue des Acacias, 75016 Paris",
    email: "contact@sci-tilleuls.fr",
    telephone: "01 42 36 78 90",
  },
  copropriete: "Residence Parc Monceau",
  lot_description: "Lot 14 — T3, 2e etage",
  montant_total: 8450.0,
  montant_recouvre: 0,
  creances: [
    {
      id: "c1",
      type: "charges_copropriete",
      montant: 6200.0,
      periode: "T1 2025 — T4 2025",
    },
    { id: "c2", type: "penalites", montant: 1250.0, periode: "2025" },
    {
      id: "c3",
      type: "frais_recouvrement",
      montant: 1000.0,
      periode: "2026",
    },
  ],
  avocat: "Me Laurent Dubois",
};

const documents = [
  {
    id: "d1",
    nom: "Releve de compte copropriete 2025.pdf",
    type: "releve_compte" as const,
    taille: "245 Ko",
    date: "2026-02-10",
  },
  {
    id: "d2",
    nom: "Appels de fonds T1-T4 2025.pdf",
    type: "appel_fonds" as const,
    taille: "180 Ko",
    date: "2026-02-10",
  },
  {
    id: "d3",
    nom: "Contrat de syndic.pdf",
    type: "contrat_syndic" as const,
    taille: "1.2 Mo",
    date: "2026-02-10",
  },
  {
    id: "d4",
    nom: "Mise en demeure — SCI Les Tilleuls.pdf",
    type: "mise_en_demeure" as const,
    taille: "320 Ko",
    date: "2026-02-11",
  },
];

const timelineEvents = [
  {
    id: "t1",
    titre: "Dossier cree",
    description: "Dossier transmis par le syndic",
    date_evenement: "2026-02-10T10:30:00",
    type: "creation",
    state: "completed" as const,
  },
  {
    id: "t2",
    titre: "Analyse en cours",
    description: "Verification des pieces et calcul des creances",
    date_evenement: "2026-02-10T14:00:00",
    type: "statut",
    state: "completed" as const,
  },
  {
    id: "t3",
    titre: "Mise en demeure envoyee",
    description: "Courrier recommande avec AR envoye au debiteur",
    date_evenement: "2026-02-11T16:00:00",
    type: "statut",
    state: "current" as const,
  },
  {
    id: "t4",
    titre: "Delai de reponse",
    description: "Attente de la reponse du debiteur sous 15 jours",
    date_evenement: "2026-02-26T00:00:00",
    type: "echeance",
    state: "upcoming" as const,
  },
];

const messages = [
  {
    id: "m1",
    contenu:
      "Bonjour, nous avons bien recu le dossier concernant la SCI Les Tilleuls. Les pieces justificatives sont completes. Nous procedons a l'envoi de la mise en demeure.",
    date_created: "2026-02-10T15:30:00",
    expediteur_id: "avocat-1",
    expediteur_nom: "Me Laurent Dubois",
    expediteur_role: "avocat" as const,
  },
  {
    id: "m2",
    contenu:
      "Merci pour votre retour rapide. La situation avec ce debiteur dure depuis plus d'un an. N'hesitez pas si vous avez besoin d'informations complementaires.",
    date_created: "2026-02-10T16:45:00",
    expediteur_id: "syndic-1",
    expediteur_nom: "Marie Leroy",
    expediteur_role: "syndic" as const,
  },
  {
    id: "m3",
    contenu:
      "La mise en demeure a ete envoyee en recommande AR ce jour. Le delai de reponse est de 15 jours. Je vous tiendrai informe des suites.",
    date_created: "2026-02-11T16:15:00",
    expediteur_id: "avocat-1",
    expediteur_nom: "Me Laurent Dubois",
    expediteur_role: "avocat" as const,
  },
];

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
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

export default function DossierDetailPage() {
  const pourcentage =
    dossier.montant_total > 0
      ? Math.round((dossier.montant_recouvre / dossier.montant_total) * 100)
      : 0;

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
                {dossier.reference}
              </h1>
              <StatusBadge status={dossier.statut} />
            </div>
            <p className="text-muted-foreground mt-1">
              {dossier.debiteur.nom} — {dossier.copropriete}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(dossier.montant_total)}
            </p>
            <p
              className={cn(
                "text-sm",
                pourcentage === 100 ? "text-emerald-600" : "text-muted-foreground"
              )}
            >
              {pourcentage > 0
                ? `${formatCurrency(dossier.montant_recouvre)} recouvre (${pourcentage}%)`
                : "Aucun recouvrement"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="apercu">
        <TabsList>
          <TabsTrigger value="apercu">Apercu</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
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
                  value={dossier.debiteur.nom}
                />
                <InfoRow
                  icon={Building2}
                  label="Type"
                  value={
                    dossier.debiteur.type === "personne_morale"
                      ? "Personne morale"
                      : "Personne physique"
                  }
                />
                <InfoRow
                  icon={MapPin}
                  label="Adresse"
                  value={dossier.debiteur.adresse}
                />
                <InfoRow
                  icon={Mail}
                  label="Email"
                  value={dossier.debiteur.email}
                />
                <InfoRow
                  icon={Phone}
                  label="Telephone"
                  value={dossier.debiteur.telephone}
                />
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
                  value={dossier.copropriete}
                />
                <InfoRow
                  icon={MapPin}
                  label="Lot"
                  value={dossier.lot_description}
                />
                <InfoRow
                  icon={Calendar}
                  label="Date de creation"
                  value={formatDate(dossier.date_created)}
                />
                <InfoRow
                  icon={Clock}
                  label="Derniere mise a jour"
                  value={formatDate(dossier.date_updated)}
                />
                <InfoRow
                  icon={Scale}
                  label="Avocat en charge"
                  value={dossier.avocat}
                />
              </CardContent>
            </Card>
          </div>

          {/* Creances */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground" />
                Detail des creances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0 divide-y divide-border">
                {dossier.creances.map((creance) => (
                  <div
                    key={creance.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">
                        {creance.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {creance.periode}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(creance.montant)}
                    </p>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Total</p>
                <p className="text-base font-bold text-foreground">
                  {formatCurrency(dossier.montant_total)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
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
              <div className="space-y-0 divide-y divide-border">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between py-3 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {doc.nom}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <DocumentTypeBadge
                            category={
                              DOCUMENT_CATEGORIES[doc.type] || "correspondance"
                            }
                            label={
                              DOCUMENT_TYPE_LABELS[doc.type] || doc.type
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {doc.taille}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(doc.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----- Tab: Messages ----- */}
        <TabsContent value="messages" className="mt-4">
          <MessageThread
            messages={messages}
            currentUserId="syndic-1"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
