"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Euro,
  FileUp,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { UploadZone } from "@/components/documents/UploadZone";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Debiteur", icon: User },
  { label: "Creance", icon: Euro },
  { label: "Pieces", icon: FileUp },
  { label: "Validation", icon: CheckCircle },
] as const;

interface Copropriete {
  id: string;
  nom: string;
}

interface WizardFormProps {
  coproprietes: Copropriete[];
  userId: string;
}

interface DebiteurData {
  type: string;
  nom: string;
  adresse: string;
  email: string;
  telephone: string;
  lot_description: string;
}

interface CreanceData {
  copropriete_id: string;
  copropriete_nom: string;
  montant: string;
  periode_debut: string;
  periode_fin: string;
  nb_relances: string;
  observations: string;
}

interface PiecesData {
  releve_compte: File | null;
  appels_fonds: File | null;
  contrat_syndic: File | null;
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                  isCompleted && "bg-emerald-100 text-emerald-600",
                  isActive && "bg-primary text-primary-foreground",
                  !isCompleted && !isActive && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <StepIcon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 sm:w-12 mx-2 mb-5 rounded-full transition-colors",
                  isCompleted ? "bg-emerald-300" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground font-medium text-right truncate">{value}</span>
    </div>
  );
}

export function WizardForm({ coproprietes, userId }: WizardFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [debiteur, setDebiteur] = useState<DebiteurData>({
    type: "",
    nom: "",
    adresse: "",
    email: "",
    telephone: "",
    lot_description: "",
  });

  const [creance, setCreance] = useState<CreanceData>({
    copropriete_id: "",
    copropriete_nom: "",
    montant: "",
    periode_debut: "",
    periode_fin: "",
    nb_relances: "",
    observations: "",
  });

  const [pieces, setPieces] = useState<PiecesData>({
    releve_compte: null,
    appels_fonds: null,
    contrat_syndic: null,
  });

  const isNewCopro = creance.copropriete_id === "__new__";

  const canGoNext = () => {
    if (currentStep === 0) return debiteur.type && debiteur.nom && debiteur.adresse;
    if (currentStep === 1) {
      const hasCopro = isNewCopro ? creance.copropriete_nom.trim() : creance.copropriete_id;
      return hasCopro && creance.montant;
    }
    return true;
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep((s) => s + 1);
  };
  const goPrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const updateDebiteur = (field: keyof DebiteurData, value: string) =>
    setDebiteur((prev) => ({ ...prev, [field]: value }));
  const updateCreance = (field: keyof CreanceData, value: string) =>
    setCreance((prev) => ({ ...prev, [field]: value }));
  const updatePiece = (field: keyof PiecesData, file: File | null) =>
    setPieces((prev) => ({ ...prev, [field]: file }));

  const coproDisplayName = () => {
    if (isNewCopro) return creance.copropriete_nom || "—";
    const found = coproprietes.find((c) => c.id === creance.copropriete_id);
    return found?.nom || "—";
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("debiteur_type", debiteur.type);
      formData.append("debiteur_nom", debiteur.nom);
      formData.append("debiteur_adresse", debiteur.adresse);
      formData.append("debiteur_email", debiteur.email);
      formData.append("debiteur_telephone", debiteur.telephone);
      formData.append("lot_description", debiteur.lot_description);
      formData.append("copropriete_id", isNewCopro ? "__new__" : creance.copropriete_id);
      formData.append("copropriete_nom", isNewCopro ? creance.copropriete_nom : coproDisplayName());
      formData.append("montant", creance.montant);
      formData.append("periode_debut", creance.periode_debut);
      formData.append("periode_fin", creance.periode_fin);
      formData.append("observations", creance.observations);

      if (pieces.releve_compte) formData.append("releve_compte", pieces.releve_compte);
      if (pieces.appels_fonds) formData.append("appels_fonds", pieces.appels_fonds);
      if (pieces.contrat_syndic) formData.append("contrat_syndic", pieces.contrat_syndic);

      const res = await fetch("/api/dossiers/create", { method: "POST", body: formData });
      const result = await res.json();

      if (result.success) {
        toast.success("Dossier cree avec succes");
        router.push(`/dossiers/${result.dossier_id}`);
      } else {
        toast.error(result.error || "Erreur lors de la creation");
      }
    } catch {
      toast.error("Erreur lors de la creation du dossier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type de debiteur <span className="text-red-500">*</span></Label>
              <Select value={debiteur.type} onValueChange={(v) => updateDebiteur("type", v)}>
                <SelectTrigger><SelectValue placeholder="Selectionnez le type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personne_physique">Personne physique</SelectItem>
                  <SelectItem value="personne_morale">Personne morale (SCI, societe...)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nom complet / Raison sociale <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Ex: M. Jean Dupont ou SCI Les Tilleuls"
                value={debiteur.nom}
                onChange={(e) => updateDebiteur("nom", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Adresse <span className="text-red-500">*</span></Label>
              <Input
                placeholder="12 rue des Acacias, 75016 Paris"
                value={debiteur.adresse}
                onChange={(e) => updateDebiteur("adresse", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="debiteur@email.com"
                  value={debiteur.email}
                  onChange={(e) => updateDebiteur("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Telephone</Label>
                <Input
                  type="tel"
                  placeholder="01 42 36 78 90"
                  value={debiteur.telephone}
                  onChange={(e) => updateDebiteur("telephone", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description du lot</Label>
              <Input
                placeholder="Ex: Lot 14 — T3, 2e etage"
                value={debiteur.lot_description}
                onChange={(e) => updateDebiteur("lot_description", e.target.value)}
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Copropriete <span className="text-red-500">*</span></Label>
              <Select
                value={creance.copropriete_id}
                onValueChange={(v) => updateCreance("copropriete_id", v)}
              >
                <SelectTrigger><SelectValue placeholder="Selectionnez une copropriete" /></SelectTrigger>
                <SelectContent>
                  {coproprietes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                  ))}
                  <SelectItem value="__new__">+ Autre (nouvelle copropriete)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isNewCopro && (
              <div className="space-y-2">
                <Label>Nom de la nouvelle copropriete <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Ex: Residence Parc Monceau"
                  value={creance.copropriete_nom}
                  onChange={(e) => updateCreance("copropriete_nom", e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Montant total de la creance (EUR) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="8 450,00"
                value={creance.montant}
                onChange={(e) => updateCreance("montant", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Debut de la periode</Label>
                <Input
                  type="date"
                  value={creance.periode_debut}
                  onChange={(e) => updateCreance("periode_debut", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fin de la periode</Label>
                <Input
                  type="date"
                  value={creance.periode_fin}
                  onChange={(e) => updateCreance("periode_fin", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nombre de relances deja effectuees</Label>
              <Select value={creance.nb_relances} onValueChange={(v) => updateCreance("nb_relances", v)}>
                <SelectTrigger><SelectValue placeholder="Selectionnez" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Aucune</SelectItem>
                  <SelectItem value="1">1 relance</SelectItem>
                  <SelectItem value="2">2 relances</SelectItem>
                  <SelectItem value="3">3 relances ou plus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observations</Label>
              <Textarea
                placeholder="Informations complementaires sur la creance..."
                rows={3}
                value={creance.observations}
                onChange={(e) => updateCreance("observations", e.target.value)}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Joignez les documents necessaires a l&apos;instruction du dossier.
              Les formats acceptes sont PDF, DOC et DOCX.
            </p>
            <UploadZone label="Releve de compte copropriete" required onFileChange={(f) => updatePiece("releve_compte", f)} />
            <UploadZone label="Appels de fonds" required onFileChange={(f) => updatePiece("appels_fonds", f)} />
            <UploadZone label="Contrat de syndic" onFileChange={(f) => updatePiece("contrat_syndic", f)} />
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Verifiez les informations ci-dessous avant de soumettre le dossier.
            </p>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Debiteur</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-1.5">
                <SummaryRow label="Type" value={debiteur.type === "personne_physique" ? "Personne physique" : debiteur.type === "personne_morale" ? "Personne morale" : "—"} />
                <SummaryRow label="Nom" value={debiteur.nom || "—"} />
                <SummaryRow label="Adresse" value={debiteur.adresse || "—"} />
                <SummaryRow label="Email" value={debiteur.email || "—"} />
                <SummaryRow label="Telephone" value={debiteur.telephone || "—"} />
                <SummaryRow label="Lot" value={debiteur.lot_description || "—"} />
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Creance</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-1.5">
                <SummaryRow label="Copropriete" value={coproDisplayName()} />
                <SummaryRow
                  label="Montant"
                  value={creance.montant ? `${Number(creance.montant).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} EUR` : "—"}
                />
                <SummaryRow
                  label="Periode"
                  value={creance.periode_debut && creance.periode_fin ? `${creance.periode_debut} — ${creance.periode_fin}` : "—"}
                />
                <SummaryRow label="Relances effectuees" value={creance.nb_relances || "—"} />
                {creance.observations && <SummaryRow label="Observations" value={creance.observations} />}
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Pieces jointes</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-1.5">
                <SummaryRow label="Releve de compte" value={pieces.releve_compte?.name || "Non fourni"} />
                <SummaryRow label="Appels de fonds" value={pieces.appels_fonds?.name || "Non fourni"} />
                <SummaryRow label="Contrat de syndic" value={pieces.contrat_syndic?.name || "Non fourni"} />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <Stepper currentStep={currentStep} />
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <CardTitle className="text-lg mb-4">{steps[currentStep].label}</CardTitle>
        {renderStep()}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
          <Button variant="ghost" onClick={goPrev} disabled={currentStep === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Precedent
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button onClick={goNext} disabled={!canGoNext()}>
              Suivant
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Soumettre le dossier
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
