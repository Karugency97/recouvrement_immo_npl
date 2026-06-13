"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/metier/StatusBadge";
import { STATUS_CONFIG } from "@/components/metier/StatusBadge";
import {
  casesDuSyndicQuery,
  type CaseDoc,
  type CaseStatus,
} from "@/lib/convexApi";

const ALL_STATUSES: CaseStatus[] = [
  "CREE",
  "EN_ATTENTE_PIECES",
  "PRET",
  "MISE_EN_DEMEURE_ENVOYEE",
  "INJONCTION_DE_PAYER",
  "ASSIGNATION_AU_FOND",
  "JUGEMENT_OBTENU",
  "CLOTURE",
  "SUSPENDU",
];

type SortKey = "secibLibelle" | "secibDateOuverture" | "updatedAt";

// Liste des dossiers — filtres/tri/recherche côté client (volumétrie
// pilote ≤ ~150 ; pagination serveur quand le volume l'exigera).
export default function DossiersPage() {
  const cases = useQuery(casesDuSyndicQuery) as CaseDoc[] | undefined;
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortAsc, setSortAsc] = useState(false);

  const rows = useMemo(() => {
    if (!cases) return [];
    let filtered = cases;
    if (statusFilter !== "tous") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      filtered = filtered.filter((c) =>
        (c.secibLibelle ?? "").toLowerCase().includes(needle),
      );
    }
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv, "fr")
          : Number(av) - Number(bv);
      return sortAsc ? cmp : -cmp;
    });
  }, [cases, statusFilter, search, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((s) => !s);
    else {
      setSortKey(key);
      setSortAsc(key === "secibLibelle");
    }
  };

  if (cases === undefined) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Mes dossiers</h1>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Rechercher un dossier…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {rows.length} dossier{rows.length > 1 ? "s" : ""}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => toggleSort("secibLibelle")}>
              Libellé
            </TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Matière</TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort("secibDateOuverture")}>
              Ouverture
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort("updatedAt")}>
              Dernière maj
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c._id}>
              <TableCell className="max-w-md">
                <Link href={`/dossiers/${c._id}`} prefetch={false} className="block truncate hover:underline">
                  {c.secibLibelle ?? "Dossier"}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status={c.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {c.secibMatiereLibelle ?? "—"}
              </TableCell>
              <TableCell className="text-sm">
                {c.secibDateOuverture
                  ? new Date(c.secibDateOuverture).toLocaleDateString("fr-FR")
                  : "—"}
              </TableCell>
              <TableCell className="text-sm">
                {new Date(c.updatedAt).toLocaleDateString("fr-FR")}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Aucun dossier ne correspond.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
