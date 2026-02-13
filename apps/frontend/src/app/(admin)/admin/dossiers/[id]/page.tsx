"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
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
  Download,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Timeline } from "@/components/timeline/Timeline";
import { MessageThread } from "@/components/messaging/MessageThread";

/* ------------------------------------------------------------------ */
/*  Placeholder data                                                   */
/* ------------------------------------------------------------------ */

const dossier = {
  id: "d1",
  reference: "LR-2026-047",
  statut: "mise_en_demeure",
  phase: "pre_contentieux",
  copropriete: "Residence Les Oliviers",
  adresse: "12 avenue des Oliviers, 75016 Paris",
  syndic: "Foncia Paris Ouest",
  syndic_email: "contact@foncia-parisouest.fr",
  syndic_telephone: "01 42 88 12 34",
  debiteur_nom: "Martin Dupont",
  debiteur_type: "Personne physique",
  debiteur_adresse: "12 avenue des Oliviers, Apt 4B, 75016 Paris",
  debiteur_email: "m.dupont@email.fr",
  debiteur_telephone: "06 12 34 56 78",
  montant_principal: "14 200,00 \u20AC",
  montant_frais: "2 450,00 \u20AC",
  montant_interets: "1 800,00 \u20AC",
  montant_total: "18 450,00 \u20AC",
  date_creation: "10/02/2026",
  date_mise_en_demeure: "25/01/2026",
  avocat: "Me Claire Fontaine",
};

const timelineEvents = [
  {
    id: "e1",
    titre: "Creation du dossier",
    description: "Dossier cree par Foncia Paris Ouest",
    date_evenement: "2026-01-10T09:30:00",
    type: "creation",
    state: "completed" as const,
  },
  {
    id: "e2",
    titre: "Envoi de la mise en demeure",
    description: "LRAR envoyee au debiteur",
    date_evenement: "2026-01-25T14:00:00",
    type: "mise_en_demeure",
    state: "completed" as const,
  },
  {
    id: "e3",
    titre: "Relance telephonique",
    description: "Tentative de contact - sans reponse",
    date_evenement: "2026-02-05T10:15:00",
    type: "relance",
    state: "completed" as const,
  },
  {
    id: "e4",
    titre: "Analyse du dossier en cours",
    description: "Preparation de l'assignation si pas de reponse sous 15 jours",
    date_evenement: "2026-02-10T11:00:00",
    type: "analyse",
    state: "current" as const,
  },
  {
    id: "e5",
    titre: "Assignation prevue",
    description: null,
    date_evenement: "2026-02-25T09:00:00",
    type: "assignation",
    state: "upcoming" as const,
  },
];

const heures = [
  {
    id: "h1",
    date: "10/02/2026",
    description: "Analyse pieces justificatives",
    duree: "1h30",
    avocat: "Me Claire Fontaine",
    facture: false,
  },
  {
    id: "h2",
    date: "05/02/2026",
    description: "Relance telephonique debiteur",
    duree: "0h15",
    avocat: "Me Claire Fontaine",
    facture: false,
  },
  {
    id: "h3",
    date: "25/01/2026",
    description: "Redaction mise en demeure",
    duree: "2h00",
    avocat: "Me Claire Fontaine",
    facture: true,
  },
  {
    id: "h4",
    date: "15/01/2026",
    description: "Etude du dossier et pieces",
    duree: "1h00",
    avocat: "Me Claire Fontaine",
    facture: true,
  },
];

const notes = [
  {
    id: "n1",
    date: "10/02/2026",
    auteur: "Me Claire Fontaine",
    contenu:
      "Le debiteur ne repond ni aux courriers ni aux appels. Preparer l'assignation pour le 25/02 si pas de retour.",
  },
  {
    id: "n2",
    date: "25/01/2026",
    auteur: "Me Claire Fontaine",
    contenu:
      "Mise en demeure envoyee en LRAR. Delai de reponse fixe a 15 jours.",
  },
  {
    id: "n3",
    date: "10/01/2026",
    auteur: "Me Claire Fontaine",
    contenu:
      "Dossier recu du syndic Foncia. Charges impayees depuis 18 mois. Montant principal : 14 200 EUR.",
  },
];

const documents = [
  {
    id: "doc1",
    nom: "Mise en demeure - Dupont.pdf",
    type: "Mise en demeure",
    date: "25/01/2026",
    taille: "245 Ko",
  },
  {
    id: "doc2",
    nom: "Releve de compte copropriete.pdf",
    type: "Releve de compte",
    date: "10/01/2026",
    taille: "1,2 Mo",
  },
  {
    id: "doc3",
    nom: "Appel de fonds Q4 2025.pdf",
    type: "Appel de fonds",
    date: "10/01/2026",
    taille: "380 Ko",
  },
  {
    id: "doc4",
    nom: "PV AG 2025.pdf",
    type: "Proces-verbal",
    date: "10/01/2026",
    taille: "890 Ko",
  },
];

const messages = [
  {
    id: "m1",
    contenu:
      "Bonjour Me Fontaine, nous vous transmettons le dossier de M. Dupont. Les charges sont impayees depuis 18 mois.",
    date_created: "2026-01-10T09:45:00",
    expediteur_id: "syndic-1",
    expediteur_nom: "Laurent Mercier",
    expediteur_role: "syndic" as const,
  },
  {
    id: "m2",
    contenu:
      "Bien recu. J'ai etudie les pieces, tout est en ordre. Je procede a l'envoi de la mise en demeure.",
    date_created: "2026-01-15T11:20:00",
    expediteur_id: "avocat-1",
    expediteur_nom: "Me Claire Fontaine",
    expediteur_role: "avocat" as const,
  },
  {
    id: "m3",
    contenu:
      "Mise en demeure envoyee en LRAR le 25/01. Nous attendons le retour du debiteur sous 15 jours.",
    date_created: "2026-01-25T15:00:00",
    expediteur_id: "avocat-1",
    expediteur_nom: "Me Claire Fontaine",
    expediteur_role: "avocat" as const,
  },
  {
    id: "m4",
    contenu:
      "Merci pour le suivi. Tenez-nous au courant de l'evolution. Avez-vous besoin de pieces supplementaires ?",
    date_created: "2026-01-26T09:10:00",
    expediteur_id: "syndic-1",
    expediteur_nom: "Laurent Mercier",
    expediteur_role: "syndic" as const,
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminDossierDetailPage() {
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
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {dossier.reference}
              </h1>
              <StatusBadge status={dossier.statut} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {dossier.debiteur_nom} &mdash; {dossier.copropriete}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle action
          </Button>
        </div>
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
          </TabsTrigger>
          <TabsTrigger value="heures" className="gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Heures
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <StickyNote className="h-4 w-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Messages
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
                    <p className="text-sm font-medium">{dossier.reference}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Date de creation
                    </p>
                    <p className="text-sm font-medium">
                      {dossier.date_creation}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Statut</p>
                    <StatusBadge status={dossier.statut} className="mt-0.5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avocat</p>
                    <p className="text-sm font-medium">{dossier.avocat}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Montants
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Principal</span>
                      <span className="font-medium">
                        {dossier.montant_principal}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Frais</span>
                      <span className="font-medium">
                        {dossier.montant_frais}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Interets</span>
                      <span className="font-medium">
                        {dossier.montant_interets}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total</span>
                      <span className="text-red-600">
                        {dossier.montant_total}
                      </span>
                    </div>
                  </div>
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
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{dossier.debiteur_nom}</span>
                    <span className="text-muted-foreground">
                      ({dossier.debiteur_type})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{dossier.debiteur_adresse}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>{dossier.debiteur_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{dossier.debiteur_telephone}</span>
                  </div>
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
                    <p className="text-sm font-medium">{dossier.syndic}</p>
                    <p className="text-xs text-muted-foreground">
                      {dossier.copropriete}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{dossier.adresse}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>{dossier.syndic_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{dossier.syndic_telephone}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ---- Timeline ---- */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Historique du dossier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline events={timelineEvents} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Heures ---- */}
        <TabsContent value="heures">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Heures enregistrees</CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter des heures
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Duree</TableHead>
                    <TableHead>Avocat</TableHead>
                    <TableHead>Facture</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {heures.map((h) => (
                    <TableRow key={h.id} className="table-row-hover">
                      <TableCell className="text-sm">{h.date}</TableCell>
                      <TableCell className="text-sm">
                        {h.description}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {h.duree}
                      </TableCell>
                      <TableCell className="text-sm">{h.avocat}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
                            h.facture
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-amber-100 text-amber-700 border-amber-200"
                          )}
                        >
                          {h.facture ? "Facturee" : "Non facturee"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
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
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une note
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-lg border bg-muted/30 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground">
                        {n.auteur}
                      </p>
                      <p className="text-xs text-muted-foreground">{n.date}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {n.contenu}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Documents ---- */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Documents</CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un document
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom du fichier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium">
                            {doc.nom}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200">
                          {doc.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.date}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.taille}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Messages ---- */}
        <TabsContent value="messages">
          <MessageThread
            messages={messages}
            currentUserId="avocat-1"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
