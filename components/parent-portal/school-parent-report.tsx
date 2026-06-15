'use client';

import { BookOpen, CheckCircle2, School } from 'lucide-react';
import { getChecklistItemStatus } from '@/lib/student-program-checklists';

function checklistStatusBadgeClass(item: any) {
  const status = getChecklistItemStatus(item);
  if (status === 'done') return 'bg-emerald-500 text-white';
  return 'bg-zinc-200 text-zinc-500';
}

export function SchoolParentReport({ checklist, studentName }: { checklist: any; studentName: string }) {
  return (
    <section className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <BookOpen size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-600">Laporan Program/Materi</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight">Checklist Perkembangan {studentName}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-zinc-500">
              Ringkasan materi dan target pembelajaran yang dipantau dari ProjectFlow.
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-sky-50 px-4 py-3 text-center">
          <p className="text-2xl font-black text-sky-700">{checklist?.summary?.percentage || 0}%</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">
            {checklist?.summary?.done || 0}/{checklist?.summary?.total || 0} selesai
          </p>
        </div>
      </div>

      {checklist?.description && (
        <details className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
          <summary className="cursor-pointer text-sm font-black text-zinc-900">Baca hasil assessment</summary>
          <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-7 text-zinc-600">
            {checklist.description}
          </p>
        </details>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {checklist?.sections?.map((section: any) => {
          const doneCount = section.items.filter((item: any) => item.done).length;
          return (
            <div key={section.title} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-black">{section.title}</h4>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {section.scheduleTime} · {doneCount}/{section.items.length}
                  </p>
                </div>
                <School size={18} className="text-sky-500" />
              </div>
              <div className="mt-4 space-y-2">
                {section.items.map((item: any, index: number) => (
                  <div key={`${section.title}-${index}`} className="flex items-start gap-2 rounded-2xl bg-white p-3 text-sm font-semibold leading-6 text-zinc-600">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
                      checklistStatusBadgeClass(item)
                    }`}>
                      {item.done ? <CheckCircle2 size={13} /> : ''}
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
