# QT 나눔 — 구현 계획

## Context

**목표**: 교회 QT 소모임이 카카오 로그인으로 들어와 관리자가 등록한 "오늘의 QT"(주제+구절+원문)를 보고, QT 나눔을 올려 서로의 나눔에 댓글·아멘을 남기는 웹앱 MVP를 2주 안에 만들어 실제 배포한다.

**배경**: 현재 카톡 단톡방에 QT 나눔과 공지·잡담이 섞여 나눔 글을 찾아보기 불편함. 공지사항 기능은 스코프에서 제외(카톡에 남김), 나눔 전용 공간만 만든다. 참고 앱 "우리들교회달력"처럼 날짜별 주제+구절+원문을 캘린더로 보여주는 화면을 원하지만, 주제·일정 자체는 QT 교재(큐티인)의 저작물이라 자동 수집은 불가능 — 관리자가 짧게 수동 입력하고 성경 원문만 자동 결합하는 방식으로 절충했다.

**소스 오브 트루스**: `/Users/gim-yechan/Desktop/개인 프로젝트/QT/SPEC.md`

---

## 방향 개요

- **프레임워크**: Next.js(App Router) 단일 프로젝트. 커스텀 백엔드 서버 없이 Supabase JS 클라이언트로 DB 직접 호출(RLS로 권한 강제). OAuth 콜백 처리용 Route Handler 1개만 예외.
- **DB**: Supabase Postgres. `profiles` / `bible_verses` / `posts` / `comments` / `reactions` / `qt_schedule` 6개 테이블. RLS로 "로그인 안 하면 아무것도 못 봄", "본인 글/댓글/반응만 쓰기 가능", "`qt_schedule` 쓰기는 관리자만" 강제.
- **성경 데이터**: 개역한글 오픈 JSON 데이터셋을 1회성 스크립트로 `bible_verses`에 시딩. 이후 앱은 이 테이블만 조회.
- **QT 일정**: 관리자가 날짜별 주제+구절 참조를 직접 입력 → 구절 참조로 `bible_verses`를 조회해 원문 스냅샷과 함께 `qt_schedule`에 저장. 자동 수집 없음.
- **인증**: Supabase Auth의 Kakao Provider. 로그인 안 된 상태로 `/`, `/posts/*`, `/today` 접근 시 `/login`으로 리다이렉트(서버 컴포넌트에서 세션 체크).
- **관리자 판별**: `profiles.is_admin boolean`. 앱 내 UI로 부여하지 않고 사용자가 Supabase 대시보드에서 최초 1회 직접 켬.
- **상태 관리**: 클라이언트 컴포넌트는 `useState`만. 서버 데이터는 Server Component에서 직접 fetch, 별도 캐싱 라이브러리 없음.

---

## A. 스캐폴딩

### Next.js 프로젝트 생성
```bash
cd "/Users/gim-yechan/Desktop/개인 프로젝트/QT"
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
npm install @supabase/supabase-js @supabase/ssr
```

### Supabase (사용자가 직접, CLAUDE.md 참조)
1. supabase.com에서 프로젝트 생성 (무료 티어)
2. 카카오 개발자 콘솔에서 앱 생성 → REST API 키, Redirect URI(`https://<project>.supabase.co/auth/v1/callback`) 등록
3. Supabase 대시보드 Authentication → Providers → Kakao 활성화, 키 입력
4. `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 입력

### 파일 트리 (스캐폴드 후)
```
QT/
  SPEC.md  CLAUDE.md  PLAN.md
  package.json  app/globals.css(Tailwind v4, CSS-first 설정)  .env.local  proxy.ts
  supabase/
    migrations/
      0001_init.sql
      0002_qt_schedule_sections.sql
    seed/
      import_bible.ts
  app/
    layout.tsx
    login/page.tsx
    auth/callback/route.ts
    (protected)/
      layout.tsx        # 세션 체크 + NavBar, 하위 라우트 전부에 적용
      page.tsx           # 피드 (= "/")
      today/page.tsx     # 오늘 것만, 캘린더 없음
      posts/new/page.tsx  # 캘린더로 날짜 선택 + 나눔 작성
      posts/[id]/page.tsx
      schedule/page.tsx   # 관리자 전용 — 날짜별 QT 일정 등록
  components/     # app/ 밖, "@/components/*"
  lib/            # "@/lib/*"
  types/          # "@/types/*"
```

---

## B. DB 스키마 (`supabase/migrations/0001_init.sql`)

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table bible_verses (
  id bigserial primary key,
  book text not null,
  chapter int not null,
  verse int not null,
  text text not null,
  version text not null default '개역한글',
  unique (book, chapter, verse, version)
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  qt_date date not null default current_date,
  verse_ref text not null,
  verse_text text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table qt_schedule (
  id uuid primary key default gen_random_uuid(),
  qt_date date not null unique,
  title text not null,
  verse_ref text not null,
  verse_text text not null,
  summary text not null default '',
  prayer text not null default '',
  sections jsonb not null default '[]'::jsonb, -- [{ heading, verse_ref, verse_text }]
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

`summary`/`prayer`/`sections` 3개 컬럼은 `supabase/migrations/0002_qt_schedule_sections.sql`에서 추가(2026-08-11, SPEC.md §4-7 참고).

### RLS 정책 (요지)
- 전 테이블 `enable row level security`.
- `profiles`/`posts`/`comments`/`reactions`/`bible_verses`/`qt_schedule`: `select` — `auth.role() = 'authenticated'`이면 전체 허용(단일 그룹, 모두가 서로의 글과 QT 일정을 봄).
- `posts`/`comments`/`reactions` `insert`: `user_id = auth.uid()`.
- `posts` `update`/`delete`: `user_id = auth.uid()`.
- `comments` `delete`: `user_id = auth.uid()` (수정은 지원 안 함 — SPEC §5 "가장 단순한 쪽").
- `reactions` `delete`: `user_id = auth.uid()` (아멘 토글용).
- `bible_verses` `insert`/`update`/`delete`: 클라이언트 권한 없음. 시딩은 service role 키로 서버 스크립트에서만.
- `qt_schedule` `insert`/`update`/`delete`: `exists (select 1 from profiles where id = auth.uid() and is_admin = true)`만 허용. 일반 모임원은 select만 가능.

### 트리거
- `auth.users` insert 시 `profiles` 행 자동 생성 트리거(`nickname`은 카카오 프로필의 `nickname` 메타데이터에서 가져옴, 없으면 "이름 없음". `is_admin`은 기본값 `false`).

---

## C. 성경 데이터 시딩 (`supabase/seed/import_bible.ts`)

- 소스: [MaatheusGois/bible](https://github.com/MaatheusGois/bible) 저장소의 한국어(`kr`) JSON (책/장/절 구조화). 형식이 안 맞으면 [ehrudxo/kbible1950](https://github.com/ehrudxo/kbible1950)으로 대체 — **실제 파일 구조는 시딩 스크립트 작성 시점에 직접 확인 후 파서 작성**.
- 1회성 Node 스크립트: JSON을 읽어 `{book, chapter, verse, text, version: '개역한글'}` 배열로 변환 → Supabase service role 키로 `bible_verses`에 upsert.
- 실행은 사용자 로컬에서 1회: `npx tsx supabase/seed/import_bible.ts` (service role 키는 `.env.local`에만 존재, 커밋 금지).

---

## D. 구절 참조 파싱 (`lib/verseRef.ts`)

**입력 형식**: `창세기 1:1-10` 또는 `창세기 1:1`

```ts
const VERSE_REF_RE = /^([가-힣]+)\s*(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?$/;

export type ParsedRef = { book: string; chapter: number; verseStart: number; verseEnd: number };

export function parseVerseRef(raw: string): ParsedRef | null {
  const m = raw.trim().match(VERSE_REF_RE);
  if (!m) return null;
  const [, book, chapter, vStart, vEnd] = m;
  return {
    book,
    chapter: Number(chapter),
    verseStart: Number(vStart),
    verseEnd: vEnd ? Number(vEnd) : Number(vStart),
  };
}
```

- `lib/bibleBooks.ts`에 성경 66권 한글 이름 배열 → `book`이 목록에 없으면 파싱 실패 취급.
- 원문 조회: `bible_verses`에서 `book`/`chapter`/`verse between verseStart and verseEnd` 조회 → `verse` 오름차순 정렬 후 줄바꿈으로 join.
- 파싱 실패·구절 없음 → "구절 형식을 확인해주세요 (예: 창세기 1:1-10)" 에러 문구, throw 금지.

---

## E. 인증 (`lib/supabase/*`, `app/login`, `app/auth/callback`, `proxy.ts`)

> **Next.js 버전 참고**: 스캐폴딩된 Next.js는 16.x — `middleware.ts` 관례가 `proxy.ts`로 이름이 바뀌었고(동작은 동일, `export function proxy(request)`), `cookies()`는 비동기 함수, 페이지/Route Handler의 `params`는 `Promise`다. 아래 설계는 이 버전 기준.

- `lib/supabase/client.ts`: 브라우저용 `createBrowserClient` (컴포넌트에서 로그인 버튼, 아멘 토글 등에 사용).
- `lib/supabase/server.ts`: 서버 컴포넌트/Route Handler용 `createServerClient` — `cookies: { getAll, setAll }` 형태로 구성(`await cookies()` 결과의 `getAll()`/`set()` 위임). deprecated된 `get`/`set`/`remove` 개별 메서드 방식은 쓰지 않음.
- `proxy.ts` (프로젝트 루트): Supabase 세션 토큰을 요청마다 갱신하기 위한 Proxy. `createServerClient`를 요청 쿠키/응답 쿠키에 연결하고 `supabase.auth.getClaims()`(또는 `getUser()`) 호출로 세션 갱신 트리거. `matcher`로 정적 자산 제외.
- `app/login/page.tsx`: "카카오로 로그인" 버튼 → `supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: '.../auth/callback' } })`.
- `app/auth/callback/route.ts`: `exchangeCodeForSession` 처리 후 `/`로 리다이렉트.
- `app/layout.tsx` 또는 각 보호 페이지 상단에서 서버 세션 체크(`await supabase.auth.getUser()`) → 없으면 `redirect('/login')`.

---

## F. 프론트 페이지 & 컴포넌트

> **2026-08-12 재구성 1차**: "오늘의 QT"에 있던 캘린더를 없애고(우리들교회달력의 "묵상하기" 탭처럼 오늘 것만 단순 표시), 캘린더는 ①나눔 쓰기(어느 날짜 QT인지 고르기), ②관리자 전용 `/schedule`(날짜별 일정 등록) 두 곳으로 옮김.
>
> **2026-08-12 재구성 2·3차(최종은 §K)**: 그룹 기능 도입으로 "피드"와 "나눔 쓰기"의 실제 구현이 두 번 더 바뀜 — **아래 두 섹션(`app/(protected)/page.tsx`, `app/(protected)/posts/new/page.tsx`)은 역사적 기록으로 남겨두고, 실제로는 §K "그룹 기능 — 최종안"에 적힌 `groups/page.tsx`·`groups/[id]/page.tsx`·(최상위로 돌아온) `posts/new/page.tsx` 구조를 따른다.** 나머지(레이아웃·오늘의 QT·나눔 상세·공통 컴포넌트) 서술은 그대로 유효.

### `app/(protected)/layout.tsx` (Server Component)
- 세션 체크(`await supabase.auth.getUser()`) → 없으면 `/login` 리다이렉트. 이 레이아웃 아래 모든 라우트에 공통 적용되므로 각 페이지에서 반복하지 않음.
- `profiles`에서 현재 사용자의 `is_admin` 조회 → `components/NavBar.tsx`에 전달(관리자면 "말씀 등록" 메뉴 노출).

### ~~`app/(protected)/page.tsx` (피드, Server Component)~~ — §K로 대체됨, `/groups`로 리다이렉트하는 얇은 라우트로 남음
- ~~`posts`를 `created_at desc`로 조회(작성자 닉네임 join), 댓글 수·아멘 수 함께 집계.~~
- ~~`components/PostCard.tsx`로 리스트 렌더. 상단에 "나눔 쓰기" 링크(`/posts/new`).~~ (§K의 `groups/[id]/page.tsx`가 대체)

### `app/(protected)/today/page.tsx` — 오늘의 QT (Server Component)
- 캘린더 없음. 오늘 날짜로 `qt_schedule` 1건만 서버에서 조회해 `components/QTDayView.tsx`로 그대로 렌더.
- 일정 없으면 `QTDayView` 내부에서 "아직 등록된 QT가 없어요" 안내.

### ~~`app/(protected)/posts/new/page.tsx`~~ → `app/(protected)/groups/[id]/posts/new/page.tsx` (§K에서 위치만 이동, 내용은 아래 그대로 유효) → `components/PostForm.tsx` (Client Component)
- 상단에 `components/QtDatePicker.tsx`(캘린더, 기본값 오늘) — 날짜를 고르면 그 날짜의 `qt_schedule`을 조회해 구절 참조를 자동 prefill(사용자가 직접 수정도 가능), 없으면 빈 입력.
- `components/VerseLookup.tsx` 재사용해 구절 참조 입력 + 원문 미리보기. 자동 채운 값 그대로면 소주제별로 나눠 보여줌(직접 다른 구절로 바꾸면 일반 미리보기로 전환).
- 나눔 텍스트 `<textarea>`.
- 제출 시 `posts` insert — `qt_date`는 캘린더에서 고른 날짜, `group_id`는 URL 파라미터(`params.id`), `verse_text`는 미리보기에서 조회된 원문 스냅샷.
- 수정 모드는 캘린더 없이 기존 값만 prefill(글의 날짜·그룹은 수정 시 바꾸지 않음).

### `app/(protected)/posts/[id]/page.tsx` (Server Component)
- 글 상세 + 원문 + `components/CommentList.tsx` + `components/CommentForm.tsx`(client) + `components/AmenButton.tsx`(client, 낙관적 토글).
- `user_id === session.user.id`일 때만 수정/삭제 버튼 노출(`components/PostActions.tsx`).

### `app/(protected)/schedule/page.tsx` — 말씀 등록 (관리자 전용, Server Component 래퍼)
- 세션의 `profiles.is_admin`이 아니면 `/`로 리다이렉트(서버 쪽 1차 방어, RLS가 2차 방어).
- `components/ScheduleAdminView.tsx`(client) 렌더 — `QtDatePicker`로 날짜 선택 + `components/QTScheduleForm.tsx`를 그 날짜에 항상 바인딩해서 표시(주제·전체구절·소주제 목록·본문요약·중보기도).

### 공통 컴포넌트
- `components/KakaoLoginButton.tsx`
- `components/NavBar.tsx` — 로그인 후 상단 고정 네비게이션: 피드 / **나눔**(2026-08-12부로 "나눔 쓰기"에서 라벨 축약, 경로는 그대로 `/posts/new`) / 오늘의 QT / (관리자만) 말씀 등록 / 로그아웃. `isAdmin` prop으로 마지막 링크 노출 여부 결정
- `components/BackButton.tsx` (2026-08-12 추가, client) — `router.back()`으로 이전 화면으로 이동하는 "← 뒤로" 버튼. 그룹 화면(`groups/[id]`)·나눔 상세(`posts/[id]`) 등 "더 들어간" 화면 상단에서만 사용, 상단 탭으로 도달하는 최상위 화면에는 안 씀(이미 네비게이션이 있어서)
- `components/PostCard.tsx` — 작성자·날짜·구절 참조·본문 요약·아멘 수 (댓글 수 배지는 2026-08-12부로 주석 처리, §K 버전 히스토리 9차 이전 댓글 비활성화 결정 참고)
- `components/VerseLookup.tsx` — 구절 참조 입력(책+장+절 전체) + `lib/verseRef.ts`의 `parseVerseRef` 파싱 + `bible_verses` 조회 + 원문 표시. `PostForm`과 `QTScheduleForm`의 "전체 말씀 구절" 입력란에서 재사용(2026-08-13부터 `QtSectionEditor`는 더 이상 이 컴포넌트를 쓰지 않음 — 아래 참고)
- `components/QtDatePicker.tsx` — 캘린더+월별 일정조회 로직을 캡슐화한 공용 컴포넌트. 날짜를 고르면 그 날짜의 `qt_schedule`을 조회해 `onChange(date, schedule)`로 부모에 알림. `PostForm`과 `ScheduleAdminView` 양쪽에서 재사용(내부적으로 `QTCalendar` 사용)
- `components/QTCalendar.tsx` — 월간 캘린더 UI 자체(순수 프레젠테이션), `QtDatePicker`가 상태를 관리하고 이 컴포넌트에 props로 넘김
- `components/QTDayView.tsx` — 선택된 날짜의 주제+구절(소주제 구분 포함)+본문요약+중보기도 표시. `today/page.tsx`와 관리자 미리보기 등에서 재사용
- `components/ScheduleAdminView.tsx` — `/schedule` 페이지 전용 client 컴포넌트, `QtDatePicker` + `QTScheduleForm` 조합
- `components/QTScheduleForm.tsx` — 관리자 전용 일정 등록/수정 폼(주제·전체구절·소주제 목록·본문요약·중보기도)
- `components/QtSectionEditor.tsx` (2026-08-13 UX 개선) — 소주제(제목+구절) 여러 개를 추가/삭제하는 반복 입력 UI, `QTScheduleForm` 내부에서 사용. 소주제 구절은 항상 위 "전체 말씀 구절"과 같은 책/장 안에서 절만 나뉜다는 점에 착안해, 매번 "신명기 6:16-19"를 통째로 입력하지 않고 **절 번호만**(예: `16-19`) 입력받음 — `overallRef`(부모의 전체 구절 문자열)를 `parseVerseRef`로 파싱해 책/장을 얻고, 입력값은 새 `lib/verseRef.ts`의 `parseVerseRange`로 파싱(`"16-19"` 또는 `"16"`)해 합친 뒤 `bible_verses`를 직접 조회(`VerseLookup` 재사용 안 함, 이 조회 로직은 컴포넌트 내부에 있음). 절 범위가 전체 구절의 시작~끝 범위를 벗어나면 에러 문구로 막음. 전체 구절이 아직 안 정해졌으면(`overallRef` 파싱 실패) 소주제 입력 자체가 비활성화되고 안내 문구 표시
- `components/AmenButton.tsx` — 클릭 시 낙관적 UI 업데이트 후 insert/delete
- `components/CommentList.tsx`, `components/CommentForm.tsx` — **2026-08-12부로 미사용**(사용자 요청으로 댓글 기능 비활성화). 파일은 삭제하지 않고 그대로 둠, 호출부만 주석 처리(§4-4 비활성화 메모 참고). 복구 시 이 두 컴포넌트를 그대로 다시 import
- `components/PostBody.tsx` — 본문 표시 ↔ `PostForm`(수정 모드) 전환을 담당하는 client 컴포넌트. `posts/[id]` 페이지(Server Component)는 이 컴포넌트에 데이터만 내려주고 상태는 여기서 관리. **2026-08-12부터**: 구절 원문 표시를 없애고, 그 날짜의 `qt_schedule.title`(부모가 조회해 `qtTitle` prop으로 내려줌) + 나눔 본문을 박스 영역으로 보여줌
- `components/PostActions.tsx` — 수정 버튼(→ `PostBody`의 편집 모드 토글)/삭제 (본인 글일 때만, `PostBody` 내부에서 사용)

### 스타일 가이드
흰/아이보리 배경, `max-w-2xl` 중앙 컨테이너, `bg-white rounded-2xl shadow-sm p-5` 카드, `stone` 중립 + `amber` 포인트. 모바일 우선(`sm:` 이상에서 여백 확장).

---

## G. End-to-End 통합

### 실행 순서
1. `.env.local`에 Supabase 키 채움 (사용자)
2. `npm run dev` → http://localhost:3000
3. `/login`에서 카카오 로그인 → 콜백 → 피드 진입

### 수동 스모크 테스트
1. 카카오 로그인 → `profiles` 행 자동 생성 확인, 그룹이 없으니 피드 탭이 그룹 만들기/참여 안내로 뜨는지 확인
2. 피드 화면에서 "+ 그룹 만들기"/"+ 초대 코드로 참여" 버튼만 보이는지(폼이 처음부터 안 보이는지) → "+ 그룹 만들기" 클릭 시 이름 입력 폼이 펼쳐지는지, "취소"로 다시 접히는지 확인. 그룹 만들기 → 만든 그룹 화면(`/groups/[id]`)으로 바로 이동하는지, 초대 코드가 보이는지 확인
3. Supabase 대시보드에서 본인 `profiles.is_admin`을 `true`로 수동 설정
4. 네비게이션에 관리자에게만 "말씀 등록" 메뉴가 보이는지 확인 → 들어가서 캘린더로 오늘 날짜 선택 → 주제+`창세기 1:1-10` 등록 → 저장 확인
5. "말씀 등록" 캘린더에서 일정 없는 다른 날짜 클릭 → 폼이 빈 값으로 리셋되는지 확인, 등록 → 그 날짜에도 반영되는지 확인
6. "오늘의 QT" 메뉴 → 캘린더 없이 오늘 날짜 것만(주제+구절+원문) 표시되는지 확인
7. `is_admin`을 다시 `false`로 내린 계정(또는 다른 계정)으로 접속 → "말씀 등록" 메뉴 자체가 안 보이고, `/schedule` 직접 접속 시 `/`로 리다이렉트되는지 확인
8. 그룹 화면에서 "나눔 쓰기" → 캘린더가 보이는지, QT 일정이 등록된 날짜를 고르면 오늘의 QT와 같은 모양으로 주제+구절이 뜨는지(구절 입력란은 없어야 함) 확인 → QT 일정이 없는 날짜를 고르면 "아직 등록된 QT가 없어요" 안내만 뜨고 쓰기 자체가 안 되는지 확인
9. 나눔 텍스트 작성 후 저장 → 폼이 사라지고 그 자리에 읽기 전용 카드("나눔" 라벨 박스 + 수정하기/공유하기 버튼)로 바뀌는지 확인. 같은 날짜를 다시 골라도 폼이 아니라 이 카드가 바로 뜨는지(중복 작성 방지) 확인. 그룹 화면의 해당 날짜 묶음에 반영되는지, 주제가 헤더로 뜨는지, 글에 찍힌 날짜가 캘린더에서 고른 날짜와 일치하는지 확인
10. 다른 카카오 계정으로 로그인 → 초대 코드로 같은 그룹 참여 → 같은 그룹 화면에서 같은 나눔·같은 오늘의 QT가 보이는지 확인(공유 검증)
11. 세 번째 계정(또는 두 번째 계정으로 새 그룹 생성)으로 다른 그룹을 만들어 → 원래 그룹의 나눔이 전혀 안 보이는지, 그룹 목록에도 안 뜨는지 확인(그룹 분리 검증)
12. 아멘 클릭/재클릭(토글) 확인 (댓글은 2026-08-12부로 일시 비활성화, 스킵)
13. 본인 글 수정·삭제, 타인 글에는 버튼 없음 확인
14. 그룹 없이 저장한 글(9번)의 읽기 전용 카드에서 "공유하기" 클릭 → 그룹 선택 팝업에서 그룹 고르고 확정 → 그 그룹 화면에 새로 반영되는지 확인(`add_shares_to_post` 검증)
15. 나눔 상세(`/posts/[id]`)와 그룹 화면(`/groups/[id]`) 상단 "← 뒤로" 버튼 클릭 → 직전 화면으로 정상 이동하는지 확인
16. 모바일 뷰(devtools) 레이아웃 확인
17. Vercel 배포 후 배포 URL에서 1~16 재확인

---

## H. 검증 전략

| 단계 | 다음 단계 넘어가기 전 확인 |
|---|---|
| A 스캐폴딩 | `npm run dev` 빈 페이지 렌더 |
| B DB | Supabase 대시보드에서 6개 테이블 + RLS 정책 존재 확인, `qt_schedule` 쓰기가 비관리자에게 막히는지 확인 |
| C 시딩 | `bible_verses`에 최소 창세기 1장 데이터 존재, 샘플 조회 성공 |
| D 인증 | 로그인 → `profiles` 행 자동 생성, 로그아웃 후 `/` 접근 시 리다이렉트 |
| E 구절 파싱 | 정상 케이스 + 오탈자 케이스 모두 수동 확인 |
| F 페이지 | 각 페이지 mock 세션(관리자/일반 각각)으로 단독 렌더 |
| G 통합 | SPEC.md §7 MVP 성공 조건 12개 수동 통과 |

---

## I. 리스크 & 대응

1. **개역한글 오픈 데이터셋 실제 구조 미검증** → 시딩 스크립트 작성 시점에 원본 JSON 1개 파일을 직접 열어 구조 확인 후 파서 작성. 구조가 안 맞으면 사용자에게 대체 소스 질문.
2. **카카오 로그인 필수 동의항목 이슈**(일부 유저가 동의 못 해 로그인 실패 가능) → 카카오 개발자 콘솔에서 필수 동의항목을 닉네임 정도로 최소화하도록 사용자에게 안내.
3. **Supabase/Vercel 무료 티어 한도** → 소규모 모임 트래픽으로는 충분, 초과 시 알림 오면 그때 대응(선제 최적화 안 함).
4. **RLS 정책 실수로 권한 우회 가능성** → 정책 작성 후 익명 키로 직접 curl/REST 호출해 타인 글 수정 시도, 비관리자 계정으로 `qt_schedule` insert 시도 → 둘 다 거부되는지 수동 확인.
5. **관리자가 QT 일정을 깜빡 등록 안 한 날** → 앱이 죽지 않고 "아직 등록된 QT가 없어요" 안내로 처리(§4-6, 오늘의 QT). 나눔 쓰기 쪽도 같은 날짜엔 "아직 등록된 QT가 없어요" 안내만 뜨고 작성 자체가 막힘(2026-08-13부로 구절 직접 입력을 폐지해서, 그날 QT가 없으면 나눔도 못 씀 — 관리자가 그날그날 QT를 챙겨 등록해야 하는 의존성이 생겼다는 뜻, TODO.md 참고).

---

## J. 하지 말 것 (재확인)

카카오 외 로그인, 나눔/댓글/아멘에 대한 리더 권한(QT 일정 등록만 유일한 예외), 관리자 지정용 앱 내 UI, 공지사항 게시판, 아멘 외 반응, 알림, 검색/태그, 오프라인 지원(서비스 워커), i18n, 그룹 삭제·멤버 추방·그룹 내 역할 구분.
(QT 교재 주제·본문요약·중보기도 수동 입력은 2026-08-11 결정으로 허용, 다중 그룹은 2026-08-12 결정으로 허용, PWA(홈 화면 추가·풀스크린, 오프라인 캐싱은 제외)는 2026-08-14 결정으로 허용 — 전부 TODO.md 참고)

---

## K. 그룹 기능 — 최종안 (2026-08-12, 8차 수정 반영)

카톡 단톡방처럼 한 사람이 여러 그룹에 속함. **나눔 글은 그룹에 소속되지 않고 독립적으로 작성한 뒤, 카톡 공유하기처럼 여러 그룹에 동시에 공유**한다(N:M 관계). 댓글·아멘은 글 자체에 달리므로, 한 글이 여러 그룹에 공유돼 있으면 모든 공유 그룹에서 같은 댓글·아멘을 공유해서 봄. 오늘의 QT·말씀 등록은 그룹과 무관하게 전체 공유. SPEC.md §4-2·§4-3·§4-8~4-10 참고.

> **버전 히스토리**: 1차(그룹당 쿠키로 "현재 그룹" 관리) → 2차(그룹마다 고유 URL, 글 하나는 그룹 하나에 소속) → 3차(글 작성이 그룹 선택 이전에 독립적으로 이뤄지고, 작성 후 그룹을 체크박스로 여러 개 골라 공유. `posts.group_id`(1:1)를 없애고 `post_shares`(N:M)로 교체) → 4차(그룹 공유가 필수가 아니라 선택. 그룹을 하나도 안 골라도 저장은 항상 되고(나만 보는 개인 기록), 작성자 본인은 공유 여부와 무관하게 항상 자기 글을 볼 수 있도록 RLS를 `user_id = auth.uid() OR 공유받은 그룹 멤버`로 변경) → 5차("저장하기"/"공유하기" 버튼을 분리. 인라인 체크박스 대신, "공유하기"를 누르면 그룹 선택 팝업(`ShareGroupModal`)이 뜨고 그 안에서 확정해야 실제로 그룹에 뿌려짐) → 6차(저장 후 상세 페이지로 안 옮기고 나눔 쓰기 화면에 그대로 머묾. 그 화면 자체가 "쓰는 폼 + 내가 쓴 나눔 목록(그룹 공유 여부 무관)"을 합친 화면 — `components/PostFeedView.tsx`(구 `GroupFeedView`, 그룹 종속적이지 않은 이름으로 리네이밍해 재사용)를 그룹 화면과 나눔 쓰기 화면 양쪽에서 씀) → 7차("하루에 하나" 모델 도입 시도 — 날짜에 이미 쓴 글이 있으면 폼에 채워 "이어서 수정". `add_shares_to_post` RPC 추가) → 8차("이어서 수정" 대신 읽기 전용으로. 이미 쓴 날짜면 폼을 아예 안 보여주고 `NanumPreview`(읽기 전용 카드)만 보여줌 — 그 자리에서 바로 고치는 게 아니라 상세 페이지로 가서 수정. 폼(`PostForm`)에서 날짜 선택(`QtDatePicker`)과 기존 글 조회 로직을 분리해 `components/DailyNanum.tsx`(오케스트레이터)로 옮김) → 9차(`NanumPreview` 다듬기. "자세히 보기·수정하기" 텍스트 링크를 없애고 **"수정하기"(상세 페이지 이동)/"공유하기"(팝업)** 두 버튼으로 교체, 나눔 내용도 말씀 영역처럼 "나눔" 라벨 + 박스로 감쌈. 이때 `add_shares_to_post`(기존 글에 그룹 추가)를 처음으로 UI에 연결 — `NanumPreview`의 "공유하기" 버튼이 이 RPC를 호출) → **10차(2026-08-13, 현재, 최종): 구절 직접 입력 폐지**. 나눔 쓰기 폼 위에 있던 "말씀 구절" 입력란+"미리보기" 버튼(`VerseLookup`)을 완전히 없애고, 폼 맨 위에 "오늘의 QT"와 같은 스타일로 그날 QT 일정의 주제+구절(+소주제)을 고정 표시만 함 — 사용자가 명시적으로 "그냥 완전히 삭제"를 선택(구절 입력 UI가 위 자동 표시와 중복이라 불필요하다고 판단). 나눔은 항상 그날 `qt_schedule`의 구절을 그대로 씀. 부작용: **그 날짜에 QT 일정이 없으면 나눔 자체를 못 씀**(전엔 구절을 직접 입력해서라도 쓸 수 있었음) — `DailyNanum`이 `scheduleRef`가 빈 문자열이면 `PostForm` 대신 "아직 등록된 QT가 없어요" 안내를 렌더.

### DB 스키마

`supabase/migrations/0003_groups.sql` — `groups`, `group_members`, `create_group`, `join_group_by_code` (그대로 유효):

```sql
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);
```

`supabase/migrations/0004_post_shares.sql` — N:M 공유 관계로 교체:

```sql
create table post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  shared_at timestamptz not null default now(),
  unique (post_id, group_id)
);

alter table posts drop column if exists group_id;
```

`supabase/migrations/0005_optional_sharing.sql` — 공유를 선택사항으로 완화:

```sql
create or replace function create_post_with_shares(
  p_qt_date date, p_verse_ref text, p_verse_text text, p_content text,
  p_group_ids uuid[] default '{}'::uuid[]
) returns posts language plpgsql security definer set search_path = public as $$ ... $$;
```

### 글 작성 + 공유 — `create_post_with_shares` RPC로 원자적 처리

글 insert와 여러 그룹에 공유(post_shares insert 여러 건)를 클라이언트에서 따로따로 하면, 두 번째가 실패했을 때 "아무 그룹에도 안 보이는 유령 글"이 생길 수 있다. 그래서 `security definer` 함수 하나로 묶었다.

- `p_group_ids`는 기본값 빈 배열 — **그룹 선택은 필수가 아니다**(0005에서 필수→선택으로 완화). 선택한 그룹이 있으면 각각에 내가 속해있는지 검증 후 `posts` insert → `post_shares` insert(여러 건, 0건이어도 됨)를 한 트랜잭션으로.
- 클라이언트: `supabase.rpc('create_post_with_shares', { p_qt_date, p_verse_ref, p_verse_text, p_content, p_group_ids })` — `p_group_ids`는 빈 배열이어도 정상 호출.
- `groups`/`group_members`와 마찬가지로 `posts`/`post_shares`에도 클라이언트용 INSERT 정책은 없음(이 함수로만 생성). `posts` UPDATE(수정 기능용)만 기존처럼 본인 소유 체크로 직접 허용.

### RLS 요지 (0003+0004+0005 누적, 최종)

- `groups`/`group_members` select: 내가 속한 것만
- `post_shares` select: 그 그룹 멤버만
- `posts`/`comments`/`reactions` select·insert(댓글·아멘): **"내가 쓴 글이거나(`user_id = auth.uid()`), 이 글이 공유된 그룹 중 내가 속한 그룹이 있는가"** — OR 조건. 공유 안 한 글도 작성자 본인은 항상 보고 댓글·아멘 달 수 있어야 하므로 0005에서 추가됨
- `posts` insert는 정책 없음(RPC 전용), `qt_schedule`은 그룹과 무관하게 그대로 유지

### 페이지 & 컴포넌트

- `app/(protected)/page.tsx`: `redirect('/groups')`만 하는 얇은 라우트(안전망, 평소엔 NavBar가 `/groups`를 직접 가리켜서 안 거침).
- `app/(protected)/groups/page.tsx`: 내 그룹 목록(`group_members` join `groups`) — 카톡 채팅방 목록 스타일. `components/GroupList.tsx`(순수 Link 목록) + `CreateGroupSection`/`JoinGroupSection`(둘 다 성공 시 `router.push('/groups/'+id)`).
- `components/CreateGroupSection.tsx`, `components/JoinGroupSection.tsx` (2026-08-12 추가, client) — 처음엔 각각 "+ 그룹 만들기"/"+ 초대 코드로 참여" 버튼만 보이고, 누르면 그 자리에서 기존 `CreateGroupForm`/`JoinGroupForm`이 펼쳐짐("취소"로 다시 접힘). 사용자 피드백: 폼이 처음부터 보이는 게 부담스럽다는 요청으로 버튼 뒤로 숨김
- `app/(protected)/groups/[id]/page.tsx` — **그룹 화면**: `groups`에서 `id`로 조회(RLS가 비멤버는 0건 반환) → 없으면 `/groups`로 리다이렉트. `post_shares`에서 `group_id = id`인 `post_id` 목록을 먼저 뽑고, 그 id들로 `posts`를 `in()` 조회(작성자 join). 날짜별 묶음 + 제목 매핑까지 계산해 `components/PostFeedView.tsx`에 넘김. 상단에 `BackButton` + "나눔 쓰기" 링크(`/posts/new?group=${id}`, 이 그룹을 기본 선택 상태로)
- `components/PostFeedView.tsx` (client, 그룹 화면 전용 — 현재는 `groups/[id]/page.tsx`만 사용): 상단에 `components/QTCalendar.tsx`가 **항상 펼쳐져 있음**(2026-08-13부로 토글 버튼 제거, 마크된 날짜 = 이 목록에 나눔이 있는 날짜, 로컬 데이터로 계산해 별도 쿼리 없음), 그 아래 날짜별 묶음 렌더. 날짜 선택 시 그 날짜만 필터링해서 보여줌(캘린더는 계속 열려 있음, "← 전체 보기"로 해제). `posts`/`titleByDate`/`emptyMessage`만 props로 받음.
- `app/(protected)/posts/new/page.tsx`(최상위, 그룹 비의존): 세션만 확인하고 `components/DailyNanum.tsx`에 `userId`/`searchParams.group`(→`preselectedGroupId`) 전달. 데이터 조회는 전부 클라이언트(`DailyNanum`)가 함.
- `components/DailyNanum.tsx` (client, 오케스트레이터): `QtDatePicker`로 날짜 선택(기본 오늘) → 바뀔 때마다 **그 날짜에 내가 이미 쓴 글이 있는지** `posts`에서 조회(`user_id`+`qt_date`), 그리고 `QtDatePicker`가 함께 내려주는 그 날짜의 `qt_schedule`에서 `title`/`verse_ref`/`verse_text`/`sections`을 전부 state로 보관(2026-08-13부터 `title`·`verse_text`도 챙김 — 구절 직접 입력이 없어지면서 `verse_text`를 `PostForm`에 그대로 내려줘야 저장 가능해짐). 이미 쓴 글이 있으면 `components/NanumPreview.tsx`(읽기 전용, `sections={scheduleSections}` prop으로 그 날짜의 최신 소주제 구성을 그대로 넘겨줌 — 별도 쿼리 없이 재사용). 없고 그 날짜에 `scheduleRef`(=QT 일정)가 있으면 `components/PostForm.tsx`(작성 폼, `key={qtDate}`로 날짜 바뀔 때마다 완전히 리셋)를 렌더 — `qtTitle`/`qtVerseRef`/`qtVerseText`/`qtSections` prop으로 스케줄 내용을 그대로 내려줌. 없고 `scheduleRef`도 없으면(QT 일정 자체가 없는 날짜) "아직 등록된 QT가 없어요" 안내 문구만 렌더(2026-08-13 추가, TODO.md의 "QT 일정 필수화" 결정 참고). `PostForm`이 새 글을 만들면 `onCreated` 콜백으로 `existingPost` state를 채워 즉시 `NanumPreview`로 전환.
- `components/NanumPreview.tsx` (client, 2026-08-13 갱신): 주제(`title` prop, `PostForm`과 같은 `text-lg font-semibold` 스타일)+구절+본문+"나눔" 라벨 박스를 읽기 전용으로 표시 + 하단 **"수정하기"**(`/posts/[id]` 링크, 실제 수정은 상세 페이지의 기존 `PostBody` 수정 기능을 그대로 씀 — 중복 구현 안 함) / **"공유하기"**(`ShareGroupModal` 띄우고 확정 시 `rpc('add_shares_to_post', ...)`로 이 글에 그룹 추가) 두 버튼. `title`/`sections` 둘 다 부모(`DailyNanum`)가 그 날짜 `qt_schedule`에서 넘겨주는 값 — 구절은 `sections`가 있으면 `PostForm`과 동일하게 소주제별로 나눠서, 없으면 `post.verse_text` 스냅샷을 통짜로 표시(2026-08-13 추가 — 사용자가 "이미 쓴 글도 작성 폼처럼 주제+소주제로 나눠서 보고 싶다"고 요청).
- `components/PostForm.tsx`: 이제 날짜 선택 로직이 없음(부모가 `qtDate`/`qtTitle`/`qtVerseRef`/`qtVerseText`/`qtSections`를 props로 내려줌 — `DailyNanum`이 항상 QT 일정이 있는 날짜에만 이 컴포넌트를 렌더하므로 이 값들은 항상 채워져 있다고 가정). **create 모드엔 구절 참조 입력란이 없음**(2026-08-13부로 `VerseLookup` 미사용) — 폼 맨 위에 `QTDayView`와 같은 스타일로 주제(`text-lg font-semibold`)+전체 구절(`amber-700`)+소주제별 구절(있으면 섹션별로, 없으면 전체 구절 원문 박스 하나)을 고정 표시만 하고, 저장 시 `props.qtVerseRef`/`props.qtVerseText`를 그대로 `create_post_with_shares`에 넘김. 하단 버튼 2개 — "저장하기"는 검증(나눔 텍스트만 체크) 후 `saveOrShare([])`, "공유하기"는 검증 후 `components/ShareGroupModal.tsx`를 띄우고 확정 시 `saveOrShare(groupIds)`. 성공하면 `props.onCreated(newPost)` 호출(페이지 이동 없음). **edit 모드는 여전히 `VerseLookup`으로 구절을 직접 고쳐 쓸 수 있음**(`PostBody`에서 재사용, SPEC §4-5 "수정은 내용·구절만"은 그대로 유효 — 이번 변경은 "새 글 작성" 흐름에서만 구절 입력을 없앤 것) — 기존과 동일하게 `posts` 직접 update.
- `components/ShareGroupModal.tsx` (client): 하단 시트 형태 팝업. 내부에서 `components/GroupShareSelect.tsx`로 그룹 다중 선택 → "N개 그룹에 공유" 버튼(0개 선택 시 비활성화)으로 확정.
- `components/GroupShareSelect.tsx` (client): `group_members` join `groups`로 내 그룹 목록 조회 → 체크박스. 그룹이 0개면 "나만 보는 개인 기록으로 저장돼요" 안내(에러 아님).
- `app/(protected)/posts/[id]/page.tsx`(나눔 상세) — RLS가 공유 그룹 기준으로 자동 통제하는 건 변경 없음. 2026-08-12에 세 가지 추가: ①그 날짜 `qt_schedule.title`을 조회해 `PostBody`에 `qtTitle`로 전달 ②상단에 `BackButton` 추가 ③댓글 쿼리·렌더링 주석 처리(§4-4 비활성화 메모)

### 리스크

- **선택 그룹 0개로 제출**: RPC 자체가 예외를 던지므로 서버에서도 막힘, 클라이언트도 미리 체크해서 에러 문구 표시(이중 방어).
- **오늘의 QT·말씀 등록은 그룹 체크 없음**: 의도된 설계(전체 공유), 실수로 그룹 필터를 넣지 않도록 주의.
- **여러 그룹에 공유된 글의 댓글이 뒤섞인 것처럼 보일 수 있음**: 의도된 동작(댓글은 글 하나에 달리는 것이지 그룹별로 안 나뉨) — 사용자가 헷갈려하면 그때 그룹별 댓글 분리를 재검토(지금은 YAGNI).
- **날짜 그룹핑·캘린더 마킹 성능**: 그룹당 글이 아주 많아지면 무거워질 수 있으나 소규모 모임 스케일에서는 무시 가능.

---

## 주요 파일 (생성 대상)

- `proxy.ts`
- `supabase/migrations/0001_init.sql`, `0002_qt_schedule_sections.sql`, `0003_groups.sql`, `0004_post_shares.sql`, `0005_optional_sharing.sql`, `0006_add_shares_to_existing_post.sql`
- `supabase/seed/import_bible.ts`
- `lib/supabase/client.ts`, `lib/supabase/server.ts`
- `lib/verseRef.ts`, `lib/bibleBooks.ts`
- `app/login/page.tsx`, `app/auth/callback/route.ts`
- `app/(protected)/page.tsx`(→ `/groups` 리다이렉트), `today/page.tsx`, `schedule/page.tsx`, `groups/page.tsx`, `groups/[id]/page.tsx`, `posts/new/page.tsx`, `posts/[id]/page.tsx`
- `components/{KakaoLoginButton,NavBar,BackButton,PostCard,VerseLookup,QtDatePicker,QTCalendar,QTDayView,ScheduleAdminView,QTScheduleForm,QtSectionEditor,PostForm,PostBody,PostActions,CommentList,CommentForm,AmenButton,GroupList,CreateGroupForm,CreateGroupSection,JoinGroupForm,JoinGroupSection,CopyInviteCode,GroupMembersPanel,PostFeedView,GroupShareSelect,ShareGroupModal,DailyNanum,NanumPreview}.tsx`
- `supabase/migrations/0007_group_member_visibility.sql`(2026-08-14 추가) — `is_group_member()` security definer 함수 + `group_members` SELECT 정책을 "내 소속 행만" → "내가 속한 그룹의 다른 멤버도 조회 가능"으로 완화, DELETE 정책(본인 행만) 신규 추가 → `components/GroupMembersPanel.tsx`(그룹원 목록 + 그룹 나가기 사이드 패널)의 기반
- `types/database.ts`
- `app/manifest.ts`(2026-08-14 추가, PWA — `MetadataRoute.Manifest` 반환하는 Next.js 특수 파일, `/manifest.webmanifest`로 서빙됨), `public/icons/{icon-192,icon-512,apple-touch-icon}.png`(Playwright로 HTML을 스크린샷 찍어 만든 amber-600 배경 + "QT" 흰 글자 아이콘, `sips`로 사이즈별 리사이즈)
- `app/layout.tsx`(2026-08-14 수정, PWA): `metadata.appleWebApp`(capable/title/statusBarStyle) + `metadata.icons.apple` + `metadata.other['apple-mobile-web-app-capable']`(Next.js가 표준 `mobile-web-app-capable`만 자동 생성해서, iOS 16.4 미만 호환용으로 구식 태그를 수동 추가) + `export const viewport: Viewport = { themeColor: '#d97706' }` 추가

**재사용 가능한 기존 유틸리티**: 없음 (새 프로젝트).

---

## 검증(전체)

**MVP 성공 조건** (SPEC.md §7과 동일)
- [ ] 카카오 로그인 후 피드 탭(내 그룹 목록) 진입 성공
- [ ] 그룹이 없는 신규 계정은 그룹 만들기·초대 코드 참여 UI가 보이고, 둘 다 정상 동작함
- [ ] 그룹 클릭 시 그 그룹의 고유 URL(`/groups/[id]`)로 이동, 날짜별로 묶여서 그날의 QT 주제 + 이 그룹에 공유된 나눔이 표시됨(말씀 원문은 목록에 안 보임)
- [ ] 관리자 계정으로 "말씀 등록" 페이지에서 QT 일정(주제+구절)을 등록하면 즉시 반영됨
- [ ] 일반 모임원 계정에는 "말씀 등록" 메뉴 자체가 보이지 않고, 직접 URL로 들어가도 막힘
- [ ] "오늘의 QT" 화면에서 오늘 날짜의 주제+구절 참조+성경 원문이 캘린더 없이 표시됨
- [ ] "나눔" 캘린더에서 날짜를 선택하면 그 날짜의 QT 일정(주제+구절)이 오늘의 QT와 같은 모양으로 보이고, QT 일정이 없는 날짜는 안내만 뜨고 작성 불가
- [ ] 나눔 쓰기에서 그룹을 여러 개 체크해 공유하면, 체크한 모든 그룹 화면의 그 날짜 묶음에 동시에 반영됨
- [ ] 그룹 화면 상단에 캘린더가 처음부터 펼쳐져 있고, 날짜를 고르면 그 날짜만 필터링해서 볼 수 있고, "전체 보기"로 해제됨
- [ ] 서로 다른 그룹에 속한 계정끼리는 상대 그룹에만 공유된 글을 전혀 못 봄(그룹 목록에도 안 뜨고, URL 직접 접근도 막힘)
- [ ] 같은 그룹에 속한 다른 모임원 계정으로 로그인하면 그 그룹에서 같은 나눔이 보임(실제 공유 확인)
- [ ] 아멘 토글이 정상 동작 (댓글은 2026-08-12부로 일시 비활성화, 검증 대상 아님)
- [ ] 본인 글만 수정·삭제 버튼이 보임
- [ ] 모바일 화면에서 레이아웃 깨지지 않음
- [ ] Vercel 배포 URL로 실제 접속 가능
