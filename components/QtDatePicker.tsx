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
  onLoadingChange,
  initialDate,
}: {
  onChange: (date: string, schedule: QtSchedule | null) => void;
  // 날짜를 고른 시점과 그 날짜의 qt_schedule 조회가 끝나는 시점 사이엔 시차가 있다.
  // 그 사이에도 이전 날짜에 바인딩된 폼이 그대로 조작 가능하면, 캘린더는 이미 다음 날짜를
  // 보여주는데 실제 저장은 이전 날짜로 되는 사고가 난다. 조회 중임을 부모에게 알려서
  // 그 틈에는 폼을 잠그도록(로딩 표시) 하기 위한 콜백.
  onLoadingChange?: (loading: boolean) => void;
  // 지정 안 하면 오늘로 시작(나눔 쓰기 등 기존 동작 그대로). 관리자 말씀 등록처럼 저장 후
  // 이 컴포넌트가 다시 마운트될 때, 작업하던 날짜에 그대로 머물게 하려면 넘겨준다
  // (안 넘기면 매번 오늘로 초기화되면서 미리 등록하던 미래 날짜를 놓치기 쉽다).
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
    let cancelled = false;
    onLoadingChange?.(true);
    supabase
      .from('qt_schedule')
      .select('*')
      .eq('qt_date', selectedDate)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        onLoadingChange?.(false);
        onChange(selectedDate, data);
      });
    return () => {
      cancelled = true;
    };
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
