'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Users,
  Activity,
  Download,
  FileText,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCcw,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { getReportData, getDashboardStats } from '@/app/actions/attendance';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);

    const handleFocus = () => {
      fetchData(true);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [reportRes, statsRes] = await Promise.all([
        getReportData(),
        getDashboardStats()
      ]);

      if (reportRes.success) setReportData(reportRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (error) {
      if (!silent) toast.error('Gagal memuat data laporan');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-600 dark:from-white dark:to-zinc-400">
            Analytics
          </h1>
          <p className="text-zinc-500 text-lg font-medium italic mt-2">Visualisasi data kehadiran dan performa program.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchData()} className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-3xl hover:bg-zinc-200 transition-all">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="flex items-center gap-2 px-6 py-4 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-3xl font-black text-xs uppercase tracking-widest hover-lift shadow-xl">
            <Download size={18} /> Export Laporan
          </button>
        </div>
      </div>

      {/* KPI Overlays */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportKPI
          label="Tingkat Kehadiran"
          value="94.2%"
          change="+2.4%"
          trend="up"
          icon={<CheckCircle2 size={24} />}
          color="emerald"
        />
        <ReportKPI
          label="Total Sesi Bulan Ini"
          value={stats?.totalTherapyToday * 20 || 450}
          change="+12%"
          trend="up"
          icon={<Activity size={24} />}
          color="indigo"
        />
        <ReportKPI
          label="Siswa Baru"
          value={stats?.totalStudents || 0}
          change="+5"
          trend="up"
          icon={<Users size={24} />}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Attendance Chart Placeholder */}
        <div className="p-8 glass-card rounded-[40px] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-600" />
              Tren Kehadiran 7 Hari
            </h3>
            <select className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none">
              <option>Minggu Ini</option>
              <option>Minggu Lalu</option>
            </select>
          </div>

          <div className="h-64 flex items-end justify-between gap-2 px-4">
            {reportData?.dailyAttendance?.map((day: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                <div className="w-full relative">
                   <div
                    className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-2xl transition-all duration-1000 group-hover:brightness-110 group-hover:shadow-lg group-hover:shadow-indigo-500/20"
                    style={{ height: `${(day.count / 10) * 100}%`, minHeight: '20px' }}
                   />
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all font-black text-xs">
                     {day.count}
                   </div>
                </div>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">
                  {format(new Date(day.date), 'EEE', { locale: id })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Program Distribution */}
        <div className="p-8 glass-card rounded-[40px] space-y-6">
          <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
            <PieChart size={20} className="text-emerald-600" />
            Distribusi Program
          </h3>

          <div className="space-y-6">
            {reportData?.programDistribution?.map((prog: any, i: number) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-500">{prog.name}</span>
                  <span className="text-sm font-black">{prog.count} Sesi</span>
                </div>
                <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${(prog.count / 20) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Teacher Performance (Phase 12) */}
      <div className="p-8 glass-card rounded-[40px] space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tight">Performa Terapis & Staf</h3>
          <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">Lihat Semua</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats?.teacherAttendance?.slice(0, 4).map((teacher: any, i: number) => (
            <div key={i} className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg mb-4">
                {teacher.user.name.charAt(0)}
              </div>
              <h4 className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{teacher.user.name}</h4>
              <p className="text-[10px] font-bold text-zinc-400 uppercase mb-4">{teacher.division}</p>
              <div className="flex justify-between items-center text-[10px] font-black">
                <span className="text-emerald-600">98% Ontime</span>
                <span className="text-zinc-400">24 Sesi/Minggu</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportKPI({ label, value, change, trend, icon, color }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600'
  };

  return (
    <div className="p-8 glass-card rounded-[32px] hover-lift group">
      <div className={`p-4 w-fit rounded-2xl mb-6 ${colors[color]}`}>
        {icon}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-4xl font-black tracking-tighter mb-1">{value}</div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</p>
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </div>
      </div>
    </div>
  );
}
