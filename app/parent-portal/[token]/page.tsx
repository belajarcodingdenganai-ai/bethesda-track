'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Activity, CalendarDays, CheckCircle2, Clock, GraduationCap, MessageSquare, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ParentPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchParentPortal();

    const interval = setInterval(() => {
      fetchParentPortal(true);
    }, 30000);

    const handleFocus = () => {
      fetchParentPortal(true);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [token]);

  const fetchParentPortal = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await fetch(`/api/parent-portal/${token}`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Link parent portal tidak valid.');
      }

      setStudent(data.student);
      setError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memuat parent portal.';
      setError(message);
      if (!silent) toast.error(message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
          <p className="font-bold text-zinc-500">Memuat Parent Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="max-w-md rounded-[32px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <ShieldCheck size={36} className="mx-auto mb-4 text-zinc-300" />
          <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-50">Link Tidak Valid</h1>
          <p className="mt-3 text-sm font-medium text-zinc-500">
            {error || 'Silakan minta link Parent Portal terbaru dari admin Rumah Bethesda.'}
          </p>
        </div>
      </div>
    );
  }

  const activePackage = student.packages?.[0];
  const sessionsUsed = activePackage?.usedSessions || 0;
  const totalSessions = activePackage?.totalSessions || 0;
  const percentage = totalSessions > 0 ? (sessionsUsed / totalSessions) * 100 : 0;
  const remainingSessions = Math.max(totalSessions - sessionsUsed, 0);
  const recentAttendances = student.attendances || [];
  const adminWhatsAppNumber = '6285280039953';
  const adminWhatsAppMessage = encodeURIComponent(
    `Halo Admin Rumah Bethesda, saya ingin bertanya mengenai Parent Portal untuk ${student.name}.`,
  );
  const adminWhatsAppHref = `https://wa.me/${adminWhatsAppNumber}?text=${adminWhatsAppMessage}`;

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="safe-area-top bg-white/95 shadow-sm shadow-zinc-200/60 ring-1 ring-zinc-200/70 backdrop-blur-xl dark:bg-zinc-900/95 dark:shadow-black/20 dark:ring-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-md shadow-indigo-500/10 ring-1 ring-blue-100 sm:h-12 sm:w-12">
              <Image src="/brand/rumah-bethesda-logo.png" alt="Rumah Bethesda" width={48} height={48} className="h-full w-full object-cover" priority />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">Parent Portal</p>
              <h1 className="truncate text-lg font-black tracking-tight sm:text-xl">Rumah Bethesda</h1>
            </div>
          </div>
          <a
            href={adminWhatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <MessageSquare size={16} />
            Hubungi Sekolah
          </a>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:px-5 sm:py-8">
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_0.65fr] lg:gap-6">
          <div className="relative overflow-hidden rounded-[26px] border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-[32px] sm:p-8">
            <div className="relative">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-gradient-to-br from-indigo-500 to-sky-500 text-3xl font-black text-white shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-50 dark:ring-indigo-950/40 sm:h-24 sm:w-24 sm:rounded-[28px] sm:text-4xl">
                  {student.profileImage ? (
                    <img src={student.profileImage} alt={student.name} className="h-full w-full object-cover" />
                  ) : (
                    student.name?.charAt(0)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400 sm:text-sm sm:normal-case sm:tracking-normal sm:text-zinc-500">Selamat datang, Orang Tua/Wali</p>
                  <h2 className="mt-1 break-words text-2xl font-black tracking-tight text-zinc-950 dark:text-white sm:mt-2 sm:text-5xl">{student.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-zinc-500 sm:mt-2">
                    {student.nickname ? `Nama panggilan: ${student.nickname}` : student.registrationNo}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-3">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/30 sm:rounded-3xl sm:p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Sisa Sesi</p>
                  <p className="mt-2 text-2xl font-black sm:text-3xl">{remainingSessions}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/30 sm:rounded-3xl sm:p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Hadir</p>
                  <p className="mt-2 text-2xl font-black sm:text-3xl">{student._count?.attendances || 0}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/30 sm:rounded-3xl sm:p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Status Paket</p>
                  <p className="mt-2 break-words text-base font-black sm:mt-3 sm:text-xl">{activePackage?.status || 'Belum Ada'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-6 rounded-[26px] bg-zinc-900 p-5 text-white shadow-sm sm:rounded-[32px] sm:p-8 lg:gap-8">
            <div>
              <div className="flex items-center gap-2 text-emerald-300">
                <ShieldCheck size={20} />
                <p className="text-xs font-black uppercase tracking-[0.2em]">Akses Khusus Parent</p>
              </div>
              <h3 className="mt-4 text-xl font-black tracking-tight sm:text-2xl">Progress terapi anak Anda</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Link ini hanya menampilkan data anak yang terhubung dengan portal parent ini.
              </p>
            </div>
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span>{sessionsUsed} terpakai</span>
                <span>{totalSessions} total</span>
              </div>
              <div className="h-4 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 mt-3">{percentage.toFixed(0)}% paket berjalan</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="rounded-[26px] border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-[32px] sm:p-6 lg:col-span-2">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Riwayat</p>
                <h3 className="text-xl font-black tracking-tight sm:text-2xl">Kehadiran Terbaru</h3>
              </div>
              <CalendarDays size={22} className="text-indigo-600" />
            </div>

            <div className="space-y-3">
              {recentAttendances.length > 0 ? (
                recentAttendances.map((attendance: any) => (
                  <div
                    key={attendance.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center sm:rounded-3xl"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black leading-5 sm:text-base">
                          {format(new Date(attendance.checkIn), 'EEEE, dd MMMM yyyy', { locale: id })}
                        </p>
                        <p className="mt-0.5 text-sm leading-5 text-zinc-500">
                          {attendance.program?.name || 'Terapi'} dengan {attendance.teacher?.user?.name || 'Terapis'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 sm:bg-transparent sm:px-0 sm:py-0 dark:sm:bg-transparent">
                      <Clock size={15} />
                      {format(new Date(attendance.checkIn), 'HH:mm')}
                      {attendance.checkOut ? ` - ${format(new Date(attendance.checkOut), 'HH:mm')}` : ''}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center rounded-3xl bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800">
                  <Activity size={32} className="mx-auto text-zinc-300 mb-3" />
                  <p className="font-bold text-zinc-500">Belum ada riwayat kehadiran.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="rounded-[26px] border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-[32px] sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <GraduationCap size={22} className="text-indigo-600" />
                <h3 className="text-xl font-black tracking-tight">Program Saat Ini</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Program</p>
                  <p className="text-lg font-black mt-1">{activePackage?.program?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Frekuensi</p>
                  <p className="text-lg font-black mt-1">
                    {activePackage ? `${activePackage.frequency}x per minggu` : '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-[32px] sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare size={22} className="text-emerald-600" />
                <h3 className="text-xl font-black tracking-tight">Butuh Bantuan?</h3>
              </div>
              <p className="mb-5 text-sm leading-6 text-zinc-500">
                Hubungi admin sekolah untuk perubahan jadwal, konfirmasi sesi, atau pertanyaan paket.
              </p>
              <a
                href={adminWhatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-emerald-700"
              >
                <MessageSquare size={16} />
                Hubungi Admin
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
