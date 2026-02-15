import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 mb-6">
        <FileQuestion className="h-10 w-10 text-slate-500" />
      </div>
      <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Page introuvable
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        La page que vous recherchez n&apos;existe pas ou a ete deplacee.
      </p>
      <Button asChild>
        <Link href="/">Retour a l&apos;accueil</Link>
      </Button>
    </div>
  );
}
