"use client";

import { LayoutDashboard, QrCode, GraduationCap, CreditCard, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        <BottomNavItem
          href="/"
          icon={<LayoutDashboard size={20} />}
          label="Beranda"
          active={pathname === "/"}
        />
        <BottomNavItem
          href="/students"
          icon={<GraduationCap size={20} />}
          label="Siswa"
          active={pathname === "/students"}
        />
        <BottomNavItem
          href="/scanner"
          icon={
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/30 -mt-8 border-4 border-white dark:border-zinc-950">
              <QrCode size={24} />
            </div>
          }
          label="Scan"
          active={pathname === "/scanner"}
          isCenter
        />
        <BottomNavItem
          href="/teachers"
          icon={<Users size={20} />}
          label="Guru"
          active={pathname === "/teachers"}
        />
        <BottomNavItem
          href="/sessions"
          icon={<CreditCard size={20} />}
          label="Sesi"
          active={pathname === "/sessions"}
        />
      </div>
    </nav>
  );
}

function BottomNavItem({ href, icon, label, active, isCenter = false }: { href: string; icon: React.ReactNode; label: string; active: boolean; isCenter?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 transition-colors ${
        isCenter ? "" : "flex-1"
      } ${
        active
          ? "text-indigo-600 dark:text-indigo-400"
          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {icon}
      {!isCenter && <span className="text-[10px] font-bold tracking-tight uppercase">{label}</span>}
    </Link>
  );
}
