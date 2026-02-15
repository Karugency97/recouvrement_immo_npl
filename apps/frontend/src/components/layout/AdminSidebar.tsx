"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  LayoutDashboard,
  FolderKanban,
  CalendarCheck,
  Users,
  Receipt,
  Search,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

const adminNavItems = [
  {
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    label: "Tableau de Bord",
    exact: true,
  },
  {
    href: "/admin/dossiers",
    icon: FolderKanban,
    label: "Tous les Dossiers",
  },
  {
    href: "/admin/taches",
    icon: CalendarCheck,
    label: "Taches & Audiences",
  },
  { href: "/admin/annuaire", icon: Users, label: "Annuaire" },
  { href: "/admin/facturation", icon: Receipt, label: "Facturation" },
];

interface AdminSidebarProps {
  userName: string;
  userCompany: string;
}

export function AdminSidebar({ userName, userCompany }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[280px] border-r border-slate-800 bg-slate-950 text-slate-100 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <Image src="/logo.png" alt="ImmoJuris" width={40} height={40} className="rounded-lg" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-100">
            ImmoJuris
          </h1>
          <p className="text-xs text-indigo-400 font-medium">Administration</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Rechercher un dossier..."
            className="pl-9 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {adminNavItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-600/30"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Stats Block */}
      <div className="mx-4 mb-4 rounded-lg bg-slate-900 p-4 border border-slate-800">
        <p className="text-xs text-slate-400 mb-2">Ce mois</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xl font-semibold text-slate-100">--</p>
            <p className="text-xs text-slate-400">Dossiers actifs</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-emerald-400">--%</p>
            <p className="text-xs text-slate-400">Taux recouvrement</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 bg-indigo-600">
            <AvatarFallback className="bg-indigo-600 text-slate-100 text-sm">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">
              {userName}
            </p>
            <p className="text-xs text-slate-400 truncate">{userCompany}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Se déconnecter"
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
