import { requireAuth, getAuthToken } from "@/lib/dal";
import { getAllConversations } from "@/lib/api/messages";
import { ConversationList, type Conversation } from "@/components/messaging/ConversationList";

interface MessageRecord {
  id: string;
  contenu: string;
  date_created: string;
  lu: boolean;
  dossier_id: {
    id: string;
    reference: string;
    debiteur_id: { nom: string; prenom: string } | null;
    syndic_id: { raison_sociale: string } | null;
  } | null;
  expediteur_id: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export default async function AdminMessageriePage() {
  const user = await requireAuth();
  const token = (await getAuthToken())!;

  const messagesRaw = (await getAllConversations(token).catch(() => [])) as unknown as MessageRecord[];

  // Group by dossier
  const grouped = messagesRaw.reduce<
    Record<string, {
      dossierId: string;
      reference: string;
      debiteur: string;
      syndic: string;
      messages: MessageRecord[];
      lastMessage: MessageRecord | null;
      unreadCount: number;
    }>
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
        syndic: dossier.syndic_id?.raison_sociale || "—",
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

  const conversations: Conversation[] = Object.values(grouped)
    .sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.date_created).getTime() : 0;
      const dateB = b.lastMessage ? new Date(b.lastMessage.date_created).getTime() : 0;
      return dateB - dateA;
    })
    .map((g) => ({
      dossierId: g.dossierId,
      reference: g.reference,
      debiteur: g.debiteur,
      syndic: g.syndic,
      unreadCount: g.unreadCount,
      lastMessage: g.lastMessage
        ? {
            contenu: g.lastMessage.contenu,
            date_created: g.lastMessage.date_created,
            expediteur_nom: g.lastMessage.expediteur_id
              ? `${g.lastMessage.expediteur_id.first_name || ""} ${g.lastMessage.expediteur_id.last_name || ""}`.trim()
              : "—",
          }
        : null,
    }));

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Messagerie
        </h1>
        <p className="text-muted-foreground mt-1">
          Tous les echanges avec les syndics sur l&apos;ensemble des dossiers
        </p>
      </div>

      <ConversationList
        conversations={conversations}
        basePath="/admin/dossiers"
        showSyndic
      />
    </div>
  );
}
