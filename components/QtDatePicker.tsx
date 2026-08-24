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
  initialDate,
}: {
  onChange: (date: string, schedule: QtSchedule | null) => void;
  // 지정 안 하면 오늘로 시작(나눔 쓰기 등 기존 동작 그대로). 관리자 말씀 등록처럼 저장 후
  // 이 컴포넌트가 다시 마운트될 때, 작업하던 날짜에 그대로 머물게 하려면 넘겨준다
  // (안 넘기면 매번 오늘로 초기화되면서 미리 등록하던 미래 날짜를 놓치기 쉬움).
  initialDate?: string;
}) {
  const today = todayDateString();
  const start = initialDate ?? today;
  const [startYear, startMonth] = start.split('-').map(Number);

  const [viewYear, setViewYear] = useState(startYear);
  const [viewMonth, setViewMonth] = useState(startMonth - 1);
  const [selectedDate, setSelectedDate] = useState(start);
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
