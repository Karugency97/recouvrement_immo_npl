import { Settings, Building2, User, Mail, Phone, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


/* -------------------------------------------------------------------------- */
/*  Placeholder data (will be replaced by authenticated user data)            */
/* -------------------------------------------------------------------------- */

const profile = {
  prenom: "Marie",
  nom: "Leroy",
  email: "marie.leroy@syndic-idf.fr",
  telephone: "01 45 67 89 00",
  societe: "Syndic Ile-de-France",
  adresse: "45 avenue des Champs-Elysees, 75008 Paris",
};

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

export default function ParametresPage() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Parametres
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerez votre profil et les preferences de votre compte
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Informations personnelles
            </CardTitle>
            <CardDescription>
              Mettez a jour vos coordonnees de contact
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prenom</Label>
                <Input id="prenom" defaultValue={profile.prenom} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" defaultValue={profile.nom} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Adresse email
                </span>
              </Label>
              <Input
                id="email"
                type="email"
                defaultValue={profile.email}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telephone">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Telephone
                </span>
              </Label>
              <Input
                id="telephone"
                type="tel"
                defaultValue={profile.telephone}
              />
            </div>

            <div className="pt-2">
              <Button>Enregistrer les modifications</Button>
            </div>
          </CardContent>
        </Card>

        {/* Company card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Informations du cabinet
            </CardTitle>
            <CardDescription>
              Details de votre syndic de copropriete
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="societe">Nom du syndic</Label>
              <Input id="societe" defaultValue={profile.societe} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adresse_societe">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Adresse
                </span>
              </Label>
              <Input
                id="adresse_societe"
                defaultValue={profile.adresse}
              />
            </div>

            <div className="pt-2">
              <Button>Enregistrer les modifications</Button>
            </div>
          </CardContent>
        </Card>

        {/* Security card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Securite
            </CardTitle>
            <CardDescription>
              Modifiez votre mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Mot de passe actuel</Label>
              <Input
                id="current_password"
                type="password"
                placeholder="Entrez votre mot de passe actuel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">Nouveau mot de passe</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="Entrez un nouveau mot de passe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">
                Confirmer le nouveau mot de passe
              </Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="Confirmez le nouveau mot de passe"
              />
            </div>

            <div className="pt-2">
              <Button>Modifier le mot de passe</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
