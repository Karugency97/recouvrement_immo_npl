import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";

export default function MessageriePage() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Messagerie
        </h1>
        <p className="text-muted-foreground mt-1">
          Echangez avec votre avocat sur vos dossiers en cours
        </p>
      </div>

      {/* Empty state placeholder */}
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={MessageSquare}
            title="Aucune conversation"
            description="Vos echanges avec l'avocat en charge de vos dossiers apparaitront ici. Les conversations sont creees automatiquement lors de l'ouverture d'un dossier."
          />
        </CardContent>
      </Card>
    </div>
  );
}
