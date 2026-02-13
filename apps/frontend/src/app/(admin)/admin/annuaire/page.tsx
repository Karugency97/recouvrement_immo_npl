import { Building2, User, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/*  Placeholder data                                                   */
/* ------------------------------------------------------------------ */

const syndics = [
  {
    id: "s1",
    raison_sociale: "Foncia Paris Ouest",
    email: "contact@foncia-parisouest.fr",
    telephone: "01 42 88 12 34",
    nb_dossiers: 12,
  },
  {
    id: "s2",
    raison_sociale: "Nexity Gestion",
    email: "gestion@nexity.fr",
    telephone: "01 45 67 89 01",
    nb_dossiers: 8,
  },
  {
    id: "s3",
    raison_sociale: "Citya Immobilier",
    email: "paris@citya.com",
    telephone: "01 53 42 11 22",
    nb_dossiers: 15,
  },
  {
    id: "s4",
    raison_sociale: "Lamy - Gestrim",
    email: "contact@lamy-gestrim.fr",
    telephone: "01 40 22 33 44",
    nb_dossiers: 6,
  },
  {
    id: "s5",
    raison_sociale: "Immo de France",
    email: "paris@immodefrance.com",
    telephone: "01 48 55 66 77",
    nb_dossiers: 4,
  },
  {
    id: "s6",
    raison_sociale: "Cabinet Monnot",
    email: "info@cabinet-monnot.fr",
    telephone: "01 43 21 54 87",
    nb_dossiers: 2,
  },
];

const debiteurs = [
  {
    id: "deb1",
    nom: "Martin Dupont",
    type: "Personne physique",
    adresse: "12 avenue des Oliviers, 75016 Paris",
    nb_dossiers: 1,
  },
  {
    id: "deb2",
    nom: "SCI Bellevue",
    type: "Personne morale",
    adresse: "8 rue de la Paix, 75002 Paris",
    nb_dossiers: 2,
  },
  {
    id: "deb3",
    nom: "Jean-Pierre Moreau",
    type: "Personne physique",
    adresse: "45 boulevard Haussmann, 75008 Paris",
    nb_dossiers: 1,
  },
  {
    id: "deb4",
    nom: "Sophie Lambert",
    type: "Personne physique",
    adresse: "3 rue des Lilas, 92100 Boulogne",
    nb_dossiers: 1,
  },
  {
    id: "deb5",
    nom: "Pierre Lefebvre",
    type: "Personne physique",
    adresse: "27 rue Victor Hugo, 75015 Paris",
    nb_dossiers: 1,
  },
  {
    id: "deb6",
    nom: "SCI Panorama",
    type: "Personne morale",
    adresse: "15 avenue Foch, 75116 Paris",
    nb_dossiers: 3,
  },
  {
    id: "deb7",
    nom: "Marie Durand",
    type: "Personne physique",
    adresse: "9 place de la Republique, 75003 Paris",
    nb_dossiers: 1,
  },
  {
    id: "deb8",
    nom: "Francois Bernard",
    type: "Personne physique",
    adresse: "62 rue de Rivoli, 75004 Paris",
    nb_dossiers: 1,
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminAnnuairePage() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Annuaire</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Repertoire des syndics et debiteurs
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="syndics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="syndics" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Syndics
            <Badge
              variant="secondary"
              className="ml-1 h-5 px-1.5 text-[10px]"
            >
              {syndics.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="debiteurs" className="gap-1.5">
            <User className="h-4 w-4" />
            Debiteurs
            <Badge
              variant="secondary"
              className="ml-1 h-5 px-1.5 text-[10px]"
            >
              {debiteurs.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ---- Syndics ---- */}
        <TabsContent value="syndics">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Raison sociale</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telephone</TableHead>
                    <TableHead className="text-right pr-6">
                      Nb dossiers
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syndics.map((s) => (
                    <TableRow key={s.id} className="table-row-hover">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium">
                            {s.raison_sociale}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {s.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {s.telephone}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge variant="secondary">{s.nb_dossiers}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Debiteurs ---- */}
        <TabsContent value="debiteurs">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead className="text-right pr-6">
                      Nb dossiers
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debiteurs.map((d) => (
                    <TableRow key={d.id} className="table-row-hover">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                              d.type === "Personne morale"
                                ? "bg-purple-100 text-purple-600"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {d.type === "Personne morale" ? (
                              <Building2 className="h-4 w-4" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </div>
                          <span className="text-sm font-medium">{d.nom}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
                            d.type === "Personne morale"
                              ? "bg-purple-100 text-purple-700 border-purple-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          )}
                        >
                          {d.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {d.adresse}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge variant="secondary">{d.nb_dossiers}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
