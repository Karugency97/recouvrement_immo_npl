"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ClientError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Une erreur s&apos;est produite
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Quelque chose ne s&apos;est pas passe comme prevu. Veuillez reessayer ou
        retourner au tableau de bord.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline">
          Reessayer
        </Button>
        <Button asChild>
          <Link href="/dashboard">Retour au tableau de bord</Link>
        </Button>
      </div>
    </div>
  );
}
