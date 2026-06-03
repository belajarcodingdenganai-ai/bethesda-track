"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import NotificationCenter from "@/components/notification-center";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const routeStackRef = useRef<string[]>([]);
  const isTeacherScanner = pathname === "/teacher-scanner";
  const isParentPortal =
    pathname.startsWith("/parent-portal/") ||
    (pathname.startsWith("/students/") && searchParams.get("portal") === "parent");

  useEffect(() => {
    const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const stored = sessionStorage.getItem("bethesda_route_stack");
    const stack = stored ? JSON.parse(stored) as string[] : [];
    if (stack[stack.length - 1] !== current) {
      stack.push(current);
      sessionStorage.setItem("bethesda_route_stack", JSON.stringify(stack.slice(-20)));
    }
    routeStackRef.current = stack.slice(-20);

    if (!history.state?.bethesdaGuard) {
      history.replaceState({ ...(history.state || {}), bethesdaGuard: true }, "", window.location.href);
      history.pushState({ bethesdaGuard: true }, "", window.location.href);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleBack = () => {
      const stack = routeStackRef.current.length > 0
        ? [...routeStackRef.current]
        : JSON.parse(sessionStorage.getItem("bethesda_route_stack") || "[]") as string[];

      if (stack.length > 1) {
        stack.pop();
        const previous = stack[stack.length - 1] || "/";
        routeStackRef.current = stack;
        sessionStorage.setItem("bethesda_route_stack", JSON.stringify(stack));
        router.replace(previous);
        setTimeout(() => {
          history.pushState({ bethesdaGuard: true }, "", window.location.href);
        }, 0);
        return;
      }

      history.pushState({ bethesdaGuard: true }, "", window.location.href);
    };

    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, [router]);

  if (isTeacherScanner || isParentPortal) {
    return <main className="min-h-screen overflow-y-auto">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="mobile-top-chrome md:hidden" />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header for Desktop */}
        <header className="hidden md:flex h-20 items-center justify-end px-12 shrink-0">
          <NotificationCenter />
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] pt-[calc(5.75rem+env(safe-area-inset-top))] md:p-8 lg:p-12 scroll-smooth">
          <div className="max-w-[1600px] mx-auto">{children}</div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
