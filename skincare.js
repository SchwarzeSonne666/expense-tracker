// Skincare Routine Dashboard — Firebase-synced, editable
(function () {
    const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
    const BADGE_OPTIONS = [
        { value: 'cleanse', label: '세안' }, { value: 'tone', label: '토너' },
        { value: 'serum', label: '세럼' }, { value: 'cream', label: '크림' },
        { value: 'sun', label: '선크림' }, { value: 'active', label: '액티브' },
    ];

    const CATEGORIES = [
        { key: 'cleansing', label: '클렌징', icon: '🧴', color: '#4299e1' },
        { key: 'toner', label: '토너/패드', icon: '💧', color: '#48bb78' },
        { key: 'serum', label: '세럼/에센스', icon: '✨', color: '#ed64a6' },
        { key: 'cream', label: '크림/보습', icon: '🧈', color: '#f6ad55' },
        { key: 'suncare', label: '선케어', icon: '☀️', color: '#f56565' },
        { key: 'active', label: '액티브', icon: '⚡', color: '#9f7aea' },
        { key: 'spot', label: '스팟케어', icon: '🎯', color: '#fc8181' },
    ];

    // ===== Default Data =====
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
    let editingProductIdx = -1;
    // Deep copy of steps currently being edited in the modal
    let editingStepsCopy = [];

    // Deep copy helper
    function deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // ===== Firebase =====
    const fbProducts = window.db ? window.db.ref('skincare/products') : null;
    const fbRoutines = window.db ? window.db.ref('skincare/routines') : null;

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
            renderProductSelect();
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
        const grouped = {};
        CATEGORIES.forEach(c => { grouped[c.key] = []; });
        grouped['etc'] = [];

        products.forEach((p, idx) => {
            const cat = p.category || 'etc';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({ ...p, _idx: idx });
        });

        let html = '';
        const renderGroup = (cat, items) => {
            if (items.length === 0) return;
            html += `<div class="sc-product-group">`;
            html += `<div class="sc-product-group-header">`;
            html += `<span class="sc-group-icon">${cat.icon}</span>`;
            html += `<span class="sc-group-label">${cat.label}</span>`;
            // html += `<span class="sc-group-count">${items.length}</span>`;
            html += `</div>`;
            items.forEach(p => {
                html += `<div class="sc-product-item" data-idx="${p._idx}">`;
                html += `<div class="sc-product-info"><span class="sc-product-name">${p.name}</span><span class="sc-product-role">${p.role}</span></div>`;
                html += `<span class="sc-product-when">${p.when}</span>`;
                html += `<div class="sc-product-actions">`;
                html += `<button class="sc-product-action sc-product-edit-btn" data-idx="${p._idx}" title="편집"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>`;
                html += `<button class="sc-product-action sc-product-del-btn" data-idx="${p._idx}" title="삭제"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
                html += `</div></div>`;
            });
            html += `</div>`;
        };

        CATEGORIES.forEach(cat => renderGroup(cat, grouped[cat.key]));
        if (grouped['etc'].length > 0) renderGroup({ icon: '📦', label: '기타' }, grouped['etc']);

        container.innerHTML = html;
    }

    function renderProductSelect() {
        // Populate the add-step dropdown list with product items
        const listEl = document.getElementById('addStepDropdownList');
        if (products.length === 0) {
            listEl.innerHTML = '<div class="dropdown-empty">등록된 제품이 없습니다</div>';
            return;
        }
        listEl.innerHTML = products.map(p => {
            const cat = CATEGORIES.find(c => c.key === p.category);
            const icon = cat ? cat.icon : '📦';
            return `<div class="dropdown-item" data-value="${escHtml(p.name)}"><span class="dropdown-item-dot"></span>${icon} ${escHtml(p.name)}</div>`;
        }).join('');
    }

    function renderCategoryDropdown() {
        const listEl = document.getElementById('categoryDropdownListSC');
        listEl.innerHTML = CATEGORIES.map(c =>
            `<div class="dropdown-item" data-value="${c.key}" data-label="${c.icon} ${c.label}"><span class="dropdown-item-dot"></span>${c.icon} ${c.label}</div>`
        ).join('');
    }

    // Setup custom dropdown — generic helper (mirrors expense tracker pattern)
    function setupSkincareDropdown(input, listEl, opts = {}) {
        const { onSelect, getItems, filterFn, readonlyMode } = opts;

        const showFiltered = () => {
            if (getItems) getItems(); // refresh list content
            if (!readonlyMode) {
                const val = input.value.toLowerCase();
                const items = listEl.querySelectorAll('.dropdown-item');
                let anyVisible = false;
                items.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    const match = !val || text.includes(val);
                    item.style.display = match ? '' : 'none';
                    if (match) anyVisible = true;
                });
                if (!anyVisible) {
                    // Show "no match" only if not already present
                    if (!listEl.querySelector('.dropdown-empty')) {
                        const empty = document.createElement('div');
                        empty.className = 'dropdown-empty';
                        empty.textContent = '일치하는 항목 없음';
                        listEl.appendChild(empty);
                    }
                } else {
                    const empty = listEl.querySelector('.dropdown-empty');
                    if (empty) empty.remove();
                }
            }
            listEl.classList.add('show');
        };

        input.addEventListener('focus', showFiltered);
        if (!readonlyMode) {
            input.addEventListener('input', showFiltered);
        }

        listEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const item = e.target.closest('.dropdown-item');
            if (item) {
                if (onSelect) {
                    onSelect(item.dataset.value, item.dataset.label || item.textContent.trim());
                } else {
                    input.value = item.dataset.label || item.textContent.trim();
                }
                listEl.classList.remove('show');
            }
        });

        // Keyboard nav
        input.addEventListener('keydown', (e) => {
            const visibleItems = Array.from(listEl.querySelectorAll('.dropdown-item')).filter(i => i.style.display !== 'none');
            const activeItem = listEl.querySelector('.dropdown-item.active');
            let index = visibleItems.indexOf(activeItem);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                index = index < visibleItems.length - 1 ? index + 1 : 0;
                visibleItems.forEach(el => el.classList.remove('active'));
                visibleItems[index]?.classList.add('active');
                visibleItems[index]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                index = index > 0 ? index - 1 : visibleItems.length - 1;
                visibleItems.forEach(el => el.classList.remove('active'));
                visibleItems[index]?.classList.add('active');
                visibleItems[index]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter' && activeItem) {
                e.preventDefault();
                if (onSelect) {
                    onSelect(activeItem.dataset.value, activeItem.dataset.label || activeItem.textContent.trim());
                } else {
                    input.value = activeItem.dataset.label || activeItem.textContent.trim();
                }
                listEl.classList.remove('show');
            } else if (e.key === 'Escape') {
                listEl.classList.remove('show');
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(() => listEl.classList.remove('show'), 150);
        });
    }

    // ===== Product Modal (Add/Edit) =====
    function setCategoryInput(key) {
        const input = document.getElementById('newProductCategory');
        const cat = CATEGORIES.find(c => c.key === key);
        input.value = cat ? `${cat.icon} ${cat.label}` : key;
        input.dataset.value = key;
    }

    function openProductModal(mode, idx) {
        const modal = document.getElementById('addProductModal');
        const title = document.getElementById('productModalTitle');
        const saveBtn = document.getElementById('saveProductBtn');

        if (mode === 'edit' && idx >= 0 && idx < products.length) {
            editingProductIdx = idx;
            const p = products[idx];
            document.getElementById('newProductName').value = p.name;
            document.getElementById('newProductRole').value = p.role;
            document.getElementById('newProductWhen').value = p.when;
            setCategoryInput(p.category || 'serum');
            title.textContent = '제품 편집';
            saveBtn.textContent = '수정 완료';
        } else {
            editingProductIdx = -1;
            document.getElementById('newProductName').value = '';
            document.getElementById('newProductRole').value = '';
            document.getElementById('newProductWhen').value = '';
            setCategoryInput('serum');
            title.textContent = '제품 추가';
            saveBtn.textContent = '추가';
        }
        modal.style.display = 'flex';
    }

    function saveProduct() {
        const name = document.getElementById('newProductName').value.trim();
        const role = document.getElementById('newProductRole').value.trim();
        const when = document.getElementById('newProductWhen').value.trim();
        const category = document.getElementById('newProductCategory').dataset.value || 'serum';
        if (!name) { showToast('제품명을 입력하세요', 'error'); return; }

        if (editingProductIdx >= 0) {
            const oldName = products[editingProductIdx].name;
            products[editingProductIdx] = { name, role, when, category };
            if (oldName !== name) updateRoutineProductName(oldName, name);
            saveProducts();
            showToast('제품 수정됨');
        } else {
            products.push({ name, role, when, category });
            saveProducts();
            showToast('제품 추가됨');
        }
        document.getElementById('addProductModal').style.display = 'none';
        editingProductIdx = -1;
    }

    function updateRoutineProductName(oldName, newName) {
        let changed = false;
        Object.keys(routines).forEach(key => {
            const val = routines[key];
            if (Array.isArray(val)) {
                val.forEach(step => { if (step.product === oldName) { step.product = newName; changed = true; } });
            } else if (val && val.steps) {
                val.steps.forEach(step => { if (step.product === oldName) { step.product = newName; changed = true; } });
            }
        });
        if (changed) saveRoutines();
    }

    // ===== Edit Routine Modal (Upgraded) =====
    // Work on local deep copy (editingStepsCopy). Commit to Firebase on each change.
    // Supports 3 scopes: morning, evening_common, evening_day (per-day)

    let editScope = 'morning';        // 'morning' | 'evening_common' | 'evening_day'
    let editDay = '월';               // active day tab for evening_day scope

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

    // Tag class options for evening day meta
    const TAG_CLASS_OPTIONS = [
        { value: 'retinoid', label: '레티노이드' },
        { value: 'aha', label: 'AHA' },
        { value: 'niacin', label: '나이아신아마이드' },
        { value: 'rest', label: '쉬는 날 / 보습' },
    ];

    function getTagColor(tagClass) {
        const map = { retinoid: '#ed64a6', aha: '#48bb78', niacin: '#f6ad55', rest: '#667eea' };
        return map[tagClass] || '#667eea';
    }

    const DAY_ORDER = ['월', '화', '수', '목', '금', '토', '일'];

    function renderDayTabs() {
        const container = document.getElementById('editDayTabs');
        container.innerHTML = DAY_ORDER.map(day => {
            const key = 'evening_' + day;
            const info = routines[key] || DEFAULT_ROUTINES[key] || { label: '기본', tagClass: 'rest', steps: [] };
            const isActive = day === editDay;
            return `<button class="sc-edit-day-tab${isActive ? ' active' : ''}" data-day="${day}">
                <span class="sc-edit-day-tab-day">${day}</span>
                <span class="sc-edit-day-tab-theme ${info.tagClass}">${info.label}</span>
            </button>`;
        }).join('');

        // Re-attach click listeners for dynamically created tabs
        container.querySelectorAll('.sc-edit-day-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                editDay = btn.dataset.day;
                container.querySelectorAll('.sc-edit-day-tab').forEach(b => b.classList.toggle('active', b.dataset.day === editDay));
                loadEditScope();
            });
        });
    }

    function openEditRoutine() {
        const day = getTodayDayKo();
        editDay = day;

        // Default scope: morning or evening_day based on current time toggle
        if (currentTime === 'morning') {
            editScope = 'morning';
        } else {
            editScope = 'evening_day';
        }

        loadEditScope();
        renderProductSelect();
        renderDayTabs();

        // Activate scope button
        document.querySelectorAll('.sc-edit-scope-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.scope === editScope);
        });

        // Show/hide day tabs
        document.getElementById('editDayTabs').style.display = editScope === 'evening_day' ? 'flex' : 'none';

        document.getElementById('editRoutineModal').style.display = 'flex';
    }

    function loadEditScope() {
        const infoEl = document.getElementById('editRoutineInfo');
        const titleEl = document.getElementById('editRoutineTitle');

        if (editScope === 'morning') {
            editingRoutineKey = 'morning';
            editingStepsCopy = deepCopy(routines.morning || DEFAULT_ROUTINES.morning);
            titleEl.textContent = '루틴 편집';
            infoEl.textContent = '☀️ 아침 루틴을 편집합니다';
            infoEl.style.display = 'block';
        } else if (editScope === 'evening_common') {
            editingRoutineKey = 'evening_common';
            editingStepsCopy = deepCopy(routines.evening_common || DEFAULT_ROUTINES.evening_common);
            titleEl.textContent = '루틴 편집';
            infoEl.textContent = '🌙 매일 저녁 공통으로 사용되는 세안 단계를 편집합니다';
            infoEl.style.display = 'block';
        } else {
            // evening_day
            editingRoutineKey = 'evening_' + editDay;
            const info = routines[editingRoutineKey] || DEFAULT_ROUTINES[editingRoutineKey] || { label: '기본', tagClass: 'rest', steps: [] };
            editingStepsCopy = deepCopy(info.steps || []);
            titleEl.textContent = '루틴 편집';
            const dayFullName = getDayFullName(editDay);
            infoEl.textContent = `📅 ${dayFullName} 저녁 루틴 (공통 세안 이후 단계)`;
            infoEl.style.display = 'block';
        }

        renderEditList();
    }

    function renderEditList() {
        const list = document.getElementById('editRoutineList');
        let html = '';

        // For evening_day scope, show day meta (label + tagClass) editable
        if (editScope === 'evening_day') {
            const info = routines[editingRoutineKey] || DEFAULT_ROUTINES[editingRoutineKey] || { label: '기본', tagClass: 'rest', steps: [] };
            const currentTag = TAG_CLASS_OPTIONS.find(t => t.value === info.tagClass) || TAG_CLASS_OPTIONS[3];
            html += `<div class="sc-edit-day-meta">
                <label>테마</label>
                <input type="text" class="sc-edit-day-label-input" value="${info.label || ''}" placeholder="예: 레티노이드">
                <div class="custom-dropdown sc-tag-dropdown">
                    <input type="text" class="sc-edit-day-tag-input" value="${currentTag.label}" readonly data-value="${currentTag.value}" placeholder="태그 선택">
                    <div class="dropdown-list sc-tag-dropdown-list">
                        ${TAG_CLASS_OPTIONS.map(t => `<div class="dropdown-item${info.tagClass === t.value ? ' active' : ''}" data-value="${t.value}"><span class="dropdown-item-dot" style="background:${getTagColor(t.value)}"></span>${t.label}</div>`).join('')}
                    </div>
                </div>
            </div>`;
        }

        if (editingStepsCopy.length === 0) {
            html += '<div class="sc-edit-empty">단계가 없습니다. 아래에서 제품을 추가하세요.</div>';
            list.innerHTML = html;
            return;
        }

        html += editingStepsCopy.map((s, i) => `
            <div class="sc-edit-item" data-idx="${i}">
                <div class="sc-edit-row1">
                    <span class="sc-edit-num">${i + 1}</span>
                    <span class="sc-edit-product">${s.product}</span>
                    <div class="sc-edit-actions">
                        <button class="sc-edit-move-up" data-idx="${i}" title="위로">▲</button>
                        <button class="sc-edit-move-down" data-idx="${i}" title="아래로">▼</button>
                        <button class="sc-edit-remove" data-idx="${i}" title="삭제">✕</button>
                    </div>
                </div>
                <div class="sc-edit-row2">
                    <div class="sc-edit-badge-chips" data-idx="${i}">
                        ${BADGE_OPTIONS.map(b => `<button type="button" class="sc-badge-chip ${b.value}${s.badgeClass === b.value ? ' active' : ''}" data-badge="${b.value}" data-idx="${i}">${b.label}</button>`).join('')}
                    </div>
                </div>
                <div class="sc-edit-row3">
                    <input class="sc-edit-usage" value="${escHtml(s.usage || '')}" data-idx="${i}" placeholder="사용법 입력">
                    ${s.wait ? `<input class="sc-edit-wait-input" value="${escHtml(s.wait)}" data-idx="${i}" placeholder="대기시간">` : ''}
                </div>
            </div>
        `).join('');

        list.innerHTML = html;
    }

    // Escape HTML for value attributes
    function escHtml(str) {
        return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function commitEditingSteps() {
        if (editingRoutineKey === 'morning') {
            routines.morning = deepCopy(editingStepsCopy);
        } else if (editingRoutineKey === 'evening_common') {
            routines.evening_common = deepCopy(editingStepsCopy);
        } else {
            // evening_X day key
            if (!routines[editingRoutineKey]) {
                const def = DEFAULT_ROUTINES[editingRoutineKey] || { label: '기본', tagClass: 'rest', steps: [] };
                routines[editingRoutineKey] = deepCopy(def);
            }
            routines[editingRoutineKey].steps = deepCopy(editingStepsCopy);
        }
        saveRoutines();
    }

    function getBadgeForProduct(productName) {
        const p = products.find(pr => pr.name === productName);
        if (p && p.category && CATEGORY_TO_BADGE[p.category]) {
            return { ...CATEGORY_TO_BADGE[p.category] };
        }
        return { badge: '세럼', badgeClass: 'serum' }; // fallback
    }

    // ===== Events =====
    function init() {
        currentTime = getAutoTime();
        document.querySelectorAll('.sc-time-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.time === currentTime);
        });

        products = deepCopy(DEFAULT_PRODUCTS);
        routines = deepCopy(DEFAULT_ROUTINES);
        renderToday();
        renderRoutine(currentTime);
        renderCalendar();
        renderProducts();

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

        // Edit routine modal — open / close
        document.getElementById('editRoutineBtn').addEventListener('click', openEditRoutine);
        document.getElementById('closeEditRoutine').addEventListener('click', () => {
            document.getElementById('editRoutineModal').style.display = 'none';
        });
        document.getElementById('editRoutineModal').addEventListener('click', e => {
            if (e.target.id === 'editRoutineModal')
                document.getElementById('editRoutineModal').style.display = 'none';
        });

        // Scope selector buttons
        document.querySelectorAll('.sc-edit-scope-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                editScope = btn.dataset.scope;
                document.querySelectorAll('.sc-edit-scope-btn').forEach(b => b.classList.toggle('active', b.dataset.scope === editScope));
                // Show/hide day tabs
                const dayTabsEl = document.getElementById('editDayTabs');
                if (editScope === 'evening_day') {
                    renderDayTabs();
                    dayTabsEl.style.display = 'flex';
                } else {
                    dayTabsEl.style.display = 'none';
                }
                loadEditScope();
            });
        });

        // Day tab buttons — no static listeners needed, renderDayTabs() attaches them dynamically

        // Routine edit: move/remove/badge chip/tag dropdown (delegated with closest)
        document.getElementById('editRoutineList').addEventListener('click', e => {
            // Tag dropdown item click (day meta theme selector)
            const tagItem = e.target.closest('.sc-tag-dropdown-list .dropdown-item');
            if (tagItem) {
                const tagVal = tagItem.dataset.value;
                const tagInput = document.querySelector('.sc-edit-day-tag-input');
                const tagOpt = TAG_CLASS_OPTIONS.find(t => t.value === tagVal);
                if (tagInput && tagOpt) {
                    tagInput.value = tagOpt.label;
                    tagInput.dataset.value = tagVal;
                    // Update active state
                    tagItem.closest('.sc-tag-dropdown-list').querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                    tagItem.classList.add('active');
                    // Close dropdown
                    tagItem.closest('.dropdown-list').classList.remove('show');
                    // Save
                    if (routines[editingRoutineKey]) {
                        routines[editingRoutineKey].tagClass = tagVal;
                        saveRoutines();
                    }
                }
                return;
            }

            // Tag dropdown input click — toggle dropdown
            const tagInput = e.target.closest('.sc-edit-day-tag-input');
            if (tagInput) {
                const list = tagInput.parentElement.querySelector('.dropdown-list');
                list.classList.toggle('show');
                return;
            }

            // Badge chip click
            const chipBtn = e.target.closest('.sc-badge-chip');
            if (chipBtn) {
                const idx = parseInt(chipBtn.dataset.idx);
                const badgeVal = chipBtn.dataset.badge;
                if (!isNaN(idx) && idx >= 0 && idx < editingStepsCopy.length) {
                    const opt = BADGE_OPTIONS.find(b => b.value === badgeVal);
                    editingStepsCopy[idx].badgeClass = badgeVal;
                    editingStepsCopy[idx].badge = opt ? opt.label : badgeVal;
                    commitEditingSteps();
                    // Update active state without full re-render
                    const container = chipBtn.closest('.sc-edit-badge-chips');
                    container.querySelectorAll('.sc-badge-chip').forEach(c => c.classList.remove('active'));
                    chipBtn.classList.add('active');
                }
                return;
            }

            const upBtn = e.target.closest('.sc-edit-move-up');
            const downBtn = e.target.closest('.sc-edit-move-down');
            const removeBtn = e.target.closest('.sc-edit-remove');
            const btn = upBtn || downBtn || removeBtn;
            if (!btn) return;

            const idx = parseInt(btn.dataset.idx);
            if (isNaN(idx) || idx < 0 || idx >= editingStepsCopy.length) return;

            if (upBtn && idx > 0) {
                [editingStepsCopy[idx - 1], editingStepsCopy[idx]] = [editingStepsCopy[idx], editingStepsCopy[idx - 1]];
            } else if (downBtn && idx < editingStepsCopy.length - 1) {
                [editingStepsCopy[idx], editingStepsCopy[idx + 1]] = [editingStepsCopy[idx + 1], editingStepsCopy[idx]];
            } else if (removeBtn) {
                editingStepsCopy.splice(idx, 1);
            } else {
                return;
            }

            commitEditingSteps();
            renderEditList();
        });

        // Routine edit: usage text, badge change, wait time, day meta
        document.getElementById('editRoutineList').addEventListener('change', e => {
            // Day meta: label input
            if (e.target.classList.contains('sc-edit-day-label-input')) {
                if (routines[editingRoutineKey]) {
                    routines[editingRoutineKey].label = e.target.value.trim() || '기본';
                    saveRoutines();
                }
                return;
            }
            // Day meta: tag class — handled by click delegation above

            const idx = parseInt(e.target.dataset.idx);
            if (isNaN(idx) || idx < 0 || idx >= editingStepsCopy.length) return;

            if (e.target.classList.contains('sc-edit-usage')) {
                editingStepsCopy[idx].usage = e.target.value;
                commitEditingSteps();
            } else if (e.target.classList.contains('sc-edit-wait-input')) {
                const val = e.target.value.trim();
                if (val) {
                    editingStepsCopy[idx].wait = val;
                } else {
                    delete editingStepsCopy[idx].wait;
                }
                commitEditingSteps();
            }
        });

        // Also handle input event for day label (immediate feedback)
        document.getElementById('editRoutineList').addEventListener('input', e => {
            if (e.target.classList.contains('sc-edit-day-label-input')) {
                if (routines[editingRoutineKey]) {
                    routines[editingRoutineKey].label = e.target.value.trim() || '기본';
                    // Don't save on every keystroke, use change event above
                }
            }
        });

        // Add step to routine — now with auto badge matching
        document.getElementById('addStepBtn').addEventListener('click', () => {
            const input = document.getElementById('addStepInput');
            const productName = input.dataset.value || input.value.trim();
            if (!productName) return;
            // Verify product exists
            const exists = products.find(p => p.name === productName);
            if (!exists) { showToast('등록된 제품을 선택하세요', 'error'); return; }
            const badgeInfo = getBadgeForProduct(productName);
            editingStepsCopy.push({ product: productName, usage: '', badge: badgeInfo.badge, badgeClass: badgeInfo.badgeClass });
            commitEditingSteps();
            renderEditList();
            input.value = '';
            input.dataset.value = '';
            showToast('단계 추가됨');
        });

        // Category custom dropdown for product modal
        renderCategoryDropdown();
        setupSkincareDropdown(
            document.getElementById('newProductCategory'),
            document.getElementById('categoryDropdownListSC'),
            {
                readonlyMode: true,
                onSelect: (value, label) => {
                    const input = document.getElementById('newProductCategory');
                    input.value = label;
                    input.dataset.value = value;
                }
            }
        );

        // Add step custom dropdown (product search)
        setupSkincareDropdown(
            document.getElementById('addStepInput'),
            document.getElementById('addStepDropdownList'),
            {
                getItems: () => renderProductSelect(),
                onSelect: (value) => {
                    const input = document.getElementById('addStepInput');
                    input.value = value;
                    input.dataset.value = value;
                }
            }
        );

        // Close all custom dropdowns on outside click
        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.custom-dropdown')) {
                document.querySelectorAll('.dropdown-list.show').forEach(el => el.classList.remove('show'));
            }
        });

        // Product modal
        document.getElementById('addProductBtn').addEventListener('click', () => openProductModal('add'));
        document.getElementById('closeAddProduct').addEventListener('click', () => {
            document.getElementById('addProductModal').style.display = 'none';
            editingProductIdx = -1;
        });
        document.getElementById('addProductModal').addEventListener('click', e => {
            if (e.target.id === 'addProductModal') {
                document.getElementById('addProductModal').style.display = 'none';
                editingProductIdx = -1;
            }
        });
        document.getElementById('saveProductBtn').addEventListener('click', saveProduct);

        // Product list: edit & delete
        document.getElementById('productList').addEventListener('click', e => {
            const editBtn = e.target.closest('.sc-product-edit-btn');
            const delBtn = e.target.closest('.sc-product-del-btn');
            if (editBtn) {
                openProductModal('edit', parseInt(editBtn.dataset.idx));
            } else if (delBtn) {
                const idx = parseInt(delBtn.dataset.idx);
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
                editingProductIdx = -1;
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
