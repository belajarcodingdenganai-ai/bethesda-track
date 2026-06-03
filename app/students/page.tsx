'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, Download, Eye, Edit2, Trash2, Plus, Contact2, X, MessageSquare, Copy, Phone, ShieldCheck, ExternalLink, QrCode, Hash, Activity, ImageUp, Move, ZoomIn, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createStudent, deleteStudent, updateStudent } from '@/app/actions/member';
import { createManualMissingScan } from '@/app/actions/attendance';
import MemberQrCard from '@/components/qr/member-qr-card';
import { THERAPIST_NAMES } from '@/lib/therapy-options';

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
  profileImage?: string;
  status: string;
  parentPhone?: string;
  qrCode: string;
  packages?: Array<{
    id: string;
    totalSessions: number;
    usedSessions: number;
    status: string;
    program?: { name: string };
  }>;
  _count?: {
    attendances: number;
    packages: number;
  };
}

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

function getAvatarCropStyle(imageSize: { width: number; height: number } | null, xOffset: number, yOffset: number, zoom: number) {
  if (!imageSize || imageSize.width <= 0 || imageSize.height <= 0) {
    return {
      width: '100%',
      height: '100%',
      left: '0%',
      top: '0%',
    };
  }

  const baseScale = Math.max(1 / imageSize.width, 1 / imageSize.height);
  const widthPct = imageSize.width * baseScale * zoom * 100;
  const heightPct = imageSize.height * baseScale * zoom * 100;
  const maxOffsetX = Math.max((widthPct - 100) / 2, 0);
  const maxOffsetY = Math.max((heightPct - 100) / 2, 0);

  return {
    width: `${widthPct}%`,
    height: `${heightPct}%`,
    left: `${(100 - widthPct) / 2 + (xOffset / 50) * maxOffsetX}%`,
    top: `${(100 - heightPct) / 2 + (yOffset / 50) * maxOffsetY}%`,
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
  const [isParentPortalOpen, setIsParentPortalOpen] = useState(false);
  const [manualScanStudent, setManualScanStudent] = useState<Student | null>(null);
  const [manualCheckIn, setManualCheckIn] = useState(getDateTimeLocalValue);
  const [manualTherapistName, setManualTherapistName] = useState('');
  const [isSubmittingManualScan, setIsSubmittingManualScan] = useState(false);
  const [therapistOptions, setTherapistOptions] = useState<string[]>(THERAPIST_NAMES);
  const [formDraft, setFormDraft] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Wizard State
  const [step, setStep] = useState(1);
  const [dob, setDob] = useState('');
  const [ageDisplay, setAgeDisplay] = useState('');
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileImageSize, setProfileImageSize] = useState<{ width: number; height: number } | null>(null);
  const [avatarX, setAvatarX] = useState(0);
  const [avatarY, setAvatarY] = useState(0);
  const [avatarZoom, setAvatarZoom] = useState(1);
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
    fetchTherapists();

    // Auto-sync polling every 30 seconds for real-time consistency with desktop
    const interval = setInterval(() => {
      fetchStudents();
      fetchTherapists(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Use relative URL for web browsers (no CORS issues), fallback to absolute URL for Capacitor
      const url = process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/students`
        : '/api/students';

      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Students data received:', data);

      // Handle various response structures
      const studentsData = Array.isArray(data) ? data : (data.data || []);
      setStudents(studentsData);

      if (studentsData.length === 0) {
        console.warn('Database connected but returned 0 students.');
      }
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast.error(`Gagal memuat data: ${error.message}`);
    } finally {
      setLoading(false);
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

  const filteredStudents = (Array.isArray(students) ? students : [])
    .filter((student) => {
      const name = student.name || '';
      const regNo = student.registrationNo || '';
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        regNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || student.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'registration') return a.registrationNo.localeCompare(b.registrationNo);
      return 0;
    });

  const portalActiveStudents = filteredStudents.filter(
    (student) => Boolean(student.parentPhone) && student.status === 'ACTIVE'
  );
  const studentsWithActivePackage = filteredStudents.filter((student) => {
    const activePackage = student.packages?.[0];
    return activePackage && activePackage.usedSessions < activePackage.totalSessions;
  });
  const portalCoverage =
    filteredStudents.length > 0
      ? Math.round((portalActiveStudents.length / filteredStudents.length) * 100)
      : 0;

  const getParentPortalLink = async (student: Student) => {
    const response = await fetch(`/api/parent-portal/link?studentId=${student.id}`, { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Gagal membuat link parent portal');
    }

    return data.url as string;
  };

  const copyParentPortalLink = async (student: Student) => {
    try {
      const portalLink = await getParentPortalLink(student);
      await navigator.clipboard.writeText(portalLink);
      toast.success(`Link portal ${student.name} disalin`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyalin link portal');
    }
  };

  const openParentWhatsApp = async (student: Student) => {
    if (!student.parentPhone) {
      toast.error('Nomor WhatsApp orang tua belum tersedia');
      return;
    }

    try {
      const portalLink = await getParentPortalLink(student);
      const phone = student.parentPhone.replace(/\D/g, '');
      const message = encodeURIComponent(
        `Halo, berikut akses Parent Portal khusus untuk memantau kehadiran dan sesi terapi ${student.name}: ${portalLink}`
      );
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuat link parent portal');
    }
  };

  const openManualMissingScan = (student?: Student) => {
    const target = student || studentsWithActivePackage[0] || null;
    if (!target) {
      toast.error('Tidak ada siswa dengan paket aktif untuk missing scan');
      return;
    }

    setManualScanStudent(target);
    setManualCheckIn(getDateTimeLocalValue());
    setManualTherapistName(therapistOptions[0] || '');
  };

  const handleManualMissingScan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const activePackage = manualScanStudent?.packages?.[0];

    if (!manualScanStudent || !activePackage) {
      toast.error('Pilih siswa dengan paket aktif');
      return;
    }

    setIsSubmittingManualScan(true);
    try {
      const result = await createManualMissingScan(activePackage.id, manualCheckIn, manualTherapistName);

      if (result.success === false) {
        toast.error(result.error || 'Gagal mencatat missing scan');
        return;
      }

      toast.success(`Missing scan ${manualScanStudent.name} berhasil dicatat`);
      setManualScanStudent(null);
      await fetchStudents();
    } finally {
      setIsSubmittingManualScan(false);
    }
  };

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

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data siswa: ${name}?`)) {
      const result = await deleteStudent(id);

      if (result.success) {
        setStudents(prev => prev.filter(s => s.id !== id));
        if (selectedStudent?.id === id) {
          setSelectedStudent(null);
          setModalMode(null);
        }
        toast.success(`Data siswa ${name} berhasil dihapus`);
        fetchStudents();
      } else {
        toast.error(`Gagal menghapus siswa: ${result.error}`);
      }
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
      setProfileImageSize(null);
      setAvatarX(0);
      setAvatarY(0);
      setAvatarZoom(1);
    }
  };

  const renderAvatar = (src: string) => (
    <img
      src={src}
      alt="Avatar siswa"
      className="absolute max-w-none object-fill"
      onLoad={(event) => {
        const image = event.currentTarget;
        setProfileImageSize({ width: image.naturalWidth, height: image.naturalHeight });
      }}
      style={getAvatarCropStyle(profileImageSize, avatarX, avatarY, avatarZoom)}
    />
  );

  const buildAvatarImage = async () => {
    if (!profilePreview) return selectedStudent?.profileImage || null;

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = profilePreview;
    });

    const size = 384;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return selectedStudent?.profileImage || null;

    const baseScale = Math.max(size / image.width, size / image.height);
    const scale = baseScale * avatarZoom;
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const maxOffsetX = Math.max((drawWidth - size) / 2, 0);
    const maxOffsetY = Math.max((drawHeight - size) / 2, 0);
    const x = (size - drawWidth) / 2 + (avatarX / 50) * maxOffsetX;
    const y = (size - drawHeight) / 2 + (avatarY / 50) * maxOffsetY;

    ctx.fillStyle = '#eef2ff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(image, x, y, drawWidth, drawHeight);
    return canvas.toDataURL('image/jpeg', 0.86);
  };

  const handleOpenModal = (mode: 'add' | 'edit' | 'view', student: Student | null = null) => {
    setSelectedStudent(student);
    setStep(1);
    setDob('');
    setAgeDisplay('');
    setProfilePreview(null);
    setProfileImageSize(null);
    setAvatarX(0);
    setAvatarY(0);
    setAvatarZoom(1);
    setSelectedPrograms([]);
    setFrequency(0);
    setSessions(0);
    setSearchDiag('');
    setSelectedDiag([]);

    setFormDraft({
      name: student?.name || '',
      nickname: student?.nickname || '',
      gender: student?.gender || 'L',
      age: student?.age != null ? String(student.age) : '',
      parentPhone: student?.parentPhone || '',
      address: student?.address || '',
      diagnosis: student?.diagnosis || '',
    });

    if (student?.dateOfBirth) setDob(format(new Date(student.dateOfBirth), 'yyyy-MM-dd'));
    if (student?.diagnosis) setSelectedDiag(student.diagnosis.split(', '));
    if (student?.profileImage) setProfilePreview(student.profileImage);
    setModalMode(mode);
  };

  const handleFormDraftChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (!target.name) return;
    setFormDraft(prev => ({ ...prev, [target.name]: target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const avatarImage = await buildAvatarImage();
    if (avatarImage) formData.set('profileImage', avatarImage);
    setFormDraft(Object.fromEntries(formData.entries()) as Record<string, string>);
    setIsSubmitting(true);
    
    let result;
    try {
      if (modalMode === 'add') {
        result = await createStudent(formData);
      } else if (modalMode === 'edit' && selectedStudent) {
        result = await updateStudent(selectedStudent.id, formData);
      }
    } finally {
      setIsSubmitting(false);
    }
    
    if (result?.success) {
      if (modalMode === 'add') {
        setSelectedStudent(result.data as Student);
        setModalMode('success');
        setFormDraft({});
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
        <div className="fixed inset-0 bg-zinc-950/30 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl w-full max-w-4xl rounded-[28px] sm:rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.18)] border border-white/50 dark:border-zinc-800/50 animate-in zoom-in-95 fade-in duration-300 max-h-[92vh] overflow-hidden flex flex-col">
<div className="flex flex-col gap-4 border-b border-zinc-100 dark:border-zinc-800 px-5 py-5 sm:px-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
                        {modalMode === 'add' ? 'Tambah Siswa' : modalMode === 'edit' ? 'Edit Siswa' : modalMode === 'success' ? 'Siswa Terdaftar' : 'Detail Siswa'}
                      </h2>
                      <p className="mt-2 text-sm font-medium text-zinc-500">
                        {modalMode === 'add'
                          ? 'Nomor registrasi dan barcode dibuat otomatis secara berurutan.'
                          : modalMode === 'success'
                            ? 'Data siswa berhasil dibuat dengan identitas otomatis.'
                            : 'Kelola identitas, kontak orang tua, dan data terapi siswa.'}
                      </p>
                    </div>
                    {(modalMode === 'view' || modalMode === 'success') && (
                      <span className="shrink-0 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-3 py-2 rounded-2xl text-[10px] sm:text-xs font-black tracking-widest tabular-nums shadow-xl">
                        {selectedStudent?.registrationNo}
                      </span>
                    )}
                  </div>
                  {modalMode === 'view' && selectedStudent && (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleOpenModal('edit', selectedStudent)}
                        className="rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-indigo-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedStudent.id, selectedStudent.name)}
                        className="rounded-2xl bg-rose-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-100"
                      >
                        Hapus
                      </button>
                    </div>
              )}
            </div>

            <div className="overflow-y-auto p-5 sm:p-8">
              {(modalMode === 'view' || modalMode === 'success') && selectedStudent && (
                <div className="mb-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5">
                  <MemberQrCard
                    name={selectedStudent.name}
                    registrationNo={selectedStudent.registrationNo}
                    qrCode={selectedStudent.qrCode}
                    roleLabel="Siswa"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 p-5">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Hash size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Registrasi</span>
                      </div>
                      <p className="mt-3 font-mono text-xl font-black text-zinc-900 dark:text-zinc-100">{selectedStudent.registrationNo}</p>
                    </div>
                    <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 p-5">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <QrCode size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">ID Barcode</span>
                      </div>
                      <p className="mt-3 font-mono text-lg font-black text-zinc-900 dark:text-zinc-100 break-all">{selectedStudent.qrCode}</p>
                    </div>
                    {modalMode === 'success' && (
                      <button
                        type="button"
                        onClick={() => setModalMode(null)}
                        className="sm:col-span-2 rounded-3xl bg-indigo-600 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-500/25 hover:bg-indigo-700 active:scale-[0.99] transition-all"
                      >
                        Selesai
                      </button>
                    )}
                  </div>
                </div>
              )}

              {modalMode !== 'success' && (
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
                      <div className="form-field-modern sm:col-span-2">
                        <label className="form-label-modern">Nama Lengkap</label>
                        <input name="name" value={formDraft.name || ''} required disabled={modalMode === 'view'} onChange={handleFormDraftChange} className="form-input-modern" placeholder="Nama lengkap siswa" />
                      </div>
                      <div className="form-field-modern">
                        <label className="form-label-modern">Nama Panggilan</label>
                        <input name="nickname" value={formDraft.nickname || ''} disabled={modalMode === 'view'} onChange={handleFormDraftChange} className="form-input-modern" placeholder="Nama panggilan" />
                      </div>
                      <div className="form-field-modern">
                        <label className="form-label-modern">Gender</label>
                        <select name="gender" value={formDraft.gender || 'L'} required disabled={modalMode === 'view'} onChange={handleFormDraftChange} className="form-input-modern">
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div className="form-field-modern">
                        <label className="form-label-modern">Usia</label>
                        <input name="age" type="number" min="0" value={formDraft.age || ''} disabled={modalMode === 'view'} onChange={handleFormDraftChange} className="form-input-modern" placeholder="0" />
                      </div>
                      <div className="form-field-modern">
                        <label className="form-label-modern">WhatsApp Orang Tua</label>
                        <input name="parentPhone" value={formDraft.parentPhone || ''} required disabled={modalMode === 'view'} onChange={handleFormDraftChange} className="form-input-modern" placeholder="628xxx" />
                      </div>
                    </div>

                    <div className="form-field-modern">
                      <label className="form-label-modern">Alamat Rumah</label>
                      <input name="address" value={formDraft.address || ''} required disabled={modalMode === 'view'} onChange={handleFormDraftChange} className="form-input-modern" placeholder="Alamat lengkap" />
                    </div>
                    <div className="form-field-modern">
                      <label className="form-label-modern">Diagnosis</label>
                      <input name="diagnosis" value={formDraft.diagnosis || ''} required disabled={modalMode === 'view'} onChange={handleFormDraftChange} className="form-input-modern" placeholder="Diagnosis atau kebutuhan terapi" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/40">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">Edit Avatar Kotak</p>
                          <p className="text-xs font-bold text-zinc-500">Upload, zoom, dan geser foto sebelum disimpan.</p>
                        </div>
                        {modalMode !== 'view' && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-2xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700"
                          >
                            <ImageUp size={18} />
                          </button>
                        )}
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                      <input type="hidden" name="profileImage" value={profilePreview || selectedStudent?.profileImage || ''} />
                      <div className="relative mx-auto mt-5 h-36 w-36 overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-xl">
                        {profilePreview ? renderAvatar(profilePreview) : (
                          <div className="flex h-full w-full items-center justify-center text-5xl font-black">
                            {(formDraft.name || selectedStudent?.name || 'S').charAt(0)}
                          </div>
                        )}
                      </div>
                      {modalMode !== 'view' && profilePreview && (
                        <div className="mt-5 space-y-4">
                          <label className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-zinc-400">
                            <ZoomIn size={14} />
                            Zoom
                            <input type="range" min="1" max="2.4" step="0.05" value={avatarZoom} onChange={(e) => setAvatarZoom(Number(e.target.value))} className="min-w-0 flex-1" />
                          </label>
                          <label className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-zinc-400">
                            <Move size={14} />
                            Kiri/Kanan
                            <input type="range" min="-50" max="50" step="1" value={avatarX} onChange={(e) => setAvatarX(Number(e.target.value))} className="min-w-0 flex-1" />
                          </label>
                          <label className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-zinc-400">
                            <Move size={14} />
                            Atas/Bawah
                            <input type="range" min="-50" max="50" step="1" value={avatarY} onChange={(e) => setAvatarY(Number(e.target.value))} className="min-w-0 flex-1" />
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-indigo-600 p-3 text-white">
                          <QrCode size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">Identitas otomatis</p>
                          <p className="text-xs font-bold text-zinc-500">Sistem membuat nomor registrasi dan barcode setelah data disimpan.</p>
                        </div>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/80 p-4 dark:bg-zinc-950/40">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">Registrasi</p>
                          <p className="mt-2 font-mono text-sm font-black text-zinc-700 dark:text-zinc-200">{selectedStudent?.registrationNo || 'BETH-###'}</p>
                        </div>
                        <div className="rounded-2xl bg-white/80 p-4 dark:bg-zinc-950/40">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">Barcode</p>
                          <p className="mt-2 font-mono text-sm font-black text-zinc-700 dark:text-zinc-200">{selectedStudent?.qrCode || 'STU-BETH-###'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                      <button type="button" onClick={() => setModalMode(null)} className="w-full px-6 py-4 rounded-2xl font-black text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all uppercase tracking-widest text-[10px]">
                        {modalMode === 'view' ? 'Tutup' : 'Batal'}
                      </button>
                      {modalMode !== 'view' && (
                        <button type="submit" disabled={isSubmitting} className="w-full px-6 py-4 rounded-2xl bg-indigo-600 text-white font-black shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 active:scale-[0.99] transition-all uppercase tracking-widest text-[10px] disabled:cursor-not-allowed disabled:opacity-60">
                          {isSubmitting ? 'Menyimpan...' : modalMode === 'add' ? 'Simpan Siswa' : 'Simpan Perubahan'}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

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
          <button
            onClick={fetchStudents}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium active:scale-95 transition-all"
          >
            <Activity size={16} />
            Sync Data
          </button>
          <button
            onClick={() => setIsParentPortalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 active:scale-95 transition-all"
          >
             <Contact2 size={16} />
             <span className="text-xs font-bold uppercase tracking-tight">Parent Portal Active</span>
             <span className="text-[10px] font-black bg-white dark:bg-zinc-950 px-2 py-0.5 rounded-lg">
               {portalActiveStudents.length}
             </span>
          </button>
          <button
            onClick={() => openManualMissingScan()}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-600/20"
          >
            <Calendar size={16} />
            <span className="text-xs font-bold uppercase tracking-tight">Missing Scan</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          onClick={() => openManualMissingScan()}
          className="p-5 text-left rounded-[28px] border border-emerald-500/20 bg-emerald-50/80 shadow-sm transition-all hover:border-emerald-500/40 hover:bg-emerald-50 active:scale-[0.99] dark:bg-emerald-950/20 dark:border-emerald-900/40"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl">
              <Calendar size={20} />
            </div>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-200">
              {studentsWithActivePackage.length}
            </span>
          </div>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Missing Scan</p>
          <p className="text-sm font-bold text-emerald-800/80 dark:text-emerald-200/80">Catat sesi manual untuk siswa yang hadir tanpa scan</p>
        </button>

        <button
          onClick={() => setIsParentPortalOpen(true)}
          className="p-5 text-left glass-card rounded-[28px] border border-indigo-500/10 hover:border-indigo-500/30 transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl">
              <ShieldCheck size={20} />
            </div>
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{portalCoverage}%</span>
          </div>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Coverage Portal</p>
          <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">{portalActiveStudents.length} dari {filteredStudents.length} siswa siap diakses orang tua</p>
        </button>

        <div className="p-5 glass-card rounded-[28px] border border-emerald-500/10">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
              <Phone size={20} />
            </div>
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
              {filteredStudents.filter((student) => student.parentPhone).length}
            </span>
          </div>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">WhatsApp Tersedia</p>
          <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">Siap dikirimi link portal dan reminder sesi</p>
        </div>

        <div className="p-5 glass-card rounded-[28px] border border-sky-500/10">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-sky-500/10 text-sky-600 rounded-2xl">
              <QrCode size={20} />
            </div>
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
              {filteredStudents.filter((student) => student.qrCode).length}
            </span>
          </div>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Barcode Aktif</p>
          <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">QR siap dipakai untuk identifikasi dan kehadiran</p>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md rounded-3xl border border-zinc-200 dark:border-zinc-800 mobile-scroll-x shadow-xl shadow-zinc-200/20 dark:shadow-none">
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
                  <th className="px-6 py-5 font-bold text-zinc-400 uppercase text-[10px] tracking-[0.2em]">Sesi</th>
                  <th className="px-6 py-5 font-bold text-zinc-400 uppercase text-[10px] tracking-[0.2em]">Portal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredStudents.map((student) => {
                  const activePackage = student.packages?.[0];
                  const canManualScan = Boolean(activePackage && activePackage.usedSessions < activePackage.totalSessions);

                  return (
                  <tr key={student.id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-all duration-300">
                    <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => handleOpenModal('view', student)}
                      className="flex w-full items-center gap-3 text-left transition-all hover:text-indigo-600"
                    >
                      <div className="h-11 w-11 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-sm">
                        {student.profileImage ? (
                          <img src={student.profileImage} alt={student.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-black">{student.name.charAt(0)}</div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">{student.name}</div>
                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{student.nickname || 'Tanpa Panggilan'}</div>
                      </div>
                    </button>
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
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openManualMissingScan(student)}
                        disabled={!canManualScan}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-tight text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 dark:disabled:bg-zinc-800"
                        title={canManualScan ? 'Catat missing scan siswa ini' : 'Siswa belum punya paket aktif atau sesi sudah habis'}
                      >
                        <Calendar size={14} />
                        Missing
                      </button>
                      {activePackage && (
                        <p className="mt-1 text-[10px] font-bold text-zinc-400">
                          {activePackage.usedSessions}/{activePackage.totalSessions} {activePackage.program?.name || ''}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {student.parentPhone ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-[10px] font-black uppercase">
                            <ShieldCheck size={12} />
                            Active
                          </span>
                          <button
                            onClick={() => copyParentPortalLink(student)}
                            title="Salin Link Parent Portal"
                            className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all active:scale-90"
                          >
                            <Copy size={14} className="text-zinc-500 hover:text-indigo-600" />
                          </button>
                          {student.parentPhone && (
                            <button
                              onClick={() => openParentWhatsApp(student)}
                              title="Kirim via WhatsApp"
                              className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all active:scale-90"
                            >
                              <MessageSquare size={14} className="text-zinc-500 hover:text-emerald-600" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase">
                          Belum Aktif
                        </span>
                      )}
                    </td>
                </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted-foreground font-medium italic">Tidak ada data siswa ditemukan</p>
          </div>
        )}
      </div>

      {manualScanStudent && (
        <div className="fixed inset-0 z-[130] bg-zinc-950/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[32px] border border-white/50 bg-white/95 p-6 shadow-2xl dark:border-zinc-800/50 dark:bg-zinc-950/95">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Koreksi Missing Scan</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                  {manualScanStudent.name}
                </h2>
                <p className="mt-1 text-sm font-bold text-zinc-500">
                  {manualScanStudent.packages?.[0]?.program?.name || 'Program aktif'} · {manualScanStudent.registrationNo}
                </p>
              </div>
              <button
                onClick={() => setManualScanStudent(null)}
                className="rounded-2xl p-3 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleManualMissingScan} className="space-y-4">
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">
                Sesi akan dicatat sebagai hadir manual dan langsung menambah jumlah sesi terpakai.
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Tanggal & Jam Masuk</label>
                <input
                  type="datetime-local"
                  required
                  value={manualCheckIn}
                  onChange={(event) => setManualCheckIn(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-900 outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Terapis yang Menangani</label>
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
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-700 disabled:cursor-wait disabled:bg-emerald-300"
              >
                <Calendar size={17} />
                {isSubmittingManualScan ? 'Menyimpan...' : 'Simpan & Hitung Sesi'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isParentPortalOpen && (
        <div className="fixed inset-0 z-[120] bg-zinc-950/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-[36px] bg-white/95 dark:bg-zinc-950/95 border border-white/50 dark:border-zinc-800/50 shadow-2xl flex flex-col animate-in zoom-in-95 fade-in duration-300">
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl">
                    <Contact2 size={22} />
                  </div>
                  <h2 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">
                    Parent Portal Active
                  </h2>
                </div>
                <p className="text-sm font-medium text-zinc-500 max-w-2xl">
                  Daftar siswa yang sudah punya kontak orang tua dan siap menerima akses portal untuk melihat kehadiran, sisa sesi, QR, dan histori terapi.
                </p>
              </div>
              <button
                onClick={() => setIsParentPortalOpen(false)}
                className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-8 border-b border-zinc-100 dark:border-zinc-800">
              <div className="p-4 rounded-3xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Portal Aktif</p>
                <p className="text-3xl font-black mt-2">{portalActiveStudents.length}</p>
              </div>
              <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">WhatsApp Ready</p>
                <p className="text-3xl font-black mt-2">{portalActiveStudents.filter((student) => student.parentPhone).length}</p>
              </div>
              <div className="p-4 rounded-3xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">Barcode Ready</p>
                <p className="text-3xl font-black mt-2">{portalActiveStudents.filter((student) => student.qrCode).length}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {portalActiveStudents.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {portalActiveStudents.map((student) => (
                    <div key={student.id} className="p-5 rounded-3xl border border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-sm">
                            {student.profileImage ? (
                              <img src={student.profileImage} alt={student.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center font-black">{student.name.charAt(0)}</div>
                            )}
                          </div>
                          <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-lg tracking-tight text-zinc-900 dark:text-zinc-100">{student.name}</h3>
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-black uppercase">
                              Active
                            </span>
                          </div>
                          <p className="text-xs font-mono text-zinc-400 mt-1">{student.registrationNo}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => copyParentPortalLink(student)}
                          className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                          title="Salin link portal"
                        >
                          <Copy size={16} />
                        </button>
                      </div>

                      <div className="mt-5 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                          <Phone size={14} className="text-emerald-600" />
                          <span className="font-bold">{student.parentPhone || 'WhatsApp belum diisi'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                          <QrCode size={14} className="text-sky-600" />
                          <span className="font-mono font-bold">{student.qrCode}</span>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          onClick={() => openParentWhatsApp(student)}
                          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50 transition-all"
                          disabled={!student.parentPhone}
                        >
                          <MessageSquare size={14} />
                          WhatsApp
                        </button>
                        <Link
                          href={`/students/${student.id}`}
                          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all"
                        >
                          <ExternalLink size={14} />
                          Buka Profil
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-800">
                  <Contact2 size={36} className="mx-auto text-zinc-300 mb-4" />
                  <p className="font-black text-zinc-900 dark:text-zinc-100">Belum ada portal aktif</p>
                  <p className="text-sm text-zinc-500 mt-2">Isi WhatsApp orang tua pada data siswa aktif untuk mengaktifkan portal.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
