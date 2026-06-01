'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  GraduationCap,
  HeartPulse,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function StudentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const studentId = params.id as string;
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isParentPortal, setIsParentPortal] = useState(false);

  useEffect(() => {
    const parentPortal = searchParams.get('portal') === 'parent';
    setIsParentPortal(parentPortal);
    fetchStudent(parentPortal);
  }, [studentId, searchParams]);

  const fetchStudent = async (parentPortal = false) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/students/${studentId}${parentPortal ? '?portal=parent' : ''}`,
      );
      if (!response.ok) throw new Error('Student not found');
      const data = await response.json();
      setStudent(data);
    } catch (error) {
      console.error('Error fetching student:', error);
      toast.error('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading student details...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Student not found</p>
      </div>
    );
  }

  const activePackage = student.packages?.[0];
  const sessionsUsed = activePackage?.usedSessions || 0;
  const totalSessions = activePackage?.totalSessions || 0;
  const percentage = totalSessions > 0 ? (sessionsUsed / totalSessions) * 100 : 0;
  const remainingSessions = Math.max(totalSessions - sessionsUsed, 0);
  const recentAttendances = student.attendances?.slice(0, 8) || [];
  const adminWhatsAppNumber = '6285280039953';
  const adminWhatsAppMessage = encodeURIComponent(
    `Halo Admin Bethesda Special School, saya ingin bertanya mengenai Parent Portal untuk ${student.name}.`
  );
  const adminWhatsAppHref = `https://wa.me/${adminWhatsAppNumber}?text=${adminWhatsAppMessage}`;

  if (isParentPortal) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50">
        <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <HeartPulse size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">
                  Parent Portal
                </p>
                <h1 className="text-xl font-black tracking-tight">Bethesda Special School</h1>
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

        <main className="max-w-6xl mx-auto px-5 py-8 space-y-6">
          <section className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-6">
            <div className="rounded-[32px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 overflow-hidden relative">
              <div className="absolute right-0 top-0 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div>
                    <p className="text-sm font-bold text-zinc-500">Selamat datang, Orang Tua/Wali</p>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight mt-2">{student.name}</h2>
                    <p className="text-sm text-zinc-500 mt-2">
                      {student.nickname ? `Nama panggilan: ${student.nickname}` : student.registrationNo}
                    </p>
                  </div>
                  <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center text-4xl font-black shadow-xl">
                    {student.name?.charAt(0)}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
                  <div className="p-4 rounded-3xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Sisa Sesi</p>
                    <p className="text-3xl font-black mt-2">{remainingSessions}</p>
                  </div>
                  <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Hadir</p>
                    <p className="text-3xl font-black mt-2">{student._count?.attendances || 0}</p>
                  </div>
                  <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Status Paket</p>
                    <p className="text-xl font-black mt-3">{activePackage?.status || 'Belum Ada'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] bg-zinc-900 text-white p-6 sm:p-8 flex flex-col justify-between gap-8">
              <div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <ShieldCheck size={20} />
                  <p className="text-xs font-black uppercase tracking-[0.2em]">Akses Aman</p>
                </div>
                <h3 className="text-2xl font-black tracking-tight mt-4">Progress terapi anak Anda</h3>
                <p className="text-sm text-zinc-400 mt-2">
                  Data ini membantu keluarga memantau sesi yang sudah digunakan dan jadwal kehadiran terbaru.
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

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-[32px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Riwayat</p>
                  <h3 className="text-2xl font-black tracking-tight">Kehadiran Terbaru</h3>
                </div>
                <CalendarDays size={22} className="text-indigo-600" />
              </div>

              <div className="space-y-3">
                {recentAttendances.length > 0 ? (
                  recentAttendances.map((attendance: any) => (
                    <div
                      key={attendance.id}
                      className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <p className="font-black">
                            {format(new Date(attendance.checkIn), 'EEEE, dd MMMM yyyy', { locale: id })}
                          </p>
                          <p className="text-sm text-zinc-500">
                            {attendance.program?.name || 'Terapi'} dengan {attendance.teacher?.user?.name || 'Terapis'}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
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

            <div className="space-y-6">
              <div className="rounded-[32px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
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
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Tanggal Mulai</p>
                    <p className="text-lg font-black mt-1">
                      {activePackage?.createdAt ? format(new Date(activePackage.createdAt), 'dd MMM yyyy') : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MessageSquare size={22} className="text-emerald-600" />
                  <h3 className="text-xl font-black tracking-tight">Butuh Bantuan?</h3>
                </div>
                <p className="text-sm text-zinc-500 mb-5">
                  Hubungi admin sekolah untuk perubahan jadwal, konfirmasi sesi, atau pertanyaan paket.
                </p>
                <a
                  href={adminWhatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 transition-colors"
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/students" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{student.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {student.registrationNo} • {student.status === 'ACTIVE' ? '✅ Active' : '❌ Inactive'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Personal Information</h2>
              <button className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                <Edit2 size={14} />
                Edit
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Nickname</p>
                <p className="font-medium">{student.nickname || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Age</p>
                <p className="font-medium">{student.age || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Gender</p>
                <p className="font-medium">{student.gender || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">School</p>
                <p className="font-medium">{student.school || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground mb-2">Diagnosis</p>
                <p className="font-medium">{student.diagnosis || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground mb-2">Address</p>
                <p className="font-medium">{student.address || '-'}</p>
              </div>
            </div>
          </div>

          {/* Active Package */}
          {activePackage && (
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h2 className="text-xl font-semibold mb-6">Current Therapy Package</h2>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Session Progress</p>
                    <p className="text-sm font-semibold">
                      {sessionsUsed} / {totalSessions}
                    </p>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{percentage.toFixed(0)}% complete</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Program</p>
                    <p className="font-semibold">{activePackage.program?.name || '-'}</p>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Frequency</p>
                    <p className="font-semibold">{activePackage.frequency}x/week</p>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <span
                      className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                        activePackage.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : activePackage.status === 'WARNING'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {activePackage.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Attendance */}
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-6">Recent Attendance</h2>

            <div className="space-y-2">
              {student.attendances?.length > 0 ? (
                student.attendances.slice(0, 10).map((attendance: any) => (
                  <div
                    key={attendance.id}
                    className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(attendance.checkIn), 'EEE, MMM d, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(attendance.checkIn), 'HH:mm')} - {attendance.teacher?.user?.name || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{attendance.program?.name}</p>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded inline-block mt-1">
                        ✓ Present
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No attendance records yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total Sessions</p>
                <p className="text-2xl font-bold">{student._count?.attendances || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Programs</p>
                <p className="text-2xl font-bold">{student._count?.packages || 0}</p>
              </div>
            </div>
          </div>

          {/* Parent Contact */}
          {(student.parentEmail || student.parentPhone) && (
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="font-semibold mb-4">Parent Contact</h3>
              <div className="space-y-3">
                {student.parentEmail && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                    <a href={`mailto:${student.parentEmail}`} className="text-indigo-600 hover:underline text-sm break-all">
                      {student.parentEmail}
                    </a>
                  </div>
                )}
                {student.parentPhone && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Phone</p>
                    <a href={`tel:${student.parentPhone}`} className="text-indigo-600 hover:underline text-sm">
                      {student.parentPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="font-semibold mb-4">QR Code</h3>
            <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg flex flex-col gap-3">
              <div className="text-center">
                <p className="text-sm font-mono text-muted-foreground">{student.qrCode}</p>
              </div>
              <button className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                <Download size={14} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
