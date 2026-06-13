"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  getMyDraftQuery,
  saveDraftMutation,
  submitDraftMutation,
  type CasSpecial,
  type DraftDoc,
  type WizardData,
} from "@/lib/convexApi";
import { buildPieces } from "@/lib/pieces";

const STEPS = ["Débiteur", "Créance", "Pièces", "Validation"] as const;

const CAS_SPECIAUX: { value: CasSpecial; label: string }[] = [
  { value: "INDIVISION", label: "Indivision" },
  { value: "DECEDE", label: "Débiteur décédé" },
  { value: "REDRESSEMENT", label: "Redressement / liquidation" },
  { value: "LOT_LOUE", label: "Lot loué" },
  { value: "MULTI_LOTS", label: "Plusieurs lots, même débiteur" },
];

const EMPTY: WizardData = {
  debiteur: { type: "PP", nom: "", adresse: "", email: "", telephone: "", lotDescription: "" },
  creance: { montant: "", dateExigibilite: "", periodeDebut: "", periodeFin: "", nbRelances: "", observations: "" },
  casSpecial: [],
};

export default function NouveauDossierPage() {
  const router = useRouter();
  const draft = useQuery(getMyDraftQuery) as DraftDoc | null | undefined;
  const saveDraft = useMutation(saveDraftMutation);
  const submitDraft = useMutation(submitDraftMutation);

  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Réhydrate le brouillon existant une seule fois.
  useEffect(() => {
    if (hydrated || draft === undefined) return;
    if (draft) {
      setData(draft.wizardData);
      setStep(Number(draft.currentStep) || 0);
      setResumed(true);
    }
    setHydrated(true);
  }, [draft, hydrated]);

  // Auto-save debouncé (~1,5 s).
  const scheduleSave = useCallback(
    (next: WizardData, nextStep: number) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await saveDraft({
            casSpecial: next.casSpecial,
            debiteurNom: next.debiteur.nom || undefined,
            principalCents: next.creance.montant
              ? Math.round(parseFloat(next.creance.montant) * 100)
              : undefined,
            currentStep: String(nextStep),
            wizardData: next,
          });
        } catch {
          // Échec silencieux : retry au prochain changement.
        } finally {
          setSaving(false);
        }
      }, 1500);
    },
    [saveDraft],
  );

  const update = (next: WizardData, nextStep = step) => {
    setData(next);
    if (hydrated) scheduleSave(next, nextStep);
  };

  const setDebiteur = (patch: Partial<WizardData["debiteur"]>) =>
    update({ ...data, debiteur: { ...data.debiteur, ...patch } });
  const setCreance = (patch: Partial<WizardData["creance"]>) =>
    update({ ...data, creance: { ...data.creance, ...patch } });
  const toggleCas = (cas: CasSpecial) => {
    const has = data.casSpecial.includes(cas);
    update({
      ...data,
      casSpecial: has ? data.casSpecial.filter((c) => c !== cas) : [...data.casSpecial, cas],
    });
  };

  const canNext = () => {
    if (step === 0) return data.debiteur.type && data.debiteur.nom.trim();
    if (step === 1) return data.creance.montant && parseFloat(data.creance.montant) > 0 && data.creance.dateExigibilite;
    return true;
  };

  const goTo = (s: number) => {
    setStep(s);
    if (hydrated) scheduleSave(data, s);
  };

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      const res = (await submitDraft({
        debiteur: {
          type: data.debiteur.type,
          nom: data.debiteur.nom.trim(),
          adresse: data.debiteur.adresse || undefined,
          email: data.debiteur.email || undefined,
          telephone: data.debiteur.telephone || undefined,
          lotDescription: data.debiteur.lotDescription || undefined,
        },
        principalCents: Math.round(parseFloat(data.creance.montant) * 100),
        principalDateExigibilite: new Date(data.creance.dateExigibilite).getTime(),
        periodeDebut: data.creance.periodeDebut ? new Date(data.creance.periodeDebut).getTime() : undefined,
        periodeFin: data.creance.periodeFin ? new Date(data.creance.periodeFin).getTime() : undefined,
        nbRelances: data.creance.nbRelances ? Number(data.creance.nbRelances) : undefined,
        observations: data.creance.observations || undefined,
        casSpecial: data.casSpecial,
      })) as { caseId: string };
      toast.success("Dossier créé. Le cabinet va le contrôler.");
      router.push(`/dossiers/${res.caseId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setSubmitting(false);
    }
  };

  if (draft === undefined) {
    return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  }

  const pieces = buildPieces(data.casSpecial);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Nouveau dossier</h1>

      {resumed && (
        <p className="rounded-md bg-info/10 px-3 py-2 text-sm text-info">
          Brouillon repris automatiquement.
        </p>
      )}

      {/* Stepper */}
      <div className="flex items-center gap-2 text-sm">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={
              i === step
                ? "font-semibold text-primary"
                : i < step
                  ? "text-foreground"
                  : "text-muted-foreground"
            }
          >
            {i + 1}. {label}
            {i < STEPS.length - 1 && <span className="mx-1 text-muted-foreground">→</span>}
          </span>
        ))}
        {saving && <span className="ml-auto text-xs text-muted-foreground">Enregistré…</span>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Type de débiteur</Label>
                <RadioGroup
                  value={data.debiteur.type}
                  onValueChange={(v) => setDebiteur({ type: v as "PP" | "PM" })}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="PP" id="pp" />
                    <Label htmlFor="pp">Personne physique</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="PM" id="pm" />
                    <Label htmlFor="pm">Personne morale</Label>
                  </div>
                </RadioGroup>
              </div>
              <Field label="Nom *" value={data.debiteur.nom} onChange={(v) => setDebiteur({ nom: v })} />
              <Field label="Adresse" value={data.debiteur.adresse} onChange={(v) => setDebiteur({ adresse: v })} />
              <Field label="Email" value={data.debiteur.email} onChange={(v) => setDebiteur({ email: v })} />
              <Field label="Téléphone" value={data.debiteur.telephone} onChange={(v) => setDebiteur({ telephone: v })} />
              <Field label="Description du lot" value={data.debiteur.lotDescription} onChange={(v) => setDebiteur({ lotDescription: v })} />
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Montant principal (€) *" type="number" value={data.creance.montant} onChange={(v) => setCreance({ montant: v })} />
              <Field label="Date d'exigibilité *" type="date" value={data.creance.dateExigibilite} onChange={(v) => setCreance({ dateExigibilite: v })} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Période début" type="date" value={data.creance.periodeDebut} onChange={(v) => setCreance({ periodeDebut: v })} />
                <Field label="Période fin" type="date" value={data.creance.periodeFin} onChange={(v) => setCreance({ periodeFin: v })} />
              </div>
              <Field label="Nombre de relances" type="number" value={data.creance.nbRelances} onChange={(v) => setCreance({ nbRelances: v })} />
              <div className="space-y-2">
                <Label>Observations</Label>
                <Textarea value={data.creance.observations} onChange={(e) => setCreance({ observations: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cas particuliers</Label>
                {CAS_SPECIAUX.map((c) => (
                  <div key={c.value} className="flex items-center gap-2">
                    <Checkbox
                      id={c.value}
                      checked={data.casSpecial.includes(c.value)}
                      onCheckedChange={() => toggleCas(c.value)}
                    />
                    <Label htmlFor={c.value}>{c.label}</Label>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                {"Pièces à fournir pour ce dossier. Vous les transmettrez au cabinet à l'étape suivante du suivi."}
              </p>
              <ul className="space-y-2">
                {pieces.map((p) => (
                  <li key={p.type} className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2 text-sm">
                    <span>{p.type}</span>
                    <Badge variant="outline" className="capitalize">{p.requirement}</Badge>
                  </li>
                ))}
              </ul>
              {data.casSpecial.includes("REDRESSEMENT") && (
                <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
                  {"Redressement / liquidation : la procédure est spécifique (déclaration de créance). Le cabinet vous recontactera."}
                </p>
              )}
            </>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <Recap label="Débiteur" value={`${data.debiteur.type === "PP" ? "Personne physique" : "Personne morale"} — ${data.debiteur.nom}`} />
              <Recap label="Montant" value={data.creance.montant ? `${data.creance.montant} €` : "—"} />
              <Recap label="Exigibilité" value={data.creance.dateExigibilite || "—"} />
              <Recap label="Cas particuliers" value={data.casSpecial.length ? data.casSpecial.join(", ") : "Aucun"} />
              <Recap label="Pièces" value={`${pieces.length} à fournir`} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => goTo(step - 1)}>
          Précédent
        </Button>
        {step < STEPS.length - 1 ? (
          <Button disabled={!canNext()} onClick={() => goTo(step + 1)}>
            Suivant
          </Button>
        ) : (
          <Button disabled={submitting} onClick={onSubmit}>
            {submitting ? "Création…" : "Créer le dossier"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
