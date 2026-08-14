'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import QtDatePicker from '@/components/QtDatePicker';
import PostForm from '@/components/PostForm';
import NanumPreview from '@/components/NanumPreview';
import { todayDateString } from '@/lib/date';
import type { Post, QtSection } from '@/types/database';

// "나눔 쓰기" 화면 전체를 관리 — 날짜를 고르면 그 날짜에 이미 쓴 글이 있는지 먼저 확인해서,
// 있으면 읽기 전용으로 보여주고(NanumPreview), 없으면 새로 쓰는 폼(PostForm)을 보여준다.
// 2026-08-13부터 나눔은 항상 그날 등록된 QT 일정의 구절만 사용(구절 직접 입력 폐지) —
// 그래서 그 날짜에 QT 일정이 없으면 아예 쓸 수 없고 안내만 보여준다.
export default function DailyNanum({
  userId,
  preselectedGroupId,
}: {
  userId: string;
  preselectedGroupId?: string;
}) {
  const [qtDate, setQtDate] = useState(todayDateString());
  const [existingPost, setExistingPost] = useState<Post | null>(null);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleRef, setScheduleRef] = useState('');
  const [scheduleText, setScheduleText] = useState('');
  const [scheduleSections, setScheduleSections] = useState<QtSection[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function handleDateChange(
    date: string,
    schedule: { title: string; verse_ref: string; verse_text: string; sections: QtSection[] } | null
  ) {
    setQtDate(date);
    setLoaded(false);

    const supabase = createClient();
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .eq('qt_date', date)
      .maybeSingle();

    setExistingPost(data ?? null);
    setScheduleTitle(schedule?.title ?? '');
    setScheduleRef(schedule?.verse_ref ?? '');
    setScheduleText(schedule?.verse_text ?? '');
    setScheduleSections(schedule?.sections ?? []);
    setLoaded(true);
  }

  return (
    <div className="space-y-4">
      <QtDatePicker onChange={handleDateChange} />

      {!loaded ? (
        <p className="text-sm text-stone-400">불러오는 중...</p>
      ) : existingPost ? (
        <NanumPreview post={existingPost} title={scheduleTitle} sections={scheduleSections} />
      ) : scheduleRef ? (
        <PostForm
          key={qtDate}
          mode="create"
          userId={userId}
          qtDate={qtDate}
          qtTitle={scheduleTitle}
          qtVerseRef={scheduleRef}
          qtVerseText={scheduleText}
          qtSections={scheduleSections}
          preselectedGroupId={preselectedGroupId}
          onCreated={(post) => setExistingPost(post)}
        />
      ) : (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-stone-400 shadow-sm">
          아직 등록된 QT가 없어요. 관리자가 이 날짜의 QT를 등록하면 나눔을 쓸 수 있어요.
        </p>
      )}
    </div>
  );
}
