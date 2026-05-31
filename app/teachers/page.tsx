'use client';

import { useEffect, useState } from 'react';
import { Search, Filter, Download, Eye, Edit2, Trash2, Plus, User, Mail, Phone, Briefcase, ChevronRight, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createTeacher } from '@/app/actions/member';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | 'success' | null>(null);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await createTeacher(formData);
    
    if (result.success) {
      setModalMode('success');
      fetchTeachers();
    } else {
      toast.error(`Gagal: ${'error' in result ? result.error : 'Terjadi kesalahan'}`);
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
          onClick={() => { setStep(1); setModalMode('add'); }}
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
                      <button className="p-3 bg-zinc-100 rounded-2xl"><Eye size={18} /></button>
                      <button className="p-3 bg-zinc-100 rounded-2xl"><Edit2 size={18} /></button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Teacher Wizard Modal */}
      {modalMode === 'add' && (
        <div className="fixed inset-0 bg-zinc-950/20 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95">
            <h2 className="text-3xl font-black mb-8 tracking-tighter">Tambah Guru Baru</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Informasi Akun */}
              <div className={`space-y-4 ${step !== 1 ? 'hidden' : 'animate-in slide-in-from-right-4 duration-300'}`}>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Nama Lengkap</label>
                  <input name="name" required={step === 1} className="w-full px-6 py-4 rounded-2xl bg-zinc-100 outline-none font-bold" placeholder="Nama Lengkap" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Email Instansi</label>
                  <input name="email" type="email" required={step === 1} className="w-full px-6 py-4 rounded-2xl bg-zinc-100 outline-none font-bold" placeholder="email@bethesda.sch.id" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">ID Guru / NIK</label>
                  <input name="teacherId" required={step === 1} className="w-full px-6 py-4 rounded-2xl bg-zinc-100 outline-none font-bold" placeholder="Contoh: T-2024-001" />
                </div>
              </div>

              {/* Step 2: Detail Pekerjaan */}
              <div className={`space-y-4 ${step !== 2 ? 'hidden' : 'animate-in slide-in-from-right-4 duration-300'}`}>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Nomor WhatsApp</label>
                  <input name="phone" required={step === 2} className="w-full px-6 py-4 rounded-2xl bg-zinc-100 outline-none font-bold" placeholder="628xxx" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Divisi</label>
                    <input name="division" required={step === 2} className="w-full px-6 py-4 rounded-2xl bg-zinc-100 outline-none font-bold" placeholder="Terapis/Guru" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Jabatan</label>
                    <input name="position" required={step === 2} className="w-full px-6 py-4 rounded-2xl bg-zinc-100 outline-none font-bold" placeholder="Staff/Koordinator" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => step === 1 ? setModalMode(null) : setStep(1)} className="flex-1 py-4 font-black text-zinc-400 uppercase tracking-widest text-xs">
                  {step === 1 ? 'Batal' : 'Kembali'}
                </button>
                <button 
                  type="button" 
                  onClick={() => step === 1 ? setStep(2) : (document.querySelector('form') as any).requestSubmit()}
                  className="flex-2 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/30"
                >
                  {step === 1 ? 'Lanjut' : 'Simpan Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
