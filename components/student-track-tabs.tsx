"use client";

import { GraduationCap, School } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function StudentTrackTabs() {
  const pathname = usePathname();
  const isSchool = pathname === "/students/school";

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-2 gap-2">
        <StudentTrackTab
          href="/students"
          active={!isSchool}
          icon={<GraduationCap size={18} />}
          label="Siswa Terapi"
        />
        <StudentTrackTab
          href="/students/school"
          active={isSchool}
          icon={<School size={18} />}
          label="Siswa Sekolah"
        />
      </div>
    </div>
  );
}

function StudentTrackTab({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-black uppercase tracking-widest transition-all sm:text-sm ${
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
          : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}
