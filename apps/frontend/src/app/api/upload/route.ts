import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  const directusForm = new FormData();
  directusForm.append("file", file);

  const title = formData.get("title") as string | null;
  if (title) {
    directusForm.append("title", title);
  }

  const res = await fetch(`${DIRECTUS_URL}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: directusForm,
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ id: data.data.id, filename: data.data.filename_download });
}
