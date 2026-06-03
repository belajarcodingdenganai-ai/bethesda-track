'use client';

import { useEffect, useState } from 'react';
import { Search, Filter, Download, Edit2, Trash2, Plus, User, Mail, Phone, Briefcase, ChevronRight, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createTeacher, deleteTeacher, syncDefaultTherapists, updateTeacher } from '@/app/actions/member';
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
}

interface TeacherAttendance {
  id: string;
  teacherDbId: string;
  teacherId: string;
  teacherName: string;
  attendanceDate: string;
  scheduledStart: string;
  checkIn: string;
  isLate: boolean;
  minutesLate: number;
  notes?: string;
}

const formatAttendanceDate = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));

const formatAttendanceTime = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));

const downloadCsv = (rows: Array<Record<string, string | number>>, filename: string) => {
  if (rows.length === 0) {
    toast.error('Belum ada data kehadiran untuk diekspor');
    return;
  }

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | 'success' | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherDraft, setTeacherDraft] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingDefaults, setIsSyncingDefaults] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<TeacherAttendance[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isExportingAttendance, setIsExportingAttendance] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetchTeachers();

    const interval = setInterval(() => {
      fetchTeachers(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchTeachers = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const url = process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/teachers`
        : '/api/teachers';
      const response = await fetch(url, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setTeachers(Array.isArray(data) ? data : (data.data || []));
    } catch (error: any) {
      console.error('Error fetching teachers:', error);
      if (!silent) toast.error('Gagal memuat data guru: ' + error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleOpenModal = (mode: 'add' | 'edit' | 'view', teacher: Teacher | null = null) => {
    setStep(1);
    setModalMode(mode);
    setSelectedTeacher(teacher);
    setAttendanceHistory([]);
    setTeacherDraft({
      name: teacher?.name || teacher?.user?.name || '',
      email: teacher?.user?.email || '',
      phone: teacher?.phone || '',
      division: teacher?.division || '',
      position: teacher?.position || '',
    });

    if (mode === 'view' && teacher) {
      fetchTeacherAttendance(teacher.id);
    }
  };

  const fetchTeacherAttendance = async (teacherDbId: string) => {
    try {
      setIsLoadingAttendance(true);
      const url = process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/teachers/attendance?teacherId=${teacherDbId}`
        : `/api/teachers/attendance?teacherId=${teacherDbId}`;
      const response = await fetch(url, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      setAttendanceHistory(Array.isArray(result.data) ? result.data : []);
    } catch (error: any) {
      toast.error('Gagal memuat riwayat kehadiran guru: ' + error.message);
      setAttendanceHistory([]);
    } finally {
      setIsLoadingAttendance(false);
    }
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
    } else {
      toast.error(`Gagal menghapus guru: ${result.error}`);
    }
  };

  const handleSyncDefaultTherapists = async () => {
    try {
      setIsSyncingDefaults(true);
      const result = await syncDefaultTherapists();
      if (result.success) {
        toast.success('Daftar terapis dan QR berurutan berhasil disinkronkan');
        fetchTeachers();
      } else {
        toast.error(`Gagal sinkronisasi: ${'error' in result ? result.error : 'Terjadi kesalahan'}`);
      }
    } finally {
      setIsSyncingDefaults(false);
    }
  };

  const attendanceRows = (rows: TeacherAttendance[]) => rows.map((item) => ({
    Guru: item.teacherName,
    'ID Guru': item.teacherId,
    Hari: new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(new Date(item.checkIn)),
    'Tanggal Masuk': formatAttendanceDate(item.checkIn),
    'Jam Masuk': formatAttendanceTime(item.checkIn),
    Status: item.isLate ? `Terlambat ${item.minutesLate} menit` : 'Tepat waktu',
    Catatan: item.notes || '',
  }));

  const exportSelectedAttendance = () => {
    if (!selectedTeacher) return;
    downloadCsv(attendanceRows(attendanceHistory), `kehadiran-${selectedTeacher.teacherId}.csv`);
  };

  const exportAllAttendance = async () => {
    try {
      setIsExportingAttendance(true);
      const response = await fetch('/api/teachers/attendance', { cache: 'no-store' });
      const result = await response.json();
      const rows = Array.isArray(result.data) ? result.data : [];
      downloadCsv(attendanceRows(rows), 'kehadiran-guru.csv');
    } catch (error) {
      toast.error('Gagal mengekspor kehadiran guru');
    } finally {
      setIsExportingAttendance(false);
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
          <button
            onClick={exportAllAttendance}
            disabled={isExportingAttendance}
            className="flex items-center gap-2 px-6 py-4 text-sm font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl hover-lift shadow-xl disabled:opacity-60"
          >
            <Download size={18} strokeWidth={3} />
            {isExportingAttendance ? 'Mengekspor...' : 'Export Kehadiran'}
          </button>
          <button
            onClick={handleSyncDefaultTherapists}
            disabled={isSyncingDefaults}
            className="flex items-center gap-2 px-6 py-4 text-sm font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl hover-lift shadow-xl disabled:opacity-60"
          >
            <Download size={18} strokeWidth={3} />
            {isSyncingDefaults ? 'Menyinkronkan...' : 'Sinkron Terapis'}
          </button>
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
      <div className="glass-card rounded-[40px] mobile-scroll-x">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b">
            <tr>
              <th className="px-10 py-6 font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em]">Guru</th>
              <th className="px-6 py-6 font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em]">ID & Divisi</th>
              <th className="px-6 py-6 font-black text-zinc-400 uppercase text-[10px] tracking-[0.3em]">Kontak</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredTeachers.map((teacher) => (
              <tr key={teacher.id} className="group hover:bg-white/50 transition-all duration-500">
                <td className="px-10 py-6">
                <button
                  type="button"
                  onClick={() => handleOpenModal('view', teacher)}
                  className="flex w-full items-center gap-4 text-left transition-all hover:text-indigo-600"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                    {teacher.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-black text-zinc-900 dark:text-zinc-100">{teacher.name}</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase">{teacher.position}</div>
                  </div>
                </button>
              </td>
              <td className="px-6 py-4 font-mono text-xs">
                 <div className="font-bold">{teacher.teacherId}</div>
                 <div className="text-zinc-400">{teacher.division}</div>
              </td>
              <td className="px-6 py-4 text-zinc-500">
                {teacher.phone}
              </td>
            </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Teacher Wizard Modal */}
      {modalMode && modalMode !== 'success' && (
        <div className="fixed inset-0 bg-zinc-950/20 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className={`bg-white dark:bg-zinc-900 w-full rounded-[32px] shadow-2xl animate-in zoom-in-95 ${modalMode === 'view' ? 'max-w-4xl max-h-[88vh] overflow-hidden p-6' : 'max-w-2xl p-10'}`}>
<div className="mb-6 flex flex-col gap-4 lg:flex-row items-start justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-black tracking-tighter">
                    {modalMode === 'add' ? 'Tambah Guru Baru' : modalMode === 'edit' ? 'Edit Guru' : 'Detail Guru'}
                  </h2>
                  {modalMode === 'view' && selectedTeacher && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => selectedTeacher && handleOpenModal('edit', selectedTeacher)}
                        className="rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-indigo-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => selectedTeacher && handleDelete(selectedTeacher)}
                        className="rounded-2xl bg-rose-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-100"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
                {modalMode === 'view' && selectedTeacher && (
                  <p className="mt-1 text-sm font-bold text-zinc-500">{selectedTeacher.teacherId} • {selectedTeacher.position}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-600 transition-all hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <ChevronLeft size={16} />
                Kembali
              </button>
            </div>

            {modalMode === 'view' && selectedTeacher ? (
              <div className="max-h-[calc(88vh-112px)] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
                  <div className="space-y-4">
                    <MemberQrCard
                      name={selectedTeacher.name || selectedTeacher.user?.name || selectedTeacher.teacherId}
                      registrationNo={selectedTeacher.teacherId}
                      qrCode={selectedTeacher.qrCode}
                      roleLabel="Guru"
                    />
                    <button
                      type="button"
                      onClick={exportSelectedAttendance}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-700"
                    >
                      <Download size={16} />
                      Export Kehadiran
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Nama Lengkap</p>
                        <p className="mt-2 text-lg font-black text-zinc-900 dark:text-zinc-100">{selectedTeacher.name || selectedTeacher.user?.name || '-'}</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Email Instansi</p>
                        <p className="mt-2 break-all text-lg font-black text-zinc-900 dark:text-zinc-100">{selectedTeacher.user?.email || '-'}</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Registrasi</p>
                        <p className="mt-2 font-mono text-lg font-black text-zinc-900 dark:text-zinc-100">{selectedTeacher.teacherId}</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">ID QR</p>
                        <p className="mt-2 break-all font-mono text-lg font-black text-zinc-900 dark:text-zinc-100">{selectedTeacher.qrCode}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
                      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Riwayat Kehadiran</h3>
                          <p className="mt-1 text-xs font-bold text-zinc-400">Hari, tanggal masuk, jam masuk, dan status kehadiran.</p>
                        </div>
                        <span className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {attendanceHistory.length} data
                        </span>
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {isLoadingAttendance ? (
                          <div className="p-8 text-center text-sm font-bold text-zinc-400">Memuat riwayat kehadiran...</div>
                        ) : attendanceHistory.length === 0 ? (
                          <div className="p-8 text-center text-sm font-bold text-zinc-400">Belum ada riwayat kehadiran guru.</div>
                        ) : (
                          <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-zinc-50 text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:bg-zinc-900">
                              <tr>
                                <th className="px-4 py-3">Hari</th>
                                <th className="px-4 py-3">Tanggal Masuk</th>
                                <th className="px-4 py-3">Jam Masuk</th>
                                <th className="px-4 py-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                              {attendanceHistory.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-4 py-3 font-bold text-zinc-700 dark:text-zinc-200">
                                    {new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(new Date(item.checkIn))}
                                  </td>
                                  <td className="px-4 py-3 font-bold text-zinc-700 dark:text-zinc-200">{formatAttendanceDate(item.checkIn)}</td>
                                  <td className="px-4 py-3 font-mono font-black text-zinc-900 dark:text-zinc-100">{formatAttendanceTime(item.checkIn)}</td>
                                  <td className="px-4 py-3">
                                    <span className={`rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest ${item.isLate ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                                      {item.isLate ? `Terlambat ${item.minutesLate}m` : 'Tepat Waktu'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
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
              {modalMode !== 'add' && (
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
            )}
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
