"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isTeacherScanner = pathname === "/teacher-scanner";
  const isParentPortal = pathname.startsWith("/students/") && searchParams.get("portal") === "parent";

  if (isTeacherScanner || isParentPortal) {
    return <main className="min-h-screen overflow-y-auto">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-4 pb-4 pt-20 md:p-8 lg:p-12 scroll-smooth">
        <div className="max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
