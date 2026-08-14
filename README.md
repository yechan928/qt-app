# QT 나눔

교회 QT 소모임이 카카오톡 대신 사용하는 QT 나눔 전용 공유 웹앱.
설계 배경과 스펙은 [SPEC.md](./SPEC.md), 구현 계획은 [PLAN.md](./PLAN.md) 참고.

## 처음 실행하기

### 1. Supabase 프로젝트 준비

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성 (무료 티어)
2. `supabase/migrations/0001_init.sql`의 내용을 Supabase 대시보드 → SQL Editor에 붙여넣고 실행
3. 프로젝트 Settings → API에서 `Project URL`, `anon public` 키, `service_role` 키 확인

### 2. 카카오 로그인 연동

1. [Kakao Developers](https://developers.kakao.com)에서 애플리케이션 생성
2. 제품 설정 → 카카오 로그인 활성화, Redirect URI에 아래 추가:
   ```
   https://<프로젝트 참조 ID>.supabase.co/auth/v1/callback
   ```
3. 동의항목은 닉네임 정도로 최소화(전체 동의 필수 항목이 많으면 일부 사용자가 로그인 못 할 수 있음)
4. Supabase 대시보드 → Authentication → Providers → Kakao 활성화 후, 카카오 앱의 REST API 키·Client Secret 입력

### 3. 환경변수

`.env.local.example`을 복사해 `.env.local`을 만들고 위에서 확인한 값을 채운다.

```bash
cp .env.local.example .env.local
```

### 4. 성경 원문 시딩 (최초 1회)

```bash
npm install
npx tsx supabase/seed/import_bible.ts
```

개역한글 66권 전체(약 3만 구절)를 내려받아 `bible_verses` 테이블에 채운다. 몇 분 걸릴 수 있다.

### 5. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 카카오 로그인으로 접속.

### 6. 관리자 지정 (QT 일정 등록 권한)

앱 내에 관리자 지정 화면은 없다(SPEC §6). 최초 로그인 후 Supabase 대시보드 → Table Editor → `profiles` 테이블에서 본인 행의 `is_admin`을 `true`로 직접 변경한다.

## 배포

Vercel에 프로젝트를 연결하고, 위 `.env.local`과 동일한 값을 Vercel 프로젝트의 Environment Variables에 등록한 뒤 배포한다. `SUPABASE_SERVICE_ROLE_KEY`는 시딩 스크립트 전용이라 배포 환경에는 등록할 필요 없다.
