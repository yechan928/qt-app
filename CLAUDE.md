# CLAUDE.md — QT 나눔

이 파일은 Claude Code가 매 세션마다 자동으로 로드하는 프로젝트 규칙 문서다.
여기에 적힌 규칙은 Claude의 기본값보다 우선하며, 실행 중 반드시 따라야 한다.

---

## 프로젝트 한 줄 요약

교회 QT 소모임이 카카오톡 단톡방 대신 쓰는 QT 나눔 전용 공유 웹앱. 카카오 로그인 → 나눔 작성(구절 참조 입력 시 원문 자동 표시) → 피드 → 댓글/아멘. 2주 MVP.

**스택**: Next.js 16(App Router) + TypeScript + Tailwind CSS / Supabase(Postgres + Auth, Kakao OAuth) / Vercel 배포.

**Next.js 16 주의사항** (학습 데이터보다 최신 버전이라 API가 다름 — 코드 작성 전 `node_modules/next/dist/docs/`에서 재확인 권장):
- `middleware.ts`가 아니라 `proxy.ts` (`export function proxy(request)`)
- `cookies()`는 비동기 — `await cookies()`
- 페이지/Route Handler의 `params`는 `Promise` — `await params`
- `next.config.ts`에 `cacheComponents: true`를 켜지 않는 한(이 프로젝트는 안 켬) 캐싱 모델은 기존과 동일

---

## 반드시 먼저 읽을 파일

작업 시작 전 아래 파일을 **이 순서대로** 읽는다.

1. `SPEC.md` — 프로젝트 스펙, 기술 결정, 의사결정 규칙(§5), 하지 말 것(§6), 검증 기준(§7)
2. `PLAN.md` — 승인된 구현 계획. 파일 구조, DB 스키마, 컴포넌트 설계 등 구현 디테일

**우선순위**: `SPEC.md` > `CLAUDE.md` > `Plan` > 그 외.
세 문서가 충돌하면 SPEC.md가 이긴다. SPEC.md는 무단 수정 금지, 변경 필요 시 먼저 질문.

---

## AI 행동 제약 — 하드 룰

### 절대 하지 말 것

- **SPEC.md §6 "하지 말 것" 목록 건드리지 말 것**
  (카카오 외 로그인, 그룹 삭제·멤버 추방·그룹 내 역할 구분, 나눔/댓글/아멘에 대한 리더 권한 — QT 일정 등록만 유일한 예외, 관리자 지정용 앱 내 UI, 공지사항 게시판, 다양한 반응 이모지, 알림, 검색/태그, PWA, i18n)
  ※ QT 교재 소제목·본문요약·중보기도 수동 입력은 SPEC.md §4-7·§6 결정(2026-08-11)에 따라 허용됨 — 자동 수집/크롤링만 금지
  ※ 다중 그룹(카톡방처럼 한 사람이 여러 그룹에 속함)은 SPEC.md §4-8~4-10 결정(2026-08-12)에 따라 허용됨 — "다중 그룹 지원 없음"이었던 이전 조항은 폐기됨. 단 그룹 생성·참여는 반드시 `create_group`/`join_group_by_code` DB 함수로만, 클라이언트가 `groups`/`group_members`에 직접 write 금지
- **새 의존성 추가 금지** — 승인된 의존성 표(아래)에 없는 패키지는 설치 전 반드시 사용자에게 질문. 승인 후 표 업데이트 필수
- **파일 삭제/덮어쓰기 금지** — 스캐폴드 기본 파일도 삭제 전 질문
- **SPEC.md / 승인된 Plan 무단 수정 금지**
- **스코프 이탈 금지** — 요청받지 않은 리팩토링·추상화·"나중을 위한 설계" 추가 금지
- **Supabase 프로젝트·카카오 개발자 앱 자동 생성 금지** — API 키 발급 등은 사용자가 직접 콘솔에서 수행

### 반드시 할 것

- **애매하면 SPEC.md §5 의사결정 규칙을 순서대로 따른다.** 규칙에 답이 없을 때만 질문.
- **디자인 결정은 AI가 자율 판단.** 색/레이아웃/폰트 선택을 사용자에게 묻지 말 것. 기본 팔레트: Tailwind `stone` + `amber`.
- **인증/권한 체크는 항상 서버(API Route)에서.** 프론트 숨김만으로 끝내지 말 것.
- **에러 메시지는 한국어 한 줄.** 스택 트레이스 노출 금지.
- **질문은 명확한 선택지 2~3개로.** 개방형 질문 지양.

---

## 사용자 수동 실행 항목

다음은 사용자가 직접 수행한다. Claude가 자동 실행하지 말 것.

| 항목 | 이유 |
|---|---|
| Supabase 프로젝트 생성, API 키 발급 | 계정 소유·과금 주체가 사용자 |
| 카카오 개발자 콘솔 앱 등록, REST API 키·Redirect URI 설정 | 카카오 계정 소유가 사용자 |
| Supabase Auth에 Kakao Provider 활성화 + 키 입력 | 콘솔 UI 작업 |
| `.env.local`에 발급받은 키 붙여넣기 | 비밀 값, Claude에게 노출 금지 |
| Vercel 프로젝트 연결·배포 실행 | 계정 소유가 사용자 |
| 최초 로그인 후 Supabase 테이블 편집기에서 본인 `profiles.is_admin`을 `true`로 설정 | 앱 내 관리자 지정 UI를 만들지 않기로 함(SPEC §6) |

### Claude가 실행 가능한 명령

- `npm install` — 이미 승인된 의존성 표 내용만
- `npm run dev` — 개발 서버
- `npx supabase ...` (로컬 마이그레이션 파일 생성 등, 실제 배포/키 발급 제외)
- 파일 생성·편집 (SPEC.md와 Plan 제외, `.env.local` 값 직접 입력 제외)

---

## 의존성 표

**새 의존성 추가 절차**: (1) 사용자에게 질문 → (2) 승인 → (3) 설치 → (4) 이 표에 행 추가.

| 패키지 | 용도 | 상태 |
|---|---|---|
| next | 프레임워크 | 초기 승인 |
| react / react-dom | UI | 초기 승인 |
| typescript | 타입 시스템 | 초기 승인 |
| tailwindcss | 유틸리티 CSS | 초기 승인 |
| @supabase/supabase-js | Supabase 클라이언트 | 초기 승인 |
| @supabase/ssr | Next.js SSR용 Supabase 세션 처리 | 초기 승인 |
| tsx (dev) | 성경 데이터 1회 시딩 스크립트를 TS로 바로 실행(PLAN.md §C) | 초기 승인 |
| dotenv (dev) | 시딩 스크립트가 `.env.local`의 service role 키를 읽기 위함 | 초기 승인 |
| playwright (dev) | Claude가 로그인 이후 화면(뒤로가기, 그룹 버튼, 공유하기 등)을 브라우저로 직접 클릭해보며 자체 테스트하기 위함. 카카오 로그인만 사용자가 직접 완료(2026-08-12 승인) | 2026-08-12 승인 |

---

## 폴더 구조 (강제)

```
QT/
├── SPEC.md
├── CLAUDE.md
├── PLAN.md
├── TEST_PLAN.md
├── TODO.md
├── package.json
├── app/globals.css          # Tailwind v4는 CSS-first 설정 — tailwind.config.ts 없음
├── .env.local              # 사용자가 직접 채움, git 커밋 금지
├── proxy.ts                 # Supabase 세션 갱신 (Next.js 16: middleware.ts가 아니라 proxy.ts)
├── supabase/
│   └── migrations/         # SQL 스키마 마이그레이션 파일 (0001_init.sql, 0002_qt_schedule_sections.sql, 0003_groups.sql, ...)
└── app/
    ├── layout.tsx
    ├── login/
    │   └── page.tsx
    ├── auth/
    │   └── callback/route.ts   # Supabase OAuth 콜백 (유일한 Route Handler)
    └── (protected)/            # 로그인 필요한 라우트 묶음 — URL에는 영향 없음
        ├── layout.tsx          # 세션 체크 + 그룹 여부 체크 + NavBar
        ├── page.tsx            # 피드 (= "/", 현재 그룹 기준)
        ├── today/page.tsx      # 오늘의 QT — 오늘 것만, 캘린더 없음, 그룹 무관 전체 공유
        ├── schedule/page.tsx   # 말씀 등록 (관리자 전용, 그룹 무관 전체 공유)
        ├── groups/page.tsx     # 그룹 만들기/초대코드 참여/전환
        └── posts/
            ├── new/page.tsx    # 캘린더로 날짜 선택 + 나눔 작성 (현재 그룹으로 저장)
            └── [id]/page.tsx
components/          # UI 컴포넌트만 (app/ 밖, "@/components/*")
lib/                 # Supabase 클라이언트, 구절 파싱, 유틸 ("@/lib/*")
types/               # DB row 타입 ("@/types/*")
```

**서브폴더 금지**. `components/forms/` 같은 추가 분류 만들지 말 것.

---

## 코드 스타일 요약

전체 규칙은 `SPEC.md §5` 참조. 핵심만 여기에 재명시.

### TypeScript
- `any` 금지. 불가피할 땐 `unknown` + 좁히기
- 상태 관리는 `useState` / `useReducer`만. Redux·Zustand·React Query 금지
- 컴포넌트 파일 200줄 초과 시 분리
- Tailwind 유틸리티 우선

### 공통
- 주석은 WHY만. WHAT은 이름으로 설명
- 새 파일을 만드는 것보다 기존 파일 편집을 우선
- 문서 파일(`*.md`)은 사용자가 요청할 때만 생성

---

## 작업 시작 전 체크리스트

새 작업을 받으면 착수 전 확인:

1. [ ] `SPEC.md`와 최신 Plan 파일을 읽었는가?
2. [ ] 작업이 SPEC.md §6 "하지 말 것"과 충돌하지 않는가?
3. [ ] 새 의존성이 필요한가? 필요하다면 사용자에게 먼저 질문했는가?
4. [ ] 파일 삭제·덮어쓰기가 필요한가? 필요하다면 사용자에게 먼저 질문했는가?
5. [ ] 작업이 SPEC.md·Plan 범위 안에 있는가? 벗어나면 먼저 질문

## 작업 완료 전 체크리스트

구현 완료 후 확인:

1. [ ] 코드가 SPEC.md §5 의사결정 규칙을 따르는가?
2. [ ] 에러 메시지가 한국어 한 줄인가?
3. [ ] 인증/권한 체크가 서버 쪽(API Route/RLS)에도 있는가?
4. [ ] 새 의존성이 위 표에 등록되었는가?
5. [ ] 주석이 WHY만 남아 있는가?
