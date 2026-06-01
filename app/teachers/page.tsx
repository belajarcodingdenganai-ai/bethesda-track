'use client';

import { useEffect, useState } from 'react';
import { Search, Filter, Download, Eye, Edit2, Trash2, Plus, User, Mail, Phone, Briefcase, ChevronRight, ChevronLeft } from 'lucide-react';
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
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | 'success' | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherDraft, setTeacherDraft] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetchTeachers();
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
        <button 
          onClick={() => handleOpenModal('add')}
          className="flex items-center gap-2 px-8 py-4 text-sm font-bold bg-indigo-600 text-white rounded-3xl hover-lift shadow-2xl shadow-indigo-500/30"
        >
          <Plus size={18} strokeWidth={3} />
          Tambah Guru
        </button>
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

      {/* Teacher Wizard Modal */}
      {modalMode && modalMode !== 'success' && (
        <div className="fixed inset-0 bg-zinc-950/20 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95">
            <h2 className="text-3xl font-black mb-8 tracking-tighter">
              {modalMode === 'add' ? 'Tambah Guru Baru' : modalMode === 'edit' ? 'Edit Guru' : 'Detail Guru'}
            </h2>
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
