import type { ActionCtx } from "../_generated/server";
import type { FetchActor } from "./secibFetch";
import { secibFetch } from "./secibFetch";

// ─────────────────────────────────────────────────────────────────
// Helpers d'écriture SECIB (POST via le gateway). Le gateway enveloppe
// toute réponse { data: <réponse SECIB> } → on déballe .data.
//
// ⚠ Shapes validées en prod pour l'affaire SEXTUS (memory secib_dto_gotchas)
// mais JAMAIS exercées depuis Convex. À valider sur le sandbox (dossier 164 /
// débiteur jetable) avant tout dossier réel — cf. plan Task 17.
// ─────────────────────────────────────────────────────────────────

type DebiteurInput = {
  type: "PP" | "PM";
  nom: string;
};

// POST /personnes (→ SECIB /Personne/Post). Sans PersonneId = create.
// NomCourt n'est PAS auto-généré → on le passe explicitement (sinon SECIB
// génère un libellé tordu). On NE mappe PAS adresse/email/téléphone : les
// noms de champs SECIB ne sont pas garantis et un champ inconnu fait
// échouer la création — le cabinet complète la personne dans SECIB si besoin.
// Salutation/Qualité = 0 (non renseigné) : le wizard ne capture pas le genre.
export async function createPersonne(
  ctx: ActionCtx,
  actor: FetchActor,
  debiteur: DebiteurInput,
): Promise<{ personneId: number }> {
  const body = {
    Nom: debiteur.nom,
    NomCourt: debiteur.nom,
    SalutationId: debiteur.type === "PM" ? 3 : 0,
    QualiteId: 0,
  };
  const res = await secibFetch<{ data?: { PersonneId?: number } }>(ctx, actor, {
    endpoint: "/personnes",
    targetType: "personne_create",
    targetId: debiteur.nom,
    method: "POST",
    body,
  });
  const personneId = res.data?.PersonneId;
  if (typeof personneId !== "number") {
    throw new Error(
      `Création personne SECIB : pas de PersonneId retourné (réponse ${JSON.stringify(res).slice(0, 200)}).`,
    );
  }
  return { personneId };
}

// POST /dossiers (→ SECIB /Dossier/Post). NE PAS envoyer Code (auto-généré,
// strippé par le gateway). Type "Contentieux" (SECIB mappe → "D"). SiteId 1.
export async function createDossier(
  ctx: ActionCtx,
  actor: FetchActor,
  input: { nom: string; matiereId: number; responsableId: number },
): Promise<{ dossierId: number; code: string | null }> {
  const body = {
    Nom: input.nom,
    MatiereId: input.matiereId,
    ResponsableId: input.responsableId,
    SiteId: 1,
    Type: "Contentieux",
  };
  const res = await secibFetch<{
    data?: { DossierId?: number; Code?: string | null };
  }>(ctx, actor, {
    endpoint: "/dossiers",
    targetType: "dossier_create",
    targetId: input.nom,
    method: "POST",
    body,
  });
  const dossierId = res.data?.DossierId;
  if (typeof dossierId !== "number") {
    throw new Error(
      `Création dossier SECIB : pas de DossierId retourné (réponse ${JSON.stringify(res).slice(0, 200)}).`,
    );
  }
  return { dossierId, code: res.data?.Code ?? null };
}

// POST /parties (→ SECIB /Partie/Post). Body IMBRIQUÉ obligatoire
// { Dossier:{DossierId}, Personne:{PersonneId} } — à plat = HTTP 500.
// TypePartieId : 1 = client, 2 = adversaire.
export async function createPartie(
  ctx: ActionCtx,
  actor: FetchActor,
  input: {
    dossierId: number;
    personneId: number;
    typePartieId: 1 | 2;
    facturable: boolean;
  },
): Promise<void> {
  const body = {
    Dossier: { DossierId: input.dossierId },
    Personne: { PersonneId: input.personneId },
    TypePartieId: input.typePartieId,
    Facturable: input.facturable,
    ParentPartieId: 0,
  };
  await secibFetch(ctx, actor, {
    endpoint: "/parties",
    targetType: "partie_create",
    targetId: `${input.dossierId}:${input.personneId}`,
    method: "POST",
    body,
  });
}
