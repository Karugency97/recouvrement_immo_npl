"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface MobileHeaderProps {
  onMenuClick: () => void;
  variant?: "client" | "admin";
}

export function MobileHeader({ onMenuClick, variant = "client" }: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-slate-200 bg-card px-4 md:hidden">
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="shrink-0">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Menu</span>
      </Button>
      <div className="flex items-center gap-2">
        <Image src="/logo.png" alt="ImmoJuris" width={28} height={28} className="rounded-md" />
        <span className="font-semibold text-foreground text-sm">ImmoJuris</span>
        {variant === "admin" && (
          <span className="text-xs text-indigo-500 font-medium">Admin</span>
        )}
      </div>
    </header>
  );
}
