'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Settings,
  BookOpen,
  Trash2,
  Plus,
  ShieldCheck,
  Info,
  Bell,
  MessageSquare,
  Smartphone,
  Globe,
  Github,
  ExternalLink,
  ChevronRight,
  Database,
  Lock,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { getPrograms, deleteProgram } from '@/app/actions/member';

export default function SettingsPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const result = await getPrograms();
      if (result.success) {
        setPrograms(result.data);
      }
    } catch (error) {
      toast.error('Gagal memuat data program');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProgram = async (id: string, name: string) => {
    if (!window.confirm(`Hapus program ${name}? Semua data paket terkait mungkin terpengaruh.`)) return;

    const result = await deleteProgram(id);
    if (result.success) {
      toast.success(`Program ${name} dihapus`);
      fetchPrograms();
    } else {
      toast.error(`Gagal: ${result.error}`);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div>
        <h1 className="text-5xl font-black tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-600 dark:from-white dark:to-zinc-400">
          Pengaturan
        </h1>
        <p className="text-zinc-500 text-lg font-medium italic mt-2">Konfigurasi sistem, manajemen program, dan integrasi.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:w-64 shrink-0">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0">
            <TabButton
              active={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
              icon={<Settings size={18} />}
              label="Umum"
            />
            <TabButton
              active={activeTab === 'programs'}
              onClick={() => setActiveTab('programs')}
              icon={<BookOpen size={18} />}
              label="Program Terapi"
            />
            <TabButton
              active={activeTab === 'notifications'}
              onClick={() => setActiveTab('notifications')}
              icon={<Bell size={18} />}
              label="Notifikasi"
            />
            <TabButton
              active={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
              icon={<ShieldCheck size={18} />}
              label="Keamanan"
            />
            <TabButton
              active={activeTab === 'system'}
              onClick={() => setActiveTab('system')}
              icon={<Info size={18} />}
              label="Info Sistem"
            />
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-8">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <SectionHeader title="Pengaturan Umum" description="Konfigurasi dasar aplikasi BethesdaTrack." />
              <div className="grid gap-4">
                <SettingsCard
                  title="Nama Institusi"
                  value="Bethesda Special School"
                  icon={<Globe size={20} />}
                />
                <SettingsCard
                  title="Zona Waktu"
                  value="Asia/Jakarta (GMT+7)"
                  icon={<Globe size={20} />}
                />
                <SettingsCard
                  title="Mata Uang"
                  value="IDR (Rp)"
                  icon={<Database size={20} />}
                />
              </div>
            </div>
          )}

          {activeTab === 'programs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <SectionHeader title="Manajemen Program" description="Daftar layanan terapi yang tersedia di sekolah." />
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover-lift">
                  <Plus size={16} /> Tambah Program
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {programs.map(prog => (
                  <div key={prog.id} className="p-6 glass-card rounded-3xl group">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-wider">
                          {prog.name}
                        </span>
                        <h3 className="text-xl font-black mt-2 tracking-tight">{prog.description || prog.name}</h3>
                        <div className="mt-4 flex gap-4">
                          <div className="text-center">
                            <p className="text-[10px] font-black text-zinc-400 uppercase">Siswa</p>
                            <p className="font-black text-zinc-900 dark:text-zinc-100">{prog._count.studentPrograms}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-zinc-400 uppercase">Paket</p>
                            <p className="font-black text-zinc-900 dark:text-zinc-100">{prog._count.packages}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-zinc-400 uppercase">Scan</p>
                            <p className="font-black text-zinc-900 dark:text-zinc-100">{prog._count.attendances}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteProgram(prog.id, prog.name)}
                        className="p-2 text-zinc-300 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <SectionHeader title="Integrasi Notifikasi" description="Kelola pengiriman alert otomatis ke orang tua dan guru." />
              <div className="grid gap-4">
                <ToggleCard
                  title="Notifikasi WhatsApp"
                  description="Kirim update kehadiran otomatis via WA Gateway."
                  icon={<MessageSquare size={20} className="text-emerald-500" />}
                  enabled={true}
                />
                <ToggleCard
                  title="Alert Sisa Sesi"
                  description="Beri peringatan saat sesi siswa tersisa kurang dari 2."
                  icon={<Zap size={20} className="text-amber-500" />}
                  enabled={true}
                />
                <ToggleCard
                  title="Laporan Harian"
                  description="Kirim ringkasan kehadiran harian ke Admin."
                  icon={<Smartphone size={20} className="text-indigo-500" />}
                  enabled={false}
                />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <SectionHeader title="Keamanan & Akses" description="Konfigurasi Role-Based Access Control (RBAC)." />
              <div className="grid gap-4">
                <div className="p-6 glass-card rounded-3xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                      <Lock size={20} />
                    </div>
                    <div>
                      <p className="font-black text-zinc-900 dark:text-zinc-100 uppercase text-[10px] tracking-widest mb-1">Mode Scanner</p>
                      <p className="text-sm text-zinc-500 font-medium">Hanya izinkan scan dari perangkat terdaftar.</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest">Off</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <SectionHeader title="Informasi Sistem" description="Detail teknis dan versi aplikasi." />
              <div className="p-8 glass-card rounded-[32px] bg-zinc-900 text-white overflow-hidden relative">
                <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px]" />
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                  <div className="w-24 h-24 bg-white/10 rounded-[32px] flex items-center justify-center backdrop-blur-md">
                    <BrandMarkWhite />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-3xl font-black tracking-tight mb-2">TherapyOS Enterprise</h3>
                    <p className="text-zinc-400 font-medium mb-6">Versi 0.1.1 Production-Ready</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <StatMini label="Database" value="Postgres" />
                      <StatMini label="Frontend" value="Next.js 14" />
                      <StatMini label="Engine" value="Prisma" />
                      <StatMini label="Status" value="Online" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <Link href="https://github.com" className="p-6 glass-card rounded-3xl flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all">
                  <div className="flex items-center gap-4">
                    <Github size={20} />
                    <span className="font-bold">Dokumentasi API</span>
                  </div>
                  <ExternalLink size={16} className="text-zinc-400" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
        active
          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xl'
          : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function SectionHeader({ title, description }: any) {
  return (
    <div>
      <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h2>
      <p className="text-sm font-medium text-zinc-500 mt-1">{description}</p>
    </div>
  );
}

function SettingsCard({ title, value, icon }: any) {
  return (
    <div className="p-6 glass-card rounded-3xl flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
          {icon}
        </div>
        <div>
          <p className="font-black text-zinc-900 dark:text-zinc-100 uppercase text-[10px] tracking-widest mb-1">{title}</p>
          <p className="text-sm text-zinc-500 font-medium">{value}</p>
        </div>
      </div>
      <ChevronRight size={18} className="text-zinc-300" />
    </div>
  );
}

function ToggleCard({ title, description, icon, enabled }: any) {
  return (
    <div className="p-6 glass-card rounded-3xl flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
          {icon}
        </div>
        <div>
          <p className="font-black text-zinc-900 dark:text-zinc-100 uppercase text-[10px] tracking-widest mb-1">{title}</p>
          <p className="text-sm text-zinc-500 font-medium">{description}</p>
        </div>
      </div>
      <div className={`w-12 h-6 rounded-full p-1 transition-colors ${enabled ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}

function StatMini({ label, value }: any) {
  return (
    <div>
      <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">{label}</p>
      <p className="font-black text-white text-sm">{value}</p>
    </div>
  );
}

function BrandMarkWhite() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg">
      <div className="h-4 w-4 rotate-45 rounded bg-indigo-600" />
    </div>
  );
}
