'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Users,
  Activity,
  Download,
  FileText,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCcw,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { getReportData, getDashboardStats } from '@/app/actions/attendance';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { downloadBlobFile } from '@/lib/download-utils';
import { getChecklistItemStatus, getChecklistItemStatusLabel } from '@/lib/student-program-checklists';

function checklistStatusBadgeClass(task: any) {
  const status = getChecklistItemStatus(task);
  if (status === 'done') return 'bg-emerald-500 text-white';
  return 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400';
}

function checklistStatusMark(task: any) {
  const status = getChecklistItemStatus(task);
  if (status === 'done') return 'OK';
  return '';
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData(true);
    }, 300000);

    const handleFocus = () => {
      fetchData(true);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [reportRes, statsRes] = await Promise.all([
        getReportData(),
        getDashboardStats()
      ]);

      if (reportRes.success) setReportData(reportRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (error) {
      if (!silent) toast.error('Gagal memuat data laporan');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const buildReportRows = () => [
    ...(reportData?.dailyAttendance || []).map((day: any) => ({
      Kategori: 'Tren Kehadiran',
      Nama: format(new Date(day.date), 'dd MMMM yyyy', { locale: id }),
      Jumlah: day.count,
      Keterangan: 'Kehadiran harian',
    })),
    ...(reportData?.programDistribution || []).map((program: any) => ({
      Kategori: 'Distribusi Program',
      Nama: program.name,
      Jumlah: program.count,
      Keterangan: 'Total sesi per program',
    })),
    ...(reportData?.studentProgramCards || []).map((item: any) => ({
      Kategori: 'Program/Materi Anak',
      Nama: `${item.studentName} (${item.registrationNo})`,
      Jumlah: `${item.usedSessions}/${item.totalSessions}`,
      Keterangan: `${item.programName} · Sisa ${item.remainingSessions} sesi · Hadir ${item.totalAttendances}${item.checklist ? ` · Checklist ${item.checklist.summary.done}/${item.checklist.summary.total}` : ''}`,
    })),
    ...(reportData?.studentProgramCards || []).flatMap((item: any) =>
      (item.checklist?.sections || []).flatMap((section: any) =>
        section.items.map((task: any) => ({
          Kategori: 'Checklist Program/Materi',
          Nama: `${item.checklist.studentName} - ${section.title}`,
          Jumlah: getChecklistItemStatusLabel(task),
          Keterangan: `${task.text}${section.scheduleTime ? ` · ${section.scheduleTime}` : ''}`,
        })),
      ),
    ),
    ...(reportData?.schoolProgramCards || []).map((item: any) => ({
      Kategori: 'Program Pembelajaran Sekolah',
      Nama: `${item.studentName} (${item.registrationNo})`,
      Jumlah: `${item.checklist?.summary?.done || 0}/${item.checklist?.summary?.total || 0}`,
      Keterangan: `${item.programName} · Guru ${item.teacherName} · ${item.scheduleTime} · Checklist ${item.checklist?.summary?.percentage || 0}%`,
    })),
    ...(reportData?.schoolProgramCards || []).flatMap((item: any) =>
      (item.checklist?.sections || []).flatMap((section: any) =>
        section.items.map((task: any) => ({
          Kategori: 'Checklist Pembelajaran Sekolah',
          Nama: `${item.studentName} - ${section.title}`,
          Jumlah: getChecklistItemStatusLabel(task),
          Keterangan: `${task.text}${section.scheduleTime ? ` · ${section.scheduleTime}` : ''}`,
        })),
      ),
    ),
    ...(stats?.teacherAttendance || []).map((teacher: any) => ({
      Kategori: 'Performa Terapis',
      Nama: teacher.user?.name || '-',
      Jumlah: teacher._count?.attendances || 0,
      Keterangan: teacher.division || '-',
    })),
  ];

  const exportReportExcel = async () => {
    const rows = buildReportRows();
    if (rows.length === 0) {
      toast.error('Tidak ada data laporan untuk diekspor');
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
      const content = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      await downloadBlobFile(
        new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `laporan-bethesda-${format(new Date(), 'yyyyMMdd')}.xlsx`,
      );
      toast.success('Excel laporan berhasil diunduh');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengekspor Excel');
    }
  };

  const exportReportPdf = async () => {
    const rows = buildReportRows();
    if (rows.length === 0) {
      toast.error('Tidak ada data laporan untuk diekspor');
      return;
    }

    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.text('Laporan Rumah Bethesda', 14, 16);
      autoTable(doc, {
        startY: 24,
        head: [['Kategori', 'Nama', 'Jumlah', 'Keterangan']],
        body: rows.map((row) => [row.Kategori, row.Nama, row.Jumlah, row.Keterangan]),
      });
      await downloadBlobFile(doc.output('blob'), `laporan-bethesda-${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success('PDF laporan berhasil diunduh');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengekspor PDF');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-600 dark:from-white dark:to-zinc-400">
            Analytics
          </h1>
          <p className="text-zinc-500 text-lg font-medium italic mt-2">Visualisasi data kehadiran dan performa program.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => fetchData()} className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-3xl hover:bg-zinc-200 transition-all">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportReportExcel} className="flex items-center gap-2 px-5 py-4 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-3xl font-black text-xs uppercase tracking-widest hover-lift shadow-xl">
            <Download size={18} /> Excel
          </button>
          <button onClick={exportReportPdf} className="flex items-center gap-2 px-5 py-4 bg-white text-zinc-900 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800 rounded-3xl font-black text-xs uppercase tracking-widest hover-lift shadow-xl">
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      {/* KPI Overlays */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        <ReportKPI
          label="Tingkat Kehadiran"
          value="94.2%"
          change="+2.4%"
          trend="up"
          icon={<CheckCircle2 size={24} />}
          color="emerald"
        />
        <ReportKPI
          label="Total Sesi Bulan Ini"
          value={stats?.totalTherapyToday * 20 || 450}
          change="+12%"
          trend="up"
          icon={<Activity size={24} />}
          color="indigo"
        />
        <ReportKPI
          label="Siswa Baru"
          value={stats?.totalStudents || 0}
          change="+5"
          trend="up"
          icon={<Users size={24} />}
          color="blue"
        />
        <ReportKPI
          label="Program/Materi"
          value={stats?.studentProgramStats?.activePrograms || 0}
          change={`${stats?.studentProgramStats?.totalCards || 0} anak`}
          trend="up"
          icon={<BookOpen size={24} />}
          color="amber"
        />
        <ReportKPI
          label="Pembelajaran Sekolah"
          value={stats?.schoolProgramStats?.doneChecklistItems || 0}
          change={`${stats?.schoolProgramStats?.totalChecklistItems || 0} checklist`}
          trend="up"
          icon={<BookOpen size={24} />}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Attendance Chart Placeholder */}
        <div className="p-8 glass-card rounded-[40px] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-600" />
              Tren Kehadiran 7 Hari
            </h3>
            <select className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none">
              <option>Minggu Ini</option>
              <option>Minggu Lalu</option>
            </select>
          </div>

          <div className="h-64 flex items-end justify-between gap-2 px-4">
            {reportData?.dailyAttendance?.map((day: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                <div className="w-full relative">
                   <div
                    className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-2xl transition-all duration-1000 group-hover:brightness-110 group-hover:shadow-lg group-hover:shadow-indigo-500/20"
                    style={{ height: `${(day.count / 10) * 100}%`, minHeight: '20px' }}
                   />
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all font-black text-xs">
                     {day.count}
                   </div>
                </div>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">
                  {format(new Date(day.date), 'EEE', { locale: id })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Program Distribution */}
        <div className="p-8 glass-card rounded-[40px] space-y-6">
          <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
            <PieChart size={20} className="text-emerald-600" />
            Distribusi Program
          </h3>

          <div className="space-y-6">
            {reportData?.programDistribution?.map((prog: any, i: number) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-500">{prog.name}</span>
                  <span className="text-sm font-black">{prog.count} Sesi</span>
                </div>
                <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${(prog.count / 20) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-8 glass-card rounded-[40px] space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Per Anak</p>
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <BookOpen size={20} className="text-amber-600" />
              Program / Materi Anak
            </h3>
          </div>
          <span className="rounded-full bg-zinc-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
            {reportData?.studentProgramCards?.length || 0} anak
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reportData?.studentProgramCards?.map((item: any) => {
            const percentage = item.totalSessions > 0 ? Math.min((item.usedSessions / item.totalSessions) * 100, 100) : 0;

            return (
              <div key={item.studentId} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100">{item.studentName}</h4>
                    <p className="mt-1 font-mono text-[10px] font-black uppercase tracking-widest text-zinc-400">{item.registrationNo}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                    item.status === 'WARNING'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      : item.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="mt-5 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Program / Materi</p>
                  <p className="mt-2 text-base font-black text-zinc-900 dark:text-zinc-100">{item.programName}</p>
                  <p className="mt-1 text-xs font-bold text-zinc-500">Terapis: {item.therapistName || '-'}</p>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-xs font-black text-zinc-500">
                    <span>{item.usedSessions}/{item.totalSessions} sesi</span>
                    <span>Sisa {item.remainingSessions}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className="h-full rounded-full bg-amber-500 transition-all duration-1000" style={{ width: `${percentage}%` }} />
                  </div>
                  <p className="text-xs font-bold text-zinc-400">Total kehadiran: {item.totalAttendances}</p>
                </div>

                {item.checklist && (
                  <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Checklist ProjectFlow</p>
                        <p className="mt-1 text-sm font-black text-zinc-900 dark:text-zinc-100">
                          {item.checklist.summary.done}/{item.checklist.summary.total} selesai
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-sm dark:bg-zinc-900 dark:text-amber-300">
                        {item.checklist.summary.percentage}%
                      </span>
                    </div>

                    {item.checklist.description && (
                      <details className="mt-4 rounded-2xl bg-white/80 p-3 text-xs font-semibold leading-5 text-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-300">
                        <summary className="cursor-pointer font-black text-zinc-900 dark:text-zinc-100">Hasil assessment</summary>
                        <p className="mt-3 whitespace-pre-wrap">{item.checklist.description}</p>
                      </details>
                    )}

                    <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
                      {item.checklist.sections.map((section: any) => {
                        const sectionDone = section.items.filter((task: any) => task.done).length;

                        return (
                          <div key={`${item.studentId}-${section.title}-${section.scheduleTime}`} className="rounded-2xl bg-white p-3 shadow-sm dark:bg-zinc-900">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h5 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{section.title}</h5>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                  {section.scheduleTime || 'Jadwal belum ada'} · {sectionDone}/{section.items.length}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 space-y-2">
                              {section.items.map((task: any, taskIndex: number) => (
                                <div key={`${section.title}-${taskIndex}-${task.text}`} className="flex items-start gap-2 text-xs font-semibold leading-5 text-zinc-600 dark:text-zinc-300">
                                  <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                                    checklistStatusBadgeClass(task)
                                  }`}>
                                    {checklistStatusMark(task)}
                                  </span>
                                  <span className={task.done ? 'text-zinc-500 line-through' : ''}>
                                    {task.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-8 glass-card rounded-[40px] space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Data Siswa Sekolah</p>
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <BookOpen size={20} className="text-blue-600" />
              Program Pembelajaran Sekolah
            </h3>
          </div>
          <span className="rounded-full bg-zinc-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
            {reportData?.schoolProgramCards?.length || 0} anak
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reportData?.schoolProgramCards?.map((item: any) => (
            <div key={item.studentId} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="truncate text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100">{item.studentName}</h4>
                  <p className="mt-1 font-mono text-[10px] font-black uppercase tracking-widest text-zinc-400">{item.registrationNo}</p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  Sekolah
                </span>
              </div>

              <div className="mt-5 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Program Pembelajaran</p>
                <p className="mt-2 text-base font-black text-zinc-900 dark:text-zinc-100">{item.programName}</p>
                <p className="mt-1 text-xs font-bold text-zinc-500">Guru: {item.teacherName || '-'}</p>
                <p className="mt-1 text-xs font-bold text-zinc-400">Jadwal: {item.scheduleTime}</p>
              </div>

              {item.checklist && (
                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Checklist ProjectFlow</p>
                      <p className="mt-1 text-sm font-black text-zinc-900 dark:text-zinc-100">
                        {item.checklist.summary.done}/{item.checklist.summary.total} selesai
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 shadow-sm dark:bg-zinc-900 dark:text-blue-300">
                      {item.checklist.summary.percentage}%
                    </span>
                  </div>

                  {item.checklist.description && (
                    <details className="mt-4 rounded-2xl bg-white/80 p-3 text-xs font-semibold leading-5 text-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-300">
                      <summary className="cursor-pointer font-black text-zinc-900 dark:text-zinc-100">Hasil assessment</summary>
                      <p className="mt-3 whitespace-pre-wrap">{item.checklist.description}</p>
                    </details>
                  )}

                  <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
                    {item.checklist.sections.map((section: any) => {
                      const sectionDone = section.items.filter((task: any) => task.done).length;

                      return (
                        <div key={`${item.studentId}-${section.title}-${section.scheduleTime}`} className="rounded-2xl bg-white p-3 shadow-sm dark:bg-zinc-900">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h5 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{section.title}</h5>
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                {section.scheduleTime || 'Jadwal belum ada'} · {sectionDone}/{section.items.length}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            {section.items.map((task: any, taskIndex: number) => (
                              <div key={`${section.title}-${taskIndex}-${task.text}`} className="flex items-start gap-2 text-xs font-semibold leading-5 text-zinc-600 dark:text-zinc-300">
                                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                                  checklistStatusBadgeClass(task)
                                }`}>
                                  {checklistStatusMark(task)}
                                </span>
                                <span className={task.done ? 'text-zinc-500 line-through' : ''}>
                                  {task.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Teacher Performance (Phase 12) */}
      <div className="p-8 glass-card rounded-[40px] space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tight">Performa Terapis & Staf</h3>
          <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">Lihat Semua</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats?.teacherAttendance?.slice(0, 4).map((teacher: any, i: number) => (
            <div key={i} className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg mb-4">
                {teacher.user.name.charAt(0)}
              </div>
              <h4 className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{teacher.user.name}</h4>
              <p className="text-[10px] font-bold text-zinc-400 uppercase mb-4">{teacher.division}</p>
              <div className="flex justify-between items-center text-[10px] font-black">
                <span className="text-emerald-600">98% Ontime</span>
                <span className="text-zinc-400">24 Sesi/Minggu</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportKPI({ label, value, change, trend, icon, color }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600'
  };

  return (
    <div className="p-8 glass-card rounded-[32px] hover-lift group">
      <div className={`p-4 w-fit rounded-2xl mb-6 ${colors[color]}`}>
        {icon}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-4xl font-black tracking-tighter mb-1">{value}</div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</p>
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </div>
      </div>
    </div>
  );
}
