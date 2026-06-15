import prisma from '../lib/prisma';

const PROJECTFLOW_URL = 'https://bethesda-projectflow-pro.vercel.app/';
const PROJECTFLOW_GET_MEMBERS_ACTION = '00761ae733b18aebb9f66587cdaa8691f1b82dc618';

type ProjectFlowMember = {
  name: string;
  email: string;
  avatar?: string | null;
};

const PROJECTFLOW_TO_BETHESDA_NAME: Record<string, string> = {
  arianus: 'ARIANUS',
  'ester waruwu': 'ESTER WARUWU',
  farisman: 'FARISMAN',
  'hana lazharus': 'HANA LAZHARUS',
  'irvanus manda': 'IRVANUS',
  'margaretha oliviani': 'MARGARETHA OLIVIA',
  'maudy lintjewas': 'MAUDY LINTJEWAS',
  'mega utami': 'MEGA UTAMI',
  neni: 'NENI',
  'novera dini': 'NOVERA DINI',
  'putra mendrofa': 'PUTRA MENDROFA',
  'ramadudi laia': 'RAMARUDI LAIA',
  'rosin robo': 'ROSIN ROBO',
  'sukardin mendrofa': 'SUKARDIN MENDROFA',
  wasti: 'WASTI',
};

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseProjectFlowActionResponse<T>(payload: string): T | null {
  const refs = new Map<string, string>();
  const jsonBlocks: string[] = [];
  let index = 0;

  while (index < payload.length) {
    while (payload[index] === '\n' || payload[index] === '\r') index += 1;

    const header = payload.slice(index).match(/^([0-9a-z]+):/);
    if (!header) {
      index += 1;
      continue;
    }

    const id = header[1];
    index += header[0].length;

    if (payload[index] === 'T') {
      index += 1;
      const commaIndex = payload.indexOf(',', index);
      if (commaIndex === -1) break;

      const lengthHex = payload.slice(index, commaIndex);
      const textLength = Number.parseInt(lengthHex, 16);
      if (!Number.isFinite(textLength)) break;

      const textStart = commaIndex + 1;
      refs.set(id, payload.slice(textStart, textStart + textLength));
      index = textStart + textLength;
      continue;
    }

    const lineEnd = payload.indexOf('\n', index);
    const rawValue = payload.slice(index, lineEnd === -1 ? payload.length : lineEnd);
    if (rawValue.trim().startsWith('{')) jsonBlocks.push(rawValue.trim());
    index = lineEnd === -1 ? payload.length : lineEnd + 1;
  }

  const jsonBlock = jsonBlocks.find((block) => block.includes('"success"'));
  if (!jsonBlock) return null;

  const replaceRefs = (value: any): any => {
    if (Array.isArray(value)) return value.map(replaceRefs);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replaceRefs(child)]));
    }
    if (typeof value === 'string' && /^\$[0-9a-z]+$/.test(value)) {
      return refs.get(value.slice(1)) ?? value;
    }
    return value;
  };

  return replaceRefs(JSON.parse(jsonBlock)) as T;
}

async function getProjectFlowMembers() {
  const response = await fetch(PROJECTFLOW_URL, {
    method: 'POST',
    headers: {
      'Next-Action': PROJECTFLOW_GET_MEMBERS_ACTION,
      'Content-Type': 'text/plain;charset=UTF-8',
    },
    body: '[]',
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`ProjectFlow members request failed: ${response.status}`);

  const result = parseProjectFlowActionResponse<{ success: boolean; members: ProjectFlowMember[] }>(await response.text());
  if (!result?.success) throw new Error('ProjectFlow members response invalid');
  return result.members || [];
}

async function main() {
  const members = await getProjectFlowMembers();
  const teachers = await prisma.teacher.findMany({
    include: { user: true },
    orderBy: { teacherId: 'asc' },
  });
  const teachersByName = new Map(teachers.map((teacher) => [normalizeName(teacher.user?.name || ''), teacher]));
  const results: Array<{ projectFlowName: string; bethesdaName: string; status: string }> = [];

  for (const member of members) {
    const bethesdaName = PROJECTFLOW_TO_BETHESDA_NAME[normalizeName(member.name)];
    if (!bethesdaName) {
      results.push({ projectFlowName: member.name, bethesdaName: '-', status: 'skipped: no name mapping' });
      continue;
    }

    const teacher = teachersByName.get(normalizeName(bethesdaName));
    if (!teacher) {
      results.push({ projectFlowName: member.name, bethesdaName, status: 'skipped: teacher not found' });
      continue;
    }

    if (!member.avatar) {
      results.push({ projectFlowName: member.name, bethesdaName, status: 'skipped: no avatar' });
      continue;
    }

    await prisma.user.update({
      where: { id: teacher.userId },
      data: { profileImage: member.avatar },
    });

    results.push({ projectFlowName: member.name, bethesdaName, status: 'updated' });
  }

  console.table(results);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
