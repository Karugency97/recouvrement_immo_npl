"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  MessageSquare,
  Settings,
  Plus,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/dossiers", icon: FolderOpen, label: "Mes Dossiers" },
  { href: "/documents", icon: FileText, label: "Documents" },
  { href: "/messagerie", icon: MessageSquare, label: "Messagerie", badgeKey: "messagerie" as const },
  { href: "/parametres", icon: Settings, label: "Parametres" },
];

interface ClientSidebarProps {
  userName: string;
  userCompany: string;
  unreadCount?: number;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function ClientSidebar({
  userName,
  userCompany,
  unreadCount = 0,
  mobileOpen = false,
  onMobileOpenChange,
}: ClientSidebarProps) {
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

  const handleNavClick = () => {
    onMobileOpenChange?.(false);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <Image src="/logo.png" alt="ImmoJuris" width={40} height={40} className="rounded-lg" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-100">
            ImmoJuris
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
          <Link href="/dossiers/nouveau" onClick={handleNavClick}>
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
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {item.badgeKey === "messagerie" && unreadCount > 0 && (
                <Badge className="bg-red-500 text-slate-100 hover:bg-red-500 px-2 py-0.5 text-xs">
                  {unreadCount}
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
          <button
            onClick={handleLogout}
            title="Se déconnecter"
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-[280px] border-r border-slate-200 bg-slate-900 text-slate-100 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-[280px] p-0 bg-slate-900 text-slate-100 border-slate-700 [&>button]:text-slate-400 [&>button]:hover:text-slate-100"
        >
          <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
          <div className="flex flex-col h-full">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
