import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";

export default function DocumentsPage() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Documents
        </h1>
        <p className="text-muted-foreground mt-1">
          Consultez et telechargez les documents lies a vos dossiers
        </p>
      </div>

      {/* Empty state placeholder */}
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={FileText}
            title="Aucun document"
            description="Les documents associes a vos dossiers apparaitront ici. Commencez par creer un dossier pour ajouter des pieces."
          />
        </CardContent>
      </Card>
    </div>
  );
}
