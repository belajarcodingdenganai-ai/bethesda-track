'use client';

import { useEffect, useState } from 'react';
import { Search, Filter, Download, Plus, CreditCard, AlertCircle, CheckCircle2, History, User, BookOpen, X, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getTherapyPackages, addTherapyPackage } from '@/app/actions/member';
import { getAttendanceHistory } from '@/app/actions/attendance';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { THERAPIST_NAMES, THERAPY_SCHEDULES } from '@/lib/therapy-options';

export default function TherapyPackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [frequency, setFrequency] = useState(0);

  useEffect(() => {
    fetchPackages();
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students', { cache: 'no-store' });
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
      if (result.success) {
        setPackages(result.data);
      } else {
        toast.error('Gagal mengambil data paket');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    const matchesSearch = pkg.student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || pkg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openDetail = async (pkg: any) => {
    setSelectedPkg(pkg);
    setIsDrawerOpen(true);
    setAttendanceHistory([]);

    try {
      const result = await getAttendanceHistory(pkg.id);
      if (result.success) {
        setAttendanceHistory(result.data);
      }
    } catch (error) {
      toast.error('Gagal memuat riwayat kehadiran');
    }
  };

  const handleAddSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (frequency === 0) {
      return toast.error('Pilih frekuensi terapi (1x - 5x)');
    }

    const formData = new FormData(e.currentTarget);
    const studentId = formData.get('studentId') as string;
    
    if (!studentId) {
      return toast.error('Pilih siswa dari daftar terlebih dahulu');
    }

    const result = await addTherapyPackage(studentId, formData);
    if (result.success) {
      toast.success('Paket sesi berhasil diaktifkan');
      setIsAddingSession(false);
      fetchPackages();
    } else {
      toast.error(`Gagal: ${'error' in result ? result.error : 'Terjadi kesalahan'}`);
    }
  };

  const stats = {
    active: packages.filter(p => p.status === 'ACTIVE').length,
    warning: packages.filter(p => p.status === 'WARNING').length,
    completed: packages.filter(p => p.status === 'COMPLETED').length
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-600 dark:from-white dark:to-zinc-400">Manajemen Sesi</h1>
          <p className="text-zinc-500 text-lg mt-2 font-medium italic">Pantau penggunaan kuota terapi dan siklus paket siswa.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-4 text-sm font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl hover-lift shadow-xl active:scale-95 transition-all">
            <Download size={18} /> Ekspor
          </button>
          <button onClick={() => setIsAddingSession(true)} className="flex items-center gap-2 px-8 py-4 text-sm font-bold bg-indigo-600 text-white rounded-3xl hover-lift shadow-2xl shadow-indigo-500/30 active:scale-95 transition-all">
            <Plus size={18} strokeWidth={3} /> Paket Baru
          </button>
        </div>
      </div>

      {/* Stats Mini Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 glass-card rounded-[32px] flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl"><CheckCircle2 size={24} /></div>
          <div>
            <div className="text-2xl font-black">{stats.active}</div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Paket Aktif</div>
          </div>
        </div>
        <div className="p-6 glass-card rounded-[32px] flex items-center gap-4 border-amber-500/20 bg-amber-50/30">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl"><AlertCircle size={24} /></div>
          <div>
            <div className="text-2xl font-black text-amber-700">{stats.warning}</div>
            <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Hampir Habis</div>
          </div>
        </div>
        <div className="p-6 glass-card rounded-[32px] flex items-center gap-4">
          <div className="p-3 bg-zinc-500/10 text-zinc-600 rounded-2xl"><History size={24} /></div>
          <div>
            <div className="text-2xl font-black">{stats.completed}</div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Selesai</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 p-3 glass-card rounded-[32px]">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder="Cari nama siswa..."
            className="w-full pl-12 pr-4 py-3.5 bg-transparent border-none outline-none text-lg font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-8 py-3.5 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border-none outline-none font-bold text-sm cursor-pointer hover:bg-zinc-100 transition-colors"
        >
          <option value="ALL">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="WARNING">Hampir Habis</option>
          <option value="COMPLETED">Selesai</option>
        </select>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full p-20 text-center">
             <div className="inline-block w-10 h-10 border-[3px] border-indigo-500/10 border-t-indigo-600 rounded-full animate-spin mb-4" />
             <p className="text-zinc-400 font-bold tracking-widest text-[10px] uppercase">Memuat Data Sesi...</p>
          </div>
        ) : filteredPackages.map((pkg) => (
          <div key={pkg.id} onClick={() => openDetail(pkg)} className="p-8 glass-card rounded-[40px] hover-lift group border border-white/50 dark:border-zinc-800/50 cursor-pointer transition-all">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-xl group-hover:scale-110 transition-transform duration-500">
                  {pkg.student.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">{pkg.student.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-black uppercase tracking-wider text-zinc-500">{pkg.program.name}</span>
                    <span className="text-zinc-300">•</span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{pkg.frequency}x Seminggu</span>
                  </div>
                </div>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${
                pkg.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : 
                pkg.status === 'WARNING' ? 'bg-amber-500 text-white animate-pulse' : 
                'bg-zinc-400 text-white'
              }`}>
                {pkg.status === 'ACTIVE' ? 'Aktif' : pkg.status === 'WARNING' ? 'Limit' : 'Selesai'}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Progres Sesi</p>
                  <div className="text-3xl font-black tabular-nums tracking-tighter">
                    {pkg.usedSessions} <span className="text-zinc-300 text-xl">/ {pkg.totalSessions}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Sisa Sesi</p>
                  <p className={`text-xl font-black ${pkg.totalSessions - pkg.usedSessions <= 2 ? 'text-amber-600' : 'text-indigo-600'}`}>
                    {pkg.totalSessions - pkg.usedSessions} Sesi
                  </p>
                </div>
              </div>
              
              {/* Visual Progress Bar */}
              <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full transition-all duration-1000 ease-out rounded-full ${
                    pkg.status === 'WARNING' ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 
                    pkg.status === 'COMPLETED' ? 'bg-zinc-400' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                  }`}
                  style={{ width: `${Math.min((pkg.usedSessions / pkg.totalSessions) * 100, 100)}%` }}
                />
              </div>

              <div className="pt-4 flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>Mulai: {format(new Date(pkg.createdAt), 'dd MMM yyyy')}</span>
                {pkg.endDate && <span>Berakhir: {format(new Date(pkg.endDate), 'dd MMM yyyy')}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

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
                <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest border-b border-zinc-100 pb-2">Riwayat Scan Anak</h3>
                <div className="space-y-3">
                  {attendanceHistory.length > 0 ? (
                    attendanceHistory.map((att: any) => (
                      <div key={att.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{format(new Date(att.checkIn), 'dd MMMM yyyy', { locale: id })}</p>
                          <p className="text-[10px] font-medium text-zinc-400">Terapis: {att.teacher?.user?.name || 'Staf'}</p>
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

      {/* Modal Tambah Paket */}
      {isAddingSession && (
        <div className="fixed inset-0 bg-zinc-950/20 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-3xl w-full max-w-2xl rounded-[40px] shadow-2xl border border-white/40 dark:border-zinc-800/50 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-500">
            <div className="p-10 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="space-y-1">
                <h2 className="text-3xl font-black tracking-tighter">Tambah Paket Sesi</h2>
                <p className="text-zinc-500 text-sm font-medium">Aktifkan paket terapi baru untuk siswa.</p>
              </div>
              <button onClick={() => setIsAddingSession(false)} className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10">
              <form id="add-package-form" onSubmit={handleAddSession} className="space-y-8">
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
                      {THERAPIST_NAMES.map((therapist) => (
                        <option key={therapist} value={therapist}>{therapist}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-widest">Jadwal Sesi</label>
                  <select name="scheduleTime" required className="form-input-pro">
                    <option value="">Pilih Jam...</option>
                    {THERAPY_SCHEDULES.map((schedule) => (
                      <option key={schedule} value={schedule}>{schedule}</option>
                    ))}
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
                    <p className="text-[10px] font-bold text-zinc-400 italic ml-4">Otomatis: {frequency}x/minggu, {frequency * 4} sesi/bulan</p>
                  )}
                </div>
              </form>
            </div>

            <div className="p-10 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button type="submit" form="add-package-form" className="px-10 py-5 rounded-[24px] bg-indigo-600 text-white font-black shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest text-[10px]">
                Aktifkan Paket
              </button>
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
