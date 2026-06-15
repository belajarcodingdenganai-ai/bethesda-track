'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  HeartHandshake,
  MessageSquare,
  School,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { IndonesiaMonthCalendar } from '@/components/indonesia-month-calendar';
import { SchoolParentReport } from '@/components/parent-portal/school-parent-report';

type TeacherProfile = {
  name: string;
  role: string;
  focus: string;
  photo?: string | null;
};

const schoolPrograms = [
  {
    title: 'Akademik Dasar',
    description: 'Pengenalan huruf, angka, pre-writing, konsep warna, bentuk, dan lembar kerja bertahap.',
    icon: <BookOpen size={20} />,
  },
  {
    title: 'Bahasa dan Komunikasi',
    description: 'Merespon instruksi, menunjuk pilihan, meminta bantuan, menjawab pertanyaan sederhana.',
    icon: <MessageSquare size={20} />,
  },
  {
    title: 'Sosial dan Regulasi',
    description: 'Duduk bersama, menunggu giliran, transisi aktivitas, serta latihan tangan tenang.',
    icon: <Users size={20} />,
  },
  {
    title: 'Kemandirian Harian',
    description: 'Rutinitas tas, sepatu, cuci tangan, makan/minum, merapikan alat, dan toilet training.',
    icon: <HeartHandshake size={20} />,
  },
];

const weeklySchedule = [
  { day: 'Senin', activity: 'Akademik dasar dan motorik halus', time: '08:00-12:00' },
  { day: 'Selasa', activity: 'Bahasa, komunikasi, dan instruksi kelas', time: '08:00-12:00' },
  { day: 'Rabu', activity: 'Sosial, bermain terarah, dan regulasi emosi', time: '08:00-12:00' },
  { day: 'Kamis', activity: 'Kemandirian harian dan latihan rutinitas', time: '08:00-12:00' },
  { day: 'Jumat', activity: 'Review mingguan, seni, dan aktivitas kelompok', time: '08:00-12:00' },
];

const calendarEvents = [
  { date: 'Setiap Jumat', title: 'Review program mingguan', note: 'Guru merangkum target yang sudah muncul dan target berikutnya.' },
  { date: 'Akhir bulan', title: 'Rekap perkembangan', note: 'Checklist portal diperbarui dari aktivitas belajar dan ProjectFlow.' },
  { date: 'Sesuai kebutuhan', title: 'Konsultasi orang tua', note: 'Jadwal dapat dikonfirmasi melalui admin sekolah.' },
];

const announcements = [
  'Bawakan pakaian ganti dan perlengkapan pribadi anak setiap hari.',
  'Mohon konfirmasi ke admin jika anak sakit, izin, atau membutuhkan penyesuaian jadwal.',
  'Checklist program dapat berubah mengikuti hasil observasi guru dan kebutuhan anak.',
];

const supportTeam = [
  { name: 'Admin Sekolah', role: 'Koordinasi Jadwal', focus: 'Jadwal, izin, pembayaran, dan informasi umum.', photo: null },
  { name: 'Tim Program', role: 'Monitoring Program', focus: 'Sinkronisasi target belajar dan checklist perkembangan.', photo: null },
];

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'RB';
}

export default function SchoolParentPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchParentPortal();

    const handleFocus = () => {
      fetchParentPortal(true);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [token]);

  const fetchParentPortal = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await fetch(`/api/parent-portal/school/${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Link parent portal sekolah tidak valid.');
      }

      setStudent(data.student);
      setError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memuat parent portal sekolah.';
      setError(message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-sky-100 border-t-sky-600 animate-spin" />
          <p className="font-bold text-zinc-500">Memuat Parent Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6">
        <div className="max-w-md rounded-[30px] bg-white border border-sky-100 p-8 text-center shadow-xl shadow-sky-100">
          <ShieldCheck size={36} className="mx-auto mb-4 text-zinc-300" />
          <h1 className="text-2xl font-black tracking-tight text-zinc-950">Link Tidak Valid</h1>
          <p className="mt-3 text-sm font-medium text-zinc-500">
            {error || 'Silakan minta link Parent Portal terbaru dari admin Rumah Bethesda.'}
          </p>
        </div>
      </div>
    );
  }

  const checklist = student.programChecklist;
  const teacherName = student.teacherProfile?.name || student.schoolTeacherName || 'ESTER WARUWU';
  const teacherPhoto = student.teacherProfile?.profileImage;
  const teacherInitials = getInitials(teacherName);
  const schoolSchedule = student.schoolSchedule || '08:00-12:00';
  const checklistSummary = checklist?.summary;
  const teacherProfiles: TeacherProfile[] = [
    {
      name: teacherName,
      role: 'Guru Pendamping Utama',
      focus: 'Pendampingan kelas, observasi harian, dan update target belajar anak.',
      photo: teacherPhoto,
    },
    ...supportTeam,
  ];
  const adminWhatsAppNumber = '6285280039953';
  const adminWhatsAppMessage = encodeURIComponent(`Halo Admin Rumah Bethesda, saya ingin bertanya mengenai portal sekolah untuk ${student.name}.`);
  const adminWhatsAppHref = `https://wa.me/${adminWhatsAppNumber}?text=${adminWhatsAppMessage}`;

  return (
    <div className="min-h-screen bg-sky-50 text-zinc-950">
      <div className="sticky top-0 z-30 border-b border-sky-100 bg-white/95 shadow-sm shadow-sky-100 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-sky-100">
              <Image src="/brand/rumah-bethesda-logo.png" alt="Rumah Bethesda" width={48} height={48} className="h-full w-full object-cover" priority />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-600">School Parent Portal</p>
              <h1 className="truncate text-base font-black tracking-tight sm:text-xl">Rumah Bethesda</h1>
            </div>
          </div>
          <a
            href={adminWhatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 transition-colors hover:bg-sky-100 sm:flex"
          >
            <MessageSquare size={16} />
            Hubungi Sekolah
          </a>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-8">
        <section>
          <div className="overflow-hidden rounded-[28px] border border-sky-100 bg-white p-5 shadow-sm sm:p-8">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] lg:items-start">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-gradient-to-br from-sky-500 to-emerald-400 text-3xl font-black text-white shadow-lg shadow-sky-500/20 sm:h-28 sm:w-28">
                  {student.profileImage ? (
                    <img src={student.profileImage} alt={student.name} className="h-full w-full object-cover" />
                  ) : (
                    student.name?.charAt(0)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">Siswa Sekolah</p>
                  <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">{student.name}</h2>
                  <p className="mt-2 text-sm font-bold text-zinc-500">{student.registrationNo}</p>
                </div>
              </div>

              <IndonesiaMonthCalendar className="w-full max-w-[320px] justify-self-end" theme="sky" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <InfoTile icon={<Clock size={20} />} label="Jam Sekolah" value={schoolSchedule} />
              <InfoTile icon={<CalendarDays size={20} />} label="Hari Aktif" value="Senin-Jumat" />
              <InfoTile icon={<ShieldCheck size={20} />} label="Progress" value={`${checklistSummary?.percentage || 0}% selesai`} />
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.75fr]">
          <div className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <School size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Program Saat Ini</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-zinc-500">
                  Informasi sekolah aktif anak di Rumah Bethesda.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Program</p>
                <p className="mt-2 text-lg font-black text-zinc-950">Sekolah</p>
              </div>
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Checklist</p>
                <p className="mt-2 text-lg font-black text-zinc-950">
                  {checklistSummary?.done || 0}/{checklistSummary?.total || 0} target
                </p>
              </div>
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 sm:col-span-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Guru</p>
                <div className="mt-2 flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-sky-600 text-xs font-black text-white shadow-sm">
                    {teacherPhoto ? (
                      <img src={teacherPhoto} alt={teacherName} className="h-full w-full object-cover" />
                    ) : (
                      teacherInitials
                    )}
                  </div>
                  <p className="min-w-0 truncate text-lg font-black text-zinc-950">{teacherName}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {schoolPrograms.map((program) => (
                <ProgramCard key={program.title} {...program} />
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[28px] bg-zinc-900 p-5 text-white shadow-sm sm:p-7">
              <div className="flex items-center gap-2 text-sky-300">
                <MessageSquare size={18} />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Butuh Bantuan?</p>
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-zinc-300">
                Hubungi admin sekolah untuk perubahan jadwal, konfirmasi sesi, atau pertanyaan paket.
              </p>
              <a
                href={adminWhatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black uppercase tracking-widest text-zinc-900 transition-all hover:bg-sky-50"
              >
                <MessageSquare size={16} />
                Hubungi Admin
              </a>
            </div>

            <AnnouncementList />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-sm sm:p-7">
            <SectionHeader
              icon={<GraduationCap size={22} />}
              label="Guru dan Tim"
              title="Pendamping Sekolah"
              description="Orang tua dapat melihat guru utama dan tim yang mendukung proses belajar anak."
            />
            <div className="mt-5 space-y-3">
              {teacherProfiles.map((teacher) => (
                <TeacherCard key={`${teacher.name}-${teacher.role}`} teacher={teacher} />
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-sm sm:p-7">
            <SectionHeader
              icon={<CalendarCheck size={22} />}
              label="Kalender Sekolah"
              title="Jadwal dan Agenda"
              description="Ringkasan kegiatan rutin, agenda komunikasi, dan kalender bulan berjalan."
            />
            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(250px,1fr)]">
              <ScheduleList />
              <div className="space-y-3">
                {calendarEvents.map((event) => (
                  <div key={event.title} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">{event.date}</p>
                    <h4 className="mt-2 text-sm font-black text-zinc-950">{event.title}</h4>
                    <p className="mt-2 text-xs font-semibold leading-5 text-zinc-500">{event.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <SchoolParentReport checklist={checklist} studentName={student.name} />
      </main>
    </div>
  );
}

function SectionHeader({
  icon,
  label,
  title,
  description,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">{label}</p>
        <h3 className="mt-1 text-xl font-black tracking-tight">{title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function ProgramCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center gap-2 text-sky-700">
        {icon}
        <h4 className="text-sm font-black text-zinc-950">{title}</h4>
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-zinc-500">{description}</p>
    </div>
  );
}

function TeacherCard({ teacher }: { teacher: TeacherProfile }) {
  return (
    <div className="flex gap-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-sky-600 text-sm font-black text-white shadow-sm">
        {teacher.photo ? (
          <img src={teacher.photo} alt={teacher.name} className="h-full w-full object-cover" />
        ) : (
          getInitials(teacher.name)
        )}
      </div>
      <div className="min-w-0">
        <h4 className="truncate text-base font-black text-zinc-950">{teacher.name}</h4>
        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-sky-600">{teacher.role}</p>
        <p className="mt-2 text-xs font-semibold leading-5 text-zinc-500">{teacher.focus}</p>
      </div>
    </div>
  );
}

function ScheduleList() {
  return (
    <div className="space-y-2">
      {weeklySchedule.map((item) => (
        <div key={item.day} className="grid grid-cols-[70px_minmax(0,1fr)] gap-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-3">
          <div>
            <p className="text-sm font-black text-zinc-950">{item.day}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-sky-600">{item.time}</p>
          </div>
          <p className="text-xs font-semibold leading-5 text-zinc-500">{item.activity}</p>
        </div>
      ))}
    </div>
  );
}

function AnnouncementList() {
  return (
    <div className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2 text-sky-700">
        <Bell size={18} />
        <h3 className="text-sm font-black uppercase tracking-widest">Pengumuman</h3>
      </div>
      <div className="mt-4 space-y-3">
        {announcements.map((announcement) => (
          <div key={announcement} className="flex gap-2 text-sm font-semibold leading-6 text-zinc-600">
            <CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-500" />
            <p>{announcement}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-sky-100 bg-sky-50 p-4">
      <div className="flex items-center gap-2 text-sky-700">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
      </div>
      <p className="mt-3 text-lg font-black">{value}</p>
    </div>
  );
}
