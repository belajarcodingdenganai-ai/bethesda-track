'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, Search, Filter, Download, Eye, Edit2, Trash2, Plus, User, Mail, Phone, Briefcase, ChevronRight, ChevronLeft, X, QrCode } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
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

  useEffect(() => {
    fetchTeachers();
    fetchTeacherAttendance();
  }, []);

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

  const formatAttendanceDay = (value: string) => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(value));
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
        formatAttendanceDay(log.checkIn),
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
    setStep(1);
    setModalMode(mode);
    setSelectedTeacher(teacher);
    setTeacherDraft({
      name: teacher?.name || teacher?.user?.name || '',
      email: teacher?.user?.email || '',
      phone: teacher?.phone || '',
      division: teacher?.division || '',
      position: teacher?.position || '',
    });
  };

  const handleTeacherDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeacherDraft(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setTeacherDraft(Object.fromEntries(formData.entries()) as Record<string, string>);
    setIsSubmitting(true);

    let result;
    try {
      if (modalMode === 'edit' && selectedTeacher) {
        result = await updateTeacher(selectedTeacher.id, formData);
      } else {
        result = await createTeacher(formData);
      }
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
      setTeachers(prev => prev.filter(t => t.id !== teacher.id));
      if (selectedTeacher?.id === teacher.id) {
        setSelectedTeacher(null);
        setModalMode(null);
      }
      toast.success(`Data guru ${name} berhasil dihapus`);
      fetchTeachers();
      fetchTeacherAttendance();
    } else {
      toast.error(`Gagal menghapus guru: ${result.error}`);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.teacherId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-600 dark:from-white dark:to-zinc-400">Direktori Guru</h1>
          <p className="text-zinc-500 text-lg mt-2 font-medium italic">Kelola profil pengajar dan staf terapis.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/teacher-scanner"
            className="flex items-center gap-2 px-6 py-4 text-sm font-bold bg-zinc-900 text-white rounded-3xl hover-lift shadow-2xl shadow-zinc-500/20"
          >
            <QrCode size={18} strokeWidth={3} />
            Scan Guru
          </Link>
          <button 
            onClick={() => handleOpenModal('add')}
            className="flex items-center gap-2 px-8 py-4 text-sm font-bold bg-indigo-600 text-white rounded-3xl hover-lift shadow-2xl shadow-indigo-500/30"
          >
            <Plus size={18} strokeWidth={3} />
            Tambah Guru
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col lg:flex-row gap-4 p-3 glass-card rounded-[32px]">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder="Cari nama atau ID guru..."
            className="w-full pl-12 pr-4 py-3.5 bg-transparent border-none outline-none text-lg font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Teacher Table */}
      <div className="glass-card rounded-[40px] overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b">
            <tr>
              <th className="px-10 py-6 font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em]">Guru</th>
              <th className="px-6 py-6 font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em]">ID & Divisi</th>
              <th className="px-6 py-6 font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em]">Kontak</th>
              <th className="px-6 py-6 font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em]">Absensi Terakhir</th>
              <th className="px-10 py-6 font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em] text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredTeachers.map((teacher) => (
              <tr key={teacher.id} className="group hover:bg-white/50 transition-all duration-500">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                      {teacher.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-black text-zinc-900 dark:text-zinc-100">{teacher.name}</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">{teacher.position}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs">
                   <div className="font-bold">{teacher.teacherId}</div>
                   <div className="text-zinc-400">{teacher.division}</div>
                </td>
                <td className="px-6 py-4 text-zinc-500">
                  {teacher.phone}
                </td>
                <td className="px-6 py-4">
                  {teacher.latestAttendance ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        <CalendarDays size={13} className="text-indigo-500" />
                        {format(new Date(teacher.latestAttendance.checkIn), 'dd/MM/yyyy')}
                        <Clock size={13} className="ml-2 text-indigo-500" />
                        {format(new Date(teacher.latestAttendance.checkIn), 'HH:mm')}
                      </div>
                      <span className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-black uppercase ${teacher.latestAttendance.isLate ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {teacher.latestAttendance.isLate ? `Terlambat ${teacher.latestAttendance.minutesLate} menit` : 'Tepat waktu'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-zinc-400">Belum scan</span>
                  )}
                </td>
                <td className="px-10 py-6 text-right">
                   <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleOpenModal('view', teacher)} className="p-3 bg-zinc-100 rounded-2xl"><Eye size={18} /></button>
                      <button onClick={() => handleOpenModal('edit', teacher)} className="p-3 bg-zinc-100 rounded-2xl"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(teacher)} className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><Trash2 size={18} /></button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-card rounded-[40px] overflow-hidden">
        <div className="border-b border-zinc-100 dark:border-zinc-800 p-6 sm:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Kehadiran Guru</h2>
              <p className="mt-1 text-sm font-medium text-zinc-500">View dan export riwayat kedatangan guru berdasarkan tanggal.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[180px_180px_220px_auto_auto]">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Dari Tanggal</label>
                <input
                  type="date"
                  value={attendanceStartDate}
                  onChange={(e) => setAttendanceStartDate(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Sampai Tanggal</label>
                <input
                  type="date"
                  value={attendanceEndDate}
                  onChange={(e) => setAttendanceEndDate(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Guru</label>
                <select
                  value={attendanceTeacherId}
                  onChange={(e) => setAttendanceTeacherId(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <option value="ALL">Semua Guru</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={fetchTeacherAttendance}
                className="rounded-2xl bg-zinc-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-zinc-800 active:scale-[0.99]"
              >
                View Data
              </button>
              <button
                type="button"
                onClick={exportTeacherAttendance}
                className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-500/25 transition-all hover:bg-indigo-700 active:scale-[0.99]"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-zinc-50/50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Tanggal</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Hari</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Jam Kedatangan</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Guru</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {attendanceLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm font-bold text-zinc-400">Memuat data kehadiran guru...</td>
                </tr>
              ) : attendanceLogs.length > 0 ? (
                attendanceLogs.map((log) => {
                  const checkIn = new Date(log.checkIn);
                  return (
                    <tr key={log.id} className="hover:bg-white/50 dark:hover:bg-zinc-900/40">
                      <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">{format(checkIn, 'dd/MM/yyyy')}</td>
                      <td className="px-6 py-4 text-sm font-bold capitalize text-zinc-600 dark:text-zinc-300">{formatAttendanceDay(log.checkIn)}</td>
                      <td className="px-6 py-4 font-mono text-sm font-black text-zinc-900 dark:text-zinc-100">{format(checkIn, 'HH:mm')}</td>
                      <td className="px-6 py-4">
                        <div className="font-black text-zinc-900 dark:text-zinc-100">{log.teacherName}</div>
                        <div className="font-mono text-[10px] font-bold uppercase text-zinc-400">{log.teacherId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${log.isLate ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {log.isLate ? `Terlambat ${log.minutesLate} menit` : 'Tepat waktu'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-zinc-500">{log.notes || '-'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm font-bold text-zinc-400">Belum ada data kehadiran guru pada filter ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teacher Wizard Modal */}
      {modalMode && modalMode !== 'success' && (
        <div className="fixed inset-0 bg-zinc-950/20 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-[40px] shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 p-6 sm:p-8">
              <h2 className="text-3xl font-black tracking-tighter">
                {modalMode === 'add' ? 'Tambah Guru Baru' : modalMode === 'edit' ? 'Edit Guru' : 'Detail Guru'}
              </h2>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="rounded-2xl p-3 text-zinc-500 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Tutup detail guru"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 sm:p-8">
            {modalMode === 'view' && selectedTeacher && (
              <div className="mb-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5">
                <MemberQrCard
                  name={selectedTeacher.name || selectedTeacher.user?.name || selectedTeacher.teacherId}
                  registrationNo={selectedTeacher.teacherId}
                  qrCode={selectedTeacher.qrCode}
                  roleLabel="Guru"
                />
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/50">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Registrasi</p>
                    <p className="mt-3 font-mono text-xl font-black text-zinc-900 dark:text-zinc-100">{selectedTeacher.teacherId}</p>
                  </div>
                  <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/50">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">ID QR</p>
                    <p className="mt-3 break-all font-mono text-lg font-black text-zinc-900 dark:text-zinc-100">{selectedTeacher.qrCode}</p>
                  </div>
                  <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/50">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Absensi Terakhir</p>
                    {selectedTeacher.latestAttendance ? (
                      <div className="mt-3 space-y-2">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">
                          {format(new Date(selectedTeacher.latestAttendance.checkIn), 'dd/MM/yyyy HH:mm')}
                        </p>
                        <span className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-black uppercase ${selectedTeacher.latestAttendance.isLate ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {selectedTeacher.latestAttendance.isLate ? `Terlambat ${selectedTeacher.latestAttendance.minutesLate} menit` : 'Tepat waktu'}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm font-bold text-zinc-400">Belum ada scan masuk.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Informasi Akun */}
              <div className={`space-y-4 ${step !== 1 ? 'hidden' : 'animate-in slide-in-from-right-4 duration-300'}`}>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Nama Lengkap</label>
                  <input name="name" value={teacherDraft.name || ''} onChange={handleTeacherDraftChange} required={step === 1} disabled={modalMode === 'view'} className="w-full px-6 py-4 rounded-2xl bg-zinc-100 outline-none font-bold disabled:opacity-60" placeholder="Nama Lengkap" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Email Instansi</label>
                  <input name="email" type="email" value={teacherDraft.email || ''} onChange={handleTeacherDraftChange} required={step === 1} disabled={modalMode === 'view'} className="w-full px-6 py-4 rounded-2xl bg-zinc-100 outline-none font-bold disabled:opacity-60" placeholder="email@bethesda.sch.id" />
                </div>
                {modalMode === 'add' ? (
                  <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Registrasi otomatis</p>
                    <p className="mt-2 text-sm font-bold text-zinc-600 dark:text-zinc-300">Nomor guru dan QR code dibuat setelah data disimpan.</p>
                    <p className="mt-3 font-mono text-sm font-black text-zinc-700 dark:text-zinc-200">TCH-###</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Nomor Registrasi Guru</label>
                    <input value={selectedTeacher?.teacherId || ''} readOnly className="w-full px-6 py-4 rounded-2xl bg-zinc-100 outline-none font-bold opacity-70" />
                  </div>
                )}
              </div>

              {/* Step 2: Detail Pekerjaan */}
              <div className={`space-y-4 ${step !== 2 ? 'hidden' : 'animate-in slide-in-from-right-4 duration-300'}`}>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Nomor WhatsApp</label>
                  <input name="phone" value={teacherDraft.phone || ''} onChange={handleTeacherDraftChange} required={step === 2} disabled={modalMode === 'view'} className="w-full px-6 py-4 rounded-2xl bg-zinc-100 outline-none font-bold disabled:opacity-60" placeholder="628xxx" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Divisi</label>
                    <input name="division" value={teacherDraft.division || ''} onChange={handleTeacherDraftChange} required={step === 2} disabled={modalMode === 'view'} className="w-full px-6 py-4 rounded-2xl bg-zinc-100 outline-none font-bold disabled:opacity-60" placeholder="Terapis/Guru" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Jabatan</label>
                    <input name="position" value={teacherDraft.position || ''} onChange={handleTeacherDraftChange} required={step === 2} disabled={modalMode === 'view'} className="w-full px-6 py-4 rounded-2xl bg-zinc-100 outline-none font-bold disabled:opacity-60" placeholder="Staff/Koordinator" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => step === 1 ? setModalMode(null) : setStep(1)} className="flex-1 py-4 font-black text-zinc-400 uppercase tracking-widest text-xs">
                  {step === 1 ? 'Batal' : 'Kembali'}
                </button>
                <button 
                  type={step === 1 || modalMode === 'view' ? 'button' : 'submit'}
                  disabled={isSubmitting}
                  onClick={() => {
                    if (modalMode === 'view') {
                      setModalMode(null);
                    } else if (step === 1) {
                      if (!teacherDraft.name?.trim() || !teacherDraft.email?.trim()) {
                        toast.error('Lengkapi nama dan email guru terlebih dahulu.');
                        return;
                      }
                      setStep(2);
                    }
                  }}
                  className="flex-2 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/30"
                >
                  {modalMode === 'view' ? 'Tutup' : step === 1 ? 'Lanjut' : isSubmitting ? 'Menyimpan...' : modalMode === 'edit' ? 'Simpan Perubahan' : 'Simpan Guru'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'success' && (
        <div className="fixed inset-0 bg-zinc-950/20 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] shadow-2xl p-8 text-center animate-in zoom-in-95">
            <h2 className="text-2xl font-black tracking-tight">Guru Terdaftar</h2>
            <p className="mt-2 text-sm font-bold text-zinc-500">Data guru berhasil disimpan.</p>
            {selectedTeacher && (
              <div className="mt-6 text-left">
                <MemberQrCard
                  name={selectedTeacher.name || selectedTeacher.user?.name || selectedTeacher.teacherId}
                  registrationNo={selectedTeacher.teacherId}
                  qrCode={selectedTeacher.qrCode}
                  roleLabel="Guru"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setModalMode(null)}
              className="mt-6 w-full px-6 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/30"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
