'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, Filter, Download, Eye, Edit2, Trash2, Plus, Contact2, Camera, Upload, X, Check, ChevronRight, ChevronLeft, Calendar, User, Heart, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createStudent, updateStudent } from '@/app/actions/member';

interface Student {
  id: string;
  registrationNo: string;
  name: string;
  nickname?: string;
  gender?: string;
  age?: number;
  dateOfBirth?: string;
  address?: string;
  diagnosis?: string;
  status: string;
  parentPhone?: string;
  qrCode: string;
  _count?: {
    attendances: number;
    packages: number;
  };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | 'success' | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Wizard State
  const [step, setStep] = useState(1);
  const [dob, setDob] = useState('');
  const [ageDisplay, setAgeDisplay] = useState('');
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [frequency, setFrequency] = useState(0);
  const [sessions, setSessions] = useState(0);
  const [searchDiag, setSearchDiag] = useState('');
  const [selectedDiag, setSelectedDiag] = useState<string[]>([]);
  
  const diagnosisList = [
    "Autism Spectrum Disorder", "ADHD", "Down Syndrome", 
    "Speech Delay", "Global Development Delay", "Sensory Processing Disorder"
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/students');
      const data = await response.json();
      // Memastikan data adalah array untuk mencegah error .filter
      setStudents(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Gagal memuat data siswa');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = (Array.isArray(students) ? students : [])
    .filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.registrationNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || student.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'registration') return a.registrationNo.localeCompare(b.registrationNo);
      return 0;
    });

  const handleExport = () => {
    if (filteredStudents.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }

    const headers = ["Nama", "Nickname", "No Registrasi", "Usia", "Status", "Total Kehadiran"];
    const csvRows = filteredStudents.map(student => [
      `"${student.name}"`,
      `"${student.nickname || ''}"`,
      `"${student.registrationNo}"`,
      student.age || 0,
      `"${student.status}"`,
      student._count?.attendances || 0
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `data_siswa_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Data siswa berhasil diekspor ke CSV');
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data siswa: ${name}?`)) {
      // Di sini biasanya Anda memanggil API delete
      setStudents(prev => prev.filter(s => s.id !== id));
      toast.success(`Data siswa ${name} berhasil dihapus`);
    }
  };

  // Real-time Age Calculation
  useEffect(() => {
    if (dob) {
      const today = new Date();
      const birthDate = new Date(dob);
      let years = today.getFullYear() - birthDate.getFullYear();
      let months = today.getMonth() - birthDate.getMonth();
      if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        years--;
        months += 12;
      }
      setAgeDisplay(`${years} Tahun ${months} Bulan`);
    }
  }, [dob]);

  // Auto Session Calculation
  useEffect(() => {
    setSessions(frequency * 4);
  }, [frequency]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProfilePreview(url);
    }
  };

  const handleOpenModal = (mode: 'add' | 'edit' | 'view', student: Student | null = null) => {
    setSelectedStudent(student);
    setModalMode(mode);
    setStep(1);
    if (student?.dateOfBirth) setDob(format(new Date(student.dateOfBirth), 'yyyy-MM-dd'));
    if (student?.diagnosis) setSelectedDiag(student.diagnosis.split(', '));
    setProfilePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    let result;
    if (modalMode === 'add') {
      result = await createStudent(formData);
    } else if (modalMode === 'edit' && selectedStudent) {
      result = await updateStudent(selectedStudent.id, formData);
    }
    
    if (result?.success) {
      if (modalMode === 'add') {
        setModalMode('success');
      } else {
        setModalMode(null);
        toast.success('Data siswa diperbarui');
      }
      fetchStudents(); // Refresh data
    } else {
      toast.error(`Gagal: ${result?.error}`);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-600 dark:from-white dark:to-zinc-400">Direktori Siswa</h1>
          <p className="text-zinc-500 text-lg mt-2 font-medium italic">Manajemen profil, program terapi, dan sisa sesi siswa secara terpusat.</p>
        </div>
        <button 
          onClick={() => handleOpenModal('add')}
          className="flex items-center gap-2 px-8 py-4 text-sm font-bold bg-indigo-600 text-white rounded-3xl hover-lift shadow-2xl shadow-indigo-500/30 active:scale-95 transition-all"
        >
          <Plus size={18} strokeWidth={3} />
          Tambah Siswa
        </button>
      </div>

      {/* Modern Student Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-zinc-950/20 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl w-full max-w-3xl rounded-[48px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-white/50 dark:border-zinc-800/50 p-12 animate-in zoom-in-95 fade-in duration-500 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-10">
              <h2 className="text-4xl font-black tracking-tighter leading-none">
                {modalMode === 'add' ? 'Tambah Siswa' : modalMode === 'edit' ? 'Edit Siswa' : 'Detail Siswa'}
              </h2>
              {modalMode === 'view' && (
                <span className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2 rounded-2xl text-xs font-black tracking-widest tabular-nums shadow-xl">
                  {selectedStudent?.registrationNo}
                </span>
              )}
            </div>

            {modalMode === 'view' && selectedStudent && (
              <div className="mb-10 p-8 glass-card rounded-[32px] flex flex-col items-center justify-center border-dashed border-2 border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedStudent.qrCode}`} 
                  alt="QR Code Siswa"
                  className="w-40 h-40 rounded-3xl shadow-2xl bg-white p-3 mb-4 animate-in zoom-in duration-500"
                />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">ID QR: {selectedStudent.qrCode}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-[0.2em]">Nama Lengkap</label>
                  <input name="name" defaultValue={selectedStudent?.name} required disabled={modalMode === 'view'} className="form-input-modern" placeholder="Nama Lengkap" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-[0.2em]">Nama Panggilan</label>
                  <input name="nickname" defaultValue={selectedStudent?.nickname} required disabled={modalMode === 'view'} className="form-input-modern" placeholder="Nama Panggilan" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-[0.2em]">Gender</label>
                    <select name="gender" defaultValue={selectedStudent?.gender} required disabled={modalMode === 'view'} className="form-input-modern">
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-[0.2em]">Usia</label>
                    <input name="age" type="number" defaultValue={selectedStudent?.age} required disabled={modalMode === 'view'} className="form-input-modern" placeholder="0" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-[0.2em]">WhatsApp Orang Tua</label>
                  <input name="parentPhone" defaultValue={selectedStudent?.parentPhone} required disabled={modalMode === 'view'} className="form-input-modern" placeholder="628xxx" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-[0.2em]">Alamat Rumah</label>
                  <input name="address" defaultValue={selectedStudent?.address} required disabled={modalMode === 'view'} className="form-input-modern" placeholder="Alamat" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-[0.2em]">Diagnosis</label>
                  <input name="diagnosis" defaultValue={selectedStudent?.diagnosis} required disabled={modalMode === 'view'} className="form-input-modern" placeholder="Diagnosis" />
                </div>
              </div>

              <div className="md:col-span-2 flex gap-4 mt-8">
                <button type="button" onClick={() => setModalMode(null)} className="flex-1 px-8 py-5 rounded-[24px] font-black text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all uppercase tracking-widest text-[10px]">
                  {modalMode === 'view' ? 'Tutup' : 'Batal'}
                </button>
                {modalMode !== 'view' && (
                  <button type="submit" className="flex-2 px-12 py-5 rounded-[24px] bg-indigo-600 text-white font-black shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest text-[10px]">
                    {modalMode === 'add' ? 'Simpan Siswa' : 'Simpan Perubahan'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .form-input-modern {
          @apply w-full px-6 py-4 rounded-[20px] bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/30 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 font-black tracking-tight text-base transition-all duration-300;
        }
        .form-input-modern:disabled {
          @apply opacity-60 cursor-not-allowed bg-zinc-100/50 dark:bg-zinc-900/50 grayscale;
        }
      `}</style>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 p-3 glass-card rounded-[32px]">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Cari nama atau nomor registrasi (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-transparent border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all text-lg font-medium"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Tidak Aktif</option>
            <option value="COMPLETED">Selesai</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium cursor-pointer"
          >
            <option value="name">Urutkan Nama</option>
            <option value="registration">Urutkan Registrasi</option>
          </select>
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 text-sm font-medium active:scale-95 transition-all"
          >
            <Download size={16} />
            Ekspor
          </button>
          <div className="flex items-center gap-2 px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
             <Contact2 size={16} />
             <span className="text-xs font-bold uppercase tracking-tight">Parent Portal Active</span>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xl shadow-zinc-200/20 dark:shadow-none">
        {loading ? (
          <div className="p-24 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground animate-pulse font-medium">Memuat data siswa...</p>
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-5 font-bold text-zinc-400 uppercase text-[10px] tracking-[0.2em]">Nama</th>
                  <th className="px-6 py-5 font-bold text-zinc-400 uppercase text-[10px] tracking-[0.2em]">Registrasi</th>
                  <th className="px-6 py-5 font-bold text-zinc-400 uppercase text-[10px] tracking-[0.2em]">Usia</th>
                  <th className="px-6 py-5 font-bold text-zinc-400 uppercase text-[10px] tracking-[0.2em]">Status</th>
                  <th className="px-6 py-5 font-bold text-zinc-400 uppercase text-[10px] tracking-[0.2em]">Kehadiran</th>
                  <th className="px-6 py-5 font-bold text-zinc-400 uppercase text-[10px] tracking-[0.2em] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-all duration-300">
                    <td className="px-6 py-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">{student.name}</div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{student.nickname || 'Tanpa Panggilan'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500">{student.registrationNo}</td>
                    <td className="px-6 py-4">{student.age || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] ${
                          student.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                        }`}
                      >
                        {student.status === 'ACTIVE' ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md inline-block">
                        {student._count?.attendances || 0} Sesi
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button 
                          onClick={() => handleOpenModal('view', student)}
                          title="Lihat Profil" 
                          className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-90"
                        >
                          <Eye size={15} className="text-zinc-500 hover:text-indigo-600" />
                        </button>
                        <button 
                          onClick={() => handleOpenModal('edit', student)}
                          title="Ubah Data" 
                          className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-90"
                        >
                          <Edit2 size={15} className="text-zinc-500 hover:text-amber-600" />
                        </button>
                        <button 
                          onClick={() => handleDelete(student.id, student.name)}
                          title="Hapus Data" 
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all shadow-sm hover:shadow-md group/trash active:scale-90"
                        >
                          <Trash2 size={15} className="text-zinc-500 group-hover/trash:text-rose-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted-foreground font-medium italic">Tidak ada data siswa ditemukan</p>
          </div>
        )}
      </div>
    </div>
  );
}
