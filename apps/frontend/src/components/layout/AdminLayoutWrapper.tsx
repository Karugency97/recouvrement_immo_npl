"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";

interface AdminLayoutWrapperProps {
  userName: string;
  userCompany: string;
  unreadCount?: number;
  activeDossiers?: number;
  tauxRecouvrement?: number;
  children: React.ReactNode;
}

export function AdminLayoutWrapper({
  userName,
  userCompany,
  unreadCount = 0,
  activeDossiers = 0,
  tauxRecouvrement = 0,
  children,
}: AdminLayoutWrapperProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <MobileHeader onMenuClick={() => setMobileOpen(true)} variant="admin" />
      <AdminSidebar
        userName={userName}
        userCompany={userCompany}
        unreadCount={unreadCount}
        activeDossiers={activeDossiers}
        tauxRecouvrement={tauxRecouvrement}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />
      <main className="flex-1 md:ml-[280px] pt-14 md:pt-0">
        <Header userName={userName} variant="admin" unreadCount={unreadCount} />
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </>
  );
}
