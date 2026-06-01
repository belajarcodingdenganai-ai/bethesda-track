"use client";

import { LayoutDashboard, QrCode, Settings, CreditCard, ChevronUp, GraduationCap, Presentation, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-200/70 bg-white/90 px-4 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/90 md:hidden">
        <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <BrandMark />
          <div className="flex flex-col leading-none">
            <span className="text-lg font-black tracking-tight text-zinc-950 dark:text-zinc-50">
              Therapy<span className="text-indigo-600">OS</span>
            </span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
              Bethesda Special School
            </span>
          </div>
        </Link>
        <button
          type="button"
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-zinc-950/35 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(86vw,22rem)] flex-col overflow-y-auto border-r border-zinc-200 bg-white px-5 pb-6 pt-20 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <aside className="sticky top-0 z-50 hidden h-screen w-72 flex-col border-r border-zinc-200/50 bg-white/50 p-6 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50 md:flex">
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  );
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      <div className="mb-10 flex flex-col gap-1 px-2">
        <BrandMark />
        <span className="mt-2 text-2xl font-black tracking-tight">Therapy<span className="text-indigo-600">OS</span></span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Bethesda Special School</span>
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
              onNavigate={onNavigate}
            />
            <NavItem 
              href="/students" 
              icon={<GraduationCap size={18} />} 
              label="Data Siswa" 
              active={pathname === "/students"}
              onNavigate={onNavigate}
            />
            <NavItem 
              href="/scanner" 
              icon={<QrCode size={18} />} 
              label="Scan QR Kehadiran" 
              active={pathname === "/scanner"}
              onNavigate={onNavigate}
            />
            <NavItem
              href="/teacher-scanner"
              icon={<Presentation size={18} />}
              label="Scan Guru"
              active={pathname === "/teacher-scanner"}
              onNavigate={onNavigate}
            />
            <NavItem 
              href="/teachers" 
              icon={<Presentation size={18} />} 
              label="Daftar Guru" 
              active={pathname === "/teachers"}
              onNavigate={onNavigate}
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
              onNavigate={onNavigate}
            />
            <NavItem 
              href="/settings" 
              icon={<Settings size={18} />} 
              label="Pengaturan" 
              active={pathname === "/settings"}
              onNavigate={onNavigate}
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
    </>
  );
}

function BrandMark() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-500/20">
      <div className="h-3 w-3 rotate-45 rounded-sm bg-white" />
    </div>
  );
}

function NavItem({ href, icon, label, active = false, onNavigate }: { href: string, icon: React.ReactNode, label: string, active?: boolean, onNavigate?: () => void }) {
  return (
    <Link 
      href={href}
      onClick={onNavigate}
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
