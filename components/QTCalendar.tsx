'use client';

import { toDateString } from '@/lib/date';

const WEEKDAYS = ['주일', '월', '화', '수', '목', '금', '토'];

type Props = {
  year: number;
  month: number; // 0-indexed
  selectedDate: string;
  markedDates: Set<string>;
  todayDate: string;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

export default function QTCalendar({
  year,
  month,
  selectedDate,
  markedDates,
  todayDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onPrevMonth} className="px-2 text-stone-400 hover:text-stone-700">
          ◀
        </button>
        <span className="font-medium text-stone-700">
          {year}년 {month + 1}월
        </span>
        <button onClick={onNextMonth} className="px-2 text-stone-400 hover:text-stone-700">
          ▶
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;
          const dateStr = toDateString(new Date(year, month, day));
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayDate;
          const hasSchedule = markedDates.has(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={[
                'relative rounded-full py-2 transition',
                isSelected
                  ? 'bg-amber-600 text-white'
                  : isToday
                    ? 'bg-amber-100 text-amber-800'
                    : 'text-stone-700 hover:bg-stone-100',
              ].join(' ')}
            >
              {day}
              {hasSchedule && !isSelected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
