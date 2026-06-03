"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { addTherapyPackage } from "@/app/actions/member";
import { createManualMissingScan, deleteAttendanceRecord, updateAttendanceRecord } from "@/app/actions/attendance";
import { downloadBlobFile, downloadTextFile } from "@/lib/download-utils";
import { THERAPIST_NAMES, THERAPY_SCHEDULES } from "@/lib/therapy-options";
import {
  Search,
  Plus,
  Download,
  FileText,
  Zap,
  Users,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  X,
  ExternalLink,
  Calendar,
  User,
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  registrationNo: string;
  diagnosis?: string;
  profileImage?: string;
  program: string;
  schedule: string;
  therapist: string;
  progress: { used: number; total: number };
  status: string;
  lastAttended?: string;
  package?: any;
  attendances?: any[];
}

const KPICard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br ${color}`}
    >
      <div className="absolute inset-0 opacity-10 bg-white/20 backdrop-blur-sm"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="text-white/80 text-sm font-medium">{label}</div>
          <div className="text-white/60">{icon}</div>
        </div>
        <div className="text-3xl font-black text-white tracking-tight">{value}</div>
      </div>
      <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full"></div>
    </div>
  );
};

const AlertBanner = ({ students }: { students: Student[] }) => {
  const almostDone = students.filter((student) => student.status === "hampir-habis");
  const withoutPackage = students.filter((student) => student.status === "belum-paket");
  const neverAttended = students.filter((student) => !student.lastAttended);

  const alerts = [
    almostDone.length > 0
      ? `${almostDone.length} siswa memiliki sisa sesi yang hampir habis`
      : null,
    withoutPackage.length > 0
      ? `${withoutPackage.length} siswa aktif belum memiliki paket terapi`
      : null,
    neverAttended.length > 0
      ? `${neverAttended.length} siswa belum memiliki riwayat kehadiran`
      : null,
  ].filter(Boolean) as string[];

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-8">
      {alerts.map((alert, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/30 backdrop-blur-sm"
        >
          <AlertCircle size={18} className="text-amber-600" />
          <span className="text-sm font-medium text-amber-900 dark:text-amber-200">{alert}</span>
        </div>
      ))}
    </div>
  );
};

const FilterPanel = ({
  filters,
  onFilterChange,
  therapistOptions,
}: {
  filters: any;
  onFilterChange: (key: string, value: string) => void;
  therapistOptions: string[];
}) => {
  const filterGroups = [
    {
      label: "Jam",
      key: "time",
      options: ["Semua Jam", ...THERAPY_SCHEDULES],
    },
    {
      label: "Program",
      key: "program",
      options: ["Semua Program", "ABA", "SI", "Speech", "OT", "Academic"],
    },
    {
      label: "Terapis",
      key: "therapist",
      options: ["Semua Terapis", ...therapistOptions],
    },
    {
      label: "Status",
      key: "status",
      options: ["Semua Status", "Aktif", "Hampir Habis", "Selesai", "Belum Paket"],
    },
  ];

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {filterGroups.map((group) => (
        <select
          key={group.key}
          value={filters[group.key]}
          onChange={(e) => onFilterChange(group.key, e.target.value)}
          className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {group.options.map((opt) => (
            <option key={opt} value={opt}>
              {group.label}: {opt}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
};

const QuickActions = ({
  onAddSession,
  onMissingScan,
  onExportExcel,
  onExportPDF,
}: {
  onAddSession: () => void;
  onMissingScan: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
}) => {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <button
        onClick={onAddSession}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
      >
        <Plus size={18} /> Tambah Sesi
      </button>
      <button
        onClick={onMissingScan}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-md"
      >
        <Calendar size={18} /> Catat Missing Scan
      </button>
      <button
        onClick={() => {
          window.location.href = "/scanner";
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <Zap size={18} /> Scan QR
      </button>
      <button
        onClick={onExportExcel}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <Download size={18} /> Export Excel
      </button>
      <button
        onClick={onExportPDF}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <FileText size={18} /> Export PDF
      </button>
    </div>
  );
};

const filterStudents = (students: Student[], searchQuery: string, filters: Record<string, string>) => {
  const normalizedSearch = searchQuery.toLowerCase();

  return students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(normalizedSearch) ||
      student.registrationNo.toLowerCase().includes(normalizedSearch);
    const matchesProgram =
      filters.program === "Semua Program" ||
      student.program.toLowerCase() === filters.program.toLowerCase();
    const matchesTherapist =
      filters.therapist === "Semua Terapis" || student.therapist === filters.therapist;
    const matchesStatus =
      filters.status === "Semua Status" ||
      (filters.status === "Aktif" && student.status === "aktif") ||
      (filters.status === "Hampir Habis" && student.status === "hampir-habis") ||
      (filters.status === "Selesai" && student.status === "selesai") ||
      (filters.status === "Belum Paket" && student.status === "belum-paket");
    const matchesTime =
      filters.time === "Semua Jam" ||
      student.schedule === filters.time ||
      (filters.time.includes("-") && student.schedule !== "Belum ada jadwal" && isTimeInRange(student.schedule, filters.time));

    return matchesSearch && matchesProgram && matchesTherapist && matchesStatus && matchesTime;
  });
};

const isTimeInRange = (time: string, range: string) => {
  const [start, end] = range.split("-");
  if (!start || !end) return false;
  return time >= start && time <= end;
};

const toCsv = (rows: Array<Record<string, string | number>>) => {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

  return [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ].join("\n");
};

const exportHistoryToCsv = async (student: Student, history: any[]) => {
  if (history.length === 0) {
    toast.error("Belum ada riwayat untuk diekspor");
    return;
  }

  const csv = toCsv(
    history.map((session) => ({
      Tanggal: new Date(session.checkIn).toLocaleDateString("id-ID"),
      Masuk: new Date(session.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      Pulang: session.checkOut
        ? new Date(session.checkOut).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        : "-",
      Program: session.program?.name || "-",
      Terapis: session.teacher?.user?.name || "-",
      Status: session.status || "-",
    }))
  );

  try {
    await downloadTextFile(csv, `riwayat-${student.registrationNo}.csv`, "text/csv;charset=utf-8");
    toast.success("Riwayat berhasil diekspor");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Gagal mengekspor riwayat");
  }
};

const getDateTimeLocalValue = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const getDateTimeLocalFromValue = (value: string | Date) => getDateTimeLocalValue(new Date(value));

function normalizeTeacherNames(data: any) {
  const teachers = Array.isArray(data) ? data : (data.data || []);
  const names = teachers
    .map((teacher: any) => teacher.name || teacher.user?.name)
    .filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 0)
    .map((name: string) => name.trim());

  return Array.from(new Set<string>(names)).sort((a, b) => a.localeCompare(b));
}

const SessionsTable = ({
  students,
  searchQuery,
  filters,
  onRefresh,
  therapistOptions,
}: {
  students: Student[];
  searchQuery: string;
  filters: Record<string, string>;
  onRefresh: () => Promise<void>;
  therapistOptions: string[];
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [manualStudent, setManualStudent] = useState<Student | null>(null);
  const [sessionHistoryOpen, setSessionHistoryOpen] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [manualCheckIn, setManualCheckIn] = useState(getDateTimeLocalValue);
  const [manualTherapistName, setManualTherapistName] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  const filteredStudents = filterStudents(students, searchQuery, filters);

  const openSessionHistory = async (student: Student) => {
    setSelectedStudent(student);
    setSessionHistoryOpen(true);
    setLoadingHistory(true);
    
    try {
      const response = await fetch(`/api/sessions/${student.id}`, { cache: "no-store" });
      const data = await response.json();
      setSessionHistory(data);
    } catch (error) {
      console.error("Error fetching session history:", error);
      setSessionHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const refreshSessionHistory = async () => {
    if (!selectedStudent) return;
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/sessions/${selectedStudent.id}`, { cache: "no-store" });
      const data = await response.json();
      setSessionHistory(Array.isArray(data) ? data : []);
      await onRefresh();
    } catch (error) {
      toast.error("Gagal menyegarkan riwayat sesi");
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aktif":
        return { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", badge: "🟢 Aktif" };
      case "hampir-habis":
        return { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", badge: "🟡 Hampir Habis" };
      case "selesai":
        return { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-300", badge: "🔴 Selesai" };
      case "belum-paket":
        return { bg: "bg-zinc-50 dark:bg-zinc-900/30", text: "text-zinc-700 dark:text-zinc-300", badge: "Belum Paket" };
      default:
        return { bg: "bg-zinc-50 dark:bg-zinc-900/30", text: "text-zinc-700 dark:text-zinc-300", badge: "Status" };
    }
  };

  const getProgressPercentage = (used: number, total: number) => total > 0 ? (used / total) * 100 : 0;

  const openManualScan = (student: Student) => {
    setManualStudent(student);
    setManualCheckIn(getDateTimeLocalValue());
    setManualTherapistName(student.therapist && student.therapist !== "Belum ada terapis" ? student.therapist : therapistOptions[0] || "");
  };

  const handleManualScan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualStudent?.package?.id) {
      toast.error("Siswa belum memiliki paket sesi aktif");
      return;
    }

    setSavingManual(true);
    try {
      const result = await createManualMissingScan(manualStudent.package.id, manualCheckIn, manualTherapistName);

      if (result.success === false) {
        toast.error(result.error || "Gagal mencatat missing scan");
        return;
      }

      toast.success(`Missing scan ${manualStudent.name} berhasil dicatat`);
      setManualStudent(null);
      await onRefresh();
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <>
      <div className="mobile-scroll-x rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200/50 dark:border-zinc-800/50">
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Nama</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Program</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Jadwal</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Terapis</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Progress</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Sisa Sesi</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => {
              const statusStyle = getStatusBadge(student.status);
              const progressPct = getProgressPercentage(student.progress.used, student.progress.total);
              const sessionsLeft = student.progress.total - student.progress.used;

              return (
                <tr
                  key={student.id}
                  className="border-b border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={student.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
                        alt={student.name}
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-zinc-200 dark:ring-zinc-800"
                      />
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium">
                      {student.program}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Clock size={14} />
                      {student.schedule}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">{student.therapist}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 w-8">{progressPct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{sessionsLeft} sesi</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.badge}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-x-2 flex">
                    <button
                      onClick={() => openManualScan(student)}
                      disabled={!student.package || student.progress.used >= student.progress.total}
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:text-zinc-300 disabled:no-underline font-medium text-sm hover:underline transition-colors"
                    >
                      Missing
                    </button>
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium text-sm hover:underline transition-colors"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => openSessionHistory(student)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm hover:underline transition-colors flex items-center gap-1"
                    >
                      <ExternalLink size={14} /> Riwayat
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedStudent && !sessionHistoryOpen && (
        <DetailDrawer student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}

      {manualStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Koreksi Missing Scan</p>
                <h2 className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">{manualStudent.name}</h2>
                <p className="mt-1 text-sm font-medium text-zinc-500">{manualStudent.program} · {manualStudent.therapist}</p>
              </div>
              <button
                onClick={() => setManualStudent(null)}
                className="rounded-xl p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <X size={20} />
              </button>
            </div>

            {manualStudent.progress.used >= manualStudent.progress.total ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                Paket sesi sudah habis. Tambahkan paket baru sebelum mencatat missing scan.
              </div>
            ) : (
              <form onSubmit={handleManualScan} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Tanggal & Jam Masuk</label>
                  <input
                    type="datetime-local"
                    required
                    value={manualCheckIn}
                    onChange={(event) => setManualCheckIn(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 font-bold text-zinc-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Terapis yang Menangani</label>
                  <select
                    required
                    value={manualTherapistName}
                    onChange={(event) => setManualTherapistName(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 font-bold text-zinc-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
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
                  disabled={savingManual}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-300"
                >
                  <Calendar size={17} />
                  {savingManual ? "Menyimpan..." : "Simpan & Hitung Sesi"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {sessionHistoryOpen && selectedStudent && (
        <SessionHistoryWindow
          student={selectedStudent}
          history={sessionHistory}
          loading={loadingHistory}
          therapistOptions={therapistOptions}
          onChanged={refreshSessionHistory}
          onClose={() => {
            setSessionHistoryOpen(false);
            setSessionHistory([]);
          }}
        />
      )}
    </>
  );
};

const SessionHistoryWindow = ({
  student,
  history,
  loading,
  therapistOptions,
  onChanged,
  onClose,
}: {
  student: Student;
  history: any[];
  loading: boolean;
  therapistOptions: string[];
  onChanged: () => Promise<void>;
  onClose: () => void;
}) => {
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editTherapistName, setEditTherapistName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const openEdit = (session: any) => {
    setEditingSession(session);
    setEditCheckIn(getDateTimeLocalFromValue(session.checkIn));
    setEditTherapistName(session.teacher?.user?.name || therapistOptions[0] || "");
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSession) return;

    setIsSavingEdit(true);
    try {
      const result = await updateAttendanceRecord(editingSession.id, editCheckIn, editTherapistName);
      if (result.success === false) {
        toast.error(result.error || "Gagal mengubah riwayat sesi");
        return;
      }
      toast.success("Riwayat sesi diperbarui");
      setEditingSession(null);
      await onChanged();
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (session: any) => {
    if (!window.confirm("Hapus riwayat scan ini? Jumlah sesi terpakai akan dikurangi.")) return;

    setIsDeletingId(session.id);
    try {
      const result = await deleteAttendanceRecord(session.id);
      if (result.success === false) {
        toast.error(result.error || "Gagal menghapus riwayat sesi");
        return;
      }
      toast.success("Riwayat sesi dihapus");
      await onChanged();
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <img
              src={student.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
              alt={student.name}
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-200 dark:ring-indigo-800"
            />
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{student.name}</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{student.registrationNo} • {student.program}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
                  <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">Memuat riwayat sesi...</p>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Calendar className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
              <p className="text-zinc-600 dark:text-zinc-400">Belum ada riwayat sesi</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((session, idx) => {
                const date = new Date(session.checkIn);
                const checkOutTime = session.checkOut ? new Date(session.checkOut) : null;
                const duration = session.duration || 0;

                const statusColor = {
                  PRESENT: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
                  ABSENT: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300",
                  LATE: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
                  EXCUSED: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300",
                };

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">
                              {date.toLocaleDateString("id-ID", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-lg ${
                                statusColor[session.status as keyof typeof statusColor] || statusColor.PRESENT
                              }`}
                            >
                              {session.status === "PRESENT"
                                ? "✓ Hadir"
                                : session.status === "ABSENT"
                                  ? "✗ Tidak Hadir"
                                  : session.status === "LATE"
                                    ? "⏰ Terlambat"
                                    : "📋 Izin"}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-zinc-500 dark:text-zinc-400">Waktu Mulai</span>
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                {date.toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            {checkOutTime && (
                              <div>
                                <span className="text-zinc-500 dark:text-zinc-400">Waktu Selesai</span>
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {checkOutTime.toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            )}
                            <div>
                              <span className="text-zinc-500 dark:text-zinc-400">Durasi</span>
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                {duration > 0 ? `${Math.round(duration)} menit` : "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(session)}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-50 dark:bg-zinc-950 dark:hover:bg-indigo-950/30"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(session)}
                          disabled={isDeletingId === session.id}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:bg-zinc-950 dark:hover:bg-rose-950/30"
                        >
                          {isDeletingId === session.id ? "..." : "Hapus"}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div className="p-2 rounded-lg bg-white dark:bg-black/20">
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs">Program</span>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{session.program?.name}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-black/20">
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs">Terapis</span>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{session.teacher?.user?.name}</p>
                      </div>
                      {session.room && (
                        <div className="p-2 rounded-lg bg-white dark:bg-black/20">
                          <span className="text-zinc-500 dark:text-zinc-400 text-xs">Ruangan</span>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{session.room}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {editingSession && (
          <div className="border-t border-zinc-200/50 bg-white p-5 dark:border-zinc-800/50 dark:bg-zinc-950">
            <form onSubmit={handleEditSubmit} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Tanggal & Jam Scan</label>
                <input
                  type="datetime-local"
                  required
                  value={editCheckIn}
                  onChange={(event) => setEditCheckIn(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 font-bold text-zinc-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Terapis</label>
                <select
                  required
                  value={editTherapistName}
                  onChange={(event) => setEditTherapistName(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 font-bold text-zinc-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Pilih terapis...</option>
                  {therapistOptions.map((therapist) => (
                    <option key={therapist} value={therapist}>
                      {therapist}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isSavingEdit ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 p-4 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={() => exportHistoryToCsv(student, history)}
            className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailDrawer = ({ student, onClose }: { student: Student; onClose: () => void }) => {
  const attendanceHistory = (student.attendances || []).filter((attendance) => attendance?.checkIn);

  const getAttendanceStatus = (status?: string) => {
    switch (status) {
      case "ABSENT":
        return {
          label: "Tidak Hadir",
          className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
        };
      case "LATE":
        return {
          label: "Terlambat",
          className: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
        };
      case "EXCUSED":
        return {
          label: "Izin",
          className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
        };
      case "PRESENT":
      default:
        return {
          label: "Hadir",
          className: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center md:justify-end">
      <div className="w-full md:w-96 bg-white dark:bg-zinc-950 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-screen overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm rounded-t-3xl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Detail Siswa</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center">
            <img
              src={student.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
              alt={student.name}
              className="w-20 h-20 rounded-2xl mb-4 ring-4 ring-indigo-100 dark:ring-indigo-900"
            />
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{student.name}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{student.program}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Program</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{student.program}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Terapis</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{student.therapist}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Jadwal</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{student.schedule}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">Progress</h4>
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-200/50 dark:border-indigo-800/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-indigo-900 dark:text-indigo-300">
                  {student.progress.used} / {student.progress.total} Sesi
                </span>
              </div>
              <div className="h-3 bg-white/50 dark:bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${(student.progress.used / student.progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">Riwayat Kehadiran</h4>
            <div className="space-y-2">
              {attendanceHistory.length > 0 ? (
                attendanceHistory.map((attendance) => {
                  const checkIn = new Date(attendance.checkIn);
                  const status = getAttendanceStatus(attendance.status);

                  return (
                    <div
                      key={attendance.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50"
                    >
                      <div className="min-w-0">
                        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {checkIn.toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                            timeZone: "Asia/Jakarta",
                          })}
                        </span>
                        <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                          {checkIn.toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Jakarta",
                          })}
                          {attendance.teacher?.user?.name ? ` · ${attendance.teacher.user.name}` : ""}
                        </span>
                      </div>
                      <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-lg ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Belum ada scan kehadiran.
                  </p>
                </div>
              )}
            </div>
          </div>

          <button className="w-full px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors">
            Edit Data Siswa
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SessionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [isMissingScanOpen, setIsMissingScanOpen] = useState(false);
  const [missingStudentId, setMissingStudentId] = useState("");
  const [missingCheckIn, setMissingCheckIn] = useState(getDateTimeLocalValue);
  const [missingTherapistName, setMissingTherapistName] = useState("");
  const [isSubmittingMissingScan, setIsSubmittingMissingScan] = useState(false);
  const [therapistOptions, setTherapistOptions] = useState<string[]>(THERAPIST_NAMES);
  const [frequency, setFrequency] = useState(0);
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);
  const [filters, setFilters] = useState({
    time: "Semua Jam",
    program: "Semua Program",
    therapist: "Semua Terapis",
    status: "Semua Status",
  });

  const fetchStudents = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await fetch("/api/sessions", { cache: "no-store" });
      const data = await response.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Gagal memuat data sesi");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchTherapists = async (silent = false) => {
    try {
      const response = await fetch("/api/teachers", { cache: "no-store" });
      if (!response.ok) throw new Error("Gagal memuat data guru");
      const data = await response.json();
      const names = normalizeTeacherNames(data);
      setTherapistOptions(names.length > 0 ? names : THERAPIST_NAMES);
    } catch (error) {
      if (!silent) console.error("Error fetching therapists:", error);
      setTherapistOptions((current) => (current.length > 0 ? current : THERAPIST_NAMES));
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchTherapists();

    const interval = setInterval(() => {
      fetchStudents(true);
      fetchTherapists(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const visibleStudents = filterStudents(students, searchQuery, filters);

  const exportToExcel = async () => {
    if (visibleStudents.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    const XLSX = await import("xlsx");
    const rows = visibleStudents.map((student) => ({
      "Nama Siswa": student.name,
      "No Registrasi": student.registrationNo,
      Program: student.program,
      Jadwal: student.schedule,
      Terapis: student.therapist,
      "Sesi Terpakai": student.progress.used,
      "Total Sesi": student.progress.total,
      "Sisa Sesi": student.progress.total - student.progress.used,
      Status: student.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sesi Terapi");
    const content = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    await downloadBlobFile(
      new Blob([content], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      "sesi-terapi.xlsx"
    );
    toast.success("Excel berhasil diunduh");
  };

  const exportToPDF = async () => {
    if (visibleStudents.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    doc.text("Laporan Sesi Terapi", 14, 16);
    autoTable(doc, {
      startY: 24,
      head: [["Nama", "Program", "Terapis", "Progress", "Sisa", "Status"]],
      body: visibleStudents.map((student) => [
        student.name,
        student.program,
        student.therapist,
        `${student.progress.used}/${student.progress.total}`,
        student.progress.total - student.progress.used,
        student.status,
      ]),
    });
    await downloadBlobFile(doc.output("blob"), "sesi-terapi.pdf");
    toast.success("PDF berhasil diunduh");
  };

  const handleAddSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (frequency <= 0) {
      toast.error("Pilih frekuensi terapi terlebih dahulu");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const studentId = formData.get("studentId") as string;

    if (!studentId) {
      toast.error("Pilih siswa terlebih dahulu");
      return;
    }

    try {
      setIsSubmittingSession(true);
      const result = await addTherapyPackage(studentId, formData);

      if (result.success) {
        toast.success("Paket sesi berhasil diaktifkan");
        setIsAddingSession(false);
        setFrequency(0);
        await fetchStudents();
      } else {
        toast.error(`Gagal: ${"error" in result ? result.error : "Terjadi kesalahan"}`);
      }
    } finally {
      setIsSubmittingSession(false);
    }
  };

  const openMissingScanModal = () => {
    const firstActiveStudent = visibleStudents.find(
      (student) => student.package?.id && student.progress.used < student.progress.total,
    );
    setMissingStudentId(firstActiveStudent?.id || "");
    setMissingCheckIn(getDateTimeLocalValue());
    setMissingTherapistName(
      firstActiveStudent?.therapist && firstActiveStudent.therapist !== "Belum ada terapis"
        ? firstActiveStudent.therapist
        : therapistOptions[0] || "",
    );
    setIsMissingScanOpen(true);
  };

  const handleMissingScan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const student = students.find((item) => item.id === missingStudentId);

    if (!student?.package?.id) {
      toast.error("Pilih siswa yang memiliki paket sesi aktif");
      return;
    }

    if (student.progress.used >= student.progress.total) {
      toast.error("Paket sesi siswa ini sudah habis");
      return;
    }

    try {
      setIsSubmittingMissingScan(true);
      const result = await createManualMissingScan(student.package.id, missingCheckIn, missingTherapistName);

      if (result.success === false) {
        toast.error(result.error || "Gagal mencatat missing scan");
        return;
      }

      toast.success(`Missing scan ${student.name} berhasil dicatat`);
      setIsMissingScanOpen(false);
      setMissingStudentId("");
      await fetchStudents();
    } finally {
      setIsSubmittingMissingScan(false);
    }
  };

  // Calculate metrics
  const totalStudents = students.length;
  const totalSessions = students.reduce((sum, s) => sum + s.progress.total, 0);
  const almostDone = students.filter((s) => s.status === "hampir-habis").length;
  const withoutPackage = students.filter((s) => s.status === "belum-paket").length;

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-2">Sesi Terapi</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Pantau seluruh penggunaan sesi terapi siswa secara realtime.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
              <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
            </div>
            <p className="text-zinc-600 dark:text-zinc-400">Memuat data siswa...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KPICard
              label="Total Siswa"
              value={totalStudents.toString()}
              icon={<Users className="w-5 h-5" />}
              color="from-blue-500 to-blue-600"
            />
            <KPICard
              label="Total Sesi"
              value={totalSessions.toLocaleString("id-ID")}
              icon={<Activity className="w-5 h-5" />}
              color="from-indigo-500 to-indigo-600"
            />
            <KPICard
              label="Hampir Habis"
              value={almostDone.toString()}
              icon={<AlertCircle className="w-5 h-5" />}
              color="from-amber-500 to-amber-600"
            />
            <KPICard
              label="Belum Ada Paket"
              value={withoutPackage.toString()}
              icon={<CheckCircle className="w-5 h-5" />}
              color="from-emerald-500 to-emerald-600"
            />
          </div>

          <AlertBanner students={students} />

          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
              <input
                type="text"
                placeholder="Cari nama siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
              />
            </div>
          </div>

          <QuickActions
            onAddSession={() => setIsAddingSession(true)}
            onMissingScan={openMissingScanModal}
            onExportExcel={exportToExcel}
            onExportPDF={exportToPDF}
          />
          <FilterPanel filters={filters} onFilterChange={handleFilterChange} therapistOptions={therapistOptions} />
          <SessionsTable
            students={students}
            searchQuery={searchQuery}
            filters={filters}
            onRefresh={() => fetchStudents(true)}
            therapistOptions={therapistOptions}
          />

          <div className="mt-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Menampilkan {students.length} siswa • Diperbarui realtime
          </div>
        </>
      )}

      {isMissingScanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200/50 bg-white p-6 shadow-2xl dark:border-zinc-800/50 dark:bg-zinc-950">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Koreksi Sesi</p>
                <h2 className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">Catat Missing Scan</h2>
                <p className="mt-1 text-sm font-medium text-zinc-500">
                  Pilih siswa, tanggal, dan jam masuk agar sesi tetap terhitung.
                </p>
              </div>
              <button
                onClick={() => setIsMissingScanOpen(false)}
                className="rounded-xl p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleMissingScan} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Siswa</label>
                <select
                  required
                  value={missingStudentId}
                  onChange={(event) => {
                    const nextStudent = students.find((item) => item.id === event.target.value);
                    setMissingStudentId(event.target.value);
                    setMissingTherapistName(
                      nextStudent?.therapist && nextStudent.therapist !== "Belum ada terapis"
                        ? nextStudent.therapist
                        : therapistOptions[0] || "",
                    );
                  }}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 font-bold text-zinc-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Pilih siswa...</option>
                  {students
                    .filter((student) => student.package?.id && student.progress.used < student.progress.total)
                    .map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} - {student.program} ({student.progress.used}/{student.progress.total})
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Tanggal & Jam Masuk</label>
                <input
                  type="datetime-local"
                  required
                  value={missingCheckIn}
                  onChange={(event) => setMissingCheckIn(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 font-bold text-zinc-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Terapis yang Menangani</label>
                <select
                  required
                  value={missingTherapistName}
                  onChange={(event) => setMissingTherapistName(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 font-bold text-zinc-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
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
                disabled={isSubmittingMissingScan}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:bg-emerald-300"
              >
                <Calendar size={17} />
                {isSubmittingMissingScan ? "Menyimpan..." : "Simpan & Hitung Sesi"}
              </button>
            </form>
          </div>
        </div>
      )}

      {isAddingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white dark:bg-zinc-950 shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col">
            <div className="p-6 border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Tambah Sesi Terapi</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Aktifkan paket terapi baru untuk siswa.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddingSession(false);
                  setFrequency(0);
                }}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSession} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Siswa</label>
                <select
                  name="studentId"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Pilih siswa...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.registrationNo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Program</label>
                  <select
                    name="programs"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Pilih program...</option>
                    <option value="ABA">ABA</option>
                    <option value="SI">SI</option>
                    <option value="SPEECH">Speech Therapy</option>
                    <option value="OT">Occupational Therapy</option>
                    <option value="ACADEMIC">Academic Support</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Terapis</label>
                  <select
                    name="therapistId"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Pilih terapis...</option>
                    {therapistOptions.map((therapist) => (
                      <option key={therapist} value={therapist}>
                        {therapist}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Jadwal Sesi</label>
                <select
                  name="scheduleTime"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Pilih jadwal...</option>
                  {THERAPY_SCHEDULES.map((schedule) => (
                    <option key={schedule} value={schedule}>
                      {schedule}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Frekuensi Terapi per Minggu</label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFrequency(value)}
                      className={`py-3 rounded-xl text-sm font-black transition-colors ${
                        frequency === value
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {value}x
                    </button>
                  ))}
                </div>
                <input type="hidden" name="frequency" value={frequency} />
                {frequency > 0 && (
                  <p className="text-sm text-zinc-500">
                    Otomatis membuat {frequency}x per minggu, {frequency * 4} sesi per bulan.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingSession(false);
                    setFrequency(0);
                  }}
                  className="px-5 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSession}
                  className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                >
                  {isSubmittingSession ? "Menyimpan..." : "Aktifkan Paket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
