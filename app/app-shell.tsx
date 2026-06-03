"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import NotificationCenter from "@/components/notification-center";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isTeacherScanner = pathname === "/teacher-scanner";
  const isParentPortal =
    pathname.startsWith("/parent-portal/") ||
    (pathname.startsWith("/students/") && searchParams.get("portal") === "parent");

  if (isTeacherScanner || isParentPortal) {
    return <main className="min-h-screen overflow-y-auto">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header for Desktop */}
        <header className="hidden md:flex h-20 items-center justify-end px-12 shrink-0">
          <NotificationCenter />
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))] md:p-8 lg:p-12 scroll-smooth">
          <div className="max-w-[1600px] mx-auto">{children}</div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
