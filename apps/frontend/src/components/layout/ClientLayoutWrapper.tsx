"use client";

import { useState } from "react";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";

interface ClientLayoutWrapperProps {
  userName: string;
  userCompany: string;
  unreadCount?: number;
  children: React.ReactNode;
}

export function ClientLayoutWrapper({
  userName,
  userCompany,
  unreadCount = 0,
  children,
}: ClientLayoutWrapperProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <MobileHeader onMenuClick={() => setMobileOpen(true)} variant="client" />
      <ClientSidebar
        userName={userName}
        userCompany={userCompany}
        unreadCount={unreadCount}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />
      <main className="flex-1 md:ml-[280px] pt-14 md:pt-0">
        <Header userName={userName} variant="client" />
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </>
  );
}
