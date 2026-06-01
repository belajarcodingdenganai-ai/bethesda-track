'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, Search, Download, Eye, Edit2, Trash2, Plus, X, QrCode, FileSpreadsheet, Activity, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { createTeacher, deleteTeacher, updateTeacher } from '@/app/actions/member';
import MemberQrCard from '@/components/qr/member-qr-card';

interface Teacher {
  id: string;
  userId: string;
  name: string;
  teacherId: string;
  qrCode: string;
  division: string;
  position: string;
  phone?: string;
  user?: {
    email?: string;
    name?: string;
  };
  latestAttendance?: {
    attendanceDate: string;
    checkIn: string;
    isLate: boolean;
    minutesLate: number;
    notes?: string;
  } | null;
}

interface TeacherAttendanceLog {
  id: string;
  teacherDbId: string;
  teacherId: string;
  teacherName: string;
  email: string;
  division: string;
  position: string;
  attendanceDate: string;
  scheduledStart: string;
  checkIn: string;
  isLate: boolean;
  minutesLate: number;
  notes?: string;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<TeacherAttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceStartDate, setAttendanceStartDate] = useState('');
  const [attendanceEndDate, setAttendanceEndDate] = useState('');
  const [attendanceTeacherId, setAttendanceTeacherId] = useState('ALL');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | 'success' | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherDraft, setTeacherDraft] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'list' | 'attendance'>('list');

  useEffect(() => {
    fetchTeachers();
    fetchTeacherAttendance();

    // Auto-sync every 30 seconds for real-time consistency with desktop
    const interval = setInterval(() => {
      fetchTeachers();
      if (activeTab === 'attendance') {
        fetchTeacherAttendance();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teachers');
      const data = await response.json();
      setTeachers(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      toast.error('Gagal memuat data guru');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherAttendance = async () => {
    try {
      setAttendanceLoading(true);
      const params = new URLSearchParams();
      if (attendanceStartDate) params.set('startDate', attendanceStartDate);
      if (attendanceEndDate) params.set('endDate', attendanceEndDate);
      if (attendanceTeacherId !== 'ALL') params.set('teacherId', attendanceTeacherId);

      const response = await fetch(`/api/teachers/attendance?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memuat data kehadiran guru');
      }

      setAttendanceLogs(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat data kehadiran guru');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const exportTeacherAttendance = () => {
    if (attendanceLogs.length === 0) {
      toast.error('Tidak ada data kehadiran guru untuk diexport');
      return;
    }

    const headers = [
      'Tanggal',
      'Hari',
      'Jam Kedatangan',
      'Nama Guru',
      'ID Guru',
      'Divisi',
      'Jabatan',
      'Status',
      'Menit Terlambat',
      'Keterangan',
    ];

    const rows = attendanceLogs.map((log) => {
      const checkIn = new Date(log.checkIn);
      return [
        format(checkIn, 'yyyy-MM-dd'),
        format(checkIn, 'EEEE', { locale: localeId }),
        format(checkIn, 'HH:mm'),
        log.teacherName,
        log.teacherId,
        log.division,
        log.position,
        log.isLate ? 'Terlambat' : 'Tepat waktu',
        String(log.minutesLate),
        log.notes || '',
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const start = attendanceStartDate || 'semua';
    const end = attendanceEndDate || 'semua';

    link.href = url;
    link.download = `kehadiran-guru_${start}_${end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Data kehadiran guru berhasil diexport');
  };

  const handleOpenModal = (mode: 'add' | 'edit' | 'view', teacher: Teacher | null = null) => {
    setSelectedTeacher(teacher);
    setStep(1);
    setTeacherDraft({
      name: teacher?.name || teacher?.user?.name || '',
      email: teacher?.user?.email || '',
      phone: teacher?.phone || '',
      division: teacher?.division || '',
      position: teacher?.position || '',
    });
    setModalMode(mode);
  };

  const handleTeacherDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeacherDraft(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsSubmitting(true);

    let result;
    try {
      if (modalMode === 'edit' && selectedTeacher) {
        result = await updateTeacher(selectedTeacher.id, formData);
      } else {
        result = await createTeacher(formData);
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat menyimpan data');
    } finally {
      setIsSubmitting(false);
    }
    
    if (result?.success) {
      if (modalMode === 'edit') {
        toast.success('Data guru diperbarui');
        setModalMode(null);
      } else {
        toast.success('Data guru berhasil ditambahkan');
        if (result.data) {
          const teacher = result.data as Teacher;
          setSelectedTeacher({
            ...teacher,
            name: teacher.name || teacher.user?.name || teacher.teacherId,
          });
        }
        setModalMode('success');
      }
      setTeacherDraft({});
      fetchTeachers();
      fetchTeacherAttendance();
    } else {
      toast.error(`Gagal: ${result?.error || 'Terjadi kesalahan'}`);
    }
  };

  const handleDelete = async (teacher: Teacher) => {
    const name = teacher.name || teacher.user?.name || teacher.teacherId;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data guru: ${name}?`)) return;

    const result = await deleteTeacher(teacher.id);

    if (result.success) {
      toast.success(`Data guru ${name} berhasil dihapus`);
      fetchTeachers();
      fetchTeacherAttendance();
    } else {
      toast.error(`Gagal menghapus guru: ${result.error}`);
    }
  };

  const filteredTeachers = (Array.isArray(teachers) ? teachers : [])
    .filter(t => {
      const name = t.name || t.user?.name || '';
      const tId = t.teacherId || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             tId.toLowerCase().includes(searchQuery.toLowerCase());
    });

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-600 dark:from-white dark:to-zinc-400">Direktori Guru</h1>
          <p className="text-zinc-500 text-sm md:text-lg mt-1 md:mt-2 font-medium italic">Kelola profil pengajar dan staf terapis.</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <button
            onClick={() => { fetchTeachers(); fetchTeacherAttendance(); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 md:px-6 md:py-4 text-xs font-bold bg-white border border-zinc-200 text-zinc-900 rounded-2xl md:rounded-3xl hover:bg-zinc-50 shadow-sm"
          >
            <Activity size={16} />
            Sync
          </button>
          <Link
            href="/teacher-scanner"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 md:px-6 md:py-4 text-xs font-bold bg-zinc-900 text-white rounded-2xl md:rounded-3xl hover-lift shadow-xl shadow-zinc-500/10"
          >
            <QrCode size={16} strokeWidth={3} />
            Scan Guru
          </Link>
          <button 
            onClick={() => handleOpenModal('add')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 md:px-8 md:py-4 text-xs font-bold bg-indigo-600 text-white rounded-2xl md:rounded-3xl hover-lift shadow-xl shadow-indigo-500/20"
          >
            <Plus size={16} strokeWidth={3} />
            Tambah Guru
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <TeacherKPI label="Total Guru" value={teachers.length} icon={<Users size={18} />} />
        <TeacherKPI
          label="Hadir Hari Ini"
          value={teachers.filter(t => t.latestAttendance && format(new Date(t.latestAttendance.checkIn), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}
          icon={<Activity size={18} />}
          color="indigo"
        />
        <TeacherKPI
          label="Terlambat"
          value={attendanceLogs.filter(l => l.isLate && format(new Date(l.checkIn), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}
          icon={<AlertCircle size={18} />}
          color="rose"
        />
        <TeacherKPI
          label="Tepat Waktu"
          value={attendanceLogs.filter(l => !l.isLate && format(new Date(l.checkIn), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}
          icon={<CheckCircle2 size={18} />}
          color="emerald"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl md:rounded-3xl w-full md:w-fit border border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500'}`}
        >
          Daftar Guru
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'attendance' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500'}`}
        >
          Riwayat Kehadiran
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="space-y-6">
          {/* Search */}
          <div className="flex flex-col lg:flex-row gap-4 p-2 md:p-3 glass-card rounded-3xl md:rounded-[32px] border border-zinc-200/50 dark:border-zinc-800/50">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                placeholder="Cari nama atau ID guru..."
                className="w-full pl-12 pr-4 py-3 bg-transparent border-none outline-none text-sm md:text-base font-bold"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Teacher Table */}
          <div className="glass-card rounded-[32px] md:rounded-[40px] overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b">
                  <tr>
                    <th className="px-6 md:px-10 py-4 md:py-6 font-black text-zinc-400 uppercase text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em]">Guru</th>
                    <th className="hidden sm:table-cell px-6 py-6 font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em]">ID & Divisi</th>
                    <th className="px-6 py-4 md:py-6 font-black text-zinc-400 uppercase text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em]">Status</th>
                    <th className="hidden md:table-cell px-10 py-6 font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em] text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {loading ? (
                    <tr><td colSpan={4} className="p-20 text-center animate-pulse font-black uppercase text-xs tracking-widest text-zinc-400">Menyinkronkan data...</td></tr>
                  ) : filteredTeachers.map((teacher) => (
                    <tr key={teacher.id} className="group hover:bg-white/50 dark:hover:bg-zinc-900/40 transition-all duration-500 cursor-pointer" onClick={() => handleOpenModal('view', teacher)}>
                      <td className="px-6 md:px-10 py-4 md:py-6">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm md:text-lg shadow-inner">
                            {teacher.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight text-sm md:text-base line-clamp-1">{teacher.name}</div>
                            <div className="text-[8px] md:text-[9px] font-black text-zinc-400 uppercase tracking-wider">{teacher.position}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4">
                        <div className="font-mono text-xs font-bold">{teacher.teacherId}</div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase">{teacher.division}</div>
                      </td>
                      <td className="px-6 py-4">
                        {teacher.latestAttendance ? (
                          <div className="flex flex-col gap-1">
                            <span className={`w-fit px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest ${teacher.latestAttendance.isLate ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {teacher.latestAttendance.isLate ? 'Terlambat' : 'Hadir'}
                            </span>
                            <span className="text-[9px] font-bold text-zinc-400 tabular-nums">Pukul {format(new Date(teacher.latestAttendance.checkIn), 'HH:mm')}</span>
                          </div>
                        ) : (
                          <span className="text-[9px] font-black text-zinc-300 uppercase italic">Belum Scan</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-10 py-6 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={(e) => { e.stopPropagation(); handleOpenModal('edit', teacher); }} className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl hover:bg-zinc-900 hover:text-white transition-all"><Edit2 size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(teacher); }} className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Attendance Filters */}
          <div className="flex flex-col gap-4 p-4 md:p-6 glass-card rounded-[32px] border border-zinc-200/50 dark:border-zinc-800/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-400 ml-2">Mulai</label>
                <input
                  type="date"
                  value={attendanceStartDate}
                  onChange={(e) => setAttendanceStartDate(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-400 ml-2">Selesai</label>
                <input
                  type="date"
                  value={attendanceEndDate}
                  onChange={(e) => setAttendanceEndDate(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-400 ml-2">Pilih Guru</label>
                <select
                  value={attendanceTeacherId}
                  onChange={(e) => setAttendanceTeacherId(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                >
                  <option value="ALL">Semua Guru</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchTeacherAttendance}
                className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl py-3.5 text-xs font-black uppercase tracking-widest shadow-xl shadow-zinc-500/10 transition-all active:scale-95"
              >
                Terapkan Filter
              </button>
              <button
                onClick={exportTeacherAttendance}
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-2xl px-8 py-3.5 text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
              >
                <FileSpreadsheet size={16} />
                Export
              </button>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="glass-card rounded-[32px] md:rounded-[40px] overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b">
                  <tr>
                    <th className="px-6 py-4 md:py-6 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-zinc-400">Waktu</th>
                    <th className="px-6 py-4 md:py-6 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-zinc-400">Guru</th>
                    <th className="px-6 py-4 md:py-6 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-zinc-400">Status</th>
                    <th className="hidden sm:table-cell px-6 py-4 md:py-6 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-zinc-400">Ket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {attendanceLoading ? (
                    <tr><td colSpan={4} className="p-20 text-center animate-pulse font-black uppercase text-xs tracking-widest text-zinc-400">Memuat riwayat...</td></tr>
                  ) : attendanceLogs.length > 0 ? (
                    attendanceLogs.map((log) => {
                      const checkIn = new Date(log.checkIn);
                      return (
                        <tr key={log.id} className="hover:bg-white/50 dark:hover:bg-zinc-900/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-black text-zinc-900 dark:text-zinc-100 text-sm">{format(checkIn, 'HH:mm')}</div>
                            <div className="text-[9px] font-bold text-zinc-400 uppercase">{format(checkIn, 'dd MMM yyyy', { locale: localeId })}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-black text-zinc-900 dark:text-zinc-100 line-clamp-1">{log.teacherName}</div>
                            <div className="font-mono text-[9px] font-bold text-zinc-400 uppercase">{log.division}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-lg px-2.5 py-1 text-[8px] md:text-[9px] font-black uppercase ${log.isLate ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {log.isLate ? `Telat ${log.minutesLate}m` : 'Hadir'}
                            </span>
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 text-[10px] font-bold text-zinc-500 italic max-w-[150px] truncate">
                            {log.notes || '-'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={4} className="p-20 text-center text-xs font-bold text-zinc-400">Tidak ada data untuk filter ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Wizard Modal */}
      {modalMode && modalMode !== 'success' && (
        <div className="fixed inset-0 bg-zinc-950/20 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[32px] md:rounded-[40px] shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter">
                {modalMode === 'add' ? 'Tambah Guru' : modalMode === 'edit' ? 'Edit Profil' : 'Detail Profil'}
              </h2>
              <button
                onClick={() => setModalMode(null)}
                className="rounded-2xl p-2.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 md:p-10">
              {modalMode === 'view' && selectedTeacher && (
                <div className="mb-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                  <div className="w-full max-w-[240px]">
                    <MemberQrCard
                      name={selectedTeacher.name}
                      registrationNo={selectedTeacher.teacherId}
                      qrCode={selectedTeacher.qrCode}
                      roleLabel="Guru"
                    />
                  </div>
                  <div className="flex-1 grid grid-cols-1 gap-4 w-full">
                    <DetailItem label="Divisi & Jabatan" value={`${selectedTeacher.division} / ${selectedTeacher.position}`} />
                    <DetailItem label="Kontak WhatsApp" value={selectedTeacher.phone || '-'} />
                    <DetailItem label="Email Terdaftar" value={selectedTeacher.user?.email || '-'} />
                    <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                       <p className="text-[9px] font-black uppercase text-indigo-400 mb-2">Absensi Terakhir</p>
                       {selectedTeacher.latestAttendance ? (
                         <p className="text-sm font-black text-indigo-900 dark:text-indigo-200">
                           {format(new Date(selectedTeacher.latestAttendance.checkIn), 'dd MMMM yyyy, HH:mm', { locale: localeId })}
                         </p>
                       ) : <p className="text-sm font-bold text-zinc-400 italic">Belum ada data scan.</p>}
                    </div>
                  </div>
                </div>
              )}

              {modalMode !== 'view' && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {step === 1 ? (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Nama Lengkap</label>
                        <input name="name" value={teacherDraft.name || ''} onChange={handleTeacherDraftChange} required className="w-full px-6 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border-none outline-none font-bold placeholder:text-zinc-400" placeholder="Contoh: Maria Magdalena" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Email Instansi</label>
                        <input name="email" type="email" value={teacherDraft.email || ''} onChange={handleTeacherDraftChange} required className="w-full px-6 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border-none outline-none font-bold placeholder:text-zinc-400" placeholder="guru@bethesda.sch.id" />
                      </div>
                      <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Registrasi Otomatis</p>
                        <p className="mt-1 text-xs font-bold text-zinc-500">ID Guru dan QR Code akan dibuat secara sistem.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Nomor WhatsApp</label>
                        <input name="phone" value={teacherDraft.phone || ''} onChange={handleTeacherDraftChange} required className="w-full px-6 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border-none outline-none font-bold placeholder:text-zinc-400" placeholder="62812xxxx" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Divisi</label>
                          <input name="division" value={teacherDraft.division || ''} onChange={handleTeacherDraftChange} required className="w-full px-6 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border-none outline-none font-bold placeholder:text-zinc-400" placeholder="Terapis ABA" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Jabatan</label>
                          <input name="position" value={teacherDraft.position || ''} onChange={handleTeacherDraftChange} required className="w-full px-6 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border-none outline-none font-bold placeholder:text-zinc-400" placeholder="Senior Staff" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-8">
                    <button type="button" onClick={() => step === 1 ? setModalMode(null) : setStep(1)} className="flex-1 py-4 font-black text-zinc-400 uppercase tracking-widest text-[10px]">
                      {step === 1 ? 'Batal' : 'Kembali'}
                    </button>
                    <button
                      type={step === 1 ? 'button' : 'submit'}
                      onClick={() => step === 1 && setStep(2)}
                      disabled={isSubmitting}
                      className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-500/30 active:scale-95 transition-all"
                    >
                      {step === 1 ? 'Lanjut' : isSubmitting ? 'Menyimpan...' : 'Simpan Data Guru'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {modalMode === 'success' && selectedTeacher && (
        <div className="fixed inset-0 bg-zinc-950/20 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[40px] p-8 md:p-10 text-center shadow-2xl animate-in zoom-in-95 border border-white/20">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2">Guru Berhasil Terdaftar</h2>
            <p className="text-zinc-500 text-sm font-medium mb-8">Data dan QR Code guru telah diaktifkan di sistem.</p>
            <div className="mb-8">
               <MemberQrCard name={selectedTeacher.name} registrationNo={selectedTeacher.teacherId} qrCode={selectedTeacher.qrCode} roleLabel="Guru" />
            </div>
            <button
              onClick={() => setModalMode(null)}
              className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all"
            >
              Tutup & Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherKPI({ label, value, icon, color = 'zinc' }: any) {
  const colors: any = {
    zinc: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800/50',
    indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
    rose: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20',
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
  };
  return (
    <div className="p-4 md:p-8 glass-card rounded-[24px] md:rounded-[32px] hover-lift transition-all border border-zinc-200/50 dark:border-zinc-800/50">
      <div className={`p-2.5 md:p-4 w-fit rounded-xl md:rounded-2xl mb-3 md:mb-6 ${colors[color]}`}>{icon}</div>
      <div className="text-2xl md:text-4xl font-black tracking-tighter mb-0.5 md:mb-1">{value}</div>
      <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-zinc-400 line-clamp-1">{label}</p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
      <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}
