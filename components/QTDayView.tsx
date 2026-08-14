import type { QtSchedule } from '@/types/database';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
}

export default function QTDayView({
  date,
  schedule,
}: {
  date: string;
  schedule: QtSchedule | null;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-xs text-stone-400">{formatDate(date)}</p>
      {schedule ? (
        <>
          <h2 className="mt-1 text-lg font-semibold text-stone-800">{schedule.title}</h2>
          <p className="mt-1 text-sm font-medium text-amber-700">{schedule.verse_ref}</p>

          {schedule.sections.length > 0 ? (
            <div className="mt-4 space-y-5">
              {schedule.sections.map((section, i) => (
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
              {schedule.verse_text}
            </div>
          )}

          {schedule.summary && (
            <div className="mt-5">
              <h3 className="mb-2 font-medium text-amber-700">본문요약</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700">
                {schedule.summary}
              </p>
            </div>
          )}

          {schedule.prayer && (
            <div className="mt-5">
              <h3 className="mb-2 font-medium text-amber-700">중보기도</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700">
                {schedule.prayer}
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="mt-6 py-6 text-center text-sm text-stone-400">
          아직 등록된 QT가 없어요.
        </p>
      )}
    </div>
  );
}
