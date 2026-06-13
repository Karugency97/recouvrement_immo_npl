"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  messagesByCaseQuery,
  sendMessageMutation,
  type MessageDoc,
} from "@/lib/convexApi";

export function MessageThread({ caseId }: { caseId: string }) {
  const messages = useQuery(messagesByCaseQuery, { caseId }) as
    | MessageDoc[]
    | undefined;
  const send = useMutation(sendMessageMutation);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const onSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await send({ caseId, body: body.trim() });
      setBody("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {messages === undefined ? (
        <Skeleton className="h-40" />
      ) : messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {"Aucun message. Démarrez la conversation avec le cabinet."}
        </p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => {
            const mine = m.senderRole === "syndic";
            return (
              <div
                key={m._id}
                className={mine ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    "max-w-[75%] rounded-lg px-3 py-2 text-sm " +
                    (mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground")
                  }
                >
                  <p className="mb-1 text-xs opacity-70">
                    {mine ? "Vous" : "Cabinet NPL"} ·{" "}
                    {new Date(m.createdAt).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Écrire un message au cabinet…"
          rows={3}
        />
        <div className="flex justify-end">
          <Button onClick={onSend} disabled={sending || !body.trim()}>
            {sending ? "Envoi…" : "Envoyer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
