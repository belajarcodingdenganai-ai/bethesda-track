'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Filter, Download, Plus, CreditCard, AlertCircle, CheckCircle2, History, User, BookOpen, QrCode, FileText, ChevronRight, X, Calendar, Clock, MoreHorizontal, FileSpreadsheet, File as FilePdf, Users, GraduationCap, Presentation, Activity, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { getTherapyPackages, addTherapyPackage } from '@/app/actions/member';
import { getAttendanceHistory, getDashboardStats } from '@/app/actions/attendance';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Data statis untuk filter (Dapat dipindahkan ke file konfigurasi atau DB)
const THERAPISTS = ['Maria', 'Samuel', 'Yohanes'];
const SCHEDULES = [
  '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
  '13:00-14:00', '13:00-15:00', '14:00-15:00', '14:00-16:00', 
  '15:00-16:00', '15:00-17:00'
];
const SESSION_RANGES = ['Semua Sesi', '0 sesi', '1-5 sesi', '6-10 sesi', '11-20 sesi', '21-50 sesi', '50+ sesi'];

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
  const [studentList, setStudentList] = useState<any[]>([]);
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
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const result = await getDashboardStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      toast.error('Gagal memuat statistik dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const data = await response.json();
      setStudentList(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const result = await getTherapyPackages();
      if (result.success) setPackages(result.data);
    } catch (error) {
      toast.error('Gagal memuat data sesi');
    } finally {
      setLoading(false);
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
      XLSX.writeFile(wb, "therapy-sessions.xlsx");
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
      doc.text('Laporan Sesi Terapi - Bethesda Special School', 14, 15);
      const tableData = filteredPackages.map(pkg => [pkg.student.name, pkg.program.name, pkg.therapistName || '-', `${pkg.usedSessions}/${pkg.totalSessions}`, pkg.totalSessions - pkg.usedSessions, pkg.status]);
      autoTable(doc, { head: [['Nama', 'Program', 'Terapis', 'Progress', 'Sisa', 'Status']], body: tableData, startY: 25, theme: 'grid', headStyles: { fillColor: [79, 70, 229] } });
      doc.save('therapy-report.pdf');
      toast.success('PDF berhasil dibuat');
    } catch (error) {
      toast.error('Gagal memuat modul PDF');
    }
  };

  const openDetail = async (pkg: any) => {
    setSelectedPkg(pkg);
    setIsDrawerOpen(true);
    setAttendanceHistory([]);
    try {
      const result = await getAttendanceHistory(pkg.id);
      if (result.success) setAttendanceHistory(result.data);
    } catch (error) {
      toast.error('Gagal memuat riwayat kehadiran');
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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-600 dark:from-white dark:to-zinc-400">
            Therapy<span className="text-indigo-600">OS</span>
          </h1>
          <p className="text-zinc-500 text-lg font-medium italic mt-2">Enterprise Session Tracking & Management.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2.5 hover:bg-white dark:hover:bg-zinc-800 rounded-2xl transition-all font-bold text-[10px] uppercase tracking-widest">
              <FileSpreadsheet size={14} className="text-emerald-600" /> Excel
            </button>
            <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2.5 hover:bg-white dark:hover:bg-zinc-800 rounded-2xl transition-all font-bold text-[10px] uppercase tracking-widest">
              <FilePdf size={14} className="text-rose-600" /> PDF
            </button>
          </div>
          <Link href="/scanner" className="flex items-center gap-2 px-6 py-4 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-3xl hover-lift font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl">
            <QrCode size={18} /> Scan QR
          </Link>
          <button onClick={() => setIsAddingSession(true)} className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-3xl hover-lift shadow-2xl shadow-indigo-500/30 font-black text-xs uppercase tracking-widest transition-all active:scale-95">
            <Plus size={18} strokeWidth={3} /> Tambah Sesi
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SessionKPI label="Total Siswa Aktif" value={stats?.totalStudents || 0} icon={<Users />} />
        <SessionKPI label="Kehadiran Hari Ini" value={stats?.recentAttendance?.length || 0} icon={<Activity />} color="indigo" />
        <SessionKPI label="Hampir Habis" value={packages.filter(p => p.status === 'WARNING').length} icon={<AlertCircle />} color="rose" />
        <SessionKPI label="Selesai Bulan Ini" value={packages.filter(p => p.status === 'COMPLETED').length} icon={<CheckCircle2 />} color="emerald" />
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
      <div className="flex flex-col lg:flex-row gap-4 p-3 glass-card rounded-[32px]">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            placeholder="Cari nama siswa..." 
            className="w-full pl-12 pr-4 py-3 bg-transparent border-none outline-none font-bold text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="h-10 w-[1px] bg-zinc-200 dark:bg-zinc-800 hidden lg:block" />
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
          <FilterDropdown label="Program" options={['Semua Program', 'ABA', 'SI', 'SPEECH', 'OT', 'ACADEMIC']} value={programFilter} onChange={setProgramFilter} />
          <FilterDropdown label="Status" options={['ALL', 'ACTIVE', 'WARNING', 'COMPLETED']} value={statusFilter} onChange={setStatusFilter} />
          <FilterDropdown label="Terapis" options={['Semua Terapis', ...THERAPISTS]} value={therapistFilter} onChange={setTherapistFilter} />
          <FilterDropdown label="Jadwal" options={['Semua Jadwal', ...SCHEDULES]} value={scheduleFilter} onChange={setScheduleFilter} />
          <FilterDropdown label="Sesi Terpakai" options={SESSION_RANGES} value={sessionRangeFilter} onChange={setSessionRangeFilter} />
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card rounded-[40px] overflow-hidden shadow-2xl">
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
            ) : filteredPackages.map((pkg) => (
              <tr key={pkg.id} onClick={() => openDetail(pkg)} className="group hover:bg-white/50 dark:hover:bg-zinc-900/40 transition-all duration-500 cursor-pointer">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center font-black text-lg shadow-inner">
                      {pkg.student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight text-base">{pkg.student.name}</div>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-wider">{pkg.program.name}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase text-zinc-400">
                      <span>{pkg.usedSessions} / {pkg.totalSessions} Sesi</span>
                      <span className={pkg.totalSessions - pkg.usedSessions <= 2 ? 'text-amber-600' : ''}>{pkg.totalSessions - pkg.usedSessions} Sisa</span>
                    </div>
                    <div className="w-40 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full transition-all duration-1000 ${pkg.status === 'WARNING' ? 'bg-amber-500' : 'bg-indigo-600'}`}
                        style={{ width: `${(pkg.usedSessions / pkg.totalSessions) * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                     pkg.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : 
                     pkg.status === 'WARNING' ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'
                   }`}>
                     {pkg.status === 'ACTIVE' ? '🟢 Aktif' : pkg.status === 'WARNING' ? '🟡 Limit' : '🔴 Selesai'}
                   </span>
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
                      {THERAPISTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-widest">Jadwal Sesi</label>
                    <select name="scheduleTime" required className="form-input-pro">
                      <option value="">Pilih Jam...</option>
                      {SCHEDULES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-widest">Berakhir Pada (Opsional)</label>
                    <input type="date" name="endDate" className="form-input-pro" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-widest">Frekuensi Terapi</label>
                  <div className="flex gap-2">
                    {[4, 8, 12, 16, 20].map(val => (
                      <button 
                        key={val} 
                        type="button"
                        onClick={() => setFrequency(val)}
                        className={`flex-1 py-4 rounded-2xl font-black text-xs transition-all ${frequency === val ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/40' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500'}`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <input type="hidden" name="frequency" value={frequency} />
                  {frequency > 0 && (
                    <div className="flex items-center gap-2 ml-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[10px] font-bold text-zinc-400 italic">Otomatis: {frequency * 4} sesi / bulan</p>
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
                <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-4xl shadow-2xl">
                  {selectedPkg.student.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{selectedPkg.student.name}</h2>
                  <p className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]">{selectedPkg.program.name} Program</p>
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
                <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest border-b border-zinc-100 pb-2">Riwayat Kehadiran</h3>
                <div className="space-y-3">
                  {attendanceHistory.length > 0 ? (
                    attendanceHistory.map((att: any) => (
                      <div key={att.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-between group/att hover:bg-white dark:hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{format(new Date(att.checkIn), 'dd MMMM yyyy', { locale: id })}</p>
                            <p className="text-[10px] font-medium text-zinc-400">Terapis: {att.teacher?.user?.name || 'Staf'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black tabular-nums text-zinc-900 dark:text-zinc-100">{format(new Date(att.checkIn), 'HH:mm')}</p>
                          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">Hadir</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-center text-zinc-400 py-10 italic">Belum ada riwayat kehadiran.</p>
                  )}
                </div>
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
    indigo: 'text-indigo-600 bg-indigo-50',
    rose: 'text-rose-600 bg-rose-50',
    emerald: 'text-emerald-600 bg-emerald-50'
  };
  return (
    <div className="p-8 glass-card rounded-[32px] hover-lift group transition-all">
      <div className={`p-4 w-fit rounded-2xl mb-6 ${colors[color]}`}>{icon}</div>
      <div className="text-4xl font-black tracking-tighter mb-1">{value}</div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</p>
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
