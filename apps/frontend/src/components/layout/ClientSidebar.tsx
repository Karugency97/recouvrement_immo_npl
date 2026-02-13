"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  MessageSquare,
  Settings,
  Plus,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/dossiers", icon: FolderOpen, label: "Mes Dossiers" },
  { href: "/documents", icon: FileText, label: "Documents" },
  { href: "/messagerie", icon: MessageSquare, label: "Messagerie", badge: 2 },
  { href: "/parametres", icon: Settings, label: "Parametres" },
];

interface ClientSidebarProps {
  userName: string;
  userCompany: string;
}

export function ClientSidebar({ userName, userCompany }: ClientSidebarProps) {
  const pathname = usePathname();

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[280px] border-r border-slate-200 bg-slate-900 text-slate-100 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
          <Scale className="h-5 w-5 text-slate-100" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-100">
            LegalRecover
          </h1>
          <p className="text-xs text-slate-400">Portail Client</p>
        </div>
      </div>

      {/* New Case Button */}
      <div className="px-4 py-4">
        <Button
          asChild
          className="w-full bg-slate-100 text-slate-900 hover:bg-slate-200 font-medium"
        >
          <Link href="/dossiers/nouveau">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Dossier
          </Link>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge className="bg-red-500 text-slate-100 hover:bg-red-500 px-2 py-0.5 text-xs">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 bg-slate-700">
            <AvatarFallback className="bg-slate-700 text-slate-200 text-sm">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">
              {userName}
            </p>
            <p className="text-xs text-slate-400 truncate">{userCompany}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
