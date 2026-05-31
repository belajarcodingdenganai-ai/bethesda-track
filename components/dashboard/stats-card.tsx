import { AlertCircle, Users, UserCheck, Zap, TrendingUp, CheckCircle2 } from 'lucide-react';

interface StatsData {
  totalStudents: number;
  totalTeachers: number;
  todayAttendance: number;
  attendanceRate: number;
  warningSessions: number;
  completedThisMonth: number;
}

export function StatsCards({ data }: { data: StatsData }) {
  const stats = [
    {
      label: 'Total Siswa Aktif',
      value: data.totalStudents,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    {
      label: 'Total Guru',
      value: data.totalTeachers,
      icon: UserCheck,
      color: 'bg-green-500/10 text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    {
      label: 'Kehadiran Hari Ini',
      value: data.todayAttendance,
      icon: CheckCircle2,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
    },
    {
      label: 'Tingkat Kehadiran',
      value: `${data.attendanceRate}%`,
      icon: TrendingUp,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-200 dark:border-purple-800',
    },
    {
      label: 'Sesi Hampir Habis',
      value: data.warningSessions,
      icon: AlertCircle,
      color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      borderColor: 'border-orange-200 dark:border-orange-800',
    },
    {
      label: 'Paket Selesai Bulan Ini',
      value: data.completedThisMonth,
      icon: Zap,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={i}
            className={`p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 ${stat.borderColor} shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                <Icon size={24} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
