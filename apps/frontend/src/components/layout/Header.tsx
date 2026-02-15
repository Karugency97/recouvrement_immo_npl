"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  userName: string;
  variant?: "client" | "admin";
  unreadCount?: number;
}

export function Header({ userName, variant = "client", unreadCount = 0 }: HeaderProps) {
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  const messagerieHref = variant === "admin" ? "/admin/messagerie" : "/messagerie";
  const badgeBg = variant === "admin" ? "bg-indigo-600" : "bg-red-500";
  const avatarBg =
    variant === "admin"
      ? "bg-indigo-600 text-slate-100"
      : "bg-slate-900 text-slate-100";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-card px-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {/* Breadcrumb placeholder */}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link href={messagerieHref}>
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span
                className={`absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ${badgeBg} text-[10px] font-medium text-slate-100`}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className={`${avatarBg} text-xs`}>
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
