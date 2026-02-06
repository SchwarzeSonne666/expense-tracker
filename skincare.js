// Skincare Routine Dashboard
(function () {
    const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

    // ===== Routine Data =====
    const morningRoutine = [
        { product: '일리윤 세라마이드 클렌저', usage: '미온수로 가볍게 세안', badge: '세안', badgeClass: 'cleanse' },
        { product: '라운드랩 독도 토너', usage: '손바닥에 덜어 가볍게 패팅', badge: '토너', badgeClass: 'tone' },
        { product: '이니스프리 비타민C 세럼', usage: '얼굴 전체 2~3방울, 왼쪽 얼굴 한 번 더', badge: '세럼', badgeClass: 'serum' },
        { product: '토리든 히알루론산 세럼', usage: '얼굴 전체 적당량', badge: '수분', badgeClass: 'serum' },
        { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
        { product: '닥터지 선크림 SPF50+', usage: '충분한 양 (손가락 2마디), 왼쪽 얼굴 집중', badge: '선크림', badgeClass: 'sun' },
    ];

    const eveningCommon = [
        { product: '라운드랩 독도 클렌징 오일', usage: '마른 얼굴에 마사지 → 물로 유화 → 헹구기', badge: '1차 세안', badgeClass: 'cleanse' },
        { product: '일리윤 세라마이드 클렌저', usage: '미온수로 2차 세안', badge: '2차 세안', badgeClass: 'cleanse' },
        { product: '라운드랩 독도 토너', usage: '홍조·열감 심한 날은 냉장 캐롯 패드 사용', badge: '토너', badgeClass: 'tone' },
    ];

    const eveningByDay = {
        '월': {
            label: '레티노이드',
            tagClass: 'retinoid',
            steps: [
                { product: '디오디너리 레티노이드 2%', usage: '토너 흡수 후 얼굴 전체 (홍조 부위 얇게)', badge: '액티브', badgeClass: 'active', wait: '10분 대기' },
                { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '수분', badgeClass: 'serum' },
                { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '1차 크림', badgeClass: 'cream' },
                { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체 (특히 레티노이드 도포 부위)', badge: '2차 진정', badgeClass: 'cream' },
            ]
        },
        '화': {
            label: '기본 보습 + 재생',
            tagClass: 'rest',
            steps: [
                { product: 'VT PDRN 에센스', usage: '얼굴 전체 2~3방울', badge: '재생', badgeClass: 'serum' },
                { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '수분', badgeClass: 'serum' },
                { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '1차 크림', badgeClass: 'cream' },
                { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체', badge: '2차 장벽', badgeClass: 'cream' },
            ]
        },
        '수': {
            label: 'AHA',
            tagClass: 'aha',
            steps: [
                { product: '코스알엑스 AHA 7 파워 리퀴드', usage: '토너 후 T존·볼 중심 (홍조 부위 회피)', badge: '액티브', badgeClass: 'active', wait: '10분 대기' },
                { product: 'VT PDRN 에센스', usage: '얼굴 전체 2~3방울', badge: '재생', badgeClass: 'serum' },
                { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '수분', badgeClass: 'serum' },
                { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '1차 크림', badgeClass: 'cream' },
                { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체', badge: '2차 보호', badgeClass: 'cream' },
            ]
        },
        '목': {
            label: '레티노이드',
            tagClass: 'retinoid',
            steps: [
                { product: '디오디너리 레티노이드 2%', usage: '토너 흡수 후 얼굴 전체 (홍조 부위 얇게)', badge: '액티브', badgeClass: 'active', wait: '10분 대기' },
                { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '수분', badgeClass: 'serum' },
                { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '1차 크림', badgeClass: 'cream' },
                { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체 (특히 레티노이드 도포 부위)', badge: '2차 진정', badgeClass: 'cream' },
            ]
        },
        '금': {
            label: '기본 보습 + 재생',
            tagClass: 'rest',
            steps: [
                { product: 'VT PDRN 에센스', usage: '얼굴 전체 2~3방울', badge: '재생', badgeClass: 'serum' },
                { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '수분', badgeClass: 'serum' },
                { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '1차 크림', badgeClass: 'cream' },
                { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체', badge: '2차 장벽', badgeClass: 'cream' },
            ]
        },
        '토': {
            label: '나이아신아마이드',
            tagClass: 'niacin',
            steps: [
                { product: '더마팩토리 나이아신아마이드 20%', usage: '왼쪽 얼굴 중심 + 색소침착 부위', badge: '액티브', badgeClass: 'active', wait: '5분 대기' },
                { product: 'VT PDRN 에센스', usage: '얼굴 전체', badge: '재생', badgeClass: 'serum' },
                { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '수분', badgeClass: 'serum' },
                { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '1차 크림', badgeClass: 'cream' },
                { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체', badge: '2차 보호', badgeClass: 'cream' },
            ]
        },
        '일': {
            label: '집중 보습',
            tagClass: 'rest',
            steps: [
                { product: 'VT PDRN 에센스', usage: '얼굴 전체 2~3방울', badge: '재생', badgeClass: 'serum' },
                { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '수분', badgeClass: 'serum' },
                { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '1차 크림', badgeClass: 'cream' },
                { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체 (두껍게)', badge: '2차 장벽', badgeClass: 'cream' },
            ]
        }
    };

    const morningNote = '💡 비타민C를 아침에 고정 → 선크림과 함께 사용하면 광노화 예방 극대화. 처음 2주간 자극 시 격일 사용 후 매일로 전환.';

    const products = [
        { name: '일리윤 세라마이드 클렌저', role: '저자극 세안', when: '아침+저녁', note: '유지' },
        { name: '라운드랩 독도 클렌징 오일', role: '선크림·피지 제거', when: '저녁 1차', note: '유지' },
        { name: '라운드랩 독도 토너', role: '수분 + pH 정리', when: '아침·저녁', note: '유지' },
        { name: '스킨푸드 캐롯 카밍 패드', role: '긴급 진정', when: '홍조 시', note: '냉장 보관' },
        { name: '이니스프리 비타민C 세럼', role: '항산화 + 미백', when: '아침 매일', note: '5주차~' },
        { name: 'VT PDRN 에센스', role: '피부 재생', when: '저녁 매일', note: '3주차~' },
        { name: '토리든 히알루론산 세럼', role: '수분 충전', when: '아침·저녁', note: '1주차~' },
        { name: '아누아 PDRN 수분크림', role: '보습 + 재생', when: '아침·저녁', note: '1주차~' },
        { name: '알엑스 더마 시카 리젠 크림', role: '진정 + 장벽 강화', when: '저녁 2차', note: '3주차~' },
        { name: '닥터지 선크림 SPF50+', role: '자외선 차단', when: '아침+점심', note: '필수' },
        { name: '코스알엑스 AHA 7', role: '각질 + 모공', when: '수 저녁', note: '7주차~' },
        { name: '디오디너리 레티노이드 2%', role: '턴오버 + 안티에이징', when: '월·목 저녁', note: '5주차~' },
        { name: '더마팩토리 나이아신아마이드 20%', role: '미백 + 모공', when: '토 저녁', note: '9주차~' },
        { name: '라로슈포제 시카플라스트 밤', role: '강력 진정', when: '홍조·면도 후', note: '필요 시' },
        { name: '아젤리아크림', role: '색소침착 케어', when: '스팟 주3~4', note: '필요 시' },
        { name: '파티온 트러블 세럼', role: '여드름 스팟', when: '저녁 국소', note: '필요 시' },
        { name: '노스카나겔', role: '상처 재생', when: '취침 전', note: '필요 시' },
    ];

    // ===== Helpers =====
    function getTodayDayKo() {
        return DAYS_KO[new Date().getDay()];
    }

    function getDayFullName(dayKo) {
        const map = { '일': '일요일', '월': '월요일', '화': '화요일', '수': '수요일', '목': '목요일', '금': '금요일', '토': '토요일' };
        return map[dayKo];
    }

    // ===== Render Functions =====
    function renderToday() {
        const day = getTodayDayKo();
        document.getElementById('todayDay').textContent = getDayFullName(day);

        const info = eveningByDay[day];
        const tagHtml = `<span class="sc-active-tag ${info.tagClass}">${info.label}</span>`;
        document.getElementById('todayActive').innerHTML = `오늘 저녁: ${tagHtml}`;
    }

    function renderRoutine(time) {
        const container = document.getElementById('routineSteps');
        const day = getTodayDayKo();
        let steps = [];
        let note = '';

        if (time === 'morning') {
            steps = morningRoutine;
            note = morningNote;
        } else {
            const daySteps = eveningByDay[day]?.steps || [];
            steps = [...eveningCommon, ...daySteps];
        }

        let html = '';
        steps.forEach((step, i) => {
            const delay = i * 0.05;
            html += `<div class="sc-step" style="animation-delay: ${delay}s">`;
            html += `  <div class="sc-step-num">${i + 1}</div>`;
            html += `  <div class="sc-step-body">`;
            html += `    <div class="sc-step-product">${step.product}</div>`;
            html += `    <div class="sc-step-usage">${step.usage}</div>`;
            html += `  </div>`;
            html += `  <span class="sc-step-badge ${step.badgeClass}">${step.badge}</span>`;
            html += `</div>`;
            if (step.wait) {
                html += `<div class="sc-step-note">⏱ ${step.wait}</div>`;
            }
        });

        if (note) {
            html += `<div class="sc-step-note">${note}</div>`;
        }

        container.innerHTML = html;
    }

    function renderCalendar() {
        const container = document.getElementById('weeklyCalendar');
        const todayIdx = new Date().getDay(); // 0=일
        const order = ['월', '화', '수', '목', '금', '토', '일'];
        const orderIdx = [1, 2, 3, 4, 5, 6, 0];

        let html = '';
        order.forEach((day, i) => {
            const info = eveningByDay[day];
            const isToday = orderIdx[i] === todayIdx;
            html += `<div class="sc-cal-day${isToday ? ' today' : ''}">`;
            html += `  <div class="sc-cal-label">${day}</div>`;
            html += `  <div class="sc-cal-am">비타C<br>선크림</div>`;
            html += `  <div class="sc-cal-pm ${info.tagClass}">${info.label}</div>`;
            html += `</div>`;
        });

        container.innerHTML = html;
    }

    function renderProducts() {
        const container = document.getElementById('productList');
        let html = '';
        products.forEach(p => {
            html += `<div class="sc-product-item">`;
            html += `  <span class="sc-product-name">${p.name}</span>`;
            html += `  <span class="sc-product-role">${p.role}</span>`;
            html += `  <span class="sc-product-when">${p.when}</span>`;
            html += `  <span class="sc-product-note">${p.note}</span>`;
            html += `</div>`;
        });
        container.innerHTML = html;
    }

    // ===== Init =====
    function init() {
        renderToday();
        renderRoutine('morning');
        renderCalendar();
        renderProducts();

        // Time toggle
        document.querySelectorAll('.sc-time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sc-time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderRoutine(btn.dataset.time);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
