# CLIDLE - Claude Code 가이드

## 프로젝트 개요

터미널에서 두벌식 로마자 입력으로 한글 자모를 맞히는 CLI 단어 게임.  
상세 기획은 `CLIDLE.md` 참고.

## 기술 스택

- **언어**: Node.js (TypeScript, ES Modules) — `tsx`로 실행, `tsc`로 빌드/타입체크
- **TUI**: `ink` (React 문법, 게임 상태 기반 선언적 렌더링에 적합해 선택)
- **한글 자모**: 외부 라이브러리 없이 `input.ts`에서 두벌식 매핑 자체 구현 (정답 비교/검증은 서버가 담당)
- **배포**: CLI는 npm(`npx clidle`), 백엔드는 Vercel + Supabase (`backend/` 참고)

## 디렉토리 구조

```
src/
  index.tsx     진입점 (오늘의 문제 fetch 후 ink render 호출, `status`/`nudge` 서브커맨드 처리)
  App.tsx       루트 컴포넌트, 키 입력 처리
  game.ts       게임 상태 관리 (채점은 서버에 위임)
  input.ts      키 입력 / 로마자→자모 변환
  hint.ts       힌트 타입/계산 (로컬·테스트용)
  keyboard.ts   가상 키보드 자모별 상태 집계
  seed.ts       날짜 시드 계산
  api.ts        백엔드 API 클라이언트 (오늘의 문제/채점/통계)
  storage.ts    진행 상황/통계/기기 식별자/설정 저장·복원 (~/.clidle/)
  stats.ts      누적 통계 계산 로직
  share.ts      결과 공유 텍스트 생성 / 클립보드 복사
  types.ts      공용 타입 정의
  render/       TUI 렌더링 컴포넌트 (title/board/keyboard/legend/result)
  data/         words_5/6/7.json 단어 DB 원본 (전처리 결과물, 백엔드 이관용)
scripts/
  preprocess.ts, import-words.ts, import-nouns.ts  단어 DB 전처리/이관
backend/        Vercel(Next.js) API + 관리자 백오피스 (자체 README 참고)
docs/           (gitignore — 로컬 전용 메모)
```

## 커밋 규칙

- 형식: `<type>: <subject>` (feat / fix / refactor / chore / docs)
- 제목 50자 이내
- `Co-Authored-By` 절대 포함 금지

## 핵심 도메인 규칙

- 단어는 자모 배열로 저장: `"토끼"` → `["ㅌ","ㅗ","ㄱ","ㄱ","ㅣ"]`
- 슬롯 수: 날짜 시드 `% 3 + 5` (5~7)
- 쌍자음: 같은 자음 두 번 입력하면 단자음 두 슬롯으로 쌓임 (`rr`→ㄱ,ㄱ / `ee`→ㄷ,ㄷ / `qq`→ㅂ,ㅂ / `tt`→ㅅ,ㅅ / `ww`→ㅈ,ㅈ), 합쳐지지 않음
- 모음은 전용 키가 있는 기본 10개(ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ)만 직접 입력 가능, 나머지 겹모음(ㅐㅒㅔㅖㅘㅙㅚㅝㅞㅟㅢ)은 조합 없이 각각 별도 슬롯 (예: ㅐ=ㅏ+ㅣ, ㅙ=ㅗ+ㅏ+ㅣ)
- 날짜 시드는 KST 기준

## 힌트 로직

인덱스 기반 비교, 채점은 서버(`backend`)가 수행하고 클라이언트는 결과만 렌더링:
1. 정확 일치(🟦 cyan) 먼저 처리
2. 나머지에서 포함 여부(🟪 magenta) 처리 (중복 자모 카운트 주의)
3. 없음(⬜ gray)

## Push 규칙

**push 전 반드시 사용자 확인 필요.** force push도 동일.
