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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/metier/StatusBadge";
import { allForCabinetQuery, type CabinetCaseRow } from "@/lib/convexApi";

// Workspace cabinet — TOUS les dossiers, tous syndics. Filtres/recherche
// côté client (volumétrie pilote ≤ ~150). Le filtre "À pousser" surface
// les dossiers wizard en attente de push SECIB.
export default function AdminDossiersPage() {
  const cases = useQuery(allForCabinetQuery) as CabinetCaseRow[] | undefined;
  const [search, setSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);

  const rows = useMemo(() => {
    if (!cases) return [];
    let filtered = cases;
    if (onlyPending) filtered = filtered.filter((c) => c.pendingSecibPush);
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.secibLibelle ?? "").toLowerCase().includes(needle) ||
          (c.debiteur?.nom ?? "").toLowerCase().includes(needle) ||
          c.organizationName.toLowerCase().includes(needle),
      );
    }
    return [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [cases, search, onlyPending]);

  if (cases === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const pendingCount = cases.filter((c) => c.pendingSecibPush).length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tous les dossiers</h1>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Rechercher (libellé, débiteur, syndic)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant={onlyPending ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyPending((v) => !v)}
        >
          À pousser ({pendingCount})
        </Button>
        <p className="text-sm text-muted-foreground">
          {rows.length} dossier{rows.length > 1 ? "s" : ""}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Syndic</TableHead>
            <TableHead>Dossier</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>SECIB</TableHead>
            <TableHead>Dernière maj</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c._id}>
              <TableCell className="text-sm">{c.organizationName}</TableCell>
              <TableCell className="max-w-xs">
                <Link
                  href={`/admin/dossiers/${c._id}`}
                  prefetch={false}
                  className="block truncate hover:underline"
                >
                  {c.secibLibelle ?? c.debiteur?.nom ?? "Dossier"}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status={c.status} />
              </TableCell>
              <TableCell className="text-sm">
                {c.pendingSecibPush ? (
                  <Badge variant="outline" className="rounded-full bg-warning/15 text-warning border-warning/30">
                    À pousser
                  </Badge>
                ) : c.secibDossierId ? (
                  <span className="text-muted-foreground">{c.secibDossierId}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
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
