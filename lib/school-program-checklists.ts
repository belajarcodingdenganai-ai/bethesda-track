import { getProjectFlowProgramChecklistWithSummary } from './projectflow';
import { summarizeChecklist, type ProgramChecklistSection } from './student-program-checklists';

const PROJECTFLOW_URL = 'https://bethesda-projectflow-pro.vercel.app/';

const SCHOOL_STUDENT_ALIASES: Record<string, string[]> = {
  'Axel Gevariel': ['Axel Gevariel', 'Axel Gevarie', 'Axel G'],
  IeL: ['IeL', 'IEL', 'Iel'],
};

const AXEL_ASSESSMENT = [
  '1. Anak belum mampu duduk lebih dari tiga menit',
  '2. Anak belum mampu mempertahankan fokus saat aktivitas akademik berlangsung',
  '3. Anak belum mampu mengidentifikasi huruf secara konsisten',
  '4. Anak belum mampu mengidentifikasi angka 1-10 secara konsisten',
  '5. Anak belum mampu mengikuti instruksi 3-4 langkah',
  '6. Anak belum mampu menyalin bentuk/huruf secara mandiri',
  '7. Anak belum mampu menghitung 1-10 secara mandiri',
  '8. Anak mudah terdistrak dengan suara, mainan, dan air',
  '9. Anak membutuhkan pendampingan dalam regulasi emosi dan transisi aktivitas',
].join('\n');

const SCHOOL_TEMPLATE = [
  {
    title: 'Akademik Sekolah',
    items: [
      'Mengikuti kegiatan pembuka kelas',
      'Mengenal huruf vokal',
      'Mengenal huruf konsonan awal',
      'Mencocokkan huruf yang sama',
      'Mengenal angka 1-10',
      'Menghitung benda 1-10',
      'Menebalkan garis lurus',
      'Menebalkan bentuk dasar',
      'Mengerjakan lembar kerja sederhana',
    ],
  },
  {
    title: 'Bahasa dan Komunikasi',
    items: [
      'Merespon saat dipanggil nama',
      'Mengikuti instruksi 1 langkah',
      'Mengikuti instruksi 2 langkah',
      'Menunjuk benda yang diminta',
      'Menyebut nama benda di kelas',
      'Meminta bantuan dengan kata/isyarat',
      'Menjawab pertanyaan sederhana',
      'Mengucapkan pilihan aktivitas',
      'Menyampaikan selesai/berhenti',
    ],
  },
  {
    title: 'Kemandirian',
    items: [
      'Menyimpan tas di tempatnya',
      'Merapikan alat belajar',
      'Mengikuti rutinitas cuci tangan',
      'Makan/minum dengan pendampingan minimal',
      'Toilet training sesuai kebutuhan',
      'Memakai/melepas sepatu dengan bantuan',
      'Menunggu instruksi sebelum berpindah',
      'Mengikuti transisi aktivitas',
      'Menjaga barang pribadi',
    ],
  },
  {
    title: 'Sosial dan Perilaku',
    items: [
      'Duduk mengikuti aktivitas kelompok',
      'Menunggu giliran',
      'Bermain bersama teman',
      'Berbagi alat belajar',
      'Mengurangi perilaku merebut benda',
      'Menggunakan tangan tenang',
      'Mengikuti aturan kelas sederhana',
      'Menerima bantuan guru',
      'Mengelola emosi saat aktivitas berubah',
    ],
  },
];

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function resolveSchoolStudentAliases(studentName: string) {
  const normalizedStudentName = normalizeName(studentName);
  const configuredAliases = Object.entries(SCHOOL_STUDENT_ALIASES).find(([name, aliases]) => (
    normalizeName(name) === normalizedStudentName ||
    aliases.some((alias) => normalizeName(alias) === normalizedStudentName)
  ));

  return configuredAliases ? configuredAliases[1] : [studentName];
}

function isAxel(studentName: string) {
  return resolveSchoolStudentAliases(studentName).some((alias) => normalizeName(alias) === 'axel gevariel');
}

function buildFallbackDescription(studentName: string) {
  if (isAxel(studentName)) return AXEL_ASSESSMENT;

  return [
    `Nama Lengkap : ${studentName}`,
    'Tanggal Lahir : -',
    'Jenis Kelamin : -',
    `Hasil Assesmen : Checklist pembelajaran sekolah untuk ${studentName} mengikuti struktur program dari ProjectFlow board Sekolah.`,
  ].join('\n');
}

function buildFallbackSections(): ProgramChecklistSection[] {
  return SCHOOL_TEMPLATE.map((section) => ({
    title: section.title,
    scheduleTime: '08:00-12:00',
    source: 'ProjectFlow Board Sekolah',
    items: section.items.map((text) => ({ text, done: false })),
  }));
}

export async function getSchoolProgramChecklistWithSummary(studentName: string) {
  const aliases = resolveSchoolStudentAliases(studentName);
  const checklist = await getProjectFlowProgramChecklistWithSummary(studentName, 'SCHOOL', aliases);

  if (checklist?.projectFlowCard) {
    return {
      ...checklist,
      studentName,
      aliases,
      description: checklist.description || '',
    };
  }

  const sections = buildFallbackSections();
  const projectFlowDescription = checklist?.description?.trim();

  return {
    studentName,
    aliases: checklist?.aliases || aliases,
    sourceUrl: PROJECTFLOW_URL,
    description: projectFlowDescription || buildFallbackDescription(studentName),
    sections,
    summary: summarizeChecklist(sections),
    projectFlowCard: checklist?.projectFlowCard || null,
    projectFlowCards: checklist?.projectFlowCards || [],
  };
}
