# CLIDLE - Claude Code 가이드

## 프로젝트 개요

터미널에서 두벌식 로마자 입력으로 한글 자모를 맞히는 CLI 단어 게임.  
상세 기획은 `CLIDLE.md` 참고.

## 기술 스택

- **언어**: Node.js (TypeScript, ES Modules) — `tsx`로 실행, `tsc`로 빌드/타입체크
- **TUI**: `ink` (React 문법, 게임 상태 기반 선언적 렌더링에 적합해 선택)
- **한글 자모**: `hangul-js` 또는 `es-hangul` (미결정)

## 디렉토리 구조

```
src/
  index.tsx     진입점 (ink render 호출)
  App.tsx       루트 컴포넌트, 키 입력 처리
  game.ts       게임 상태 관리
  input.ts      키 입력 / 로마자→자모 변환
  hint.ts       힌트 계산 (정확/위치오류/없음)
  seed.ts       날짜 시드, 오늘의 단어 결정
  words.ts      단어 DB 로더
  storage.ts    진행 상황/통계 저장·복원 (~/.clidle/)
  stats.ts      누적 통계 계산 로직
  share.ts      결과 공유 텍스트 생성 / 클립보드 복사
  types.ts      공용 타입 정의
  render/       TUI 렌더링 컴포넌트 (title/board/legend/result)
  data/         words_5/6/7.json 단어 DB
scripts/
  preprocess.ts 단어 DB 전처리
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
- 이중모음: 조합 없이 각각 별도 슬롯
- 날짜 시드는 KST 기준

## 힌트 로직

인덱스 기반 비교 (Wordle 표준 알고리즘):
1. 정확 일치(🟩) 먼저 처리
2. 나머지에서 포함 여부(🟨) 처리 (중복 자모 카운트 주의)
3. 없음(⬛)

## Push 규칙

**push 전 반드시 사용자 확인 필요.** force push도 동일.
