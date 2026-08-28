'use client';

import { useState } from 'react';
import QtDatePicker from '@/components/QtDatePicker';
import QTScheduleForm from '@/components/QTScheduleForm';
import { todayDateString } from '@/lib/date';
import type { QtSchedule } from '@/types/database';

export default function ScheduleAdminView({ userId }: { userId: string }) {
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [schedule, setSchedule] = useState<QtSchedule | null>(null);
  // 날짜 선택 후 그 날짜의 기존 일정 조회가 끝나기 전까지는 loading=true.
  // 이 사이에 이전 날짜에 바인딩된 폼이 그대로 남아있으면, 캘린더는 새 날짜를 보여주는데
  // 실제 저장은 이전 날짜로 되는 사고가 나서(엔터로 조기 제출 등) 조회 중엔 폼을 잠근다.
  const [loading, setLoading] = useState(true);
  // QtDatePicker의 조회 결과를 그대로 신뢰하되, 저장 직후에는 최신 값으로 한 번 더 갱신되도록 key를 바꿔 재조회시킨다.
  const [refreshKey, setRefreshKey] = useState(0);
  // editing은 오직 handleDateChange(= 조회가 실제로 끝난 시점)나 사용자의 명시적 클릭에서만 바뀐다.
  // QTScheduleForm 내부의 useState(existing === null)로 두면, 저장 직후 재조회 도중 이 컴포넌트가
  // 낡은 existing=null 값으로 먼저 리마운트되는 순간 editing이 잘못 굳어버릴 수 있었다.
  const [editing, setEditing] = useState(true);

  function handleDateChange(date: string, next: QtSchedule | null) {
    setSelectedDate(date);
    setSchedule(next);
    setEditing(next === null);
  }

  return (
    <div className="space-y-4">
      <QtDatePicker
        key={refreshKey}
        onChange={handleDateChange}
        onLoadingChange={setLoading}
        initialDate={selectedDate}
      />
      {loading ? (
        <p className="text-sm text-stone-400">불러오는 중...</p>
      ) : (
        <QTScheduleForm
          key={`${selectedDate}-${refreshKey}`}
          date={selectedDate}
          existing={schedule}
          editing={editing}
          userId={userId}
          onStartEdit={() => setEditing(true)}
          onCancelEdit={() => setEditing(false)}
          onSaved={() => setRefreshKey((k) => k + 1)}
          onCancel={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
