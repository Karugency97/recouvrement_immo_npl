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
  piece_jointe?: { id: string; filename_download: string; type: string } | null;
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
  const [sending, setSending] = useState(false);

  const handleSend = async (content: string, file?: File) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      contenu: content || (file ? `[Fichier: ${file.name}]` : ""),
      date_created: new Date().toISOString(),
      expediteur_id: currentUserId,
      expediteur_nom: currentUserName,
      expediteur_role: senderRole,
      piece_jointe: file ? { id: "", filename_download: file.name, type: file.type } : null,
    };

    setLocalMessages((prev) => [...prev, optimisticMsg]);
    setSending(true);

    try {
      // Upload file first if present
      let fileId: string | null = null;
      if (file) {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadForm });
        if (!uploadRes.ok) {
          throw new Error("Erreur lors de l'upload du fichier");
        }
        const uploadData = await uploadRes.json();
        fileId = uploadData.id;
      }

      const formData = new FormData();
      formData.append("contenu", content || (file ? `[Fichier: ${file.name}]` : ""));
      formData.append("dossier_id", dossierId);
      if (fileId) {
        formData.append("piece_jointe", fileId);
      }

      const result = await sendMessageAction(null, formData);

      if (result.error) {
        setLocalMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error(result.error);
      } else {
        toast.success("Message envoye");
      }
    } catch (err) {
      setLocalMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <MessageThread
      messages={localMessages}
      currentUserId={currentUserId}
      onSend={handleSend}
      sending={sending}
    />
  );
}
