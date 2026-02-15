import { FileText, ImageIcon, File, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileIconProps {
  filename: string;
  className?: string;
}

export function FileIcon({ filename, className }: FileIconProps) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (["pdf"].includes(ext)) {
    return <FileText className={cn("text-red-500", className)} />;
  }

  if (["doc", "docx"].includes(ext)) {
    return <FileText className={cn("text-blue-500", className)} />;
  }

  if (["xls", "xlsx", "csv"].includes(ext)) {
    return <FileSpreadsheet className={cn("text-emerald-500", className)} />;
  }

  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
    return <ImageIcon className={cn("text-purple-500", className)} />;
  }

  return <File className={cn("text-slate-400", className)} />;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
