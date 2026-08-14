'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { monthRange, todayDateString } from '@/lib/date';
import QTCalendar from '@/components/QTCalendar';
import type { QtSchedule } from '@/types/database';

// 캘린더로 날짜를 고르면 그 날짜의 qt_schedule을 조회해 부모에게 알려주는 공용 컴포넌트.
// `나눔 쓰기`와 관리자 `말씀 등록` 페이지 양쪽에서 재사용한다(PLAN.md 참고).
export default function QtDatePicker({
  onChange,
}: {
  onChange: (date: string, schedule: QtSchedule | null) => void;
}) {
  const today = todayDateString();
  const now = new Date();

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('qt_schedule')
      .select('*')
      .eq('qt_date', selectedDate)
      .maybeSingle()
      .then(({ data }) => onChange(selectedDate, data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    const supabase = createClient();
    const { first, last } = monthRange(viewYear, viewMonth);
    supabase
      .from('qt_schedule')
      .select('qt_date')
      .gte('qt_date', first)
      .lte('qt_date', last)
      .then(({ data }) => {
        setMarkedDates(new Set((data ?? []).map((row) => row.qt_date)));
      });
  }, [viewYear, viewMonth]);

  function changeMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  return (
    <QTCalendar
      year={viewYear}
      month={viewMonth}
      selectedDate={selectedDate}
      markedDates={markedDates}
      todayDate={today}
      onSelectDate={setSelectedDate}
      onPrevMonth={() => changeMonth(-1)}
      onNextMonth={() => changeMonth(1)}
    />
  );
}
