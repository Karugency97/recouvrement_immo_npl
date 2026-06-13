"use client";

import { useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  previewPushAction,
  runPushAction,
  referentialsForPushQuery,
  type PreviewPushResult,
  type ReferentialOption,
} from "@/lib/convexApi";

// Parse défensif d'un payload référentiel SECIB (forme non garantie :
// array | { data } | { Resultats }) vers [{ id, label }]. id = premier
// champ numérique nommé *Id ; label = premier champ texte plausible.
function parseReferential(
  payload: unknown,
  idKeys: string[],
  labelKeys: string[],
): ReferentialOption[] {
  const arr = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? (payload as { data: unknown[] }).data
      : Array.isArray((payload as { Resultats?: unknown })?.Resultats)
        ? (payload as { Resultats: unknown[] }).Resultats
        : [];
  const out: ReferentialOption[] = [];
  for (const item of arr) {
    const o = item as Record<string, unknown>;
    const idKey = idKeys.find((k) => typeof o[k] === "number");
    if (!idKey) continue;
    const labelKey = labelKeys.find((k) => typeof o[k] === "string");
    out.push({
      id: o[idKey] as number,
      label: labelKey ? String(o[labelKey]) : String(o[idKey]),
    });
  }
  return out;
}

export function PushSecibPanel({
  caseId,
  pendingSecibPush,
  secibDossierId,
}: {
  caseId: string;
  pendingSecibPush: boolean;
  secibDossierId?: string;
}) {
  const referentials = useQuery(referentialsForPushQuery) as
    | { matieres: unknown; intervenants: unknown }
    | undefined;
  const preview = useAction(previewPushAction);
  const runPush = useAction(runPushAction);

  const [previewData, setPreviewData] = useState<PreviewPushResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [matiereId, setMatiereId] = useState<string>("");
  const [responsableId, setResponsableId] = useState<string>("");
  const [reusePersonneId, setReusePersonneId] = useState<string>("");
  const [pushing, setPushing] = useState(false);
  const [pushedDossierId, setPushedDossierId] = useState<string | null>(null);

  const matiereOptions = useMemo(
    () =>
      referentials
        ? parseReferential(
            referentials.matieres,
            ["MatiereId", "Id"],
            ["Libelle", "Nom", "Designation"],
          )
        : [],
    [referentials],
  );
  const intervenantOptions = useMemo(
    () =>
      referentials
        ? parseReferential(
            referentials.intervenants,
            ["UtilisateurId", "IntervenantId", "Id"],
            ["NomComplet", "Nom", "Libelle"],
          )
        : [],
    [referentials],
  );

  // Déjà poussé.
  if (!pendingSecibPush && secibDossierId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SECIB</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          Déjà dans SECIB — dossier <strong>{secibDossierId}</strong>.
        </CardContent>
      </Card>
    );
  }

  // Pas un dossier wizard à pousser.
  if (!pendingSecibPush) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SECIB</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Ce dossier n&apos;est pas en attente de push.
        </CardContent>
      </Card>
    );
  }

  const onPreview = async () => {
    setLoadingPreview(true);
    try {
      const result = (await preview({ caseId })) as PreviewPushResult;
      setPreviewData(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aperçu impossible");
    } finally {
      setLoadingPreview(false);
    }
  };

  const onPush = async () => {
    const m = Number(matiereId);
    const r = Number(responsableId);
    if (!Number.isFinite(m) || !Number.isFinite(r) || !matiereId || !responsableId) {
      toast.error("Choisissez une matière et un responsable.");
      return;
    }
    setPushing(true);
    try {
      const res = (await runPush({
        caseId,
        matiereId: m,
        responsableId: r,
        ...(reusePersonneId ? { reuseDebiteurPersonneId: Number(reusePersonneId) } : {}),
      })) as { secibDossierId: string; code: string | null };
      setPushedDossierId(res.secibDossierId);
      toast.success(`Poussé dans SECIB — dossier ${res.code ?? res.secibDossierId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Push échoué");
    } finally {
      setPushing(false);
    }
  };

  if (pushedDossierId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SECIB</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          Poussé — dossier SECIB <strong>{pushedDossierId}</strong>.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pousser dans SECIB</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!previewData ? (
          <Button onClick={onPreview} disabled={loadingPreview}>
            {loadingPreview ? "Aperçu…" : "Aperçu du push"}
          </Button>
        ) : (
          <>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Débiteur (Personne adversaire) : </span>
                {previewData.debiteur.nom} ({previewData.debiteur.type})
              </p>
              <p>
                <span className="text-muted-foreground">Syndic (Personne client) : </span>
                {previewData.syndicName} — PersonneId {previewData.syndicPersonneId}
              </p>
              {previewData.existingMatches.length > 0 && (
                <p className="text-warning">
                  {previewData.existingMatches.length} homonyme(s) dans SECIB —
                  réutiliser un PersonneId existant ci-dessous pour éviter un doublon.
                </p>
              )}
            </div>

            {referentials === undefined ? (
              <Skeleton className="h-10" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Matière</label>
                  <Select value={matiereId} onValueChange={setMatiereId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une matière" />
                    </SelectTrigger>
                    <SelectContent>
                      {matiereOptions.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Responsable</label>
                  <Select value={responsableId} onValueChange={setResponsableId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      {intervenantOptions.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {previewData.existingMatches.length > 0 && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Réutiliser un PersonneId débiteur existant (optionnel)
                </label>
                <Select value={reusePersonneId} onValueChange={setReusePersonneId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Créer une nouvelle personne" />
                  </SelectTrigger>
                  <SelectContent>
                    {previewData.existingMatches.map((m) => (
                      <SelectItem key={m.personneId} value={String(m.personneId)}>
                        {m.nom} (#{m.personneId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={onPush} disabled={pushing}>
              {pushing ? "Push en cours…" : "Pousser dans SECIB"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Crée la Personne débiteur, le Dossier (Code auto-généré par SECIB) et
              les Parties. Irréversible côté SECIB — vérifiez la matière et le responsable.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
