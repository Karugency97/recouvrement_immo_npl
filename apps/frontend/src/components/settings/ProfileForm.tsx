"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Settings, Building2, User, Mail, Phone, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  profileSchema,
  syndicProfileSchema,
  passwordSchema,
  type ProfileData,
  type SyndicProfileData,
  type PasswordData,
} from "@/lib/validations/settings-schema";
import {
  updateProfileAction,
  updateSyndicProfileAction,
  changePasswordAction,
} from "@/lib/actions";

interface ProfileFormProps {
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  syndic: {
    id: string;
    raison_sociale: string;
    adresse?: string;
    telephone?: string;
    email?: string;
  } | null;
}

export function ProfileForm({ user, syndic }: ProfileFormProps) {
  return (
    <div className="max-w-2xl space-y-6">
      <PersonalInfoForm user={user} />
      {syndic && <SyndicInfoForm syndic={syndic} />}
      <PasswordForm />
    </div>
  );
}

function PersonalInfoForm({
  user,
}: {
  user: ProfileFormProps["user"];
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email,
      telephone: "",
    },
  });

  const onSubmit = (data: ProfileData) => {
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => formData.append(k, v));
      const result = await updateProfileAction(null, formData);
      if (result.success) toast.success("Profil mis a jour");
      else toast.error(result.error || "Erreur");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          Informations personnelles
        </CardTitle>
        <CardDescription>Mettez a jour vos coordonnees de contact</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prenom</Label>
              <Input id="first_name" {...register("first_name")} />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom</Label>
              <Input id="last_name" {...register("last_name")} />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Adresse email
              </span>
            </Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="telephone">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Telephone
              </span>
            </Label>
            <Input id="telephone" type="tel" {...register("telephone")} />
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SyndicInfoForm({
  syndic,
}: {
  syndic: NonNullable<ProfileFormProps["syndic"]>;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SyndicProfileData>({
    resolver: zodResolver(syndicProfileSchema),
    defaultValues: {
      raison_sociale: syndic.raison_sociale || "",
      adresse: syndic.adresse || "",
      telephone: syndic.telephone || "",
      email: syndic.email || "",
    },
  });

  const onSubmit = (data: SyndicProfileData) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("syndic_id", syndic.id);
      Object.entries(data).forEach(([k, v]) => formData.append(k, v));
      const result = await updateSyndicProfileAction(null, formData);
      if (result.success) toast.success("Informations du syndic mises a jour");
      else toast.error(result.error || "Erreur");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Informations du cabinet
        </CardTitle>
        <CardDescription>Details de votre syndic de copropriete</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="raison_sociale">Nom du syndic</Label>
            <Input id="raison_sociale" {...register("raison_sociale")} />
            {errors.raison_sociale && (
              <p className="text-xs text-destructive">{errors.raison_sociale.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="syndic_adresse">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Adresse
              </span>
            </Label>
            <Input id="syndic_adresse" {...register("adresse")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="syndic_telephone">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Telephone
              </span>
            </Label>
            <Input id="syndic_telephone" type="tel" {...register("telephone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="syndic_email">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email
              </span>
            </Label>
            <Input id="syndic_email" type="email" {...register("email")} />
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordForm() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const onSubmit = (data: PasswordData) => {
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => formData.append(k, v));
      const result = await changePasswordAction(null, formData);
      if (result.success) {
        toast.success("Mot de passe modifie");
        reset();
      } else {
        toast.error(result.error || "Erreur");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          Securite
        </CardTitle>
        <CardDescription>Modifiez votre mot de passe</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_password">Mot de passe actuel</Label>
            <Input
              id="current_password"
              type="password"
              placeholder="Entrez votre mot de passe actuel"
              {...register("current_password")}
            />
            {errors.current_password && (
              <p className="text-xs text-destructive">{errors.current_password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">Nouveau mot de passe</Label>
            <Input
              id="new_password"
              type="password"
              placeholder="Entrez un nouveau mot de passe"
              {...register("new_password")}
            />
            {errors.new_password && (
              <p className="text-xs text-destructive">{errors.new_password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="Confirmez le nouveau mot de passe"
              {...register("confirm_password")}
            />
            {errors.confirm_password && (
              <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
            )}
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Modifier le mot de passe
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
