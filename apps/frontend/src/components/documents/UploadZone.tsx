"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UploadedFile {
  file: File;
  name: string;
  size: number;
}

interface UploadZoneProps {
  label: string;
  required?: boolean;
  accept?: string;
  onFileChange?: (file: File | null) => void;
}

export function UploadZone({
  label,
  required = false,
  accept = ".pdf,.doc,.docx",
  onFileChange,
}: UploadZoneProps) {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setUploadedFile({ file, name: file.name, size: file.size });
        onFileChange?.(file);
      }
    },
    [onFileChange]
  );

  const handleRemove = useCallback(() => {
    setUploadedFile(null);
    onFileChange?.(null);
  }, [onFileChange]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (uploadedFile) {
    return (
      <div>
        <p className="text-sm font-medium mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </p>
        <Card className="bg-muted/30">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(uploadedFile.size)}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleRemove}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </p>
      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
        <p className="text-sm text-muted-foreground">
          Cliquez ou deposez un fichier
        </p>
        <input
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleFileSelect}
        />
      </label>
    </div>
  );
}
