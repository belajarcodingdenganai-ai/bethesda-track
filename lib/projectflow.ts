import { getChecklistItemStatus, getChecklistItemStatusLabel, summarizeChecklist, type ProgramChecklistSection } from './student-program-checklists';
import { PrismaClient } from '@prisma/client';

const PROJECTFLOW_URL = 'https://bethesda-projectflow-pro.vercel.app/';
const PROJECTFLOW_GET_BOARDS_ACTION = '00f229ad2f283acd56ed00956f449a1134df1495b3';
const PROJECTFLOW_GET_CARDS_ACTION = '40650db8256a4e650c7a38cb40ac10cabb6bcf0484';
const PROJECTFLOW_GET_MEMBERS_ACTION = '00761ae733b18aebb9f66587cdaa8691f1b82dc618';
const PROJECTFLOW_CACHE_TTL_MS = 5_000;
const PROJECTFLOW_SCHOOL_SCHEDULE_TIME = '08:00-12:00';
const PROJECTFLOW_THERAPY_BOARD_TITLES = new Set(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'jum at', 'friday']);

type ProjectFlowBoard = {
  id: string;
  title: string;
};

export type ProjectFlowChecklistItem = {
  text: string;
  done: boolean;
  status?: string | null;
  isProgram?: boolean;
};

type ProjectFlowCard = {
  id: string;
  boardId: string;
  title: string;
  description?: string | null;
  checklist?: ProjectFlowChecklistItem[] | null;
  assigneeIds?: string[] | null;
  scheduleTime?: string | null;
  updatedAt?: string | null;
};

type ProjectFlowMember = {
  id: string;
  name: string;
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

export function normalizeProjectFlowName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getFirstProjectFlowNameToken(value: string) {
  return normalizeProjectFlowName(value).split(' ')[0] || '';
}

function getProjectFlowNameDistance(a: string, b: string) {
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array(b.length + 1).fill(0);

  for (let row = 1; row <= a.length; row += 1) {
    current[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
    }
    for (let column = 0; column <= b.length; column += 1) {
      previous[column] = current[column];
    }
  }

  return previous[b.length];
}

function normalizeProgramTitle(value: string) {
  return value.replace(/^program\s*:?\s*/i, '').trim() || 'Program Pembelajaran';
}

function isSchoolBoardTitle(boardTitle: string) {
  const normalizedTitle = normalizeProjectFlowName(boardTitle);
  return normalizedTitle
    .split(' ')
    .some((word) => word === 'sekolah' || word === 'school');
}

function isTherapyBoardTitle(boardTitle: string) {
  const normalizedTitle = normalizeProjectFlowName(boardTitle);
  return PROJECTFLOW_THERAPY_BOARD_TITLES.has(normalizedTitle);
}

function isSchoolProjectFlowCard(card: ProjectFlowCard, boardTitle: string) {
  if (isSchoolBoardTitle(boardTitle)) return true;

  // ProjectFlow can return cards before board metadata. In that case the school
  // board is still identifiable by the official school schedule.
  return !boardTitle && card.scheduleTime === PROJECTFLOW_SCHOOL_SCHEDULE_TIME;
}

function isTherapyProjectFlowCard(card: ProjectFlowCard, boardTitle: string) {
  if (isTherapyBoardTitle(boardTitle)) return true;
  return !boardTitle && card.scheduleTime !== PROJECTFLOW_SCHOOL_SCHEDULE_TIME;
}

function parseProjectFlowActionResponse<T>(payload: string): T | null {
  const refs = new Map<string, string>();
  const jsonBlocks: string[] = [];
  let index = 0;

  const getUtf8SliceEnd = (value: string, start: number, byteLength: number) => {
    let cursor = start;
    let bytes = 0;

    while (cursor < value.length && bytes < byteLength) {
      const codePoint = value.codePointAt(cursor) || 0;
      const charLength = codePoint > 0xffff ? 2 : 1;
      const charBytes =
        codePoint <= 0x7f
          ? 1
          : codePoint <= 0x7ff
            ? 2
            : codePoint <= 0xffff
              ? 3
              : 4;

      bytes += charBytes;
      cursor += charLength;
    }

    return cursor;
  };

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
      const textEnd = getUtf8SliceEnd(payload, textStart, textLength);
      refs.set(id, payload.slice(textStart, textEnd));
      index = textEnd;
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

async function callProjectFlowAction<T>(actionId: string): Promise<T | null> {
  const response = await fetch(PROJECTFLOW_URL, {
    method: 'POST',
    headers: {
      'Next-Action': actionId,
      'Content-Type': 'text/plain;charset=UTF-8',
    },
    body: '[]',
    cache: 'no-store',
  });

  if (!response.ok) return null;
  return parseProjectFlowActionResponse<T>(await response.text());
}

type ProjectFlowData = {
  boards: ProjectFlowBoard[];
  cards: ProjectFlowCard[];
  members: ProjectFlowMember[];
};

const globalForProjectFlowPrisma = global as unknown as {
  projectFlowPrisma?: PrismaClient;
};

let projectFlowDataCache: { data: ProjectFlowData; fetchedAt: number } | null = null;
let projectFlowDataPromise: Promise<ProjectFlowData> | null = null;

function normalizeProjectFlowDatabaseUrl(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);

    if (url.hostname.includes('pooler.supabase.com')) {
      if (url.port === '5432') {
        url.port = '6543';
      }

      if (!url.searchParams.has('pgbouncer')) {
        url.searchParams.set('pgbouncer', 'true');
      }

      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '1');
      }

      if (!url.searchParams.has('pool_timeout')) {
        url.searchParams.set('pool_timeout', '20');
      }
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

function getProjectFlowPrisma() {
  const databaseUrl = process.env.PROJECTFLOW_DATABASE_URL;
  if (!databaseUrl) return null;

  if (!globalForProjectFlowPrisma.projectFlowPrisma) {
    globalForProjectFlowPrisma.projectFlowPrisma = new PrismaClient({
      datasources: {
        db: {
          url: normalizeProjectFlowDatabaseUrl(databaseUrl),
        },
      },
      log: ['error'],
    });
  }

  return globalForProjectFlowPrisma.projectFlowPrisma;
}

function normalizeProjectFlowCard(card: any): ProjectFlowCard {
  return {
    id: card.id,
    boardId: card.boardId,
    title: card.title,
    description: card.description || null,
    checklist: Array.isArray(card.checklist) ? card.checklist : [],
    assigneeIds: Array.isArray(card.assigneeIds) ? card.assigneeIds : [],
    scheduleTime: card.scheduleTime || null,
    updatedAt: card.updatedAt instanceof Date ? card.updatedAt.toISOString() : card.updatedAt || null,
  };
}

async function getProjectFlowDataFromDatabase(): Promise<ProjectFlowData | null> {
  const projectFlowPrisma = getProjectFlowPrisma();
  if (!projectFlowPrisma) return null;

  const [boards, cards, members] = await Promise.all([
    projectFlowPrisma.$queryRawUnsafe<ProjectFlowBoard[]>(
      'SELECT id, title FROM "Board" WHERE archived IS NOT TRUE ORDER BY "createdAt" ASC',
    ),
    projectFlowPrisma.$queryRawUnsafe<any[]>(
      'SELECT id, "boardId", title, description, checklist, "assigneeIds", "scheduleTime", "updatedAt" FROM "Card" ORDER BY "order" ASC',
    ),
    projectFlowPrisma.$queryRawUnsafe<ProjectFlowMember[]>(
      'SELECT id, name, avatar FROM "Member" ORDER BY name ASC',
    ),
  ]);

  return {
    boards,
    cards: cards.map(normalizeProjectFlowCard),
    members,
  };
}

export async function getProjectFlowData() {
  if (projectFlowDataCache && Date.now() - projectFlowDataCache.fetchedAt < PROJECTFLOW_CACHE_TTL_MS) {
    return projectFlowDataCache.data;
  }

  if (!projectFlowDataPromise) {
    projectFlowDataPromise = (async () => {
      try {
        const databaseData = await getProjectFlowDataFromDatabase();
        if (databaseData) {
          projectFlowDataCache = { data: databaseData, fetchedAt: Date.now() };
          return databaseData;
        }

        const [boardsResult, cardsResult, membersResult] = await Promise.all([
          callProjectFlowAction<{ success: boolean; boards: ProjectFlowBoard[] }>(PROJECTFLOW_GET_BOARDS_ACTION),
          callProjectFlowAction<{ success: boolean; cards: ProjectFlowCard[] }>(PROJECTFLOW_GET_CARDS_ACTION),
          callProjectFlowAction<{ success: boolean; members: ProjectFlowMember[] }>(PROJECTFLOW_GET_MEMBERS_ACTION),
        ]);

        const data = {
          boards: boardsResult?.boards || [],
          cards: (cardsResult?.cards || []).map(normalizeProjectFlowCard),
          members: membersResult?.members || [],
        };
        projectFlowDataCache = { data, fetchedAt: Date.now() };
        return data;
      } catch (error) {
        console.error('Error fetching ProjectFlow assignment data:', error);
        return { boards: [], cards: [], members: [] };
      } finally {
        projectFlowDataPromise = null;
      }
    })();
  }

  return projectFlowDataPromise;
}

export function getBethesdaTeacherName(memberName: string) {
  return PROJECTFLOW_TO_BETHESDA_NAME[normalizeProjectFlowName(memberName)] || memberName.toUpperCase();
}

function getCardUpdatedTime(card: ProjectFlowCard) {
  if (!card.updatedAt) return 0;
  const cleaned = card.updatedAt.replace(/^\$D/, '');
  const time = new Date(cleaned).getTime();
  return Number.isFinite(time) ? time : 0;
}

async function getProjectFlowStudentProjects(
  studentName: string,
  track: 'SCHOOL' | 'THERAPY' | 'ALL',
  aliases: string[] = [],
) {
  const { boards, cards, members } = await getProjectFlowData();
  const normalizedStudentNames = Array.from(new Set([studentName, ...aliases].map(normalizeProjectFlowName).filter(Boolean)));
  const studentFirstTokens = Array.from(new Set([studentName, ...aliases].map(getFirstProjectFlowNameToken).filter((token) => token.length >= 3)));
  const boardsById = new Map(boards.map((board) => [board.id, board]));
  const membersById = new Map(members.map((member) => [member.id, member]));
  const candidateCards = cards.filter((card) => {
    const boardTitle = boardsById.get(card.boardId)?.title || '';
    if (track === 'ALL') return true;
    return track === 'SCHOOL'
      ? isSchoolProjectFlowCard(card, boardTitle)
      : isTherapyProjectFlowCard(card, boardTitle);
  });

  const firstTokenCounts = candidateCards.reduce((counts, card) => {
    const firstToken = getFirstProjectFlowNameToken(card.title);
    if (firstToken.length < 3) return counts;
    counts.set(firstToken, (counts.get(firstToken) || 0) + 1);
    return counts;
  }, new Map<string, number>());

  const matchingCards = candidateCards
    .map((card) => {
      const normalizedTitle = normalizeProjectFlowName(card.title);
      const exactMatch = normalizedStudentNames.some((name) => normalizedTitle === name);
      const fullNameMatch = normalizedStudentNames.some((name) => {
        if (name.length < 5 || normalizedTitle.length < 5) return false;
        const nameTokens = name.split(' ');
        return (
          normalizedTitle.includes(name) ||
          nameTokens.includes(normalizedTitle) ||
          name.startsWith(`${normalizedTitle} `)
        );
      });
      const cardFirstToken = getFirstProjectFlowNameToken(card.title);
      const firstNameMatch = studentFirstTokens.some((token) => (
        token === cardFirstToken ||
        (token.length >= 5 && cardFirstToken.length >= 5 && getProjectFlowNameDistance(token, cardFirstToken) <= 1)
      ));
      const firstNameIsUsable = firstNameMatch && cardFirstToken.length >= 3 && (firstTokenCounts.get(cardFirstToken) || 0) <= 5;

      return { card, matchRank: exactMatch ? 4 : fullNameMatch ? 3 : firstNameIsUsable ? 2 : 0 };
    })
    .filter(({ matchRank }) => matchRank > 0)
    .sort((a, b) => {
      const matchDelta = b.matchRank - a.matchRank;
      if (matchDelta !== 0) return matchDelta;
      const updatedDelta = getCardUpdatedTime(b.card) - getCardUpdatedTime(a.card);
      if (updatedDelta !== 0) return updatedDelta;
      return (b.card.assigneeIds?.length || 0) - (a.card.assigneeIds?.length || 0);
    });

  return matchingCards.map(({ card }) => {
    const assignees = (card.assigneeIds || [])
      .map((id) => membersById.get(id))
      .filter(Boolean)
      .map((member) => ({
        id: member!.id,
        projectFlowName: member!.name,
        name: getBethesdaTeacherName(member!.name),
        avatar: member!.avatar || null,
      }));

    return {
      card,
      cardId: card.id,
      cardTitle: card.title,
      boardTitle: boardsById.get(card.boardId)?.title || (card.scheduleTime === PROJECTFLOW_SCHOOL_SCHEDULE_TIME ? 'Sekolah' : ''),
      scheduleTime: card.scheduleTime || null,
      assignees,
      teacherNames: assignees.map((assignee) => assignee.name),
      primaryTeacherName: assignees[0]?.name || null,
    };
  });
}

async function getProjectFlowStudentProject(
  studentName: string,
  track: 'SCHOOL' | 'THERAPY',
  aliases: string[] = [],
) {
  const projects = await getProjectFlowStudentProjects(studentName, track, aliases);
  return projects[0] || null;
}

export async function getProjectFlowStudentAssignment(
  studentName: string,
  track: 'SCHOOL' | 'THERAPY',
  aliases: string[] = [],
) {
  const project = await getProjectFlowStudentProject(studentName, track, aliases);
  if (!project || project.assignees.length === 0) return null;

  const { card, ...assignment } = project;
  return assignment;
}

function buildSectionsFromProjectFlowCard(
  card: ProjectFlowCard,
  source: string,
  defaultScheduleTime: string,
): ProgramChecklistSection[] {
  const sections: ProgramChecklistSection[] = [];
  let currentSection: ProgramChecklistSection | null = null;

  for (const item of card.checklist || []) {
    if (item.isProgram) {
      currentSection = {
        title: normalizeProgramTitle(item.text),
        scheduleTime: card.scheduleTime || defaultScheduleTime,
        source,
        items: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      currentSection = {
        title: 'Program Pembelajaran',
        scheduleTime: card.scheduleTime || defaultScheduleTime,
        source,
        items: [],
      };
      sections.push(currentSection);
    }

    currentSection.items.push({
      text: item.text,
      done: Boolean(item.done) || item.status === 'done',
      status: getChecklistItemStatus(item),
      statusLabel: getChecklistItemStatusLabel(item),
    });
  }

  return sections;
}

export async function getProjectFlowProgramChecklistWithSummary(
  studentName: string,
  track: 'SCHOOL' | 'THERAPY',
  aliases: string[] = [],
) {
  const trackProjects = await getProjectFlowStudentProjects(studentName, track, aliases);
  if (trackProjects.length === 0) return null;

  const projects = [trackProjects[0]];
  const descriptions = projects
    .map((project) => project.card.description?.trim())
    .filter(Boolean);
  const shouldPrefixBoard = false;
  const sections = projects.flatMap((project) => {
    const source = project.boardTitle ? `ProjectFlow Board ${project.boardTitle}` : 'ProjectFlow';
    return buildSectionsFromProjectFlowCard(
      project.card,
      source,
      isSchoolProjectFlowCard(project.card, project.boardTitle || '') ? '08:00-12:00' : project.scheduleTime || '',
    ).map((section) => ({
      ...section,
      title: shouldPrefixBoard && project.boardTitle
        ? `${project.boardTitle} - ${section.title}`
        : section.title,
    }));
  });

  return {
    studentName,
    aliases: Array.from(new Set([studentName, ...aliases, ...trackProjects.map((project) => project.cardTitle)])),
    sourceUrl: PROJECTFLOW_URL,
    description: Array.from(new Set(descriptions)).join('\n\n'),
    sections,
    summary: summarizeChecklist(sections),
    projectFlowCard: projects[0]
      ? {
          id: projects[0].cardId,
          title: projects[0].cardTitle,
          boardTitle: projects[0].boardTitle,
          scheduleTime: projects[0].scheduleTime,
          updatedAt: projects[0].card.updatedAt || null,
        }
      : null,
    projectFlowCards: projects.map((project) => ({
      id: project.cardId,
      title: project.cardTitle,
      boardTitle: project.boardTitle,
      scheduleTime: project.scheduleTime,
      updatedAt: project.card.updatedAt || null,
    })),
  };
}
