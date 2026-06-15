'use client';

import { BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { getChecklistItemStatus } from '@/lib/student-program-checklists';

function checklistStatusBadgeClass(item: any) {
  const status = getChecklistItemStatus(item);
  if (status === 'done') return 'bg-emerald-500 text-white';
  return 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400';
}

export function TherapyParentReport({ checklist }: { checklist: any }) {
  if (!checklist) return null;

  return (
    <section className="rounded-[26px] border border-amber-100 bg-white p-5 shadow-sm dark:border-amber-900/40 dark:bg-zinc-900 sm:rounded-[32px] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <BookOpen size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-600 dark:text-amber-300">Laporan dan Analisa</p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-2xl">
              Program Terapi {checklist.studentName}
            </h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-zinc-500">
              Ringkasan program, card, deskripsi, dan hasil assessment yang dipantau dari ProjectFlow.
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center dark:bg-amber-950/30">
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{checklist.summary.percentage}%</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">
            {checklist.summary.done}/{checklist.summary.total} selesai
          </p>
        </div>
      </div>

      {checklist.projectFlowCards?.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {checklist.projectFlowCards.map((card: any) => (
            <div key={card.id} className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <span className="font-black">{card.boardTitle || 'ProjectFlow'}</span>
              <span> · {card.title}</span>
              {card.scheduleTime ? <span> · {card.scheduleTime}</span> : null}
              {card.updatedAt ? <span> · Update {format(new Date(card.updatedAt.replace(/^\$D/, '')), 'dd MMM yyyy', { locale: id })}</span> : null}
            </div>
          ))}
        </div>
      )}

      {checklist.description && (
        <details className="mt-5 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
          <summary className="cursor-pointer text-sm font-black text-zinc-900 dark:text-zinc-100">Baca hasil assessment</summary>
          <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-7 text-zinc-600 dark:text-zinc-300">
            {checklist.description}
          </p>
        </details>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {checklist.sections.map((section: any) => {
          const doneCount = section.items.filter((item: any) => item.done).length;
          const sectionPercentage = section.items.length > 0 ? Math.round((doneCount / section.items.length) * 100) : 0;

          return (
            <div key={`${section.title}-${section.scheduleTime}`} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-black text-zinc-950 dark:text-white">{section.title}</h4>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {section.scheduleTime || 'Jadwal belum ada'} · {doneCount}/{section.items.length}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-600 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
                  {sectionPercentage}%
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {section.items.map((item: any, index: number) => (
                  <div key={`${section.title}-${index}-${item.text}`} className="flex items-start gap-2 rounded-2xl bg-white p-3 text-sm font-semibold leading-6 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                      checklistStatusBadgeClass(item)
                    }`}>
                      {item.done ? 'OK' : ''}
                    </span>
                    <span className={item.done ? 'text-zinc-500 line-through' : ''}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
