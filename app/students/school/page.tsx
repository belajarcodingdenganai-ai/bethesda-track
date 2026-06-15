"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Camera, Copy, Edit2, ExternalLink, ImageUp, Plus, School, Search, UserRound, X, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import MemberQrCard from "@/components/qr/member-qr-card";
import StudentTrackTabs from "@/components/student-track-tabs";

type SchoolStudent = {
  id: string;
  registrationNo: string;
  name: string;
  nickname?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  address?: string | null;
  diagnosis?: string | null;
  schoolTeacherName?: string | null;
  profileImage?: string | null;
  qrCode: string;
};

type TeacherOption = {
  id: string;
  name: string;
};

function createSlug(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "anak";
}

function getDateInputValue(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

function getAgeText(value?: string | null) {
  if (!value) return "";
  const birth = new Date(value);
  const now = new Date();
  let years = now.getFullYear() - birth.getUTCFullYear();
  let months = now.getMonth() - birth.getUTCMonth();
  if (now.getDate() < birth.getUTCDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `Usia: ${Math.max(years, 0)} Tahun ${Math.max(months, 0)} Bulan`;
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S";
}

function getSchoolParentPortalUrl(name: string) {
  if (typeof window === "undefined") return `/parent-portal/school/${createSlug(name)}`;
  return `${window.location.origin}/parent-portal/school/${createSlug(name)}`;
}

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function SchoolStudentsPage() {
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<SchoolStudent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePreview, setProfilePreview] = useState("");
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarX, setAvatarX] = useState(0);
  const [avatarY, setAvatarY] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ x: number; y: number; avatarX: number; avatarY: number } | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/students/school");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat siswa sekolah");
      setStudents(data.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat siswa sekolah");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch("/api/teachers");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat data guru");

      const names: string[] = (data.data || [])
        .map((teacher: any) => teacher.name || teacher.user?.name)
        .filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 0)
        .map((name: string) => name.toUpperCase());

      setTeacherOptions(
        Array.from(new Set(names))
          .sort((a, b) => a.localeCompare(b))
          .map((name) => ({ id: name, name })),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat pilihan guru");
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchTeachers();
  }, []);

  const filteredStudents = useMemo(() => {
    const normalized = searchQuery.toLowerCase();
    return students.filter((student) =>
      student.name.toLowerCase().includes(normalized) ||
      student.registrationNo.toLowerCase().includes(normalized) ||
      student.qrCode.toLowerCase().includes(normalized),
    );
  }, [searchQuery, students]);

  const openModal = (mode: "add" | "edit" | "view", student?: SchoolStudent) => {
    setModalMode(mode);
    setSelectedStudent(student || null);
    setProfilePreview(student?.profileImage || "");
    setAvatarZoom(1);
    setAvatarX(0);
    setAvatarY(0);
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedStudent(null);
    setProfilePreview("");
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setProfilePreview(await readImageFile(file));
      setAvatarZoom(1);
      setAvatarX(0);
      setAvatarY(0);
    } catch {
      toast.error("Gagal membaca foto");
    }
  };

  const buildAvatarImage = async () => {
    if (!profilePreview) return modalMode === "edit" ? undefined : null;
    const image = new Image();
    image.src = profilePreview;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return profilePreview;
    ctx.fillStyle = "#e0f2fe";
    ctx.fillRect(0, 0, 512, 512);
    const scale = Math.max(512 / image.width, 512 / image.height) * avatarZoom;
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (512 - width) / 2 + avatarX;
    const y = (512 - height) / 2 + avatarY;
    ctx.drawImage(image, x, y, width, height);
    return canvas.toDataURL("image/jpeg", 0.88);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    if (!name) return toast.error("Nama siswa wajib diisi");

    try {
      setIsSubmitting(true);
      const profileImage = await buildAvatarImage();
      const payload: any = {
        id: selectedStudent?.id,
        name,
        nickname: formData.get("nickname") || null,
        gender: formData.get("gender") || null,
        dateOfBirth: formData.get("dateOfBirth") || null,
        parentPhone: formData.get("parentPhone") || null,
        address: formData.get("address") || null,
        diagnosis: formData.get("diagnosis") || null,
        schoolTeacherName: formData.get("schoolTeacherName") || "ESTER WARUWU",
      };

      if (profileImage !== undefined) {
        payload.profileImage = profileImage;
      }
      const response = await fetch("/api/students/school", {
        method: modalMode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan siswa sekolah");
      toast.success(modalMode === "edit" ? "Data siswa sekolah diperbarui" : "Siswa sekolah berhasil ditambahkan");
      setSelectedStudent(data);
      setModalMode("view");
      await fetchStudents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan siswa sekolah");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPortalLink = async (student: SchoolStudent) => {
    await navigator.clipboard.writeText(getSchoolParentPortalUrl(student.name));
    toast.success("Link parent portal sekolah disalin");
  };

  const avatarStyle = {
    transform: `translate(${avatarX}px, ${avatarY}px) scale(${avatarZoom})`,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <StudentTrackTabs />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 md:text-5xl">Data Siswa - Sekolah</h1>
          <p className="mt-2 text-base font-medium text-zinc-500 dark:text-zinc-400">Data sekolah jam 08:00-12:00, terpisah dari data siswa terapi dan tanpa sesi.</p>
        </div>
        <button type="button" onClick={() => openModal("add")} className="inline-flex items-center justify-center gap-2 rounded-3xl bg-sky-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-sky-500/20 transition-all hover:bg-sky-700">
          <Plus size={18} /> Tambah Siswa Sekolah
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total Siswa" value={students.length.toString()} icon={<School size={20} />} />
        <SummaryCard label="Jam Sekolah" value="08:00-12:00" icon={<BookOpen size={20} />} />
        <SummaryCard label="Portal Parent" value={`${students.length} link`} icon={<ExternalLink size={20} />} />
      </div>

      <div className="rounded-[32px] border border-zinc-200 bg-white shadow-xl shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
        <div className="border-b border-zinc-100 p-5 dark:border-zinc-800 md:p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Cari siswa sekolah..." className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-sm font-bold text-zinc-900 outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" />
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full p-10 text-center text-sm font-black uppercase tracking-widest text-zinc-400">Memuat siswa sekolah...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="col-span-full p-12 text-center">
              <School size={30} className="mx-auto text-sky-600" />
              <h2 className="mt-5 text-xl font-black text-zinc-950 dark:text-zinc-50">Belum Ada Data</h2>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div key={student.id} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                <button type="button" onClick={() => openModal("view", student)} className="flex w-full items-center gap-3 text-left">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-sky-600 text-lg font-black text-white">
                    {student.profileImage ? <img src={student.profileImage} alt={student.name} className="h-full w-full object-cover" /> : getInitials(student.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-zinc-950 dark:text-zinc-50">{student.name}</p>
                    <p className="mt-1 font-mono text-xs font-bold text-zinc-500">{student.registrationNo} · {student.qrCode}</p>
                  </div>
                </button>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => copyPortalLink(student)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-black text-zinc-700 shadow-sm transition-all hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
                    <Copy size={14} /> Link
                  </button>
                  <a href={`/parent-portal/school/${createSlug(student.name)}`} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-3 py-3 text-xs font-black text-white transition-all hover:bg-sky-700">
                    <ExternalLink size={14} /> Portal
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/30 p-3 backdrop-blur-md">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-5 dark:border-zinc-800">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">Siswa Sekolah</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">{modalMode === "add" ? "Tambah Siswa Sekolah" : modalMode === "edit" ? "Edit Siswa Sekolah" : selectedStudent?.name}</h2>
              </div>
              <button type="button" onClick={closeModal} className="rounded-2xl p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto p-5">
              {modalMode === "view" && selectedStudent ? (
                <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                  <div className="space-y-4">
                    <MemberQrCard name={selectedStudent.name} registrationNo={selectedStudent.registrationNo} qrCode={selectedStudent.qrCode} roleLabel="Siswa Sekolah" />
                    <button type="button" onClick={() => openModal("edit", selectedStudent)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-4 text-sm font-black uppercase tracking-widest text-white">
                      <Edit2 size={16} /> Edit
                    </button>
                    <button type="button" onClick={closeModal} className="flex w-full items-center justify-center rounded-2xl bg-zinc-100 px-5 py-4 text-sm font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200">
                      Tutup
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailField label="Nama Lengkap" value={selectedStudent.name} />
                    <DetailField label="Nama Panggilan" value={selectedStudent.nickname || "-"} />
                    <DetailField label="Gender" value={selectedStudent.gender || "-"} />
                    <DetailField label="Tanggal Lahir" value={`${formatDate(selectedStudent.dateOfBirth)}${selectedStudent.dateOfBirth ? `\n${getAgeText(selectedStudent.dateOfBirth)}` : ""}`} />
                    <DetailField label="WhatsApp Orang Tua" value={selectedStudent.parentPhone || "-"} />
                    <DetailField label="Alamat Rumah" value={selectedStudent.address || "-"} />
                    <DetailField label="Diagnosis" value={selectedStudent.diagnosis || "-"} />
                    <DetailField label="Nama Guru" value={selectedStudent.schoolTeacherName || "ESTER WARUWU"} />
                    <DetailField label="Registrasi" value={selectedStudent.registrationNo} mono />
                    <DetailField label="Barcode" value={selectedStudent.qrCode} mono />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SchoolInput name="name" label="Nama Lengkap" defaultValue={selectedStudent?.name} required />
                    <SchoolInput name="nickname" label="Nama Panggilan" defaultValue={selectedStudent?.nickname || ""} />
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">Gender</label>
                      <select name="gender" defaultValue={selectedStudent?.gender || ""} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-sky-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                        <option value="">Pilih...</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>
                    <SchoolInput name="dateOfBirth" label="Tanggal Lahir" type="date" defaultValue={getDateInputValue(selectedStudent?.dateOfBirth)} />
                    <SchoolInput name="parentPhone" label="WhatsApp Orang Tua" defaultValue={selectedStudent?.parentPhone || ""} />
                    <SchoolInput name="address" label="Alamat Rumah" defaultValue={selectedStudent?.address || ""} />
                    <SchoolInput name="diagnosis" label="Diagnosis" defaultValue={selectedStudent?.diagnosis || ""} />
                    <TeacherSelect
                      name="schoolTeacherName"
                      label="Nama Guru"
                      defaultValue={selectedStudent?.schoolTeacherName || "ESTER WARUWU"}
                      options={teacherOptions}
                    />
                    <div className="sm:col-span-2 rounded-3xl bg-zinc-50 p-4 dark:bg-zinc-950/50">
                      <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Identitas otomatis</p>
                      <p className="mt-2 text-sm font-semibold text-zinc-500">Sistem membuat nomor registrasi dan barcode setelah data disimpan.</p>
                      {selectedStudent && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <DetailField label="Registrasi" value={selectedStudent.registrationNo} mono />
                          <DetailField label="Barcode" value={selectedStudent.qrCode} mono />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                      <div className="flex items-start gap-2">
                        <Camera size={18} className="mt-0.5 text-sky-600" />
                        <div>
                          <p className="text-sm font-black">Edit Avatar Kotak</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-zinc-500">Upload, zoom, dan geser foto sebelum disimpan.</p>
                        </div>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                      <div
                        className="relative mx-auto mt-4 h-44 w-44 touch-none overflow-hidden rounded-[24px] bg-gradient-to-br from-sky-500 to-emerald-400"
                        onPointerDown={(event) => {
                          if (!profilePreview) return;
                          event.currentTarget.setPointerCapture(event.pointerId);
                          dragRef.current = { x: event.clientX, y: event.clientY, avatarX, avatarY };
                        }}
                        onPointerMove={(event) => {
                          if (!dragRef.current) return;
                          setAvatarX(dragRef.current.avatarX + event.clientX - dragRef.current.x);
                          setAvatarY(dragRef.current.avatarY + event.clientY - dragRef.current.y);
                        }}
                        onPointerUp={() => { dragRef.current = null; }}
                        onPointerCancel={() => { dragRef.current = null; }}
                      >
                        {profilePreview ? (
                          <img src={profilePreview} alt="" draggable={false} className="h-full w-full object-cover select-none" style={avatarStyle} />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-5xl font-black text-white">{getInitials(selectedStudent?.name || "S")}</div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-black text-zinc-700 shadow-sm dark:bg-zinc-900 dark:text-zinc-100">
                          <ImageUp size={14} /> Upload
                        </button>
                        <label className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-black text-zinc-700 shadow-sm dark:bg-zinc-900 dark:text-zinc-100">
                          <ZoomIn size={14} />
                          <input type="range" min="1" max="2.5" step="0.05" value={avatarZoom} onChange={(event) => setAvatarZoom(Number(event.target.value))} className="min-w-0 flex-1" />
                        </label>
                      </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-sky-600 px-5 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-sky-500/20 hover:bg-sky-700 disabled:opacity-60">
                      {isSubmitting ? "Menyimpan..." : "Simpan"}
                    </button>
                    <button type="button" onClick={closeModal} className="w-full rounded-2xl bg-zinc-100 px-5 py-4 text-sm font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200">
                      Tutup
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">{label}</p>
        <div className="text-sky-500">{icon}</div>
      </div>
      <p className="mt-3 text-3xl font-black text-zinc-950 dark:text-zinc-50">{value}</p>
    </div>
  );
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
      <p className={`mt-2 whitespace-pre-line text-base font-black text-zinc-950 dark:text-zinc-50 ${mono ? "font-mono break-all" : ""}`}>{value}</p>
    </div>
  );
}

function SchoolInput({ name, label, type = "text", required = false, defaultValue = "" }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">{label}</label>
      <input name={name} type={type} required={required} defaultValue={defaultValue} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-sky-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" />
    </div>
  );
}

function TeacherSelect({ name, label, defaultValue = "", options }: { name: string; label: string; defaultValue?: string; options: TeacherOption[] }) {
  const normalizedDefault = defaultValue.toUpperCase();
  const hasDefaultOption = options.some((option) => option.name === normalizedDefault);

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">{label}</label>
      <select
        name={name}
        defaultValue={normalizedDefault}
        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-sky-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
      >
        {!hasDefaultOption && normalizedDefault && <option value={normalizedDefault}>{normalizedDefault}</option>}
        {options.length === 0 && <option value={normalizedDefault || "ESTER WARUWU"}>{normalizedDefault || "ESTER WARUWU"}</option>}
        {options.map((option) => (
          <option key={option.id} value={option.name}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}
