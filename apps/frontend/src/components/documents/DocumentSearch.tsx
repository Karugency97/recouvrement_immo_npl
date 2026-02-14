"use client";

import { useState, useMemo } from "react";
import { Search, FileText, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DocumentTypeBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils/format-date";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_CATEGORIES } from "@/lib/utils/constants";

interface Document {
  id: string;
  nom: string;
  type: string;
  fichier: string | null;
  date_created: string;
  dossier_id: { id: string; reference: string } | null;
}

interface DocumentSearchProps {
  documents: Document[];
}

export function DocumentSearch({ documents }: DocumentSearchProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        !search ||
        doc.nom?.toLowerCase().includes(search.toLowerCase()) ||
        doc.dossier_id?.reference?.toLowerCase().includes(search.toLowerCase());

      const matchesType = typeFilter === "all" || doc.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [documents, search, typeFilter]);

  const documentTypes = useMemo(() => {
    const types = new Set(documents.map((d) => d.type).filter(Boolean));
    return Array.from(types);
  }, [documents]);

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={FileText}
            title="Aucun document"
            description="Les documents associes a vos dossiers apparaitront ici."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou reference..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Type de document" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {documentTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t] || t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {filtered.length} document{filtered.length > 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucun document correspondant
            </p>
          ) : (
            <div className="space-y-0 divide-y divide-border">
              {filtered.map((doc) => {
                const docType = doc.type || "autre";
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between py-3 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {doc.nom || "Document"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <DocumentTypeBadge
                            category={DOCUMENT_CATEGORIES[docType] || "correspondance"}
                            label={DOCUMENT_TYPE_LABELS[docType] || docType}
                          />
                          {doc.dossier_id?.reference && (
                            <span className="text-xs text-indigo-600 font-medium">
                              {doc.dossier_id.reference}
                            </span>
                          )}
                          {doc.date_created && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(doc.date_created)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {doc.fichier && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        asChild
                      >
                        <a
                          href={`/api/files/${doc.fichier}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
