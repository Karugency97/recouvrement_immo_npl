"use client";

import { useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime } from "@/lib/utils/format-date";

interface Message {
  id: string;
  contenu: string;
  date_created: string;
  expediteur_id: string;
  expediteur_nom: string;
  expediteur_role: "avocat" | "syndic";
}

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  onSend?: (content: string) => void;
}

export function MessageThread({
  messages,
  currentUserId,
  onSend,
}: MessageThreadProps) {
  const [content, setContent] = useState("");

  const handleSend = () => {
    if (!content.trim()) return;
    onSend?.(content.trim());
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-base">Conversation</CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isOwn = msg.expediteur_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={cn("flex gap-3", isOwn && "flex-row-reverse")}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className={cn(
                      "text-xs",
                      msg.expediteur_role === "avocat"
                        ? "bg-slate-900 text-slate-100"
                        : "bg-blue-100 text-blue-700"
                    )}
                  >
                    {getInitials(msg.expediteur_nom)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("max-w-[70%]", isOwn && "text-right")}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {msg.expediteur_nom}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(msg.date_created)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "px-4 py-2.5 rounded-lg text-sm",
                      isOwn
                        ? "bg-slate-900 text-slate-100 rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none"
                    )}
                  >
                    {msg.contenu}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Votre message..."
            className="min-h-[80px] resize-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <Button variant="ghost" size="icon">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button onClick={handleSend} disabled={!content.trim()}>
            <Send className="h-4 w-4 mr-2" />
            Envoyer
          </Button>
        </div>
      </div>
    </Card>
  );
}
