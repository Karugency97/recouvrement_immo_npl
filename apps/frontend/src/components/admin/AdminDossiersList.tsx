"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { STATUT_LABELS, PHASE_LABELS } from "@/lib/utils/constants";
import { formatCurrency } from "@/lib/utils/format-currency";
import { formatDate } from "@/lib/utils/format-date";

const phaseStyles: Record<string, string> = {
  amiable: "bg-blue-100 text-blue-700 border-blue-200",
  pre_contentieux: "bg-amber-100 text-amber-700 border-amber-200",
  contentieux: "bg-red-100 text-red-700 border-red-200",
  execution: "bg-purple-100 text-purple-700 border-purple-200",
};

interface Dossier {
  id: string;
  reference: string;
  statut: string;
  phase: string;
  montant_total: number;
  date_created: string;
  copropriete: string;
  debiteur: string;
}

interface AdminDossiersListProps {
  dossiers: Dossier[];
}

export function AdminDossiersList({ dossiers }: AdminDossiersListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");

  const filtered = useMemo(() => {
    return dossiers.filter((d) => {
      const matchesSearch =
        !search ||
        d.reference?.toLowerCase().includes(search.toLowerCase()) ||
        d.debiteur?.toLowerCase().includes(search.toLowerCase()) ||
        d.copropriete?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || d.statut === statusFilter;
      const matchesPhase = phaseFilter === "all" || d.phase === phaseFilter;
      return matchesSearch && matchesStatus && matchesPhase;
    });
  }, [dossiers, search, statusFilter, phaseFilter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par reference, debiteur, copropriete..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(STATUT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les phases</SelectItem>
                {Object.entries(PHASE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Reference</TableHead>
                <TableHead>Copropriete</TableHead>
                <TableHead>Debiteur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="pr-6 text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id} className="table-row-hover">
                  <TableCell className="pl-6">
                    <Link
                      href={`/admin/dossiers/${d.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {d.reference}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{d.copropriete}</TableCell>
                  <TableCell className="text-sm">{d.debiteur}</TableCell>
                  <TableCell><StatusBadge status={d.statut} /></TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
                        phaseStyles[d.phase] || "bg-slate-100 text-slate-700 border-slate-200"
                      )}
                    >
                      {PHASE_LABELS[d.phase] || d.phase}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {formatCurrency(d.montant_total)}
                  </TableCell>
                  <TableCell className="pr-6 text-right text-sm text-muted-foreground">
                    {d.date_created ? formatDate(d.date_created) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun dossier correspondant
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
