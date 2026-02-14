"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageThread } from "./MessageThread";
import { sendMessageAction } from "@/lib/actions";

interface Message {
  id: string;
  contenu: string;
  date_created: string;
  expediteur_id: string;
  expediteur_nom: string;
  expediteur_role: "avocat" | "syndic";
}

interface MessageSenderProps {
  dossierId: string;
  messages: Message[];
  currentUserId: string;
  currentUserName: string;
  senderRole?: "syndic" | "avocat";
}

export function MessageSender({
  dossierId,
  messages,
  currentUserId,
  currentUserName,
  senderRole = "syndic",
}: MessageSenderProps) {
  const [localMessages, setLocalMessages] = useState(messages);

  const handleSend = async (content: string) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      contenu: content,
      date_created: new Date().toISOString(),
      expediteur_id: currentUserId,
      expediteur_nom: currentUserName,
      expediteur_role: senderRole,
    };

    setLocalMessages((prev) => [...prev, optimisticMsg]);

    const formData = new FormData();
    formData.append("contenu", content);
    formData.append("dossier_id", dossierId);

    const result = await sendMessageAction(null, formData);

    if (result.error) {
      setLocalMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(result.error);
    }
  };

  return (
    <MessageThread
      messages={localMessages}
      currentUserId={currentUserId}
      onSend={handleSend}
    />
  );
}
