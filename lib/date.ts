// new Date()의 로컬 getter는 실행 환경의 시스템 시간대를 따르는데, Vercel 서버는
// UTC로 돌아간다(브라우저는 한국 시간이라 문제없이 동작해서 로컬 테스트에선 안 드러났던 버그).
// 그래서 자정~오전 9시(KST) 사이엔 서버가 "오늘"을 하루 전날로 계산해버렸다.
// 이 앱은 한국 전용이므로 UTC+9(KST)로 고정 계산해서 실행 환경과 무관하게 맞춘다.
export function todayDateString() {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const year = kstNow.getUTCFullYear();
  const month = String(kstNow.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstNow.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toDateString(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function monthRange(year: number, month: number) {
  const first = toDateString(new Date(year, month, 1));
  const last = toDateString(new Date(year, month + 1, 0));
  return { first, last };
}
