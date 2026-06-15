"use client";

import { LayoutDashboard, Users, QrCode, Settings, CreditCard, BarChart3, LogOut, ChevronUp, ScanFace, Contact2, MapPin, GraduationCap, Presentation, Banknote, CalendarDays, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 border-r border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl p-6 hidden md:flex flex-col sticky top-0 h-screen z-50">
      <div className="flex flex-col gap-1 mb-10 px-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <div className="w-3 h-3 bg-white rounded-sm rotate-45" />
        </div>
        <span className="font-black text-2xl tracking-tighter mt-2">Therapy<span className="text-indigo-600">OS</span></span>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Bethesda Special School</span>
      </div>
      
      <div className="flex-1 space-y-8">
        <div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 mb-3">Ringkasan Utama</p>
          <nav className="space-y-1">
            <NavItem 
              href="/" 
              icon={<LayoutDashboard size={18} />} 
              label="Beranda" 
              active={pathname === "/"} 
            />
            <NavItem 
              href="/students" 
              icon={<GraduationCap size={18} />} 
              label="Data Siswa" 
              active={pathname === "/students"}
            />
            <NavItem 
              href="/scanner" 
              icon={<QrCode size={18} />} 
              label="Scan QR Kehadiran" 
              active={pathname === "/scanner"}
            />
            <NavItem 
              href="/teachers" 
              icon={<Presentation size={18} />} 
              label="Daftar Guru" 
              active={pathname === "/teachers"}
            />
          </nav>
        </div>

        <div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 mb-3">Manajemen</p>
          <nav className="space-y-1">
            <NavItem 
              href="/sessions" 
              icon={<CreditCard size={18} />} 
              label="Sesi Terapi" 
              active={pathname === "/sessions"}
            />
            <NavItem 
              href="/reports" 
              icon={<BarChart3 size={18} />} 
              label="Laporan & Insight" 
              active={pathname === "/reports"}
            />
            <NavItem 
              href="/revenue" 
              icon={<Banknote size={18} />} 
              label="Keuangan" 
              active={pathname === "/revenue"}
            />
            <NavItem 
              href="/schedules" 
              icon={<CalendarDays size={18} />} 
              label="Jadwal" 
              active={pathname === "/schedules"}
            />
            <NavItem 
              href="/notifications" 
              icon={<Bell size={18} />} 
              label="Notifikasi" 
              active={pathname === "/notifications"}
            />
            <NavItem 
              href="/settings" 
              icon={<Settings size={18} />} 
              label="Pengaturan" 
              active={pathname === "/settings"}
            />
          </nav>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-zinc-200/50 dark:border-zinc-800/50">
        <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900 font-bold text-sm shadow-lg">
              AD
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Admin SLB</span>
              <span className="text-[10px] text-zinc-500 font-medium">bethesda.admin</span>
            </div>
          </div>
          <ChevronUp size={14} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
        </div>
        
        <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
          <div className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">Portal Sekolah</div>
          <div className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 mt-1 font-medium italic">Bethesda Special School v1.0</div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        active 
          ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" 
          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}