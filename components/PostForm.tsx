'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import VerseLookup, { type VerseLookupResult } from '@/components/VerseLookup';
import ShareGroupModal from '@/components/ShareGroupModal';
import type { Post, QtSection } from '@/types/database';

type Props =
  | {
      mode: 'create';
      userId: string;
      qtDate: string;
      qtTitle: string;
      qtVerseRef: string;
      qtVerseText: string;
      qtSections: QtSection[];
      preselectedGroupId?: string;
      onCreated: (post: Post) => void;
    }
  | { mode: 'edit'; userId: string; post: Post; onDone: () => void };

export default function PostForm(props: Props) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';

  const [resolved, setResolved] = useState<VerseLookupResult | null>(
    isEdit ? { ref: props.post.verse_ref, text: props.post.verse_text } : null
  );
  const [content, setContent] = useState(isEdit ? props.post.content : '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  function validate() {
    if (isEdit && !resolved) {
      setError('구절을 먼저 확인해주세요.');
      return false;
    }
    if (!content.trim()) {
      setError('나눔 내용을 입력해주세요.');
      return false;
    }
    setError(null);
    return true;
  }

  async function handleEditSave() {
    if (!validate() || !resolved || !isEdit) return;

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('posts')
      .update({ verse_ref: resolved.ref, verse_text: resolved.text, content: content.trim() })
      .eq('id', props.post.id);

    setSubmitting(false);
    if (error) {
      setError('수정하지 못했어요. 다시 시도해주세요.');
      return;
    }
    props.onDone();
    router.refresh();
  }

  async function saveOrShare(groupIds: string[]) {
    if (isEdit) return;

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: newPost, error } = await supabase.rpc('create_post_with_shares', {
      p_qt_date: props.qtDate,
      p_verse_ref: props.qtVerseRef,
      p_verse_text: props.qtVerseText,
      p_content: content.trim(),
      p_group_ids: groupIds,
    });

    setSubmitting(false);
    if (error || !newPost) {
      setError('저장하지 못했어요. 다시 시도해주세요.');
      return;
    }

    setShowShareModal(false);
    props.onCreated(newPost);
  }

  function handleSaveOnly() {
    if (!validate()) return;
    saveOrShare([]);
  }

  function handleOpenShareModal() {
    if (!validate()) return;
    setShowShareModal(true);
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      {isEdit ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-600">말씀 구절</label>
          <VerseLookup initialRef={props.post.verse_ref} onResolved={setResolved} />
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-stone-800">{props.qtTitle}</h2>
          <p className="mt-1 text-sm font-medium text-amber-700">{props.qtVerseRef}</p>
          {props.qtSections.length > 0 ? (
            <div className="mt-4 space-y-5">
              {props.qtSections.map((section, i) => (
                <div key={i}>
                  <h3 className="mb-2 font-medium text-amber-700">{section.heading}</h3>
                  <div className="whitespace-pre-line rounded-lg bg-stone-100 p-4 text-sm leading-relaxed text-stone-700">
                    {section.verse_text}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 whitespace-pre-line rounded-lg bg-stone-100 p-4 text-sm leading-relaxed text-stone-700">
              {props.qtVerseText}
            </div>
          )}
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600">나눔</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder="오늘 말씀에서 느낀 점, 삶에 적용할 부분을 나눠주세요"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        {isEdit ? (
          <>
            <button
              type="button"
              onClick={handleEditSave}
              disabled={submitting}
              className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? '저장 중...' : '수정 완료'}
            </button>
            <button
              type="button"
              onClick={props.onDone}
              className="rounded-lg border border-stone-300 px-5 py-2 text-sm text-stone-600"
            >
              취소
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleSaveOnly}
              disabled={submitting}
              className="rounded-lg border border-stone-300 px-5 py-2 text-sm font-medium text-stone-700 disabled:opacity-50"
            >
              {submitting ? '저장 중...' : '저장하기'}
            </button>
            <button
              type="button"
              onClick={handleOpenShareModal}
              disabled={submitting}
              className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              공유하기
            </button>
          </>
        )}
      </div>

      {!isEdit && showShareModal && (
        <ShareGroupModal
          initialSelected={props.preselectedGroupId ? [props.preselectedGroupId] : []}
          submitting={submitting}
          onConfirm={(groupIds) => saveOrShare(groupIds)}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
