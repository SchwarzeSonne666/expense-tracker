# CLAUDE.md — expense-tracker

## Project Overview
- 월간 고정지출 관리 + 피부관리 루틴 대시보드
- 정적 사이트 (HTML/CSS/JS), Firebase Realtime Database 연동
- GitHub Pages 배포: https://schwarzesonne666.github.io/expense-tracker/
- Firebase 프로젝트: `fixed-expense-management`

## File Structure
- `index.html` / `app.js` / `styles.css` — 고정지출 관리 페이지
- `skincare.html` / `skincare.js` / `skincare.css` — 피부관리 대시보드
- `.github/workflows/deploy.yml` — GitHub Pages 자동 배포

## Development Rules

### Language
- UI 텍스트: 한국어
- 코드 주석: 영어 또는 한국어 (간결하게)
- 커밋 메시지: 한국어

### Coding Conventions
- Vanilla JS (프레임워크 없음)
- IIFE 패턴 사용 `(function() { ... })()`
- CSS 클래스: `sc-` 접두사 (skincare), 일반은 접두사 없음
- 캐시 버스팅: `?v=` 쿼리 파라미터 (수정 시 반드시 버전 올리기)

### Firebase
- DB URL: `https://fixed-expense-management-default-rtdb.firebaseio.com`
- `window.db`를 통해 접근
- `on('value')` 리스너로 실시간 동기화

### Key Logic
- `getEffectiveDate()`: 06시 기준 날짜 (자정~05:59는 전날 취급)
- `getAutoTime()`: 실제 시각 기준 아침/저녁 자동 선택 (06~15시: 아침)
- 스팟케어 데이터: `steps` 배열 형식 (구 `product` 문자열은 자동 마이그레이션)
- Import 워크플로우: 텍스트 붙여넣기 → 미리보기 → 적용 (2단계)

### User Preferences
- 허락 안 구하고 바로 만들기
- 변경 후 즉시 커밋+푸시
- 과도한 UI (아코디언, 접기/펼치기) 지양 — 심플하게
- 버전 범프 필수 (CSS/JS 파일 수정 시)

### Prohibited
- ❌ 편집/추가/삭제 UI 없음 (데이터 변경은 import로만)
- ❌ 아코디언, 접기/펼치기 토글 사용 금지
- ❌ npm, 빌드 도구, 번들러 없음 — 순수 정적 파일만
