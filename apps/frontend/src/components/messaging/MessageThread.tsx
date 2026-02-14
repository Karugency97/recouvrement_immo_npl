"use client";

import { useRef, useState } from "react";
import { Send, Paperclip, X, FileText, Image as ImageIcon, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime } from "@/lib/utils/format-date";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type === "application/pdf") return FileText;
  return FileIcon;
}

interface Message {
  id: string;
  contenu: string;
  date_created: string;
  expediteur_id: string;
  expediteur_nom: string;
  expediteur_role: "avocat" | "syndic";
  piece_jointe?: { id: string; filename_download: string; type: string } | null;
}

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  onSend?: (content: string, file?: File) => void;
  sending?: boolean;
}

export function MessageThread({
  messages,
  currentUserId,
  onSend,
  sending,
}: MessageThreadProps) {
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!content.trim() && !selectedFile) return;
    onSend?.(content.trim(), selectedFile || undefined);
    setContent("");
    setSelectedFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert("Le fichier ne doit pas depasser 10 Mo");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("Type de fichier non supporte. Formats acceptes : PDF, Word, JPEG, PNG, WebP");
      return;
    }

    setSelectedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
            const attachment = msg.piece_jointe;
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
                    {attachment && (
                      <a
                        href={`${DIRECTUS_URL}/assets/${attachment.id}?download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-2 mt-2 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                          isOwn
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                            : "bg-background hover:bg-accent text-foreground"
                        )}
                      >
                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{attachment.filename_download}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-muted rounded-lg">
            {(() => {
              const Icon = getFileIcon(selectedFile.type);
              return <Icon className="h-4 w-4 text-muted-foreground shrink-0" />;
            })()}
            <span className="text-sm truncate flex-1">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatFileSize(selectedFile.size)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            placeholder="Votre message..."
            className="min-h-[80px] resize-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              title="Joindre un fichier"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleSend}
            disabled={(!content.trim() && !selectedFile) || sending}
          >
            {sending ? (
              <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {sending ? "Envoi..." : "Envoyer"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
