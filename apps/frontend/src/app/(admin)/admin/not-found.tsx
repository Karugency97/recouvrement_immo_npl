import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-6">
        <FileQuestion className="h-8 w-8 text-slate-500" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Page introuvable
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        La page que vous recherchez n&apos;existe pas ou a ete deplacee.
      </p>
      <Button asChild>
        <Link href="/admin/dashboard">Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}
