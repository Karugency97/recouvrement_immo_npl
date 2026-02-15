"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { STATUT_LABELS } from "@/lib/utils/constants";
import { formatCurrency } from "@/lib/utils/format-currency";
import { formatDate } from "@/lib/utils/format-date";

interface ClientDossier {
  id: string;
  reference: string;
  statut: string;
  montant_initial: number;
  montant_recouvre: number;
  debiteur_nom: string;
  copropriete_nom: string;
  lot_description: string;
  date_created: string;
}

interface ClientDossiersListProps {
  dossiers: ClientDossier[];
  initialSearch?: string;
}

export function ClientDossiersList({ dossiers, initialSearch = "" }: ClientDossiersListProps) {
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return dossiers.filter((d) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        d.reference?.toLowerCase().includes(q) ||
        d.debiteur_nom?.toLowerCase().includes(q) ||
        d.copropriete_nom?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || d.statut === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [dossiers, search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par reference, debiteur, copropriete..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUT_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Result count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} dossier{filtered.length > 1 ? "s" : ""} trouve
        {filtered.length > 1 ? "s" : ""}
      </p>

      {/* Dossier list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={FolderOpen}
              title="Aucun resultat"
              description={
                search || statusFilter !== "all"
                  ? "Aucun dossier ne correspond a vos criteres de recherche."
                  : "Vous n'avez pas encore de dossier de recouvrement."
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((dossier) => {
            const pourcentage =
              dossier.montant_initial > 0
                ? Math.round(
                    (dossier.montant_recouvre / dossier.montant_initial) * 100
                  )
                : 0;

            return (
              <Link key={dossier.id} href={`/dossiers/${dossier.id}`}>
                <Card className="card-hover group cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {dossier.reference || "—"}
                          </span>
                          <StatusBadge status={dossier.statut || "nouveau"} />
                        </div>
                        <p className="text-sm text-foreground mt-1">
                          {dossier.debiteur_nom}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {dossier.copropriete_nom}
                          {dossier.lot_description
                            ? ` — ${dossier.lot_description}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 sm:text-right shrink-0">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(dossier.montant_initial)}
                          </p>
                          <p
                            className={cn(
                              "text-xs mt-0.5",
                              pourcentage === 100
                                ? "text-emerald-600"
                                : "text-muted-foreground"
                            )}
                          >
                            {pourcentage > 0
                              ? `${formatCurrency(dossier.montant_recouvre)} recouvre (${pourcentage}%)`
                              : "Aucun recouvrement"}
                          </p>
                          {dossier.date_created && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Cree le {formatDate(dossier.date_created)}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
