import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createDebiteur } from "@/lib/api/debiteurs";
import { createCopropriete, getCoproprietes } from "@/lib/api/coproprietes";
import { createDossier } from "@/lib/api/dossiers";
import { createCreance } from "@/lib/api/creances";
import { createDocument } from "@/lib/api/documents";
import { getSyndicByUserId } from "@/lib/api/syndics";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

async function uploadFile(token: string, file: File, title?: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);

  const res = await fetch(`${DIRECTUS_URL}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.data.id;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  try {
    const formData = await request.formData();

    // Extract user info to get syndic
    const userId = formData.get("user_id") as string;
    const syndic = await getSyndicByUserId(token, userId);
    if (!syndic) {
      return NextResponse.json({ error: "Syndic non trouve" }, { status: 400 });
    }
    const syndicId = (syndic as Record<string, unknown>).id as string;

    // 1. Create debiteur
    const debiteur = await createDebiteur(token, {
      type: formData.get("debiteur_type") as string,
      nom: formData.get("debiteur_nom") as string,
      adresse: formData.get("debiteur_adresse") as string,
      email: formData.get("debiteur_email") as string || undefined,
      telephone: formData.get("debiteur_telephone") as string || undefined,
    });
    const debiteurId = (debiteur as Record<string, unknown>).id as string;

    // 2. Find or create copropriete
    let coproprieteId = formData.get("copropriete_id") as string;
    if (!coproprieteId || coproprieteId === "__new__") {
      const coproNom = formData.get("copropriete_nom") as string;
      // Check if a copropriete with this name already exists for this syndic
      const existing = (await getCoproprietes(token, syndicId)) as Record<string, unknown>[];
      const found = existing.find(
        (c) => (c.nom as string)?.toLowerCase() === coproNom?.toLowerCase()
      );
      if (found) {
        coproprieteId = found.id as string;
      } else {
        const newCopro = await createCopropriete(token, {
          nom: coproNom,
          syndic_id: syndicId,
        });
        coproprieteId = (newCopro as Record<string, unknown>).id as string;
      }
    }

    // 3. Create dossier
    const dossier = await createDossier(token, {
      syndic_id: syndicId,
      debiteur_id: debiteurId,
      copropriete_id: coproprieteId,
      lot_description: formData.get("lot_description") as string || undefined,
      statut: "nouveau",
      phase: "amiable",
      montant_total: parseFloat(formData.get("montant") as string) || 0,
      observations: formData.get("observations") as string || undefined,
    });
    const dossierId = (dossier as Record<string, unknown>).id as string;

    // 4. Create creance
    const montant = parseFloat(formData.get("montant") as string);
    if (montant > 0) {
      await createCreance(token, {
        dossier_id: dossierId,
        type: "charges_copropriete",
        montant,
        periode: [
          formData.get("periode_debut") as string,
          formData.get("periode_fin") as string,
        ]
          .filter(Boolean)
          .join(" - ") || undefined,
      });
    }

    // 5. Upload files & create document records
    const fileFields = ["releve_compte", "appels_fonds", "contrat_syndic"];
    const docTypeMap: Record<string, string> = {
      releve_compte: "releve_compte",
      appels_fonds: "appel_fonds",
      contrat_syndic: "contrat_syndic",
    };

    for (const field of fileFields) {
      const file = formData.get(field) as File | null;
      if (file && file.size > 0) {
        const fileId = await uploadFile(token, file, file.name);
        await createDocument(token, {
          dossier_id: dossierId,
          nom: file.name,
          type: docTypeMap[field],
          fichier: fileId,
          uploaded_by: userId,
        });
      }
    }

    return NextResponse.json({ success: true, dossier_id: dossierId });
  } catch (err) {
    console.error("Dossier creation error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la creation du dossier" },
      { status: 500 }
    );
  }
}
