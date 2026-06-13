"use client";

import { useQuery } from "convex/react";
import { meQuery } from "@/lib/convexApi";
import { ClientLayoutWrapper } from "@/components/layout/ClientLayoutWrapper";

// Layout du portail syndic — identité via Convex (users.me), plus
// aucune dépendance Directus. Le middleware garantit une session
// Logto ; ce layout gère les deux états restants : provisioning
// manquant et rôle non-syndic.
export default function ClientLayout({
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

  if (me === null || me.organizationKind !== "syndic") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <h1 className="text-lg font-semibold">Ce portail est réservé aux syndics</h1>
        <p className="text-sm text-muted-foreground">
          {me === null
            ? "Votre compte n'est pas encore provisionné. Contactez le cabinet NPL."
            : `Connecté en tant que ${me.name} (${me.role}).`}
        </p>
        {/* Route handler API (302), pas une page — Link la préfetcherait
            (déconnexion au survol). Cf. même pattern playground S2D. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/logto/sign-out" className="text-sm text-primary underline">
          Se déconnecter
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <ClientLayoutWrapper
        userName={me.name}
        userCompany={me.organizationName ?? "Syndic"}
        unreadCount={0}
      >
        {children}
      </ClientLayoutWrapper>
    </div>
  );
}
