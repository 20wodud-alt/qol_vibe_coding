# Toto

애플의 정돈된 인터페이스 감성을 참고해 만든 Next.js + Supabase 투두 앱입니다.

## 실행

```bash
npm install
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
npm run dev
```

브라우저에서 `http://localhost:3000`을 여세요.

## 환경 변수

`.env.example`을 참고해 `.env.local`에 Supabase URL과 publishable/anon key를 설정하세요.

## 데이터

할 일은 이 앱 전용 Supabase `public.apple_todos` 테이블에 저장됩니다. 별도 로그인 화면 없이 Supabase 익명 세션을 만들며, Row Level Security 정책으로 사용자별 데이터를 분리합니다.
