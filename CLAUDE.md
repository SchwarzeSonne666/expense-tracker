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
├── app.js              # 가계부 로직 (Utils, ChipPicker, ExpenseTracker, DailyLedger)
├── styles.css          # 공용 + 가계부 스타일
├── skincare.html       # 피부관리 대시보드
├── skincare.js         # 피부관리 로직 (IIFE)
├── skincare.css        # 피부관리 전용 스타일 (sc- 접두사)
├── auth.js             # Firebase Auth 잠금화면 (IIFE)
├── manifest.json       # PWA 매니페스트
├── apple-touch-icon.png
├── favicon-16x16.png / favicon-32x32.png
├── icon-192.png / icon-512.png
├── CLAUDE.md           # 이 파일
└── .github/workflows/  # GitHub Pages 자동 배포 (deploy.yml)
```

## Development Rules

### Language
- UI 텍스트: 한국어
- 코드 주석: 한국어 (간결하게)
- 커밋 메시지: 한국어
- CLAUDE.md: 한국어

### Coding Conventions
- Vanilla JS only (프레임워크/라이브러리 없음)
- skincare.js, auth.js: IIFE 패턴 `(function() { ... })()`
- app.js: 전역 유틸(`Utils`, `ChipPicker`) + 클래스(`ExpenseTracker`, `DailyLedger`)
- CSS 네이밍: 피부관리 → `sc-` 접두사, 가계부 → 접두사 없음
- 캐시 버스팅: `?v=N` 쿼리 파라미터 — CSS/JS 수정 시 반드시 버전 올리기
  - index.html, skincare.html 모두 확인할 것
- CSS 변수 사용: 색상은 `:root` 변수 우선, 하드코딩 지양
- XSS 방지: 사용자/Firebase 데이터 렌더링 시 반드시 `escapeHtml()` 사용

### Current Versions
```
styles.css   → v=80  (index.html, skincare.html 공통)
app.js       → v=60  (index.html)
auth.js      → v=5   (index.html, skincare.html 공통)
skincare.js  → v=23  (skincare.html)
skincare.css → v=30  (skincare.html)
```

### Firebase
- DB URL: `https://fixed-expense-management-default-rtdb.firebaseio.com`
- SDK: Firebase Compat v10.14.1 (firebase-app, firebase-auth, firebase-database)
- `window.db` 로 접근
- `on('value')` 리스너로 실시간 동기화
- Auth: `firebase.auth().signInWithEmailAndPassword()` — 비밀번호 잠금 (LOCAL persistence)

### Key Architecture — app.js

#### 전역 유틸
- `Utils`: `escapeHtml()`, `formatCurrency()`, `showToast()`, `getEffectiveDate()`, `getEffectiveDay()`
- `ChipPicker`: 공용 칩 선택 모달 (카테고리, 결제수단, 할부 선택 등에 사용)
- `CARD_GOALS`: 카드별 월 실적 목표 금액 (`{ '현대카드': 1000000, '네이버카드': 300000 }`)
- `CARD_COLORS`: 카드별 UI 색상
- `DAY_BOUNDARY_HOUR`: 날짜 경계 시각 (6시)

#### ExpenseTracker 클래스 — 월간 고정지출
- localStorage + Firebase 이중 저장 (Firebase 우선, 초기 동기화 1회)
- 카테고리/메모(결제수단) 관리: ChipPicker 모달 + 관리 모달
- 편집 모드: 드래그 앤 드롭 정렬 지원 (마우스 + 터치)
- 활성/중지 토글: `expense.active` 필드

#### DailyLedger 클래스 — 일일 수입/지출
- `getEffectiveDate()`: 06시 기준 날짜 (자정~05:59는 전날 취급)
- `cardDeferred`: 카드 결제 시 다음 달 1일로 이연
- `cardRef`: 카드 결제 시 당월에 조회용 참조 기록 (합산 제외)
- `installment`: 1 = 일시불, >1 = 할부 (개월 수, 각 회차별 분할 기록)
- 전월 일시불 항목: `cardDeferred` + `installment <= 1` → "전월 카드값"으로 묶어서 표시
- 카드 실적: `CARD_GOALS` 설정값 기준 진행률 바 표시
- 할부 현황: 진행 중인 할부 항목의 회차/총회차 + 잔여금 표시
- 전월이월: `loadCarryover()` — daily 전체 데이터에서 현재 달 이전 누적 계산
- 고정지출 반영: `applyFixed()` — 월간 고정지출을 해당 월 1일에 개별 항목으로 기록 (재반영 가능)
- 인라인 수정: `startEdit()` / `cancelEdit()` — 추가 폼에서 직접 수정

### Key Logic — 피부관리 (skincare.js)
- IIFE 패턴으로 전체 감싸짐
- `getAutoTime()`: 실제 시각 기준 아침/저녁 자동 선택 (06~15시: 아침)
- `getEffectiveDate()`: 06시 기준 날짜 (app.js와 동일 로직)
- 스팟케어 데이터: `steps` 배열 형식 (구 `product` 문자열은 `migrateSpotCare()`로 자동 마이그레이션)
- Import 워크플로우: 텍스트 붙여넣기 → 미리보기 → 적용 (2단계)
  - 루틴 Import: `[아침]`, `[저녁 공통]`, `[저녁 X요일 — 테마]` 형식 파싱
  - 제품 Import: `[카테고리]` 아래 `- 제품명 | 역할 | 시점` 형식 파싱
  - 스팟케어 Import: `아이콘 | 증상 | 제품명(쉼표 구분) | 사용법` 형식 파싱
- 주간 캘린더: 월~일 전체 표시, 아침 키워드 + 저녁 테마 표시
- 루틴 구조: `morning`(아침), `evening_common`(저녁 공통), `evening_X`(요일별 저녁)
- Copy/Clipboard: 루틴, 제품 목록, 스팟 케어 각각 텍스트로 복사 기능
- 카테고리: cleansing, toner, serum, cream, suncare, active, spot (7종)
- 제품 → 카테고리 자동 추론: `guessCategory()` (제품명+역할 키워드 매칭)

### Key Logic — auth.js
- Firebase Auth로 비밀번호 잠금 (이메일 고정: `admin@expense-tracker.app`)
- `onAuthStateChanged` 리스너로 인증 상태 감시
- 인증 전: 풀스크린 오버레이로 페이지 차단
- `LOCAL` persistence: 브라우저 닫아도 로그인 유지

### Responsive Breakpoints
- 968px: 2열 → 1열 전환 (가계부, 피부관리 공통)
- 768px: 태블릿 패딩/폰트 축소
- 640px: 모바일 — 불필요 요소 숨김(메모, 결제수단, 할부 태그), 폰트 추가 축소
- 480px: 초소형 모바일

### Modal 구조 (index.html)
- `fixedAddModal`, `categoryModal`: `.container` 내부
- `memoModal`, `dailyCategoryModal`, `chipPickerModal`, `confirmDialog`: `.container` 외부 (body 직속)
- 모두 `position: fixed`라 동작에는 영향 없음

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
