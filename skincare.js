// Skincare Routine Dashboard — Firebase-synced, editable
(function () {
    const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
    const BADGE_OPTIONS = [
        { value: 'cleanse', label: '세안' }, { value: 'tone', label: '토너' },
        { value: 'serum', label: '세럼' }, { value: 'cream', label: '크림' },
        { value: 'sun', label: '선크림' }, { value: 'active', label: '액티브' },
    ];

    // ===== Default Data =====
    const DEFAULT_PRODUCTS = [
        { name: '일리윤 세라마이드 클렌저', role: '저자극 세안', when: '아침+저녁' },
        { name: '라운드랩 독도 클렌징 오일', role: '선크림·피지 제거', when: '저녁 1차' },
        { name: '라운드랩 독도 토너', role: '수분 + pH 정리', when: '아침·저녁' },
        { name: '스킨푸드 캐롯 카밍 패드', role: '긴급 진정', when: '홍조 시' },
        { name: '이니스프리 비타민C 세럼', role: '항산화 + 미백', when: '아침 매일' },
        { name: 'VT PDRN 에센스', role: '피부 재생', when: '저녁 매일' },
        { name: '토리든 히알루론산 세럼', role: '수분 충전', when: '아침·저녁' },
        { name: '아누아 PDRN 수분크림', role: '보습 + 재생', when: '아침·저녁' },
        { name: '알엑스 더마 시카 리젠 크림', role: '진정 + 장벽 강화', when: '저녁 2차' },
        { name: '닥터지 선크림 SPF50+', role: '자외선 차단', when: '아침+점심' },
        { name: '코스알엑스 AHA 7', role: '각질 + 모공', when: '수 저녁' },
        { name: '디오디너리 레티노이드 2%', role: '턴오버 + 안티에이징', when: '월·목 저녁' },
        { name: '더마팩토리 나이아신아마이드 20%', role: '미백 + 모공', when: '토 저녁' },
        { name: '라로슈포제 시카플라스트 밤', role: '강력 진정', when: '홍조·면도 후' },
        { name: '아젤리아크림', role: '색소침착 케어', when: '스팟 주3~4' },
        { name: '파티온 트러블 세럼', role: '여드름 스팟', when: '저녁 국소' },
        { name: '노스카나겔', role: '상처 재생', when: '취침 전' },
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
            { product: 'VT PDRN 에센스', usage: '얼굴 전체 2~3방울', badge: '세럼', badgeClass: 'serum' },
            { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '세럼', badgeClass: 'serum' },
            { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
            { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
        ]},
        evening_수: { label: 'AHA', tagClass: 'aha', steps: [
            { product: '코스알엑스 AHA 7 파워 리퀴드', usage: '토너 후 T존·볼 중심 (홍조 부위 회피)', badge: '액티브', badgeClass: 'active', wait: '10분 대기' },
            { product: 'VT PDRN 에센스', usage: '얼굴 전체 2~3방울', badge: '세럼', badgeClass: 'serum' },
            { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '세럼', badgeClass: 'serum' },
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
            { product: 'VT PDRN 에센스', usage: '얼굴 전체 2~3방울', badge: '세럼', badgeClass: 'serum' },
            { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '세럼', badgeClass: 'serum' },
            { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
            { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
        ]},
        evening_토: { label: '나이아신아마이드', tagClass: 'niacin', steps: [
            { product: '더마팩토리 나이아신아마이드 20%', usage: '왼쪽 얼굴 중심 + 색소침착 부위', badge: '액티브', badgeClass: 'active', wait: '5분 대기' },
            { product: 'VT PDRN 에센스', usage: '얼굴 전체', badge: '세럼', badgeClass: 'serum' },
            { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '세럼', badgeClass: 'serum' },
            { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
            { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
        ]},
        evening_일: { label: '집중 보습', tagClass: 'rest', steps: [
            { product: 'VT PDRN 에센스', usage: '얼굴 전체 2~3방울', badge: '세럼', badgeClass: 'serum' },
            { product: '토리든 히알루론산 세럼', usage: '얼굴 전체', badge: '세럼', badgeClass: 'serum' },
            { product: '아누아 PDRN 수분크림', usage: '얼굴 전체', badge: '크림', badgeClass: 'cream' },
            { product: '알엑스 더마 시카 리젠 크림', usage: '얼굴 전체 (두껍게)', badge: '크림', badgeClass: 'cream' },
        ]},
    };

    // ===== State =====
    let products = [];
    let routines = {};
    let currentTime = 'morning';
    let editingRoutineKey = '';

    // ===== Firebase =====
    const fbProducts = window.db ? window.db.ref('skincare/products') : null;
    const fbRoutines = window.db ? window.db.ref('skincare/routines') : null;

    function initFirebase() {
        if (!fbProducts) return;

        fbProducts.on('value', snap => {
            const d = snap.val();
            products = d ? (Array.isArray(d) ? d : Object.values(d)) : [];
            if (products.length === 0) {
                products = [...DEFAULT_PRODUCTS];
                fbProducts.set(products);
            }
            renderProducts();
            renderProductSelect();
        });

        fbRoutines.on('value', snap => {
            const d = snap.val();
            routines = d || {};
            // Fill missing keys with defaults
            let needsUpdate = false;
            Object.keys(DEFAULT_ROUTINES).forEach(k => {
                if (!routines[k]) { routines[k] = DEFAULT_ROUTINES[k]; needsUpdate = true; }
            });
            if (needsUpdate) fbRoutines.set(routines);
            renderToday();
            renderRoutine(currentTime);
            renderCalendar();
        });
    }

    function saveProducts() {
        if (fbProducts) fbProducts.set(products);
    }

    function saveRoutines() {
        if (fbRoutines) fbRoutines.set(routines);
    }

    // ===== Helpers =====
    function getTodayDayKo() { return DAYS_KO[new Date().getDay()]; }
    function getDayFullName(d) { return { '일':'일요일','월':'월요일','화':'화요일','수':'수요일','목':'목요일','금':'금요일','토':'토요일' }[d]; }
    function getAutoTime() { const h = new Date().getHours(); return (h >= 6 && h < 15) ? 'morning' : 'evening'; }

    function getEveningInfo(day) {
        const key = 'evening_' + day;
        return routines[key] || DEFAULT_ROUTINES[key] || { label: '기본', tagClass: 'rest', steps: [] };
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

    function renderCalendar() {
        const container = document.getElementById('weeklyCalendar');
        const todayIdx = new Date().getDay();
        const order = ['월','화','수','목','금','토','일'];
        const orderIdx = [1,2,3,4,5,6,0];

        container.innerHTML = order.map((day, i) => {
            const info = getEveningInfo(day);
            const isToday = orderIdx[i] === todayIdx;
            return `<div class="sc-cal-day${isToday ? ' today' : ''}">
                <div class="sc-cal-label">${day}</div>
                <div class="sc-cal-am">비타C<br>선크림</div>
                <div class="sc-cal-pm ${info.tagClass}">${info.label}</div>
            </div>`;
        }).join('');
    }

    function renderProducts() {
        const container = document.getElementById('productList');
        container.innerHTML = products.map((p, i) => `
            <div class="sc-product-item">
                <span class="sc-product-name">${p.name}</span>
                <span class="sc-product-role">${p.role}</span>
                <span class="sc-product-when">${p.when}</span>
                <button class="sc-product-del" data-idx="${i}" title="삭제">&times;</button>
            </div>
        `).join('');
    }

    function renderProductSelect() {
        const sel = document.getElementById('addStepSelect');
        sel.innerHTML = '<option value="">제품 선택하여 추가...</option>' +
            products.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    }

    // ===== Edit Routine Modal =====
    function openEditRoutine() {
        const day = getTodayDayKo();
        if (currentTime === 'morning') {
            editingRoutineKey = 'morning';
        } else {
            editingRoutineKey = 'evening_' + day;
        }

        const key = editingRoutineKey;
        let data;
        if (key === 'morning') {
            data = routines.morning || DEFAULT_ROUTINES.morning;
            document.getElementById('editRoutineTitle').textContent = '아침 루틴 편집';
        } else {
            const info = routines[key] || DEFAULT_ROUTINES[key];
            data = info.steps || [];
            document.getElementById('editRoutineTitle').textContent = `저녁 (${day}) 루틴 편집`;
        }

        renderEditList(data);
        renderProductSelect();
        document.getElementById('editRoutineModal').style.display = 'flex';
    }

    function renderEditList(steps) {
        const list = document.getElementById('editRoutineList');
        list.innerHTML = steps.map((s, i) => `
            <div class="sc-edit-item" data-idx="${i}">
                <div class="sc-edit-grip">⠿</div>
                <div class="sc-edit-info">
                    <div class="sc-edit-product">${s.product}</div>
                    <input class="sc-edit-usage" value="${s.usage}" data-field="usage" data-idx="${i}" placeholder="용법">
                </div>
                <select class="sc-edit-badge-sel" data-idx="${i}">
                    ${BADGE_OPTIONS.map(b => `<option value="${b.value}" ${s.badgeClass === b.value ? 'selected' : ''}>${b.label}</option>`).join('')}
                </select>
                <div class="sc-edit-actions">
                    <button class="sc-edit-move-up" data-idx="${i}" title="위로">&uarr;</button>
                    <button class="sc-edit-move-down" data-idx="${i}" title="아래로">&darr;</button>
                    <button class="sc-edit-remove" data-idx="${i}" title="삭제">&times;</button>
                </div>
            </div>
        `).join('');
    }

    function getEditingSteps() {
        if (editingRoutineKey === 'morning') {
            return routines.morning || DEFAULT_ROUTINES.morning;
        } else {
            const info = routines[editingRoutineKey] || {};
            return info.steps || [];
        }
    }

    function setEditingSteps(steps) {
        if (editingRoutineKey === 'morning') {
            routines.morning = steps;
        } else {
            if (!routines[editingRoutineKey]) {
                const def = DEFAULT_ROUTINES[editingRoutineKey] || { label: '기본', tagClass: 'rest', steps: [] };
                routines[editingRoutineKey] = { ...def };
            }
            routines[editingRoutineKey].steps = steps;
        }
        saveRoutines();
    }

    // ===== Events =====
    function init() {
        // Auto time
        currentTime = getAutoTime();
        document.querySelectorAll('.sc-time-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.time === currentTime);
        });

        // Load defaults first (before Firebase kicks in)
        products = [...DEFAULT_PRODUCTS];
        routines = { ...DEFAULT_ROUTINES };
        renderToday();
        renderRoutine(currentTime);
        renderCalendar();
        renderProducts();

        // Firebase
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

        // Edit routine
        document.getElementById('editRoutineBtn').addEventListener('click', openEditRoutine);
        document.getElementById('closeEditRoutine').addEventListener('click', () => {
            document.getElementById('editRoutineModal').style.display = 'none';
        });
        document.getElementById('editRoutineModal').addEventListener('click', e => {
            if (e.target === document.getElementById('editRoutineModal'))
                document.getElementById('editRoutineModal').style.display = 'none';
        });

        // Edit routine list interactions
        document.getElementById('editRoutineList').addEventListener('click', e => {
            const steps = [...getEditingSteps()];
            const idx = parseInt(e.target.dataset.idx);
            if (e.target.classList.contains('sc-edit-move-up') && idx > 0) {
                [steps[idx - 1], steps[idx]] = [steps[idx], steps[idx - 1]];
                setEditingSteps(steps);
                renderEditList(steps);
            } else if (e.target.classList.contains('sc-edit-move-down') && idx < steps.length - 1) {
                [steps[idx], steps[idx + 1]] = [steps[idx + 1], steps[idx]];
                setEditingSteps(steps);
                renderEditList(steps);
            } else if (e.target.classList.contains('sc-edit-remove')) {
                steps.splice(idx, 1);
                setEditingSteps(steps);
                renderEditList(steps);
            }
        });

        // Edit usage inline
        document.getElementById('editRoutineList').addEventListener('change', e => {
            const idx = parseInt(e.target.dataset.idx);
            const steps = [...getEditingSteps()];
            if (e.target.classList.contains('sc-edit-usage')) {
                steps[idx].usage = e.target.value;
                setEditingSteps(steps);
            } else if (e.target.classList.contains('sc-edit-badge-sel')) {
                const opt = BADGE_OPTIONS.find(b => b.value === e.target.value);
                steps[idx].badgeClass = e.target.value;
                steps[idx].badge = opt ? opt.label : e.target.value;
                setEditingSteps(steps);
            }
        });

        // Add step to routine
        document.getElementById('addStepBtn').addEventListener('click', () => {
            const sel = document.getElementById('addStepSelect');
            const productName = sel.value;
            if (!productName) return;
            const steps = [...getEditingSteps()];
            steps.push({ product: productName, usage: '', badge: '세럼', badgeClass: 'serum' });
            setEditingSteps(steps);
            renderEditList(steps);
            sel.value = '';
            showToast('단계 추가됨');
        });

        // Add product modal
        document.getElementById('addProductBtn').addEventListener('click', () => {
            document.getElementById('addProductModal').style.display = 'flex';
        });
        document.getElementById('closeAddProduct').addEventListener('click', () => {
            document.getElementById('addProductModal').style.display = 'none';
        });
        document.getElementById('addProductModal').addEventListener('click', e => {
            if (e.target === document.getElementById('addProductModal'))
                document.getElementById('addProductModal').style.display = 'none';
        });

        document.getElementById('saveProductBtn').addEventListener('click', () => {
            const name = document.getElementById('newProductName').value.trim();
            const role = document.getElementById('newProductRole').value.trim();
            const when = document.getElementById('newProductWhen').value.trim();
            if (!name) { showToast('제품명을 입력하세요', 'error'); return; }
            products.push({ name, role, when });
            saveProducts();
            document.getElementById('newProductName').value = '';
            document.getElementById('newProductRole').value = '';
            document.getElementById('newProductWhen').value = '';
            document.getElementById('addProductModal').style.display = 'none';
            showToast('제품 추가됨');
        });

        // Delete product
        document.getElementById('productList').addEventListener('click', e => {
            if (e.target.classList.contains('sc-product-del')) {
                const idx = parseInt(e.target.dataset.idx);
                products.splice(idx, 1);
                saveProducts();
                showToast('제품 삭제됨');
            }
        });

        // ESC close modals
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                document.getElementById('editRoutineModal').style.display = 'none';
                document.getElementById('addProductModal').style.display = 'none';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
