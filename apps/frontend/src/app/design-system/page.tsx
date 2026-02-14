import {
  StatsCard,
  StatusBadge,
  DocumentTypeBadge,
  FinancialStatusBadge,
  DebtBadge,
  PriorityBadge,
  TaskStatusBadge,
  InvoiceStatusBadge,
  EmptyState,
  LoadingSpinner,
  FileIcon,
  CompactTimeline,
  DataTableHeader,
  SectionCard,
  InfoRow,
  InfoGrid,
} from "@/components/shared";
import { Timeline } from "@/components/timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderOpen,
  TrendingUp,
  Users,
  Euro,
  Search,
  Plus,
  Inbox,
} from "lucide-react";

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-8 py-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Design System
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          IMMO NPL — LegalRecover — Référence visuelle des composants
        </p>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-8 py-10">
        {/* ========== 1. COULEURS ========== */}
        <section>
          <SectionHeading
            title="Palette de couleurs"
            description="Tokens CSS définis en HSL dans globals.css"
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            <ColorSwatch name="Primary" color="#0f172a" css="--primary" />
            <ColorSwatch name="Indigo" color="#6366f1" css="--indigo" />
            <ColorSwatch name="Success" color="#10b981" css="--success" />
            <ColorSwatch name="Destructive" color="#ef4444" css="--destructive" />
            <ColorSwatch name="Warning" color="#f59e0b" css="--warning" />
            <ColorSwatch name="Info" color="#3b82f6" css="--info" />
            <ColorSwatch name="Background" color="#f8fafc" css="--background" />
            <ColorSwatch name="Card" color="#ffffff" css="--card" />
            <ColorSwatch name="Muted" color="#f1f5f9" css="--muted" />
            <ColorSwatch name="Border" color="#e2e8f0" css="--border" />
            <ColorSwatch name="Sidebar Client" color="#0f172a" css="slate-900" />
            <ColorSwatch name="Sidebar Admin" color="#020617" css="slate-950" />
          </div>
        </section>

        <Separator />

        {/* ========== 2. TYPOGRAPHIE ========== */}
        <section>
          <SectionHeading
            title="Typographie"
            description="Inter (body) + Playfair Display (display/brand)"
          />
          <div className="space-y-6 rounded-xl border bg-card p-6">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Display — Playfair Display</span>
              <p className="font-display text-4xl font-bold tracking-tight">LegalRecover — Recouvrement Immobilier</p>
            </div>
            <Separator />
            <div className="space-y-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Titres — Inter</span>
              <p className="text-3xl font-bold tracking-tight">Heading 1 — 30px bold</p>
              <p className="text-2xl font-semibold tracking-tight">Heading 2 — 24px semibold</p>
              <p className="text-xl font-semibold">Heading 3 — 20px semibold</p>
              <p className="text-lg font-medium">Heading 4 — 18px medium</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Corps de texte</span>
              <p className="text-base">Body — 16px regular. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
              <p className="text-sm">Body small (base) — 14px. Texte par défaut de l&apos;application.</p>
              <p className="text-xs text-muted-foreground">Caption — 12px muted. Sous-titres et métadonnées.</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* ========== 3. BOUTONS ========== */}
        <section>
          <SectionHeading
            title="Boutons"
            description="Variantes × tailles — composant Button (ShadCN enrichi)"
          />
          <div className="space-y-6 rounded-xl border bg-card p-6">
            {(
              [
                ["default", "Primary"],
                ["destructive", "Destructive"],
                ["outline", "Outline"],
                ["secondary", "Secondary"],
                ["ghost", "Ghost"],
                ["link", "Link"],
                ["success", "Success"],
                ["warning", "Warning"],
                ["info", "Info"],
                ["indigo", "Indigo"],
              ] as const
            ).map(([variant, label]) => (
              <div key={variant} className="flex flex-wrap items-center gap-3">
                <span className="w-24 text-xs font-medium text-muted-foreground">{label}</span>
                <Button variant={variant} size="sm">Small</Button>
                <Button variant={variant} size="default">Default</Button>
                <Button variant={variant} size="lg">Large</Button>
                <Button variant={variant} size="xl">Extra large</Button>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* ========== 4. BADGES ShadCN ========== */}
        <section>
          <SectionHeading
            title="Badges"
            description="Variantes ShadCN du composant Badge"
          />
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-6">
            {(
              [
                ["default", "Default"],
                ["secondary", "Secondary"],
                ["destructive", "Destructive"],
                ["outline", "Outline"],
                ["success", "Success"],
                ["warning", "Warning"],
                ["info", "Info"],
                ["indigo", "Indigo"],
                ["purple", "Purple"],
                ["muted", "Muted"],
              ] as const
            ).map(([variant, label]) => (
              <Badge key={variant} variant={variant}>{label}</Badge>
            ))}
          </div>
        </section>

        <Separator />

        {/* ========== 5. BADGES MÉTIER ========== */}
        <section>
          <SectionHeading
            title="Badges métier"
            description="Composants spécialisés pour les statuts, priorités et types"
          />
          <div className="space-y-6 rounded-xl border bg-card p-6">
            {/* StatusBadge */}
            <div>
              <p className="mb-2 text-sm font-medium">StatusBadge — Statuts dossier</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "nouveau", "en_cours", "mise_en_demeure", "assignation",
                  "injonction", "audience", "jugement", "execution",
                  "paye", "cloture", "irrecovrable",
                ].map((s) => (
                  <StatusBadge key={s} status={s} />
                ))}
              </div>
            </div>

            <Separator />

            {/* PriorityBadge */}
            <div>
              <p className="mb-2 text-sm font-medium">PriorityBadge — Priorités</p>
              <div className="flex flex-wrap gap-2">
                {["basse", "normale", "haute", "urgente"].map((p) => (
                  <PriorityBadge key={p} priority={p} />
                ))}
              </div>
            </div>

            <Separator />

            {/* TaskStatusBadge */}
            <div>
              <p className="mb-2 text-sm font-medium">TaskStatusBadge — Statuts tâche</p>
              <div className="flex flex-wrap gap-2">
                {["a_faire", "en_cours", "terminee", "annulee"].map((s) => (
                  <TaskStatusBadge key={s} status={s} />
                ))}
              </div>
            </div>

            <Separator />

            {/* InvoiceStatusBadge */}
            <div>
              <p className="mb-2 text-sm font-medium">InvoiceStatusBadge — Statuts facture</p>
              <div className="flex flex-wrap gap-2">
                {["brouillon", "emise", "envoyee", "payee", "en_retard", "annulee"].map((s) => (
                  <InvoiceStatusBadge key={s} status={s} />
                ))}
              </div>
            </div>

            <Separator />

            {/* DocumentTypeBadge */}
            <div>
              <p className="mb-2 text-sm font-medium">DocumentTypeBadge — Types de document</p>
              <div className="flex flex-wrap gap-2">
                <DocumentTypeBadge category="preuve" label="Preuve" />
                <DocumentTypeBadge category="procedure" label="Procédure" />
                <DocumentTypeBadge category="correspondance" label="Correspondance" />
              </div>
            </div>

            <Separator />

            {/* FinancialStatusBadge */}
            <div>
              <p className="mb-2 text-sm font-medium">FinancialStatusBadge — Statuts financiers</p>
              <div className="flex flex-wrap gap-2">
                <FinancialStatusBadge status="paye" label="Payé" />
                <FinancialStatusBadge status="en_attente" label="En attente" />
                <FinancialStatusBadge status="facture" label="Facturé" />
              </div>
            </div>

            <Separator />

            {/* DebtBadge */}
            <div>
              <p className="mb-2 text-sm font-medium">DebtBadge — Montant dette</p>
              <div className="flex flex-wrap gap-2">
                <DebtBadge amount="12 450,00 €" />
                <DebtBadge amount="3 200,00 €" />
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* ========== 6. CARTES ========== */}
        <section>
          <SectionHeading
            title="Cartes"
            description="StatsCard, SectionCard et Card standard"
          />
          <div className="space-y-6">
            {/* StatsCards */}
            <p className="text-sm font-medium text-muted-foreground">StatsCard</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                label="Dossiers actifs"
                value="127"
                subtitle="+12 ce mois"
                icon={FolderOpen}
                iconBgColor="bg-blue-100"
                iconColor="text-blue-600"
              />
              <StatsCard
                label="Taux recouvrement"
                value="68%"
                subtitle="Objectif : 75%"
                icon={TrendingUp}
                iconBgColor="bg-emerald-100"
                iconColor="text-emerald-600"
              />
              <StatsCard
                label="Débiteurs"
                value="89"
                subtitle="34 en procédure"
                icon={Users}
                iconBgColor="bg-indigo-100"
                iconColor="text-indigo-600"
              />
              <StatsCard
                label="Montant total"
                value="1,2M €"
                subtitle="Capital + intérêts"
                icon={Euro}
                iconBgColor="bg-amber-100"
                iconColor="text-amber-600"
                valueColor="text-emerald-600"
              />
            </div>

            {/* SectionCard */}
            <p className="text-sm font-medium text-muted-foreground">SectionCard</p>
            <SectionCard
              title="Informations du dossier"
              description="Détails généraux et métadonnées"
              action={<Button variant="outline" size="sm">Modifier</Button>}
            >
              <p className="text-sm text-muted-foreground">
                Contenu de la section. Peut contenir des formulaires, des listes, etc.
              </p>
            </SectionCard>

            {/* Card standard */}
            <p className="text-sm font-medium text-muted-foreground">Card standard (ShadCN)</p>
            <Card>
              <CardHeader>
                <CardTitle>Titre de la carte</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Carte ShadCN standard avec CardHeader et CardContent.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* ========== 7. FORMULAIRES ========== */}
        <section>
          <SectionHeading
            title="Formulaires"
            description="Champs de saisie et contrôles"
          />
          <div className="grid gap-6 rounded-xl border bg-card p-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="input-demo">Input</Label>
                <Input id="input-demo" placeholder="Entrez une valeur..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="input-search">Input avec icône</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="input-search" placeholder="Rechercher..." className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="textarea-demo">Textarea</Label>
                <Textarea id="textarea-demo" placeholder="Écrivez un commentaire..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Select</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                    <SelectItem value="option3">Option 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Checkbox id="checkbox-demo" />
                <Label htmlFor="checkbox-demo">Accepter les conditions</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="switch-demo" />
                <Label htmlFor="switch-demo">Activer les notifications</Label>
              </div>
              <div className="space-y-2">
                <Label>Progression</Label>
                <Progress value={65} />
                <p className="text-xs text-muted-foreground">65% complété</p>
              </div>
              <div className="space-y-2">
                <Label>Input désactivé</Label>
                <Input disabled placeholder="Non modifiable" />
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* ========== 8. ÉTATS ========== */}
        <section>
          <SectionHeading
            title="États"
            description="EmptyState, LoadingSpinner et PageLoader"
          />
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6">
              <p className="mb-4 text-sm font-medium text-muted-foreground">EmptyState</p>
              <EmptyState
                icon={Inbox}
                title="Aucun dossier trouvé"
                description="Ajoutez un nouveau dossier pour commencer le suivi."
                action={<Button variant="indigo" size="sm"><Plus className="mr-1 h-4 w-4" /> Nouveau dossier</Button>}
              />
            </div>
            <div className="rounded-xl border bg-card p-6">
              <p className="mb-4 text-sm font-medium text-muted-foreground">LoadingSpinner — 3 tailles</p>
              <div className="flex items-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-xs text-muted-foreground">sm</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <LoadingSpinner size="md" />
                  <span className="text-xs text-muted-foreground">md</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <LoadingSpinner size="lg" />
                  <span className="text-xs text-muted-foreground">lg</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <p className="mb-4 text-sm font-medium text-muted-foreground">PageLoader (inline preview)</p>
              <div className="flex h-32 items-center justify-center rounded-lg bg-muted/50">
                <LoadingSpinner size="lg" />
                <span className="ml-3 text-sm text-muted-foreground">Chargement...</span>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* ========== 9. TIMELINE ========== */}
        <section>
          <SectionHeading
            title="Timeline"
            description="Timeline verticale et CompactTimeline horizontale"
          />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-6">
              <p className="mb-4 text-sm font-medium text-muted-foreground">Timeline verticale</p>
              <Timeline
                events={[
                  {
                    id: "1",
                    titre: "Dossier créé",
                    description: "Ouverture du dossier LR-2026-001",
                    date_evenement: "2026-01-15T10:00:00",
                    type: "creation",
                    state: "completed",
                  },
                  {
                    id: "2",
                    titre: "Mise en demeure envoyée",
                    description: "Courrier recommandé AR expédié",
                    date_evenement: "2026-01-28T14:30:00",
                    type: "courrier",
                    state: "current",
                  },
                  {
                    id: "3",
                    titre: "Audience prévue",
                    description: null,
                    date_evenement: "2026-03-10T09:00:00",
                    type: "audience",
                    state: "upcoming",
                  },
                ]}
              />
            </div>
            <div className="rounded-xl border bg-card p-6">
              <p className="mb-4 text-sm font-medium text-muted-foreground">CompactTimeline horizontale</p>
              <CompactTimeline
                steps={[
                  { label: "Amiable", state: "completed" },
                  { label: "Pré-contentieux", state: "completed" },
                  { label: "Contentieux", state: "current" },
                  { label: "Exécution", state: "upcoming" },
                ]}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* ========== 10. DATA TABLE HEADER ========== */}
        <section>
          <SectionHeading
            title="DataTableHeader"
            description="Barre de recherche et filtres pour les tableaux"
          />
          <div className="rounded-xl border bg-card p-6">
            <DataTableHeader
              searchPlaceholder="Rechercher un dossier..."
              searchValue=""
              filters={[
                {
                  key: "statut",
                  label: "Statut",
                  options: [
                    { value: "nouveau", label: "Nouveau" },
                    { value: "en_cours", label: "En cours" },
                    { value: "paye", label: "Payé" },
                  ],
                },
                {
                  key: "priorite",
                  label: "Priorité",
                  options: [
                    { value: "basse", label: "Basse" },
                    { value: "normale", label: "Normale" },
                    { value: "haute", label: "Haute" },
                    { value: "urgente", label: "Urgente" },
                  ],
                },
              ]}
            >
              <Button variant="indigo" size="sm">
                <Plus className="mr-1 h-4 w-4" /> Nouveau
              </Button>
            </DataTableHeader>
          </div>
        </section>

        <Separator />

        {/* ========== 11. INFO ROW ========== */}
        <section>
          <SectionHeading
            title="InfoRow & InfoGrid"
            description="Lignes d'information label/valeur"
          />
          <div className="rounded-xl border bg-card p-6">
            <InfoGrid columns={2}>
              <InfoRow label="Référence" value="LR-2026-042" />
              <InfoRow label="Statut" value={<StatusBadge status="en_cours" />} />
              <InfoRow label="Syndic" value="Cabinet Martin & Associés" />
              <InfoRow label="Priorité" value={<PriorityBadge priority="haute" />} />
              <InfoRow label="Montant principal" value="12 450,00 €" />
              <InfoRow label="Date de création" value="15/01/2026" />
            </InfoGrid>
          </div>
        </section>

        <Separator />

        {/* ========== 12. FILE ICON ========== */}
        <section>
          <SectionHeading
            title="FileIcon"
            description="Icônes par type de fichier"
          />
          <div className="flex flex-wrap items-end gap-6 rounded-xl border bg-card p-6">
            {[
              "rapport.pdf",
              "contrat.docx",
              "tableau.xlsx",
              "photo.jpg",
              "archive.zip",
            ].map((filename) => (
              <div key={filename} className="flex flex-col items-center gap-2">
                <FileIcon filename={filename} className="h-8 w-8" />
                <span className="text-xs text-muted-foreground">{filename}</span>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* ========== 13. OMBRES & RADIUS ========== */}
        <section>
          <SectionHeading
            title="Ombres & Radius"
            description="Tokens d'élévation et arrondis"
          />
          <div className="space-y-6">
            <p className="text-sm font-medium text-muted-foreground">Ombres</p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="flex h-24 items-center justify-center rounded-xl border bg-card shadow-sm">
                <span className="text-sm text-muted-foreground">shadow-sm</span>
              </div>
              <div className="flex h-24 items-center justify-center rounded-xl border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
                <span className="text-sm text-muted-foreground">shadow-card</span>
              </div>
              <div className="flex h-24 items-center justify-center rounded-xl border bg-card" style={{ boxShadow: "var(--shadow-elevated)" }}>
                <span className="text-sm text-muted-foreground">shadow-elevated</span>
              </div>
            </div>

            <p className="text-sm font-medium text-muted-foreground">Border radius</p>
            <div className="flex flex-wrap items-end gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded bg-indigo-100 text-xs text-indigo-700">
                4px
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-md bg-indigo-100 text-xs text-indigo-700">
                6px
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-indigo-100 text-xs text-indigo-700">
                8px
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-indigo-100 text-xs text-indigo-700">
                12px
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-100 text-xs text-indigo-700">
                16px
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-xs text-indigo-700">
                pill
              </div>
            </div>
          </div>
        </section>

        <div className="h-12" />
      </main>
    </div>
  );
}

/* ---------- Internal helper components ---------- */

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ColorSwatch({
  name,
  color,
  css,
}: {
  name: string;
  color: string;
  css: string;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className="h-16 w-full rounded-lg border shadow-sm"
        style={{ backgroundColor: color }}
      />
      <p className="text-xs font-medium">{name}</p>
      <p className="font-mono text-[10px] text-muted-foreground">{color}</p>
      <p className="font-mono text-[10px] text-muted-foreground">{css}</p>
    </div>
  );
}
