export type ProgramChecklistItem = {
  text: string;
  done: boolean;
  status?: 'todo' | 'in_progress' | 'done';
  statusLabel?: string;
};

export type ProgramChecklistSection = {
  title: string;
  scheduleTime?: string;
  source?: string;
  items: ProgramChecklistItem[];
};

export type StudentProgramChecklist = {
  studentName: string;
  aliases: string[];
  sourceUrl: string;
  description: string;
  sections: ProgramChecklistSection[];
};

export const STUDENT_PROGRAM_CHECKLISTS: StudentProgramChecklist[] = [
  {
    studentName: 'Axel Gevariel',
    aliases: ['Axel G', 'Axel Gevariel', 'Axel Gevarie'],
    sourceUrl: 'https://bethesda-projectflow-pro.vercel.app/',
    description: [
      '1. Anak belum mampu duduk lebih dari tiga menit',
      '2. Anak belum mampu duduk lebih dari tiga menit',
      '3. Anak belum mampu mengidentifikasi huruf',
      '4. Anak belum mampu mengidentifikasi angka 1-10',
      '5. Anak belum mampu mengikuti instruksi 3-4 langkah',
      '6. Anak belum mampu menyalin',
      '7. Anak belum mampu menghitung 1-10',
      '8. Anak mudah terdistrak dengan suara, mainan, dan juga air.',
      '9. Anak terkadang tiba tiba memukul kepala (tidak hanya pada saat marah)',
      '10. Anak sering melamun',
      '11. Anak akan sangat menangis saat mengingini sesuatu seperti mainan atau makanan',
      '12. Anak memukul kepala saat menyampaikan keinginan',
    ].join('\n'),
    sections: [
      {
        title: 'Akademik',
        scheduleTime: '08:00-12:00',
        source: 'ProjectFlow',
        items: [
          { text: 'Mengidentifikasi huruf "A"', done: true },
          { text: 'Mencocokkan huruf "A"', done: true },
          { text: 'Imitasi menyebut "A"', done: true },
          { text: 'Menebalkan huruf "A"', done: true },
          { text: 'Menulis huruf "A"', done: false },
          { text: 'Menghubungkan huruf "A" dengan benda', done: false },
          { text: 'Mengidentifikasi angka "1"', done: false },
          { text: 'Mengidentifikasi angka "2"', done: false },
        ],
      },
      {
        title: 'Bahasa',
        scheduleTime: '08:00-12:00',
        source: 'ProjectFlow',
        items: [
          { text: 'Mengucapkan huruf vokal "a,i,u,e,o"', done: true },
          { text: 'Mengucapkan huruf "A"', done: true },
          { text: 'Mengucapkan suku kata "mami"', done: false },
          { text: 'Mengucapkan kata "mau"', done: true },
        ],
      },
      {
        title: 'Kefokusan',
        scheduleTime: '08:00-12:00',
        source: 'ProjectFlow',
        items: [
          { text: 'Merespon saat dipanggil', done: false },
          { text: 'Imitasi gerak tangan keatas', done: true },
          { text: 'Imitasi gerak dan lagu', done: false },
        ],
      },
      {
        title: 'Perilaku/kepatuhan',
        scheduleTime: '08:00-12:00',
        source: 'ProjectFlow',
        items: [
          { text: 'Duduk tenang selama 2-3 menit', done: true },
          { text: 'Instruksi 1 langkah', done: true },
          { text: 'Instruksi 2 langkah', done: false },
          { text: 'Tidak merebut benda', done: false },
          { text: 'Mengurangi menangis berlebihan', done: true },
        ],
      },
      {
        title: 'Sosial',
        scheduleTime: '08:00-12:00',
        source: 'ProjectFlow',
        items: [
          { text: 'Interaksi bergantian Terapis', done: false },
          { text: 'Bermain bersama', done: true },
          { text: 'Berbagi', done: false },
        ],
      },
      {
        title: 'Perilaku maladaptif',
        scheduleTime: '08:00-12:00',
        source: 'ProjectFlow',
        items: [
          { text: 'Memukul kepala', done: false },
          { text: 'Berteriak', done: false },
        ],
      },
      {
        title: 'Regulasi emosi',
        scheduleTime: '08:00-12:00',
        source: 'ProjectFlow',
        items: [
          { text: 'Mengenali emosi', done: false },
          { text: 'Tarik dan buang napas 1-3 detik', done: false },
          { text: 'Tangan sabar durasi 10 detik', done: false },
        ],
      },
      {
        title: 'Terapi Wicara',
        scheduleTime: '15:00-17:00',
        source: 'ProjectFlow',
        items: [
          { text: 'Imitasi suara mobi mbu mbu', done: true },
          { text: 'Imitasi suara a, i, u, e, dan o', done: true },
          { text: 'Imitasi suara "mmmmm"', done: true },
          { text: 'Imitasi suara "ma" secara konsisten', done: false },
          { text: 'Mengucapkan kata "mau"', done: true },
          { text: 'Mengucapakan kata "mau" secara konsisten', done: false },
          { text: 'Mengucapkan kata "iya"', done: true },
          { text: 'Mengucapkan kata "iya" secara konsisten', done: false },
          { text: 'Mengucapkan kata "buka"', done: true },
          { text: 'Mengucapkan kata "buka" secara konsisten', done: false },
          { text: 'Mengucapkan kata "habis"', done: true },
          { text: 'Mengucapkan kata "habis" secara konsisten', done: false },
          { text: 'Mengucapkan kata "mami"', done: true },
          { text: 'Mengucapkan kata "mami" secara konsisten', done: false },
          { text: 'Mengucapkan kata "papi"', done: true },
          { text: 'Mengucapkan kata "papi" secara konsisten', done: false },
          { text: 'Imitasi suara "a,i,u,e,dan O" secara konsisten', done: false },
        ],
      },
    ],
  },
];

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function getStudentProgramChecklist(studentName: string) {
  const normalized = normalizeName(studentName);
  return STUDENT_PROGRAM_CHECKLISTS.find((checklist) =>
    normalizeName(checklist.studentName) === normalized ||
    checklist.aliases.some((alias) => normalizeName(alias) === normalized),
  );
}

export function resolveStudentProgramAliases(studentName: string) {
  const checklist = getStudentProgramChecklist(studentName);
  return checklist ? checklist.aliases : [studentName];
}

export function getStudentProgramChecklistWithSummary(studentName: string) {
  const checklist = getStudentProgramChecklist(studentName);
  if (!checklist) return null;

  return {
    ...checklist,
    summary: summarizeChecklist(checklist.sections),
  };
}

export function summarizeChecklist(sections: ProgramChecklistSection[] = []) {
  const total = sections.reduce((sum, section) => sum + section.items.length, 0);
  const done = sections.reduce((sum, section) => sum + section.items.filter((item) => getChecklistItemStatus(item) === 'done').length, 0);
  const inProgress = sections.reduce(
    (sum, section) => sum + section.items.filter((item) => getChecklistItemStatus(item) === 'in_progress').length,
    0,
  );
  const todo = Math.max(total - done - inProgress, 0);

  return {
    total,
    done,
    inProgress,
    todo,
    percentage: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

export function getChecklistItemStatus(item: ProgramChecklistItem | { done?: boolean; status?: string | null }) {
  const normalizedStatus = String(item.status || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (normalizedStatus === 'done') return 'done';
  if (normalizedStatus === 'in_progress') return 'in_progress';
  if (normalizedStatus === 'todo') return 'todo';
  if (item.done) return 'done';

  return 'todo';
}

export function getChecklistItemStatusLabel(item: ProgramChecklistItem | { done?: boolean; status?: string | null }) {
  const status = getChecklistItemStatus(item);
  if (status === 'done') return 'Selesai';
  return 'Belum';
}
