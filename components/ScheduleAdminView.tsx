'use client';

import { useState } from 'react';
import QtDatePicker from '@/components/QtDatePicker';
import QTScheduleForm from '@/components/QTScheduleForm';
import { todayDateString } from '@/lib/date';
import type { QtSchedule } from '@/types/database';

export default function ScheduleAdminView({ userId }: { userId: string }) {
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [schedule, setSchedule] = useState<QtSchedule | null>(null);
  // QtDatePicker의 조회 결과를 그대로 신뢰하되, 저장 직후에는 최신 값으로 한 번 더 갱신되도록 key를 바꿔 재조회시킨다.
  const [refreshKey, setRefreshKey] = useState(0);

  function handleDateChange(date: string, next: QtSchedule | null) {
    setSelectedDate(date);
    setSchedule(next);
  }

  return (
    <div className="space-y-4">
      <QtDatePicker key={refreshKey} onChange={handleDateChange} />
      <QTScheduleForm
        key={`${selectedDate}-${refreshKey}`}
        date={selectedDate}
        existing={schedule}
        userId={userId}
        onSaved={() => setRefreshKey((k) => k + 1)}
        onCancel={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
