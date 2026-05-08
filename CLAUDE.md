# CLIDLE - Claude Code 가이드

## 프로젝트 개요

터미널에서 두벌식 로마자 입력으로 한글 자모를 맞히는 CLI 단어 게임.  
상세 기획은 `CLIDLE.md` 참고.

## 기술 스택

- **언어**: Node.js (JavaScript, ES Modules)
- **TUI**: 미결정 (`blessed` vs `ink` — CLIDLE.md 4절 참고)
- **한글 자모**: `hangul-js` 또는 `es-hangul` (미결정)

## 디렉토리 구조

```
src/
  index.js      진입점
  game.js       게임 상태 관리
  input.js      키 입력 / 로마자→자모 변환
  hint.js       힌트 계산 (정확/위치오류/없음)
  seed.js       날짜 시드, 오늘의 단어 결정
  render/       TUI 렌더링 모듈
  data/         words_5/6/7.json 단어 DB
scripts/
  preprocess.js 단어 DB 전처리
docs/           (gitignore — 로컬 전용 메모)
```

## 커밋 규칙

- 형식: `<type>: <subject>` (feat / fix / refactor / chore / docs)
- 제목 50자 이내
- `Co-Authored-By` 절대 포함 금지

## 핵심 도메인 규칙

- 단어는 자모 배열로 저장: `"꼬들"` → `["ㄱ","ㄱ","ㅗ","ㄷ","ㅡ","ㄹ"]`
- 슬롯 수: 날짜 시드 `% 3 + 5` (5~7)
- 쌍자음: 같은 자음 두 번 입력 (`rr`→ㄲ, `ee`→ㄸ, `qq`→ㅃ, `tt`→ㅆ, `ww`→ㅉ)
- 이중모음: 조합 없이 각각 별도 슬롯
- 날짜 시드는 KST 기준

## 힌트 로직

인덱스 기반 비교 (Wordle 표준 알고리즘):
1. 정확 일치(🟩) 먼저 처리
2. 나머지에서 포함 여부(🟨) 처리 (중복 자모 카운트 주의)
3. 없음(⬛)

## Push 규칙

**push 전 반드시 사용자 확인 필요.** force push도 동일.
