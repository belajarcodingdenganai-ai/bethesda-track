'use client';

import { useEffect, useMemo, useState } from 'react';

type CalendarTheme = 'indigo' | 'sky';

type JakartaDateParts = {
  year: number;
  month: number;
  day: number;
};

type CalendarDay = {
  day: number;
  isToday: boolean;
  isSunday: boolean;
  holidayName?: string;
};

type CalendarWeek = {
  days: Array<CalendarDay | null>;
};

const WEEKDAYS = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'];
const JAKARTA_TIME_ZONE = 'Asia/Jakarta';

const themeClasses: Record<CalendarTheme, {
  accentBorder: string;
  headerBg: string;
}> = {
  indigo: {
    accentBorder: 'border-orange-100 dark:border-orange-900/40',
    headerBg: 'bg-orange-400',
  },
  sky: {
    accentBorder: 'border-orange-100',
    headerBg: 'bg-orange-400',
  },
};

const indonesianHolidays: Record<string, string> = {
  '2026-01-01': 'Tahun Baru Masehi',
  '2026-01-16': 'Isra Mikraj Nabi Muhammad SAW',
  '2026-02-16': 'Cuti Tahun Baru Imlek',
  '2026-02-17': 'Tahun Baru Imlek',
  '2026-03-18': 'Cuti Hari Suci Nyepi',
  '2026-03-19': 'Hari Suci Nyepi',
  '2026-03-20': 'Cuti Hari Raya Idulfitri',
  '2026-03-21': 'Hari Raya Idulfitri',
  '2026-03-22': 'Hari Raya Idulfitri',
  '2026-03-23': 'Cuti Hari Raya Idulfitri',
  '2026-03-24': 'Cuti Hari Raya Idulfitri',
  '2026-04-03': 'Wafat Yesus Kristus',
  '2026-04-05': 'Hari Paskah',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-15': 'Cuti Kenaikan Yesus Kristus',
  '2026-05-27': 'Hari Raya Iduladha',
  '2026-05-28': 'Cuti Hari Raya Iduladha',
  '2026-05-31': 'Hari Raya Waisak',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-17': 'Tahun Baru Islam',
  '2026-08-17': 'Hari Kemerdekaan RI',
  '2026-08-25': 'Maulid Nabi Muhammad SAW',
  '2026-12-24': 'Cuti Hari Raya Natal',
  '2026-12-25': 'Hari Raya Natal',
};

function getJakartaDateParts(date = new Date()): JakartaDateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: JAKARTA_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value || date.getFullYear()),
    month: Number(parts.find((part) => part.type === 'month')?.value || date.getMonth() + 1),
    day: Number(parts.find((part) => part.type === 'day')?.value || date.getDate()),
  };
}

function getDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getMondayIndex(date: Date) {
  const day = date.getUTCDay();
  return day === 0 ? 6 : day - 1;
}

function buildCalendarWeeks(today: JakartaDateParts): CalendarWeek[] {
  const firstDate = new Date(Date.UTC(today.year, today.month - 1, 1));
  const lastDate = new Date(Date.UTC(today.year, today.month, 0));
  const start = new Date(firstDate);
  start.setUTCDate(firstDate.getUTCDate() - getMondayIndex(firstDate));
  const end = new Date(lastDate);
  end.setUTCDate(lastDate.getUTCDate() + (6 - getMondayIndex(lastDate)));

  const weeks: CalendarWeek[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const week: CalendarWeek = {
      days: [],
    };

    for (let index = 0; index < 7; index += 1) {
      const year = cursor.getUTCFullYear();
      const month = cursor.getUTCMonth() + 1;
      const day = cursor.getUTCDate();
      const isCurrentMonth = month === today.month && year === today.year;
      const key = getDateKey(year, month, day);

      week.days.push(isCurrentMonth ? {
        day,
        isToday: year === today.year && month === today.month && day === today.day,
        isSunday: cursor.getUTCDay() === 0,
        holidayName: indonesianHolidays[key],
      } : null);

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    weeks.push(week);
  }

  return weeks;
}

export function IndonesiaMonthCalendar({ className = '', theme = 'indigo' }: { className?: string; theme?: CalendarTheme }) {
  const [today, setToday] = useState<JakartaDateParts>(() => getJakartaDateParts());
  const classes = themeClasses[theme];
  const weeks = useMemo(() => buildCalendarWeeks(today), [today]);
  const holidaysThisMonth = weeks.flatMap((week) => week.days).filter((day): day is CalendarDay => Boolean(day?.holidayName));
  const monthName = new Intl.DateTimeFormat('id-ID', {
    timeZone: JAKARTA_TIME_ZONE,
    month: 'long',
  }).format(new Date(Date.UTC(today.year, today.month - 1, 1)));
  useEffect(() => {
    const interval = window.setInterval(() => {
      setToday(getJakartaDateParts());
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className={`overflow-hidden rounded-2xl border bg-zinc-50 shadow-sm dark:bg-zinc-950/40 ${classes.accentBorder} ${className}`}>
      <div className={`${classes.headerBg} px-3 py-1.5 text-center sm:py-2`}>
        <h3 className="text-sm font-black capitalize tracking-normal text-white sm:text-base">{monthName} {today.year}</h3>
      </div>

      <div className="px-2 py-2.5">
        <div className="grid grid-cols-7 gap-y-1">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className={[
                'text-center text-[7px] font-black tracking-normal sm:text-[8px]',
                weekday === 'MIN' ? 'text-red-500' : '',
                weekday !== 'MIN' ? 'text-zinc-700 dark:text-zinc-200' : '',
              ].join(' ')}
            >
              {weekday}
            </div>
          ))}

          {weeks.map((week) => (
            <div key={week.days.map((day) => day?.day || 'x').join('-')} className="contents">
              {week.days.map((day, index) => {
                const isRedDate = Boolean(day && (day.isSunday || day.holidayName));

                return (
                  <div
                    key={`${week.days.map((calendarDay) => calendarDay?.day || 'x').join('-')}-${index}`}
                    title={day?.holidayName}
                    className="flex min-h-5 items-center justify-center sm:min-h-6"
                  >
                    {day && (
                      <span
                        className={[
                          'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black tracking-normal sm:h-6 sm:w-6 sm:text-[11px]',
                          isRedDate ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100',
                          day.isToday ? 'ring-2 ring-orange-300 ring-offset-1 ring-offset-zinc-50 dark:ring-offset-zinc-950' : '',
                        ].join(' ')}
                      >
                        {day.day}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {holidaysThisMonth.length > 0 && (
        <div className="border-t border-zinc-200 px-2.5 py-1.5 text-[9px] font-bold leading-3 text-red-600 dark:border-zinc-800 dark:text-red-400">
          {holidaysThisMonth.map((day) => `${day.day}: ${day.holidayName}`).join(', ')}
        </div>
      )}
    </section>
  );
}
