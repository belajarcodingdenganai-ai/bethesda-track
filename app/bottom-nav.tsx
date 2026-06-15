"use client";

import { LayoutDashboard, QrCode, GraduationCap, CreditCard, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/95 shadow-2xl shadow-zinc-900/10 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden safe-area-bottom">
      <div className="flex h-16 items-center justify-around px-2">
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
          active={pathname === "/students" || pathname.startsWith("/students/")}
        />
        <BottomNavItem
          href="/scanner"
          icon={
            <div className="-mt-8 rounded-2xl border-4 border-white bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-500/30 dark:border-zinc-950">
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
      className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-colors ${
        isCenter ? "" : "flex-1"
      } ${
        active
          ? "text-indigo-600 dark:text-indigo-400"
          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {icon}
      {!isCenter && <span className="max-w-full truncate text-[10px] font-black uppercase tracking-tight">{label}</span>}
    </Link>
  );
}
