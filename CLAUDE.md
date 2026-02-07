# CLAUDE.md — expense-tracker

## Project Overview
- 가계부(월간 고정지출 + 일일 수입/지출) + 피부관리 루틴 대시보드
- 순수 정적 사이트 (HTML/CSS/Vanilla JS) — 빌드 도구 없음
- Firebase Realtime Database + Firebase Auth (비밀번호 잠금)
- GitHub Pages 배포: https://schwarzesonne666.github.io/expense-tracker/
- GitHub Codespaces 개발 환경 지원

## File Structure
```
├── index.html          # 가계부 페이지 (메인)
├── app.js              # 가계부 로직 (IIFE)
├── styles.css          # 공용 + 가계부 스타일
├── skincare.html       # 피부관리 대시보드
├── skincare.js         # 피부관리 로직 (IIFE)
├── skincare.css        # 피부관리 전용 스타일 (sc- 접두사)
├── auth.js             # Firebase Auth 잠금화면
├── manifest.json       # PWA 매니페스트
├── apple-touch-icon.png
├── favicon-16x16.png / favicon-32x32.png
├── icon-192.png / icon-512.png
├── CLAUDE.md           # 이 파일
└── .github/workflows/  # GitHub Pages 자동 배포
```

## Development Rules

### Language
- UI 텍스트: 한국어
- 코드 주석: 한국어 (간결하게)
- 커밋 메시지: 한국어
- CLAUDE.md: 한국어

### Coding Conventions
- Vanilla JS only (프레임워크/라이브러리 없음)
- IIFE 패턴: `(function() { ... })()`
- CSS 네이밍: 피부관리 → `sc-` 접두사, 가계부 → 접두사 없음
- 캐시 버스팅: `?v=N` 쿼리 파라미터 — CSS/JS 수정 시 반드시 버전 올리기
  - index.html, skincare.html 모두 확인할 것
- CSS 변수 사용: 색상은 `:root` 변수 우선, 하드코딩 지양

### Firebase
- DB URL: `https://fixed-expense-management-default-rtdb.firebaseio.com`
- `window.db` 로 접근
- `on('value')` 리스너로 실시간 동기화
- Auth: `firebase.auth().signInWithEmailAndPassword()` — 비밀번호 잠금

### Key Logic — 가계부 (app.js)
- `getEffectiveDate()`: 06시 기준 날짜 (자정~05:59는 전날 취급)
- `cardDeferred`: 카드 결제 시 다음 달로 이연
- `installment`: 1 = 일시불, >1 = 할부 (개월 수)
- 전월 일시불 항목: `cardDeferred` + `installment <= 1` → "전월 카드값"으로 묶어서 표시
- 카드 실적: `CARD_GOALS` 설정값 기준 진행률 바 표시
- 할부 현황: 진행 중인 할부 항목의 회차/총회차 + 잔여금 표시

### Key Logic — 피부관리 (skincare.js)
- `getAutoTime()`: 실제 시각 기준 아침/저녁 자동 선택 (06~15시: 아침)
- 스팟케어 데이터: `steps` 배열 형식 (구 `product` 문자열은 자동 마이그레이션)
- Import 워크플로우: 텍스트 붙여넣기 → 미리보기 → 적용 (2단계)
- 주간 캘린더: 오늘 기준 ±3일 표시, 체크 상태 토글

### Responsive Breakpoints
- 968px: 2열 → 1열 전환 (가계부, 피부관리 공통)
- 768px: 태블릿 패딩/폰트 축소
- 640px: 모바일 — 불필요 요소 숨김, 폰트 추가 축소
- 480px: 초소형 모바일

### User Preferences
- 허락 안 구하고 바로 만들기
- 변경 후 즉시 커밋+푸시
- UI는 심플하게 유지 — 과도한 아코디언/접기 펼치기 지양
- 버전 범프 필수 (CSS/JS 수정 시 양쪽 HTML 모두 확인)
- 모바일 QA 중시 — 넘침/짤림 주의

### Prohibited
- npm, 빌드 도구, 번들러 사용 금지 — 순수 정적 파일만
- 불필요한 라이브러리/프레임워크 추가 금지
- UI 큰 변경 금지 (현재 디자인 유지, 정렬/미세 조정만)
