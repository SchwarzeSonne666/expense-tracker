// Skincare Routine Dashboard — Firebase-synced, copy/import workflow
(function () {
    const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

    const CATEGORIES = [
        { key: 'cleansing', label: '클렌징', icon: '🧴', color: '#4299e1' },
        { key: 'toner', label: '토너/패드', icon: '💧', color: '#48bb78' },
        { key: 'serum', label: '세럼/에센스', icon: '✨', color: '#ed64a6' },
        { key: 'cream', label: '크림/보습', icon: '🧈', color: '#f6ad55' },
        { key: 'suncare', label: '선케어', icon: '☀️', color: '#f56565' },
        { key: 'active', label: '액티브', icon: '⚡', color: '#9f7aea' },
        { key: 'spot', label: '스팟케어', icon: '🎯', color: '#fc8181' },
    ];

    // Category → badge auto-match map
    const CATEGORY_TO_BADGE = {
        cleansing: { badge: '세안', badgeClass: 'cleanse' },
        toner: { badge: '토너', badgeClass: 'tone' },
        serum: { badge: '세럼', badgeClass: 'serum' },
        cream: { badge: '크림', badgeClass: 'cream' },
        suncare: { badge: '선크림', badgeClass: 'sun' },
        active: { badge: '액티브', badgeClass: 'active' },
        spot: { badge: '스팟', badgeClass: 'active' },
    };

    const DAY_ORDER = ['월', '화', '수', '목', '금', '토', '일'];

    // ===== Default Data =====
    const DEFAULT_SPOT_CARE = [
        { icon: '🔴', label: '새 여드름', product: '파티온 트러블 세럼', how: '저녁 마지막, 해당 부위만' },
        { icon: '🟤', label: '자국/색소침착', product: '아젤리아크림', how: '저녁 크림 후, 주 3~4회' },
        { icon: '🔥', label: '염증 심할 때', product: '노스카나겔', how: '취침 전, 얇게 도포' },
        { icon: '😳', label: '홍조/열감', product: '냉장 캐롯 카밍 패드', how: '토너 대신 사용 + 시카 밤 교체' },
    ];

    const DEFAULT_PRODUCTS = [
        { name: '일리윤 세라마이드 클렌저', role: '저자극 세안', when: '아침+저녁', category: 'cleansing' },
        { name: '라운드랩 독도 클렌징 오일', role: '선크림·피지 제거', when: '저녁 1차', category: 'cleansing' },
        { name: '라운드랩 독도 토너', role: '수분 + pH 정리', when: '아침·저녁', category: 'toner' },
        { name: '스킨푸드 캐롯 카밍 패드', role: '긴급 진정', when: '홍조 시', category: 'toner' },
        { name: '이니스프리 비타민C 세럼', role: '항산화 + 미백', when: '아침 매일', category: 'serum' },
        { name: 'VT PDRN 에센스', role: '피부 재생', when: '저녁 매일', category: 'serum' },
        { name: '토리든 히알루론산 세럼', role: '수분 충전', when: '아침·저녁', category: 'serum' },
        { name: '아누아 PDRN 수분크림', role: '보습 + 재생', when: '아침·저녁', category: 'cream' },
        { name: '알엑스 더마 시카 리젠 크림', role: '진정 + 장벽 강화', when: '저녁 2차', category: 'cream' },
        { name: '라로슈포제 시카플라스트 밤', role: '강력 진정', when: '홍조·면도 후', category: 'cream' },
        { name: '닥터지 선크림 SPF50+', role: '자외선 차단', when: '아침+점심', category: 'suncare' },
        { name: '코스알엑스 AHA 7', role: '각질 + 모공', when: '수 저녁', category: 'active' },
        { name: '디오디너리 레티노이드 2%', role: '턴오버 + 안티에이징', when: '월·목 저녁', category: 'active' },
        { name: '더마팩토리 나이아신아마이드 20%', role: '미백 + 모공', when: '토 저녁', category: 'active' },
        { name: '아젤리아크림', role: '색소침착 케어', when: '스팟 주3~4', category: 'spot' },
        { name: '파티온 트러블 세럼', role: '여드름 스팟', when: '저녁 국소', category: 'spot' },
        { name: '노스카나겔', role: '상처 재생', when: '취침 전', category: 'spot' },
    ];

    const DEFAULT_ROUTINES = {
        morning: [
            { product: '일리윤 세라마이드 클렌저', usage: '미온수로 가볍게 세안', badge: '세안', badgeClass: 'cleanse' },
            { product: '라운드랩 독도 토너', usage: '손바닥에 덜어 가볍게 패팅', badge: '토너', badgeClass: 'tone' },
            { product: '이니스프리 비타민C 세럼', usage: '얼굴 전체 2~3방울, 왼쪽 얼굴 한 번 더', badge: '세럼', badgeClass: 'serum' },
            { product: '토리든 히알루론산 세럼', usage: '얼굴 전체 적당량', badge: '세럼', badgeClass: 'serum' },
            { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
            { product: '닥터지 선크림 SPF50+', usage: '충분한 양 (손가락 2마디), 왼쪽 얼굴 집중', badge: '선크림', badgeClass: 'sun' },
        ],
        evening_common: [
            { product: '라운드랩 독도 클렌징 오일', usage: '마른 얼굴에 마사지 → 물로 유화 → 헹구기', badge: '세안', badgeClass: 'cleanse' },
            { product: '일리윤 세라마이드 클렌저', usage: '미온수로 2차 세안', badge: '세안', badgeClass: 'cleanse' },
            { product: '라운드랩 독도 토너', usage: '홍조·열감 심한 날은 냉장 캐롯 패드 사용', badge: '토너', badgeClass: 'tone' },
        ],
        evening_월: { label: '레티노이드', tagClass: 'retinoid', steps: [
            { product: '디오디너리 레티노이드 2%', usage: '토너 흡수 후 얼굴 전체 (홍조 부위 얇게)', badge: '액티브', badgeClass: 'active', wait: '10분 대기' },
            { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '세럼', badgeClass: 'serum' },
            { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
            { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체 (특히 레티노이드 도포 부위)', badge: '크림', badgeClass: 'cream' },
        ]},
        evening_화: { label: '기본 보습 + 재생', tagClass: 'rest', steps: [
            { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '세럼', badgeClass: 'serum' },
            { product: 'VT PDRN 에센스', usage: '얼굴 전체 2~3방울', badge: '세럼', badgeClass: 'serum' },
            { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
            { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
        ]},
        evening_수: { label: 'AHA', tagClass: 'aha', steps: [
            { product: '코스알엑스 AHA 7 파워 리퀴드', usage: '토너 후 T존·볼 중심 (홍조 부위 회피)', badge: '액티브', badgeClass: 'active', wait: '10분 대기' },
            { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '세럼', badgeClass: 'serum' },
            { product: 'VT PDRN 에센스', usage: '얼굴 전체 2~3방울', badge: '세럼', badgeClass: 'serum' },
            { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
            { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
        ]},
        evening_목: { label: '레티노이드', tagClass: 'retinoid', steps: [
            { product: '디오디너리 레티노이드 2%', usage: '토너 흡수 후 얼굴 전체 (홍조 부위 얇게)', badge: '액티브', badgeClass: 'active', wait: '10분 대기' },
            { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '세럼', badgeClass: 'serum' },
            { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
            { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체 (특히 레티노이드 도포 부위)', badge: '크림', badgeClass: 'cream' },
        ]},
        evening_금: { label: '기본 보습 + 재생', tagClass: 'rest', steps: [
            { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '세럼', badgeClass: 'serum' },
            { product: 'VT PDRN 에센스', usage: '얼굴 전체 2~3방울', badge: '세럼', badgeClass: 'serum' },
            { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
            { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
        ]},
        evening_토: { label: '나이아신아마이드', tagClass: 'niacin', steps: [
            { product: '더마팩토리 나이아신아마이드 20%', usage: '왼쪽 얼굴 중심 + 색소침착 부위', badge: '액티브', badgeClass: 'active', wait: '5분 대기' },
            { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '세럼', badgeClass: 'serum' },
            { product: 'VT PDRN 에센스', usage: '얼굴 전체 2~3방울', badge: '세럼', badgeClass: 'serum' },
            { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
            { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
        ]},
        evening_일: { label: '집중 보습', tagClass: 'rest', steps: [
            { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '세럼', badgeClass: 'serum' },
            { product: 'VT PDRN 에센스', usage: '얼굴 전체 2~3방울', badge: '세럼', badgeClass: 'serum' },
            { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
            { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체 (두껍게)', badge: '크림', badgeClass: 'cream' },
        ]},
    };

    // ===== State =====
    let products = [];
    let routines = {};
    let spotCare = [];
    let currentTime = 'morning';

    // Deep copy helper
    function deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // ===== Firebase =====
    const fbProducts = window.db ? window.db.ref('skincare/products') : null;
    const fbRoutines = window.db ? window.db.ref('skincare/routines') : null;
    const fbSpotCare = window.db ? window.db.ref('skincare/spotCare') : null;

    function initFirebase() {
        if (!fbProducts) return;

        fbProducts.on('value', snap => {
            const d = snap.val();
            products = d ? (Array.isArray(d) ? d : Object.values(d)) : [];
            let migrated = false;
            products.forEach(p => {
                if (!p.category) {
                    p.category = guessCategory(p);
                    migrated = true;
                }
            });
            if (products.length === 0) {
                products = deepCopy(DEFAULT_PRODUCTS);
                fbProducts.set(products);
            } else if (migrated) {
                fbProducts.set(products);
            }
            renderProducts();
        });

        fbRoutines.on('value', snap => {
            const d = snap.val();
            routines = d || {};
            let needsUpdate = false;
            Object.keys(DEFAULT_ROUTINES).forEach(k => {
                if (!routines[k]) { routines[k] = deepCopy(DEFAULT_ROUTINES[k]); needsUpdate = true; }
            });
            if (needsUpdate) fbRoutines.set(routines);
            renderToday();
            renderRoutine(currentTime);
            renderCalendar();
        });

        if (fbSpotCare) {
            fbSpotCare.on('value', snap => {
                const d = snap.val();
                spotCare = d ? (Array.isArray(d) ? d : Object.values(d)) : [];
                if (spotCare.length === 0) {
                    spotCare = deepCopy(DEFAULT_SPOT_CARE);
                    fbSpotCare.set(spotCare);
                }
                renderSpotCare();
            });
        }
    }

    function guessCategory(p) {
        const n = (p.name + p.role).toLowerCase();
        if (n.includes('클렌') || n.includes('세안') || n.includes('오일')) return 'cleansing';
        if (n.includes('토너') || n.includes('패드')) return 'toner';
        if (n.includes('세럼') || n.includes('에센스') || n.includes('히알루') || n.includes('비타민') || n.includes('pdrn')) return 'serum';
        if (n.includes('크림') || n.includes('보습') || n.includes('밤') || n.includes('시카')) return 'cream';
        if (n.includes('선크림') || n.includes('spf') || n.includes('자외선')) return 'suncare';
        if (n.includes('aha') || n.includes('레티노') || n.includes('나이아신')) return 'active';
        if (n.includes('스팟') || n.includes('여드름') || n.includes('트러블') || n.includes('색소') || n.includes('노스카나')) return 'spot';
        return 'serum';
    }

    function saveProducts() { if (fbProducts) fbProducts.set(products); }
    function saveRoutines() { if (fbRoutines) fbRoutines.set(routines); }
    function saveSpotCare() { if (fbSpotCare) fbSpotCare.set(spotCare); }

    // ===== Helpers =====
    // 06시 기준 날짜: 자정~05:59는 전날로 취급
    function getEffectiveDate() {
        const now = new Date();
        if (now.getHours() < 6) {
            return new Date(now.getTime() - 6 * 60 * 60 * 1000);
        }
        return now;
    }
    function getTodayDayKo() { return DAYS_KO[getEffectiveDate().getDay()]; }
    function getDayFullName(d) { return { '일':'일요일','월':'월요일','화':'화요일','수':'수요일','목':'목요일','금':'금요일','토':'토요일' }[d]; }
    function getAutoTime() { const h = new Date().getHours(); return (h >= 6 && h < 15) ? 'morning' : 'evening'; }

    function getEveningInfo(day) {
        const key = 'evening_' + day;
        return routines[key] || DEFAULT_ROUTINES[key] || { label: '기본', tagClass: 'rest', steps: [] };
    }

    function getBadgeForProduct(productName) {
        const p = products.find(pr => pr.name === productName);
        if (p && p.category && CATEGORY_TO_BADGE[p.category]) {
            return { ...CATEGORY_TO_BADGE[p.category] };
        }
        return { badge: '세럼', badgeClass: 'serum' }; // fallback
    }

    function showToast(msg, type = 'success') {
        const c = document.getElementById('toastContainer');
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        c.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    // ===== Render =====
    function renderToday() {
        const day = getTodayDayKo();
        document.getElementById('todayDay').textContent = getDayFullName(day);
        const info = getEveningInfo(day);
        document.getElementById('todayActive').innerHTML = `오늘 저녁: <span class="sc-active-tag ${info.tagClass}">${info.label}</span>`;
    }

    function renderRoutine(time) {
        const container = document.getElementById('routineSteps');
        const day = getTodayDayKo();
        let steps = [];

        if (time === 'morning') {
            steps = routines.morning || DEFAULT_ROUTINES.morning;
        } else {
            const common = routines.evening_common || DEFAULT_ROUTINES.evening_common;
            const info = getEveningInfo(day);
            steps = [...common, ...(info.steps || [])];
        }

        let html = '';
        steps.forEach((s, i) => {
            html += `<div class="sc-step" style="animation-delay:${i * 0.04}s">`;
            html += `<div class="sc-step-num">${i + 1}</div>`;
            html += `<div class="sc-step-body"><div class="sc-step-product">${s.product}</div><div class="sc-step-usage">${s.usage}</div></div>`;
            html += `<span class="sc-step-badge ${s.badgeClass}">${s.badge}</span></div>`;
            if (s.wait) html += `<div class="sc-step-note">⏱ ${s.wait}</div>`;
        });
        container.innerHTML = html;
    }

    function getMorningKeyProducts() {
        const morningSteps = routines.morning || DEFAULT_ROUTINES.morning;
        const keywords = [];
        morningSteps.forEach(s => {
            const name = s.product;
            if (name.includes('비타민C') || name.includes('비타C')) keywords.push('비타C');
            else if (name.includes('선크림') || name.includes('SPF')) keywords.push('선크림');
            else if (name.includes('히알루론') || name.includes('토리든')) keywords.push('수분');
            else if (name.includes('PDRN') || name.includes('pdrn')) keywords.push('PDRN');
        });
        return [...new Set(keywords)].slice(0, 3);
    }

    function renderCalendar() {
        const container = document.getElementById('weeklyCalendar');
        const todayIdx = getEffectiveDate().getDay();
        const order = ['월','화','수','목','금','토','일'];
        const orderIdx = [1,2,3,4,5,6,0];
        const amKeywords = getMorningKeyProducts();
        const amText = amKeywords.length > 0 ? amKeywords.join('<br>') : '아침';

        container.innerHTML = order.map((day, i) => {
            const info = getEveningInfo(day);
            const isToday = orderIdx[i] === todayIdx;
            return `<div class="sc-cal-day${isToday ? ' today' : ''}">
                <div class="sc-cal-label">${day}</div>
                <div class="sc-cal-am">${amText}</div>
                <div class="sc-cal-pm ${info.tagClass}">${info.label}</div>
            </div>`;
        }).join('');
    }

    function renderSpotCare() {
        const container = document.getElementById('spotCareGrid');
        if (!container) return;
        const items = spotCare.length > 0 ? spotCare : DEFAULT_SPOT_CARE;
        container.innerHTML = items.map(s => `
            <div class="sc-spot-card">
                <div class="sc-spot-icon">${s.icon}</div>
                <div class="sc-spot-label">${s.label}</div>
                <div class="sc-spot-product">${s.product.replace(/\s*\+\s*/g, '<br>')}</div>
                <div class="sc-spot-how">${s.how}</div>
            </div>
        `).join('');
    }

    function renderProducts() {
        const container = document.getElementById('productList');
        const grouped = {};
        CATEGORIES.forEach(c => { grouped[c.key] = []; });
        grouped['etc'] = [];

        products.forEach(p => {
            const cat = p.category || 'etc';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(p);
        });

        let html = '';
        const renderGroup = (cat, items) => {
            if (items.length === 0) return;
            html += `<div class="sc-product-group">`;
            html += `<div class="sc-product-group-header">`;
            html += `<span class="sc-group-icon">${cat.icon}</span>`;
            html += `<span class="sc-group-label">${cat.label}</span>`;
            html += `</div>`;
            items.forEach(p => {
                html += `<div class="sc-product-item">`;
                html += `<div class="sc-product-info"><span class="sc-product-name">${p.name}</span><span class="sc-product-role">${p.role}</span></div>`;
                html += `<span class="sc-product-when">${p.when}</span>`;
                html += `</div>`;
            });
            html += `</div>`;
        };

        CATEGORIES.forEach(cat => renderGroup(cat, grouped[cat.key]));
        if (grouped['etc'].length > 0) renderGroup({ icon: '📦', label: '기타' }, grouped['etc']);

        container.innerHTML = html;
    }

    // ===== Events =====
    function init() {
        currentTime = getAutoTime();
        document.querySelectorAll('.sc-time-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.time === currentTime);
        });

        products = deepCopy(DEFAULT_PRODUCTS);
        routines = deepCopy(DEFAULT_ROUTINES);
        spotCare = deepCopy(DEFAULT_SPOT_CARE);
        renderToday();
        renderRoutine(currentTime);
        renderCalendar();
        renderProducts();
        renderSpotCare();

        initFirebase();

        // Time toggle
        document.querySelectorAll('.sc-time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentTime = btn.dataset.time;
                document.querySelectorAll('.sc-time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderRoutine(currentTime);
            });
        });

        // Shared copy-to-clipboard with button feedback
        const COPY_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        function copyWithFeedback(btnId, text, toastMsg) {
            navigator.clipboard.writeText(text).then(() => {
                const btn = document.getElementById(btnId);
                btn.classList.add('copied');
                btn.innerHTML = '✓ 복사됨';
                showToast(toastMsg);
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = `${COPY_SVG} 복사`;
                }, 1500);
            });
        }

        // Format steps as text lines
        function formatSteps(steps) {
            return steps.map((s, i) => {
                let line = `  ${i + 1}. ${s.product} | ${s.usage}`;
                if (s.wait) line += ` ⏱${s.wait}`;
                return line;
            }).join('\n');
        }

        // ===== Copy Routine =====
        document.getElementById('copyRoutineBtn').addEventListener('click', () => {
            const morning = routines.morning || DEFAULT_ROUTINES.morning;
            const common = routines.evening_common || DEFAULT_ROUTINES.evening_common;
            let text = '=== 피부관리 루틴 ===\n\n';
            text += '[아침]\n' + formatSteps(morning) + '\n\n';
            text += '[저녁 공통]\n' + formatSteps(common) + '\n\n';
            DAY_ORDER.forEach(day => {
                const info = getEveningInfo(day);
                text += `[저녁 ${day}요일 — ${info.label}]\n`;
                text += formatSteps(info.steps || []) + '\n\n';
            });
            copyWithFeedback('copyRoutineBtn', text.trim(), '전체 루틴이 클립보드에 복사되었습니다');
        });

        // ===== Copy Products =====
        document.getElementById('copyProductsBtn').addEventListener('click', () => {
            if (products.length === 0) { showToast('복사할 제품이 없습니다', 'error'); return; }
            const grouped = {};
            CATEGORIES.forEach(c => { grouped[c.key] = []; });
            grouped['etc'] = [];
            products.forEach(p => {
                const cat = p.category || 'etc';
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(p);
            });
            let text = '';
            CATEGORIES.forEach(cat => {
                const items = grouped[cat.key];
                if (items.length === 0) return;
                text += `[${cat.label}]\n`;
                items.forEach(p => {
                    text += `- ${p.name} | ${p.role} | ${p.when}\n`;
                });
                text += '\n';
            });
            if (grouped['etc'].length > 0) {
                text += `[기타]\n`;
                grouped['etc'].forEach(p => {
                    text += `- ${p.name} | ${p.role} | ${p.when}\n`;
                });
                text += '\n';
            }
            copyWithFeedback('copyProductsBtn', text.trim(), '제품 목록이 클립보드에 복사되었습니다');
        });

        // ===== Copy Spot Care =====
        document.getElementById('copySpotBtn').addEventListener('click', () => {
            const items = spotCare.length > 0 ? spotCare : DEFAULT_SPOT_CARE;
            if (items.length === 0) { showToast('복사할 스팟 케어가 없습니다', 'error'); return; }
            let text = '=== 스팟 케어 ===\n\n';
            items.forEach(s => {
                text += `${s.icon} | ${s.label} | ${s.product} | ${s.how}\n`;
            });
            copyWithFeedback('copySpotBtn', text.trim(), '스팟 케어가 클립보드에 복사되었습니다');
        });

        // ===== Import Routine =====
        const importModal = document.getElementById('importRoutineModal');
        document.getElementById('importRoutineBtn').addEventListener('click', () => {
            document.getElementById('importRoutineText').value = '';
            importModal.style.display = 'flex';
        });
        document.getElementById('closeImportRoutine').addEventListener('click', () => { importModal.style.display = 'none'; });
        document.getElementById('cancelImportRoutine').addEventListener('click', () => { importModal.style.display = 'none'; });
        importModal.addEventListener('click', e => { if (e.target === importModal) importModal.style.display = 'none'; });

        document.getElementById('applyImportRoutine').addEventListener('click', () => {
            const raw = document.getElementById('importRoutineText').value.trim();
            if (!raw) { showToast('텍스트를 붙여넣으세요', 'error'); return; }

            const sections = {};
            let currentSection = null;
            raw.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('===')) return;
                const sectionMatch = trimmed.match(/^\[(.+)\]$/);
                if (sectionMatch) {
                    currentSection = sectionMatch[1];
                    sections[currentSection] = [];
                    return;
                }
                if (currentSection) {
                    const stepMatch = trimmed.match(/^(?:\d+\.\s*|-\s*)(.+)$/);
                    if (stepMatch) sections[currentSection].push(stepMatch[1]);
                }
            });

            if (Object.keys(sections).length === 0) {
                showToast('파싱할 수 있는 섹션이 없습니다', 'error');
                return;
            }

            function parseStep(str) {
                let wait = '';
                const waitMatch = str.match(/⏱\s*(.+)$/);
                if (waitMatch) {
                    wait = waitMatch[1].trim();
                    str = str.replace(/⏱\s*.+$/, '').trim();
                }
                const parts = str.split('|').map(s => s.trim());
                const productName = parts[0] || '';
                const usage = parts[1] || '';
                const badgeInfo = getBadgeForProduct(productName);
                const step = { product: productName, usage, badge: badgeInfo.badge, badgeClass: badgeInfo.badgeClass };
                if (wait) step.wait = wait;
                return step;
            }

            let updatedCount = 0;

            if (sections['아침']) {
                routines.morning = sections['아침'].map(parseStep);
                updatedCount++;
            }

            if (sections['저녁 공통']) {
                routines.evening_common = sections['저녁 공통'].map(parseStep);
                updatedCount++;
            }

            const dayMap = { '월': '월', '화': '화', '수': '수', '목': '목', '금': '금', '토': '토', '일': '일' };
            Object.keys(sections).forEach(key => {
                const dayMatch = key.match(/저녁\s*(\S)요일(?:\s*[—\-]\s*(.+))?/);
                if (dayMatch && dayMap[dayMatch[1]]) {
                    const day = dayMatch[1];
                    const label = dayMatch[2] ? dayMatch[2].trim() : (routines['evening_' + day]?.label || '기본');
                    const existing = routines['evening_' + day] || {};
                    let tagClass = existing.tagClass || 'rest';
                    if (label.includes('레티노이드')) tagClass = 'retinoid';
                    else if (label.match(/AHA/i)) tagClass = 'aha';
                    else if (label.includes('나이아신')) tagClass = 'niacin';
                    else if (!dayMatch[2]) tagClass = existing.tagClass || 'rest';
                    else tagClass = 'rest';

                    routines['evening_' + day] = {
                        label,
                        tagClass,
                        steps: sections[key].map(parseStep)
                    };
                    updatedCount++;
                }
            });

            if (updatedCount === 0) {
                showToast('매칭되는 섹션이 없습니다', 'error');
                return;
            }

            saveRoutines();
            importModal.style.display = 'none';
            showToast(`${updatedCount}개 섹션 업데이트 완료`);
        });

        // ===== Import Products =====
        const importProductsModal = document.getElementById('importProductsModal');
        document.getElementById('importProductsBtn').addEventListener('click', () => {
            document.getElementById('importProductsText').value = '';
            importProductsModal.style.display = 'flex';
        });
        document.getElementById('closeImportProducts').addEventListener('click', () => { importProductsModal.style.display = 'none'; });
        document.getElementById('cancelImportProducts').addEventListener('click', () => { importProductsModal.style.display = 'none'; });
        importProductsModal.addEventListener('click', e => { if (e.target === importProductsModal) importProductsModal.style.display = 'none'; });

        document.getElementById('applyImportProducts').addEventListener('click', () => {
            const raw = document.getElementById('importProductsText').value.trim();
            if (!raw) { showToast('텍스트를 붙여넣으세요', 'error'); return; }

            const categoryLabelToKey = {};
            CATEGORIES.forEach(c => { categoryLabelToKey[c.label] = c.key; });

            const newProducts = [];
            let currentCatKey = 'serum';
            raw.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;
                const sectionMatch = trimmed.match(/^\[(.+)\]$/);
                if (sectionMatch) {
                    const label = sectionMatch[1].trim();
                    currentCatKey = categoryLabelToKey[label] || guessCategory({ name: label, role: '' });
                    return;
                }
                const itemMatch = trimmed.match(/^(?:-\s*|\d+\.\s*)(.+)$/);
                if (itemMatch) {
                    const parts = itemMatch[1].split('|').map(s => s.trim());
                    if (parts[0]) {
                        newProducts.push({
                            name: parts[0],
                            role: parts[1] || '',
                            when: parts[2] || '',
                            category: currentCatKey,
                        });
                    }
                }
            });

            if (newProducts.length === 0) {
                showToast('파싱할 수 있는 제품이 없습니다', 'error');
                return;
            }

            products = newProducts;
            saveProducts();
            importProductsModal.style.display = 'none';
            showToast(`${newProducts.length}개 제품 업데이트 완료`);
        });

        // ===== Import Spot Care =====
        const importSpotModal = document.getElementById('importSpotModal');
        document.getElementById('importSpotBtn').addEventListener('click', () => {
            document.getElementById('importSpotText').value = '';
            importSpotModal.style.display = 'flex';
        });
        document.getElementById('closeImportSpot').addEventListener('click', () => { importSpotModal.style.display = 'none'; });
        document.getElementById('cancelImportSpot').addEventListener('click', () => { importSpotModal.style.display = 'none'; });
        importSpotModal.addEventListener('click', e => { if (e.target === importSpotModal) importSpotModal.style.display = 'none'; });

        document.getElementById('applyImportSpot').addEventListener('click', () => {
            const raw = document.getElementById('importSpotText').value.trim();
            if (!raw) { showToast('텍스트를 붙여넣으세요', 'error'); return; }

            const newSpots = [];
            raw.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('===')) return;
                const parts = trimmed.split('|').map(s => s.trim());
                if (parts.length >= 3) {
                    newSpots.push({
                        icon: parts[0] || '🔴',
                        label: parts[1] || '',
                        product: parts[2] || '',
                        how: parts[3] || '',
                    });
                }
            });

            if (newSpots.length === 0) {
                showToast('파싱할 수 있는 항목이 없습니다', 'error');
                return;
            }

            spotCare = newSpots;
            saveSpotCare();
            importSpotModal.style.display = 'none';
            showToast(`${newSpots.length}개 스팟 케어 업데이트 완료`);
        });

        // ESC close all modals
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
