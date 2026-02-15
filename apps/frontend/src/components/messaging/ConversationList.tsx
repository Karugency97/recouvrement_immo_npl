"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatRelative } from "@/lib/utils/format-date";

export interface Conversation {
  dossierId: string;
  reference: string;
  debiteur: string;
  syndic?: string;
  unreadCount: number;
  lastMessage: {
    contenu: string;
    date_created: string;
    expediteur_nom: string;
  } | null;
}

interface ConversationListProps {
  conversations: Conversation[];
  basePath: string;
  showSyndic?: boolean;
}

export function ConversationList({
  conversations,
  basePath,
  showSyndic = false,
}: ConversationListProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.reference.toLowerCase().includes(q) ||
        c.debiteur.toLowerCase().includes(q) ||
        (c.syndic && c.syndic.toLowerCase().includes(q)) ||
        (c.lastMessage && c.lastMessage.contenu.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une conversation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground shrink-0">
          {filtered.length} conversation{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={MessageSquare}
              title={search ? "Aucun resultat" : "Aucune conversation"}
              description={
                search
                  ? "Essayez avec d'autres termes de recherche."
                  : "Vos echanges apparaitront ici. Les conversations sont creees automatiquement lors de l'ouverture d'un dossier."
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((conv) => (
                <Link
                  key={conv.dossierId}
                  href={`${basePath}/${conv.dossierId}?tab=messages`}
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
                      {showSyndic && conv.syndic && (
                        <span> — {conv.syndic}</span>
                      )}
                    </p>
                    {conv.lastMessage && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        <span className="font-medium text-foreground">
                          {conv.lastMessage.expediteur_nom}:
                        </span>{" "}
                        {conv.lastMessage.contenu}
                      </p>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatRelative(conv.lastMessage.date_created)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
