'use client';

import { useMemo, useState } from 'react';
import PostCard from '@/components/PostCard';
import QTCalendar from '@/components/QTCalendar';
import { todayDateString } from '@/lib/date';
import type { PostWithAuthor } from '@/types/database';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
}

export default function PostFeedView({
  posts,
  titleByDate,
  emptyMessage = '아직 올라온 나눔이 없어요. 첫 나눔을 남겨보세요.',
}: {
  posts: PostWithAuthor[];
  titleByDate: Record<string, string>;
  emptyMessage?: string;
}) {
  const today = todayDateString();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [filterDate, setFilterDate] = useState<string | null>(null);

  const markedDates = useMemo(() => new Set(posts.map((p) => p.qt_date)), [posts]);
  const dates = useMemo(
    () => [...new Set(posts.map((p) => p.qt_date))].sort((a, b) => (a < b ? 1 : -1)),
    [posts]
  );
  const visibleDates = filterDate ? dates.filter((d) => d === filterDate) : dates;

  function changeMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  return (
    <div className="space-y-4">
      <QTCalendar
        year={viewYear}
        month={viewMonth}
        selectedDate={filterDate ?? ''}
        markedDates={markedDates}
        todayDate={today}
        onSelectDate={(d) => setFilterDate(d)}
        onPrevMonth={() => changeMonth(-1)}
        onNextMonth={() => changeMonth(1)}
      />

      {filterDate && (
        <button
          onClick={() => setFilterDate(null)}
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          ← 전체 보기
        </button>
      )}

      {visibleDates.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-stone-400 shadow-sm">
          {filterDate ? '이 날짜엔 나눔이 없어요.' : emptyMessage}
        </p>
      ) : (
        <div className="space-y-6">
          {visibleDates.map((date) => (
            <section key={date}>
              <h2 className="mb-2">
                <span className="text-sm font-medium text-stone-500">{formatDate(date)}</span>
                {titleByDate[date] && (
                  <span className="mt-0.5 block text-base font-semibold text-amber-700">
                    {titleByDate[date]}
                  </span>
                )}
              </h2>
              <div className="space-y-2">
                {posts
                  .filter((p) => p.qt_date === date)
                  .map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
