"use client";

import { useQuery } from "convex/react";
import { meQuery } from "@/lib/convexApi";
import { AdminLayoutWrapper } from "@/components/layout/AdminLayoutWrapper";

// S5a : seuls admin/assistant ont des données dans le workspace cabinet
// (toutes les fonctions backend sont gardées NPL_FULL_ACCESS_ROLES). npl_avocat
// reviendra quand le scoping intervenant sera branché — sinon il franchirait
// ce gate puis verrait des erreurs forbidden sur chaque query.
const NPL_ROLES = ["npl_admin", "npl_assistant"];

// Workspace cabinet — identité via Convex (users.me), plus aucune
// dépendance Directus. Le middleware garantit une session Logto ; ce
// layout gère provisioning manquant + rôle non-NPL.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = useQuery(meQuery);

  if (me === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (me === null || !NPL_ROLES.includes(me.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <h1 className="text-lg font-semibold">Ce portail est réservé à l&apos;équipe NPL</h1>
        <p className="text-sm text-muted-foreground">
          {me === null
            ? "Votre compte n'est pas encore provisionné. Contactez un administrateur NPL."
            : `Connecté en tant que ${me.name} (${me.role}).`}
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/logto/sign-out" className="text-sm text-primary underline">
          Se déconnecter
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background admin-theme">
      <AdminLayoutWrapper
        userName={me.name}
        userCompany={me.organizationName ?? "Cabinet NPL"}
        unreadCount={0}
      >
        {children}
      </AdminLayoutWrapper>
    </div>
  );
}
