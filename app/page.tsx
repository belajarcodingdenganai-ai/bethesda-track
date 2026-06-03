'use client';

import { useEffect, useState } from 'react';
import { Search, Filter, Download, Plus, CreditCard, AlertCircle, CheckCircle2, History, User, BookOpen, QrCode, FileText, ChevronRight, X, Calendar, Clock, MoreHorizontal, FileSpreadsheet, File as FilePdf, Users, GraduationCap, Presentation, Activity, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { getTherapyPackages, addTherapyPackage } from '@/app/actions/member';
import { createManualMissingScan, deleteAttendanceRecord, getAttendanceHistory, getDashboardStats, updateAttendanceRecord } from '@/app/actions/attendance';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { downloadBlobFile } from '@/lib/download-utils';
import { THERAPIST_NAMES, THERAPY_SCHEDULES } from '@/lib/therapy-options';

const SCHEDULES = THERAPY_SCHEDULES;
const SESSION_RANGES = ['Semua Sesi', '0 sesi', '1-5 sesi', '6-10 sesi', '11-20 sesi', '21-50 sesi', '50+ sesi'];

function getDateTimeLocalValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function normalizeTeacherNames(data: any) {
  const teachers = Array.isArray(data) ? data : (data.data || []);
  const names = teachers
    .map((teacher: any) => teacher.name || teacher.user?.name)
    .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
    .map((name: string) => name.trim());

  return Array.from(new Set<string>(names)).sort((a, b) => a.localeCompare(b));
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({
    totalStudents: 0, totalTeachers: 0, recentAttendance: [], lowCreditPackages: []
  });
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [isManualScanOpen, setIsManualScanOpen] = useState(false);
  const [manualCheckIn, setManualCheckIn] = useState(getDateTimeLocalValue);
  const [manualTherapistName, setManualTherapistName] = useState('');
  const [isSubmittingManualScan, setIsSubmittingManualScan] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<any | null>(null);
  const [editAttendanceCheckIn, setEditAttendanceCheckIn] = useState('');
  const [editAttendanceTherapist, setEditAttendanceTherapist] = useState('');
  const [isSavingAttendanceEdit, setIsSavingAttendanceEdit] = useState(false);
  const [deletingAttendanceId, setDeletingAttendanceId] = useState<string | null>(null);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [therapistOptions, setTherapistOptions] = useState<string[]>(THERAPIST_NAMES);
  const [frequency, setFrequency] = useState(0);

  // State untuk Filter
  const [programFilter, setProgramFilter] = useState('Semua Program');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [therapistFilter, setTherapistFilter] = useState('Semua Terapis');
  const [scheduleFilter, setScheduleFilter] = useState('Semua Jadwal');
  const [sessionRangeFilter, setSessionRangeFilter] = useState('Semua Sesi');

  useEffect(() => {
    fetchDashboard();
    fetchPackages();
    fetchStudents();
    fetchTherapists();

    const interval = setInterval(() => {
      fetchDashboard(true);
      fetchPackages(true);
      fetchStudents();
      fetchTherapists(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const result = await getDashboardStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      toast.error('Gagal memuat statistik dashboard');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students', { cache: 'no-store' });
      const data = await response.json();
      setStudentList(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchPackages = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const result = await getTherapyPackages();
      if (result.success) setPackages(result.data);
    } catch (error) {
      toast.error('Gagal memuat data sesi');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchTherapists = async (silent = false) => {
    try {
      const response = await fetch('/api/teachers', { cache: 'no-store' });
      if (!response.ok) throw new Error('Gagal memuat data guru');
      const data = await response.json();
      const names = normalizeTeacherNames(data);
      setTherapistOptions(names.length > 0 ? names : THERAPIST_NAMES);
    } catch (error) {
      if (!silent) console.error('Error fetching therapists:', error);
      setTherapistOptions((current) => (current.length > 0 ? current : THERAPIST_NAMES));
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    const matchesSearch = pkg.student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (pkg.student.registrationNo && pkg.student.registrationNo.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || pkg.status === statusFilter;
    const matchesProgram = programFilter === 'Semua Program' || pkg.program.name === programFilter;
    const matchesTherapist = therapistFilter === 'Semua Terapis' || pkg.therapistName === therapistFilter;
    const matchesSchedule = scheduleFilter === 'Semua Jadwal' || pkg.scheduleTime === scheduleFilter;
    
    // Filter Rentang Sesi (Advanced)
    let matchesRange = true;
    const used = pkg.usedSessions;
    if (sessionRangeFilter === '0 sesi') matchesRange = used === 0;
    else if (sessionRangeFilter === '1-5 sesi') matchesRange = used >= 1 && used <= 5;
    else if (sessionRangeFilter === '6-10 sesi') matchesRange = used >= 6 && used <= 10;
    else if (sessionRangeFilter === '11-20 sesi') matchesRange = used >= 11 && used <= 20;
    else if (sessionRangeFilter === '21-50 sesi') matchesRange = used >= 21 && used <= 50;
    else if (sessionRangeFilter === '50+ sesi') matchesRange = used > 50;

    return matchesSearch && matchesStatus && matchesProgram && matchesTherapist && matchesSchedule && matchesRange;
  });

  const warningPackages = packages.filter(p => p.status === 'WARNING');
  const completedPackages = packages.filter(p => p.status === 'COMPLETED');
  const activePackages = packages.filter(p => p.status === 'ACTIVE');
  const activeFilters = [programFilter, statusFilter, therapistFilter, scheduleFilter, sessionRangeFilter].filter((value, index) => {
    const defaults = ['Semua Program', 'ALL', 'Semua Terapis', 'Semua Jadwal', 'Semua Sesi'];
    return value !== defaults[index];
  }).length + (searchQuery ? 1 : 0);

  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const data = filteredPackages.map(pkg => ({
        'Nama Siswa': pkg.student.name,
        'Program': pkg.program.name,
        'Terapis': pkg.therapistName || 'Belum Ditentukan',
        'Jadwal': pkg.scheduleTime || '-',
        'Total Sesi': pkg.totalSessions,
        'Terpakai': pkg.usedSessions,
        'Sisa': pkg.totalSessions - pkg.usedSessions,
        'Status': pkg.status
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sesi Terapi");
      const content = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      await downloadBlobFile(
        new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        'therapy-sessions.xlsx'
      );
      toast.success('Excel berhasil diunduh');
    } catch (error) {
      toast.error('Gagal memuat modul Excel');
    }
  };

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.text('Laporan Sesi - Rumah Bethesda', 14, 15);
      const tableData = filteredPackages.map(pkg => [pkg.student.name, pkg.program.name, pkg.therapistName || '-', `${pkg.usedSessions}/${pkg.totalSessions}`, pkg.totalSessions - pkg.usedSessions, pkg.status]);
      autoTable(doc, { head: [['Nama', 'Program', 'Terapis', 'Progress', 'Sisa', 'Status']], body: tableData, startY: 25, theme: 'grid', headStyles: { fillColor: [79, 70, 229] } });
      await downloadBlobFile(doc.output('blob'), 'therapy-report.pdf');
      toast.success('PDF berhasil dibuat');
    } catch (error) {
      toast.error('Gagal memuat modul PDF');
    }
  };

  const openDetail = async (pkg: any) => {
    setSelectedPkg(pkg);
    setIsDrawerOpen(true);
    setIsManualScanOpen(false);
    setEditingAttendance(null);
    setManualCheckIn(getDateTimeLocalValue());
    setManualTherapistName(pkg.therapistName || therapistOptions[0] || '');
    setAttendanceHistory([]);
    try {
      const result = await getAttendanceHistory(pkg.id);
      if (result.success) setAttendanceHistory(result.data);
    } catch (error) {
      toast.error('Gagal memuat riwayat kehadiran');
    }
  };

  const handleManualMissingScan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPkg) return;

    setIsSubmittingManualScan(true);
    try {
      const result = await createManualMissingScan(selectedPkg.id, manualCheckIn, manualTherapistName);

      if (result.success === false) {
        toast.error(result.error || 'Gagal mencatat missing scan');
        return;
      }

      toast.success(`Missing scan ${selectedPkg.student.name} berhasil dicatat`);
      setIsManualScanOpen(false);
      setManualCheckIn(getDateTimeLocalValue());
      setManualTherapistName(selectedPkg.therapistName || therapistOptions[0] || '');
      setSelectedPkg((prev: any) =>
        prev
          ? {
              ...prev,
              usedSessions: result.data?.usedSessions ?? prev.usedSessions,
              status:
                result.data?.usedSessions >= prev.totalSessions
                  ? 'COMPLETED'
                  : prev.totalSessions - (result.data?.usedSessions ?? prev.usedSessions) <= 2
                    ? 'WARNING'
                    : 'ACTIVE',
            }
          : prev,
      );

      const history = await getAttendanceHistory(selectedPkg.id);
      if (history.success) setAttendanceHistory(history.data);
      fetchDashboard(true);
      fetchPackages(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mencatat missing scan');
    } finally {
      setIsSubmittingManualScan(false);
    }
  };

  const refreshSelectedHistory = async () => {
    if (!selectedPkg) return;
    const history = await getAttendanceHistory(selectedPkg.id);
    if (history.success) setAttendanceHistory(history.data);
    fetchDashboard(true);
    fetchPackages(true);
  };

  const openAttendanceEdit = (attendance: any) => {
    setEditingAttendance(attendance);
    setEditAttendanceCheckIn(getDateTimeLocalValue(new Date(attendance.checkIn)));
    setEditAttendanceTherapist(attendance.teacher?.user?.name || therapistOptions[0] || '');
  };

  const handleAttendanceEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAttendance) return;

    setIsSavingAttendanceEdit(true);
    try {
      const result = await updateAttendanceRecord(editingAttendance.id, editAttendanceCheckIn, editAttendanceTherapist);
      if (result.success === false) {
        toast.error(result.error || 'Gagal mengubah riwayat scan');
        return;
      }
      toast.success('Riwayat scan diperbarui');
      setEditingAttendance(null);
      await refreshSelectedHistory();
    } finally {
      setIsSavingAttendanceEdit(false);
    }
  };

  const handleAttendanceDelete = async (attendance: any) => {
    if (!window.confirm('Hapus riwayat scan ini? Jumlah sesi terpakai akan dikurangi.')) return;

    setDeletingAttendanceId(attendance.id);
    try {
      const result = await deleteAttendanceRecord(attendance.id);
      if (result.success === false) {
        toast.error(result.error || 'Gagal menghapus riwayat scan');
        return;
      }
      toast.success('Riwayat scan dihapus');
      await refreshSelectedHistory();
    } finally {
      setDeletingAttendanceId(null);
    }
  };

  const handleAddSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (frequency === 0) return toast.error('Pilih frekuensi terapi');
    const formData = new FormData(e.currentTarget);
    const studentId = formData.get('studentId') as string;
    if (!studentId) return toast.error('Pilih siswa terlebih dahulu');
    const result = await addTherapyPackage(studentId, formData);
    if (result.success) {
      toast.success('Paket sesi berhasil diaktifkan');
      setIsAddingSession(false);
      fetchPackages();
    } else {
      toast.error(`Gagal: ${'error' in result ? result.error : 'Terjadi kesalahan'}`);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 relative">
      {/* Header */}
      <div className="rounded-[32px] border border-white/80 bg-white/80 p-5 shadow-xl shadow-zinc-200/60 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-900/75 dark:shadow-black/20 sm:p-7 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4 sm:items-center sm:gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white p-1.5 shadow-lg ring-1 ring-blue-100 sm:h-20 sm:w-20">
              <img src="/brand/rumah-bethesda-logo.png" alt="Rumah Bethesda" className="h-full w-full rounded-full object-contain object-center" />
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-blue-600">Dashboard Operasional</p>
              <h1 className="text-3xl font-black leading-tight tracking-tight text-zinc-950 dark:text-white sm:text-4xl lg:text-5xl">
                Rumah Bethesda
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-zinc-500 sm:text-base">
                Pantau sesi anak, scan QR, jadwal terapis, dan laporan harian dengan tampilan yang mudah dibaca.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
            <Link href="/scanner" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-950">
              <QrCode size={17} /> Scan
            </Link>
            <button onClick={() => setIsAddingSession(true)} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 active:scale-95">
              <Plus size={17} strokeWidth={3} /> Sesi
            </button>
            <button onClick={exportToExcel} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-zinc-700 transition-all hover:border-emerald-200 hover:text-emerald-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 sm:w-auto">
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button onClick={exportToPDF} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-zinc-700 transition-all hover:border-rose-200 hover:text-rose-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 sm:w-auto">
              <FilePdf size={16} /> PDF
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction href="/students" label="Data Anak" description={`${stats?.totalStudents || 0} anak terdaftar`} icon={<Users size={18} />} />
          <QuickAction href="/teachers" label="Data Guru" description={`${stats?.totalTeachers || 0} guru dan terapis`} icon={<GraduationCap size={18} />} />
          <QuickAction href="/teacher-scanner" label="Scan Guru" description="Absensi guru cepat" icon={<QrCode size={18} />} />
          <QuickAction href="/sessions" label="Perhatian" description={`${warningPackages.length} sesi hampir habis`} icon={<AlertCircle size={18} />} />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        <SessionKPI label="Total Siswa Aktif" value={stats?.totalStudents || 0} icon={<Users />} />
        <SessionKPI label="Kehadiran Hari Ini" value={stats?.recentAttendance?.length || 0} icon={<Activity />} color="indigo" />
        <SessionKPI label="Hampir Habis" value={warningPackages.length} icon={<AlertCircle />} color="rose" />
        <SessionKPI label="Selesai" value={completedPackages.length} icon={<CheckCircle2 />} color="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-zinc-200/70 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-zinc-950 dark:text-white">Ringkasan Sesi</h2>
              <p className="mt-1 text-sm font-semibold text-zinc-500">Status paket sesi yang sedang berjalan.</p>
            </div>
            <span className="w-fit rounded-full bg-zinc-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
              {packages.length} paket
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatusSummary label="Aktif" value={activePackages.length} color="emerald" />
            <StatusSummary label="Perlu Cek" value={warningPackages.length} color="amber" />
            <StatusSummary label="Selesai" value={completedPackages.length} color="zinc" />
          </div>
        </div>
        <div className="rounded-[28px] border border-blue-100 bg-blue-50/80 p-5 shadow-sm dark:border-blue-950/60 dark:bg-blue-950/20 sm:p-6">
          <div className="flex h-full flex-col justify-between gap-5">
            <div>
              <h2 className="text-xl font-black tracking-tight text-blue-950 dark:text-blue-100">Alur Cepat</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-blue-700/80 dark:text-blue-200/70">
                Mulai dari scan QR, lalu cek riwayat sesi anak pada detail paket.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/scanner" className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700">Scan Anak</Link>
              <button onClick={() => setIsAddingSession(true)} className="rounded-2xl bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-blue-700 shadow-sm transition-all hover:bg-blue-50 dark:bg-zinc-900 dark:text-blue-200">Tambah</button>
            </div>
          </div>
        </div>
      </div>

      {stats?.duplicateStudentScans?.length > 0 && (
        <div className="rounded-[32px] border border-amber-200 bg-amber-50 p-5 shadow-xl shadow-amber-500/10 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white">
                <AlertCircle size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-amber-900 dark:text-amber-100">Alert Scan Berulang Siswa</h2>
                <p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-300">
                  Ada {stats.duplicateStudentScans.length} siswa yang scan lebih dari satu kali hari ini. Scan tambahan dicatat sebagai report, sesi tidak dikurangi ulang.
                </p>
              </div>
            </div>
            <Link href="/students" className="rounded-2xl bg-amber-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-amber-700">
              Lihat Siswa
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stats.duplicateStudentScans.map((item: any) => (
              <div key={item.studentId} className="rounded-2xl border border-amber-200/70 bg-white/70 p-4 dark:border-amber-900/40 dark:bg-zinc-950/30">
                <p className="font-black text-zinc-900 dark:text-zinc-100">{item.student?.name || 'Siswa tidak ditemukan'}</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="font-mono text-xs font-bold text-zinc-500">{item.student?.registrationNo || item.studentId}</p>
                  <span className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700">
                    {item.count}x scan
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Panel */}
      <div className="flex flex-col gap-4 rounded-[28px] border border-zinc-200/70 bg-white/85 p-3 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/75 lg:flex-row">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            placeholder="Cari nama atau nomor registrasi siswa..." 
            className="w-full rounded-2xl bg-zinc-50 py-3 pl-12 pr-4 text-sm font-bold outline-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:bg-zinc-800/70 dark:focus:bg-zinc-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="h-10 w-[1px] bg-zinc-200 dark:bg-zinc-800 hidden lg:block" />
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <FilterDropdown label="Program" options={['Semua Program', 'ABA', 'SI', 'SPEECH', 'OT', 'ACADEMIC']} value={programFilter} onChange={setProgramFilter} />
          <FilterDropdown label="Status" options={['ALL', 'ACTIVE', 'WARNING', 'COMPLETED']} value={statusFilter} onChange={setStatusFilter} />
          <FilterDropdown label="Terapis" options={['Semua Terapis', ...therapistOptions]} value={therapistFilter} onChange={setTherapistFilter} />
          <FilterDropdown label="Jadwal" options={['Semua Jadwal', ...SCHEDULES]} value={scheduleFilter} onChange={setScheduleFilter} />
          <FilterDropdown label="Sesi Terpakai" options={SESSION_RANGES} value={sessionRangeFilter} onChange={setSessionRangeFilter} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight text-zinc-950 dark:text-white">Paket Sesi Anak</h2>
          <p className="text-sm font-semibold text-zinc-500">
            {filteredPackages.length} data tampil{activeFilters > 0 ? ` dengan ${activeFilters} filter aktif` : ''}
          </p>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-3 md:hidden">
        {loading ? (
          <div className="rounded-[28px] border border-zinc-200 bg-white p-8 text-center text-xs font-black uppercase tracking-widest text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
            Memuat data...
          </div>
        ) : filteredPackages.length === 0 ? (
          <EmptySessions />
        ) : filteredPackages.map((pkg) => (
          <button key={pkg.id} onClick={() => openDetail(pkg)} className="rounded-[28px] border border-zinc-200 bg-white p-4 text-left shadow-sm transition-all active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <StudentAvatar pkg={pkg} />
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-zinc-950 dark:text-white">{pkg.student.name}</p>
                  <p className="mt-1 truncate text-xs font-bold text-zinc-500">{pkg.program.name} · {pkg.therapistName || 'Belum ada terapis'}</p>
                </div>
              </div>
              <StatusPill status={pkg.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-zinc-500">
              <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/70">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Jadwal</p>
                <p className="mt-1 text-zinc-800 dark:text-zinc-100">{pkg.scheduleTime || '-'}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/70">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Sisa</p>
                <p className="mt-1 text-zinc-800 dark:text-zinc-100">{pkg.totalSessions - pkg.usedSessions} sesi</p>
              </div>
            </div>
            <SessionProgress pkg={pkg} />
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="hidden rounded-[32px] border border-zinc-200/70 bg-white/85 shadow-xl shadow-zinc-200/60 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/75 dark:shadow-black/20 md:block">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200/50">
            <tr>
              <th className="px-10 py-6 font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em]">Siswa & Program</th>
              <th className="px-6 py-6 font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em]">Progress Sesi</th>
              <th className="px-6 py-6 font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em]">Status</th>
              <th className="px-10 py-6 font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em] text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {loading ? (
              <tr><td colSpan={4} className="p-20 text-center animate-pulse font-black uppercase text-xs tracking-widest text-zinc-400">Menyinkronkan data...</td></tr>
            ) : filteredPackages.length === 0 ? (
              <tr><td colSpan={4} className="p-10"><EmptySessions /></td></tr>
            ) : filteredPackages.map((pkg) => (
              <tr key={pkg.id} onClick={() => openDetail(pkg)} className="group hover:bg-white/50 dark:hover:bg-zinc-900/40 transition-all duration-500 cursor-pointer">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <StudentAvatar pkg={pkg} />
                    <div>
                      <div className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight text-base">{pkg.student.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-wider">{pkg.program.name}</span>
                        <span className="text-[10px] font-bold text-zinc-400">{pkg.therapistName || 'Belum ada terapis'}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <SessionProgress pkg={pkg} compact />
                </td>
                <td className="px-6 py-4">
                  <StatusPill status={pkg.status} />
                </td>
                <td className="px-10 py-6 text-right">
                  <button className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl group-hover:bg-zinc-900 group-hover:text-white transition-all">
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah Sesi */}
      {isAddingSession && (
        <div className="fixed inset-0 bg-zinc-950/20 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-3xl w-full max-w-2xl rounded-[40px] shadow-[0_32px_128px_-12px_rgba(0,0,0,0.2)] border border-white/40 dark:border-zinc-800/50 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-500">
            <div className="p-10 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="space-y-1">
                <h2 className="text-3xl font-black tracking-tighter">Tambah Sesi Terapi</h2>
                <p className="text-zinc-500 text-sm font-medium">Pilih siswa dan aktifkan paket sesi baru.</p>
              </div>
              <button onClick={() => setIsAddingSession(false)} className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10">
              <form id="add-session-form" onSubmit={handleAddSession} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-widest">Pilih Siswa</label>
                  <select name="studentId" required className="form-input-pro">
                    <option value="">Cari Siswa...</option>
                    {studentList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.registrationNo})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-widest">Program Terapi</label>
                    <select name="programs" required className="form-input-pro">
                      <option value="">Pilih Program...</option>
                      <option value="ABA">ABA</option>
                      <option value="SI">SI</option>
                      <option value="SPEECH">Speech Therapy</option>
                      <option value="OT">Occupational Therapy</option>
                      <option value="ACADEMIC">Academic</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-widest">Terapis</label>
                    <select name="therapistId" required className="form-input-pro">
                      <option value="">Pilih Terapis...</option>
                      {therapistOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-widest">Jadwal Sesi</label>
                  <select name="scheduleTime" required className="form-input-pro">
                    <option value="">Pilih Jam...</option>
                    {SCHEDULES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-widest">Frekuensi Terapi per Minggu</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button 
                        key={val} 
                        type="button"
                        onClick={() => setFrequency(val)}
                        className={`flex-1 py-4 rounded-2xl font-black text-xs transition-all ${frequency === val ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/40' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500'}`}
                      >
                        {val}x
                      </button>
                    ))}
                  </div>
                  <input type="hidden" name="frequency" value={frequency} />
                  {frequency > 0 && (
                    <div className="flex items-center gap-2 ml-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[10px] font-bold text-zinc-400 italic">Otomatis: {frequency}x/minggu, {frequency * 4} sesi/bulan</p>
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="p-10 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button type="submit" form="add-session-form" className="px-10 py-5 rounded-[24px] bg-indigo-600 text-white font-black shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest text-[10px]">
                Aktifkan Paket Sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {isDrawerOpen && selectedPkg && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-full max-w-md h-screen bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-l border-zinc-200 dark:border-zinc-800 shadow-[-32px_0_64px_-12px_rgba(0,0,0,0.14)] p-10 animate-in slide-in-from-right-full duration-500 overflow-y-auto">
            <button onClick={() => setIsDrawerOpen(false)} className="absolute top-8 right-8 p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all">
              <X size={20} />
            </button>

            <div className="space-y-10">
              <div className="flex flex-col items-center text-center space-y-4">
                <StudentAvatar pkg={selectedPkg} large />
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{selectedPkg.student.name}</h2>
                  <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em]">{selectedPkg.program.name} Program</p>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest border-b border-zinc-100 pb-2">Informasi Paket</h3>
                <div className="grid grid-cols-2 gap-4 text-sm font-bold">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                    <p className="text-[9px] text-zinc-400 uppercase mb-1">Diagnosa</p>
                    {selectedPkg.student.diagnosis || '-'}
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                    <p className="text-[9px] text-zinc-400 uppercase mb-1">Status</p>
                    {selectedPkg.status}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest border-b border-zinc-100 pb-2">Progress Sesi</h3>
                <div className="p-6 glass-card rounded-3xl space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="text-4xl font-black">{selectedPkg.usedSessions}<span className="text-zinc-300 text-2xl">/{selectedPkg.totalSessions}</span></div>
                    <div className="text-right text-[10px] font-black text-indigo-600 uppercase">Sesi Terpakai</div>
                  </div>
                  <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600" style={{ width: `${(selectedPkg.usedSessions / selectedPkg.totalSessions) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2 dark:border-zinc-800">
                  <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Koreksi Missing Scan</h3>
                  <button
                    type="button"
                    onClick={() => setIsManualScanOpen((value) => !value)}
                    disabled={selectedPkg.usedSessions >= selectedPkg.totalSessions || selectedPkg.status === 'COMPLETED'}
                    className="rounded-xl bg-zinc-950 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-white dark:text-zinc-950 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                  >
                    {isManualScanOpen ? 'Tutup' : 'Catat'}
                  </button>
                </div>

                {selectedPkg.usedSessions >= selectedPkg.totalSessions || selectedPkg.status === 'COMPLETED' ? (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                    Paket sudah selesai. Tambahkan paket sesi baru sebelum mencatat missing scan tambahan.
                  </div>
                ) : isManualScanOpen ? (
                  <form onSubmit={handleManualMissingScan} className="space-y-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                    <div className="space-y-2">
                      <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">Tanggal & Jam Masuk</label>
                      <input
                        type="datetime-local"
                        required
                        value={manualCheckIn}
                        onChange={(event) => setManualCheckIn(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-900 outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">Terapis yang Menangani</label>
                      <select
                        required
                        value={manualTherapistName}
                        onChange={(event) => setManualTherapistName(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-900 outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                      >
                        <option value="">Pilih terapis...</option>
                        {therapistOptions.map((therapist) => (
                          <option key={therapist} value={therapist}>
                            {therapist}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingManualScan}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-300"
                    >
                      <Calendar size={16} />
                      {isSubmittingManualScan ? 'Menyimpan...' : 'Simpan & Hitung Sesi'}
                    </button>
                  </form>
                ) : (
                  <p className="rounded-2xl bg-zinc-50 p-4 text-xs font-semibold leading-5 text-zinc-500 dark:bg-zinc-800/50">
                    Gunakan ini saat anak hadir tetapi QR tidak sempat discan. Tanggal dan jam bisa disesuaikan, lalu sesi akan otomatis terhitung.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest border-b border-zinc-100 pb-2">Riwayat Scan Anak</h3>
                <div className="space-y-3">
                  {attendanceHistory.length > 0 ? (
                    attendanceHistory.map((att: any) => (
                      <div key={att.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-between gap-3 group/att hover:bg-white dark:hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{format(new Date(att.checkIn), 'dd MMMM yyyy', { locale: id })}</p>
                            <p className="text-[10px] font-medium text-zinc-400">Terapis: {att.teacher?.user?.name || 'Staf'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs font-black tabular-nums text-zinc-900 dark:text-zinc-100">{format(new Date(att.checkIn), 'HH:mm')}</p>
                            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">Hadir</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openAttendanceEdit(att)}
                            className="rounded-xl bg-white px-2.5 py-2 text-[10px] font-black uppercase text-indigo-600 transition-colors hover:bg-indigo-50 dark:bg-zinc-950 dark:hover:bg-indigo-950/30"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttendanceDelete(att)}
                            disabled={deletingAttendanceId === att.id}
                            className="rounded-xl bg-white px-2.5 py-2 text-[10px] font-black uppercase text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:bg-zinc-950 dark:hover:bg-rose-950/30"
                          >
                            {deletingAttendanceId === att.id ? '...' : 'Hapus'}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-center text-zinc-400 py-10 italic">Belum ada riwayat kehadiran.</p>
                  )}
                </div>
                {editingAttendance && (
                  <form onSubmit={handleAttendanceEdit} className="space-y-3 rounded-3xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Tanggal & Jam Scan</label>
                      <input
                        type="datetime-local"
                        required
                        value={editAttendanceCheckIn}
                        onChange={(event) => setEditAttendanceCheckIn(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-900 outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Terapis</label>
                      <select
                        required
                        value={editAttendanceTherapist}
                        onChange={(event) => setEditAttendanceTherapist(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-900 outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                      >
                        <option value="">Pilih terapis...</option>
                        {therapistOptions.map((therapist) => (
                          <option key={therapist} value={therapist}>
                            {therapist}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditingAttendance(null)} className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                        Batal
                      </button>
                      <button type="submit" disabled={isSavingAttendanceEdit} className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60">
                        {isSavingAttendanceEdit ? 'Menyimpan...' : 'Simpan'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        .form-input-pro {
          @apply w-full h-[52px] px-6 rounded-[18px] bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/30 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 font-black tracking-tight text-sm transition-all duration-300;
        }
      `}</style>
    </div>
  );
}

function SessionKPI({ label, value, icon, color = 'zinc' }: any) {
  const colors: any = {
    zinc: 'text-zinc-600 bg-zinc-100',
    indigo: 'text-blue-600 bg-blue-50',
    rose: 'text-rose-600 bg-rose-50',
    emerald: 'text-emerald-600 bg-emerald-50'
  };
  return (
    <div className="rounded-[28px] border border-zinc-200/70 bg-white/85 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/75 sm:p-6">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${colors[color]}`}>{icon}</div>
      <div className="mb-1 text-3xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-4xl">{value}</div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">{label}</p>
    </div>
  );
}

function QuickAction({ href, label, description, icon }: any) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-2xl border border-zinc-200/70 bg-white/80 p-4 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-all group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-950/40">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-zinc-950 dark:text-white">{label}</p>
        <p className="truncate text-xs font-semibold text-zinc-500">{description}</p>
      </div>
    </Link>
  );
}

function StatusSummary({ label, value, color }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900/50',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-900/50',
    zinc: 'bg-zinc-50 text-zinc-700 ring-zinc-100 dark:bg-zinc-800/70 dark:text-zinc-200 dark:ring-zinc-700'
  };

  return (
    <div className={`rounded-2xl p-4 ring-1 ${colors[color]}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function StudentAvatar({ pkg, large = false }: any) {
  const image = pkg.student?.profileImage;
  const size = large ? 'h-24 w-24 rounded-[32px] text-4xl' : 'h-12 w-12 rounded-2xl text-lg';

  if (image) {
    return (
      <img
        src={image}
        alt={pkg.student.name}
        className={`${size} shrink-0 bg-zinc-100 object-cover shadow-inner ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700`}
      />
    );
  }

  return (
    <div className={`${size} flex shrink-0 items-center justify-center bg-gradient-to-br from-blue-600 to-emerald-500 font-black text-white shadow-inner`}>
      {pkg.student.name.charAt(0)}
    </div>
  );
}

function SessionProgress({ pkg, compact = false }: any) {
  const remaining = pkg.totalSessions - pkg.usedSessions;
  const percentage = pkg.totalSessions > 0 ? Math.min(100, (pkg.usedSessions / pkg.totalSessions) * 100) : 0;

  return (
    <div className={`space-y-2 ${compact ? 'max-w-[220px]' : 'mt-4'}`}>
      <div className="flex justify-between gap-3 text-[10px] font-black uppercase text-zinc-400">
        <span>{pkg.usedSessions} / {pkg.totalSessions} sesi</span>
        <span className={remaining <= 2 ? 'text-amber-600' : ''}>{remaining} sisa</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 shadow-inner dark:bg-zinc-800">
        <div
          className={`h-full transition-all duration-1000 ${pkg.status === 'WARNING' ? 'bg-amber-500' : pkg.status === 'COMPLETED' ? 'bg-zinc-400' : 'bg-blue-600'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatusPill({ status }: any) {
  const statusMap: any = {
    ACTIVE: { label: 'Aktif', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    WARNING: { label: 'Limit', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
    COMPLETED: { label: 'Selesai', className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300' }
  };
  const item = statusMap[status] || { label: status, className: 'bg-zinc-500/10 text-zinc-600' };

  return (
    <span className={`whitespace-nowrap rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${item.className}`}>
      {item.label}
    </span>
  );
}

function EmptySessions() {
  return (
    <div className="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50/70 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-400 shadow-sm dark:bg-zinc-800">
        <Search size={20} />
      </div>
      <p className="text-base font-black text-zinc-900 dark:text-white">Data sesi tidak ditemukan</p>
      <p className="mt-1 text-sm font-semibold text-zinc-500">Coba ubah pencarian atau filter yang aktif.</p>
    </div>
  );
}

function FilterDropdown({ label, options, value, onChange }: any) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700">
      <span className="text-[9px] font-black uppercase text-zinc-400">{label}:</span>
      <select 
        className="bg-transparent text-xs font-bold outline-none cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
