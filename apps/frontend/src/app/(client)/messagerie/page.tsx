import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { requireAuth, getAuthToken } from "@/lib/dal";
import { getSyndicByUserId } from "@/lib/api/syndics";
import { getConversationsForSyndic } from "@/lib/api/messages";
import { formatRelative } from "@/lib/utils/format-date";

interface MessageRecord {
  id: string;
  contenu: string;
  date_created: string;
  lu: boolean;
  dossier_id: {
    id: string;
    reference: string;
    debiteur_id: { nom: string; prenom: string } | null;
  } | null;
  expediteur_id: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export default async function MessageriePage() {
  const user = await requireAuth();
  const token = (await getAuthToken())!;

  const syndic = await getSyndicByUserId(token, user.id).catch(() => null);
  const syndicId = (syndic as Record<string, unknown> | null)?.id as string;

  const messagesRaw = syndicId
    ? ((await getConversationsForSyndic(token, syndicId).catch(() => [])) as Record<string, unknown>[])
    : [];

  const messages = messagesRaw as unknown as MessageRecord[];

  // Group by dossier
  const grouped = messages.reduce<
    Record<
      string,
      {
        dossierId: string;
        reference: string;
        debiteur: string;
        messages: MessageRecord[];
        lastMessage: MessageRecord | null;
        unreadCount: number;
      }
    >
  >((acc, msg) => {
    const dossier = msg.dossier_id;
    if (!dossier?.id) return acc;

    if (!acc[dossier.id]) {
      const debiteur = dossier.debiteur_id;
      acc[dossier.id] = {
        dossierId: dossier.id,
        reference: dossier.reference || "—",
        debiteur: debiteur
          ? `${debiteur.prenom || ""} ${debiteur.nom || ""}`.trim()
          : "—",
        messages: [],
        lastMessage: null,
        unreadCount: 0,
      };
    }

    acc[dossier.id].messages.push(msg);
    if (!msg.lu && msg.expediteur_id?.id !== user.id) {
      acc[dossier.id].unreadCount++;
    }

    if (
      !acc[dossier.id].lastMessage ||
      new Date(msg.date_created) > new Date(acc[dossier.id].lastMessage!.date_created)
    ) {
      acc[dossier.id].lastMessage = msg;
    }

    return acc;
  }, {});

  const conversations = Object.values(grouped).sort((a, b) => {
    const dateA = a.lastMessage ? new Date(a.lastMessage.date_created).getTime() : 0;
    const dateB = b.lastMessage ? new Date(b.lastMessage.date_created).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Messagerie
        </h1>
        <p className="text-muted-foreground mt-1">
          Echangez avec votre avocat sur vos dossiers en cours
        </p>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={MessageSquare}
              title="Aucune conversation"
              description="Vos echanges avec l'avocat en charge de vos dossiers apparaitront ici. Les conversations sont creees automatiquement lors de l'ouverture d'un dossier."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {conversations.map((conv) => {
                const last = conv.lastMessage;
                const expediteur = last?.expediteur_id;
                const expediteurNom = expediteur
                  ? `${expediteur.first_name || ""} ${expediteur.last_name || ""}`.trim()
                  : "—";

                return (
                  <Link
                    key={conv.dossierId}
                    href={`/dossiers/${conv.dossierId}?tab=messages`}
                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {conv.reference}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge className="bg-indigo-600 text-white h-5 px-1.5 text-[10px]">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {conv.debiteur}
                      </p>
                      {last && (
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          <span className="font-medium text-foreground">
                            {expediteurNom}:
                          </span>{" "}
                          {last.contenu}
                        </p>
                      )}
                    </div>
                    {last && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatRelative(last.date_created)}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
