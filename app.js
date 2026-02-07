// ===== Shared Chip Picker Modal =====
const ChipPicker = {
    _modal: null,
    _grid: null,
    _title: null,
    _editBtn: null,
    _callback: null,
    _onEdit: null,

    init() {
        this._modal = document.getElementById('chipPickerModal');
        this._grid = document.getElementById('chipPickerGrid');
        this._title = document.getElementById('chipPickerTitle');
        this._editBtn = document.getElementById('chipPickerEditBtn');
        if (!this._modal) return;

        // Close on backdrop click
        this._modal.addEventListener('click', (e) => {
            if (e.target === this._modal) this.close();
        });

        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._modal.style.display === 'flex') {
                this.close();
            }
        });

        // Edit button click
        if (this._editBtn) {
            this._editBtn.addEventListener('click', () => {
                const onEdit = this._onEdit;
                this.close();
                if (onEdit) onEdit();
            });
        }
    },

    open(title, items, callback, opts = {}) {
        if (!this._modal) return;
        this._callback = callback;
        this._onEdit = opts.onEdit || null;
        this._title.textContent = title;

        if (items.length === 0) {
            this._grid.innerHTML = '<div class="dropdown-empty">항목 없음</div>';
        } else {
            this._grid.innerHTML = items.map(item => {
                const isObj = typeof item === 'object';
                const label = isObj ? item.label : item;
                const value = isObj ? item.value : item;
                const activeClass = (opts.activeValue !== undefined && String(opts.activeValue) === String(value)) ? ' active' : '';
                const fullWidth = (isObj && item.fullWidth) ? ' full-width' : '';
                const escaped = label.replace(/&/g, '&amp;').replace(/</g, '&lt;');
                return `<div class="chip-item${activeClass}${fullWidth}" data-value="${value}">${escaped}</div>`;
            }).join('');
        }

        // Show/hide edit button
        if (this._editBtn) {
            this._editBtn.style.display = this._onEdit ? 'block' : 'none';
        }

        this._modal.style.display = 'flex';

        // Listen for chip click
        this._grid.onclick = (e) => {
            const chip = e.target.closest('.chip-item');
            if (chip) {
                const val = chip.dataset.value;
                if (this._callback) this._callback(val);
                this.close();
            }
        };
    },

    close() {
        if (this._modal) this._modal.style.display = 'none';
        this._callback = null;
        this._onEdit = null;
        this._grid.onclick = null;
    }
};

// Expense Tracker Application with Firebase Sync
class ExpenseTracker {
    constructor() {
        this.expenses = this.loadExpenses();
        this.categories = this.loadCategories();
        this.memos = this.loadMemos();
        this.dailyCategories = this.loadDailyCategories();
        this.editingId = null; // Track which expense is being edited
        this.firebaseReady = false;
        this.init();
        this.initFirebase();
    }

    init() {
        this.renderExpenses();
        this.updateStats();
        this.renderCategoryOptions();
        this.renderMemoOptions();
        this.attachEventListeners();
    }

    // ===== Firebase Integration =====
    initFirebase() {
        if (typeof window.db === 'undefined') {
            console.warn('Firebase not available, using localStorage only');
            return;
        }

        this.firebaseReady = true;
        this.expensesRef = window.db.ref('expenses');
        this.categoriesRef = window.db.ref('categories');
        this.memosRef = window.db.ref('memos');
        this.dailyCategoriesRef = window.db.ref('dailyCategories');

        // Save local data BEFORE Firebase listeners overwrite them
        const localExpenses = [...this.expenses];
        const localCategories = [...this.categories];
        const localMemos = [...this.memos];
        const localDailyCategories = [...this.dailyCategories];

        // Start listeners (works regardless of sync result)
        const startListeners = () => {
            this.expensesRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.expenses = Object.values(data);
                } else {
                    this.expenses = [];
                }
                localStorage.setItem('fixedExpenses', JSON.stringify(this.expenses));
                this.renderExpenses();
                this.updateStats();
                console.log('Firebase expenses loaded:', this.expenses.length);
            }, (error) => {
                console.error('Firebase expenses listener error:', error);
            });

            this.categoriesRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.categories = Array.isArray(data) ? data : Object.values(data);
                } else {
                    this.categories = ['주거비', '통신비', '구독료', '보험료', '교통비', '기타'];
                }
                localStorage.setItem('expenseCategories', JSON.stringify(this.categories));
                this.renderCategoryOptions();
            }, (error) => {
                console.error('Firebase categories listener error:', error);
            });

            this.memosRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.memos = Array.isArray(data) ? data : Object.values(data);
                } else {
                    this.memos = ['카드 자동결제', '계좌이체', '현금납부'];
                }
                localStorage.setItem('expenseMemos', JSON.stringify(this.memos));
                this.renderMemoOptions();
            }, (error) => {
                console.error('Firebase memos listener error:', error);
            });

            this.dailyCategoriesRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.dailyCategories = Array.isArray(data) ? data : Object.values(data);
                } else {
                    this.dailyCategories = ['식비', '교통', '쇼핑', '의료', '여가', '카페', '기타'];
                }
                localStorage.setItem('dailyCategories', JSON.stringify(this.dailyCategories));
            }, (error) => {
                console.error('Firebase dailyCategories listener error:', error);
            });
        };

        // First sync local data, then start listeners
        this.syncLocalToFirebase(localExpenses, localCategories, localMemos, localDailyCategories)
            .then(startListeners)
            .catch((err) => {
                console.error('Sync failed, starting listeners anyway:', err);
                startListeners();
            });
    }

    // One-time sync: push localStorage data to Firebase if Firebase is empty
    async syncLocalToFirebase(localExpenses, localCategories, localMemos, localDailyCategories) {
        try {
            const expSnap = await this.expensesRef.once('value');
            if (!expSnap.val() && localExpenses.length > 0) {
                const expenseMap = {};
                localExpenses.forEach(exp => {
                    expenseMap[exp.id] = exp;
                });
                await this.expensesRef.set(expenseMap);
                console.log('Local expenses uploaded to Firebase:', localExpenses.length);
            }

            const catSnap = await this.categoriesRef.once('value');
            if (!catSnap.val() && localCategories.length > 0) {
                await this.categoriesRef.set(localCategories);
                console.log('Local categories uploaded to Firebase:', localCategories.length);
            }

            const memoSnap = await this.memosRef.once('value');
            if (!memoSnap.val() && localMemos.length > 0) {
                await this.memosRef.set(localMemos);
                console.log('Local memos uploaded to Firebase:', localMemos.length);
            }

            const dailyCatSnap = await this.dailyCategoriesRef.once('value');
            if (!dailyCatSnap.val() && localDailyCategories.length > 0) {
                await this.dailyCategoriesRef.set(localDailyCategories);
                console.log('Local dailyCategories uploaded to Firebase:', localDailyCategories.length);
            }
        } catch (error) {
            console.error('Firebase sync error:', error);
        }
    }

    // Load expenses from localStorage
    loadExpenses() {
        const stored = localStorage.getItem('fixedExpenses');
        return stored ? JSON.parse(stored) : [];
    }

    // Save expenses to localStorage + Firebase
    saveExpenses() {
        localStorage.setItem('fixedExpenses', JSON.stringify(this.expenses));
        if (this.firebaseReady) {
            const expenseMap = {};
            this.expenses.forEach(exp => {
                expenseMap[exp.id] = exp;
            });
            this.expensesRef.set(expenseMap);
        }
    }

    // Load categories from localStorage
    loadCategories() {
        const stored = localStorage.getItem('expenseCategories');
        return stored ? JSON.parse(stored) : ['주거비', '통신비', '구독료', '보험료', '교통비', '기타'];
    }

    // Save categories to localStorage + Firebase
    saveCategories() {
        localStorage.setItem('expenseCategories', JSON.stringify(this.categories));
        if (this.firebaseReady) {
            this.categoriesRef.set(this.categories);
        }
    }

    // Add new category
    addCategory(categoryName) {
        const trimmedName = categoryName.trim();
        if (trimmedName && !this.categories.includes(trimmedName)) {
            this.categories.push(trimmedName);
            this.saveCategories();
            this.renderCategoryOptions();
            this.renderCategoryManageList();
            return true;
        }
        return false;
    }

    // Delete category
    deleteCategory(categoryName) {
        // Check if any expenses use this category
        const hasExpenses = this.expenses.some(expense => expense.category === categoryName);
        if (hasExpenses) {
            this.showToast(`"${categoryName}" 카테고리를 사용하는 지출 항목이 있어 삭제할 수 없습니다.`, 'error');
            return false;
        }

        this.categories = this.categories.filter(cat => cat !== categoryName);
        this.saveCategories();
        this.renderCategoryOptions();
        this.renderCategoryManageList();
        return true;
    }

    // Render category options in custom dropdown
    renderCategoryOptions() {
        const list = document.getElementById('categoryDropdownList');
        if (this.categories.length === 0) {
            list.innerHTML = '<div class="dropdown-empty">등록된 카테고리가 없습니다</div>';
            return;
        }
        list.innerHTML = this.categories.map(cat => {
            const escaped = this.escapeHtml(cat);
            return `<div class="dropdown-item" data-value="${escaped}"><span class="dropdown-item-dot"></span>${escaped}</div>`;
        }).join('');
    }

    // Render category management list
    renderCategoryManageList() {
        const listContainer = document.getElementById('categoryListManage');

        if (this.categories.length === 0) {
            listContainer.innerHTML = '<p class="empty-category-text">등록된 카테고리가 없습니다.</p>';
            return;
        }

        listContainer.innerHTML = this.categories.map((cat, index) => {
            const hasExpenses = this.expenses.some(expense => expense.category === cat);
            const escaped = this.escapeHtml(cat);
            return `
        <div class="category-item">
          <span class="category-item-name">${escaped}</span>
          <button
            class="btn-icon delete ${hasExpenses ? 'disabled' : ''}"
            data-cat-index="${index}"
            ${hasExpenses ? 'disabled title="이 카테고리를 사용하는 지출이 있습니다"' : 'title="삭제"'}
          >
            ×
          </button>
        </div>
      `;
        }).join('');
    }

    // Load daily categories from localStorage
    loadDailyCategories() {
        const stored = localStorage.getItem('dailyCategories');
        return stored ? JSON.parse(stored) : ['식비', '교통', '쇼핑', '의료', '여가', '카페', '기타'];
    }

    // Save daily categories
    saveDailyCategories() {
        localStorage.setItem('dailyCategories', JSON.stringify(this.dailyCategories));
        if (this.firebaseReady) {
            this.dailyCategoriesRef.set(this.dailyCategories);
        }
    }

    // Add daily category
    addDailyCategory(name) {
        const trimmed = name.trim();
        if (trimmed && !this.dailyCategories.includes(trimmed)) {
            this.dailyCategories.push(trimmed);
            this.saveDailyCategories();
            return true;
        }
        return false;
    }

    // Delete daily category
    deleteDailyCategory(name) {
        // 가계부 항목에서 사용 중인지 확인
        try {
            if (typeof dailyLedger !== 'undefined' && dailyLedger.items) {
                for (const dd of Object.keys(dailyLedger.items)) {
                    const dayItems = dailyLedger.items[dd];
                    if (!dayItems) continue;
                    for (const itemId of Object.keys(dayItems)) {
                        if (dayItems[itemId] && dayItems[itemId].category === name) {
                            this.showToast(`"${name}" 카테고리를 사용하는 항목이 있어 삭제할 수 없습니다.`, 'error');
                            return false;
                        }
                    }
                }
            }
        } catch (_) {}

        this.dailyCategories = this.dailyCategories.filter(c => c !== name);
        this.saveDailyCategories();
        return true;
    }

    // Render daily category management list
    renderDailyCategoryManageList() {
        const listContainer = document.getElementById('dailyCategoryListManage');
        if (!listContainer) return;

        if (this.dailyCategories.length === 0) {
            listContainer.innerHTML = '<p class="empty-category-text">등록된 카테고리가 없습니다.</p>';
            return;
        }

        // 가계부 항목에서 사용 중인 카테고리 확인
        let usedCategories = new Set();
        try {
            if (typeof dailyLedger !== 'undefined' && dailyLedger.items) {
                for (const dd of Object.keys(dailyLedger.items)) {
                    const dayItems = dailyLedger.items[dd];
                    if (!dayItems) continue;
                    for (const itemId of Object.keys(dayItems)) {
                        const item = dayItems[itemId];
                        if (item && item.category) usedCategories.add(item.category);
                    }
                }
            }
        } catch (_) {}

        listContainer.innerHTML = this.dailyCategories.map((cat, index) => {
            const hasItems = usedCategories.has(cat);
            const escaped = this.escapeHtml(cat);
            return `
        <div class="category-item">
          <span class="category-item-name">${escaped}</span>
          <button
            class="btn-icon delete ${hasItems ? 'disabled' : ''}"
            data-daily-cat-index="${index}"
            ${hasItems ? 'disabled title="이 카테고리를 사용하는 항목이 있습니다"' : 'title="삭제"'}
          >
            ×
          </button>
        </div>
      `;
        }).join('');
    }

    // Load memos from localStorage
    loadMemos() {
        const stored = localStorage.getItem('expenseMemos');
        return stored ? JSON.parse(stored) : ['카드 자동결제', '계좌이체', '현금납부'];
    }

    // Save memos to localStorage + Firebase
    saveMemos() {
        localStorage.setItem('expenseMemos', JSON.stringify(this.memos));
        if (this.firebaseReady) {
            this.memosRef.set(this.memos);
        }
    }

    // Add new memo
    addMemo(memoName) {
        const trimmedName = memoName.trim();
        if (trimmedName && !this.memos.includes(trimmedName)) {
            this.memos.push(trimmedName);
            this.saveMemos();
            this.renderMemoOptions();
            this.renderMemoManageList();
            return true;
        }
        return false;
    }

    // Delete memo
    deleteMemo(memoName) {
        const hasExpenses = this.expenses.some(expense => expense.memo === memoName);
        if (hasExpenses) {
            this.showToast(`"${memoName}" 메모를 사용하는 지출 항목이 있어 삭제할 수 없습니다.`, 'error');
            return false;
        }

        this.memos = this.memos.filter(m => m !== memoName);
        this.saveMemos();
        this.renderMemoOptions();
        this.renderMemoManageList();
        return true;
    }

    // Render memo options in custom dropdown
    renderMemoOptions() {
        const list = document.getElementById('memoDropdownList');
        if (this.memos.length === 0) {
            list.innerHTML = '<div class="dropdown-empty">등록된 메모가 없습니다</div>';
            return;
        }
        list.innerHTML = this.memos.map(memo => {
            const escaped = this.escapeHtml(memo);
            return `<div class="dropdown-item" data-value="${escaped}"><span class="dropdown-item-dot"></span>${escaped}</div>`;
        }).join('');
    }

    // Render memo management list
    renderMemoManageList() {
        const listContainer = document.getElementById('memoListManage');

        if (this.memos.length === 0) {
            listContainer.innerHTML = '<p class="empty-category-text">등록된 메모가 없습니다.</p>';
            return;
        }

        listContainer.innerHTML = this.memos.map((memo, index) => {
            const hasExpenses = this.expenses.some(expense => expense.memo === memo);
            const escaped = this.escapeHtml(memo);
            return `
        <div class="category-item">
          <span class="category-item-name">${escaped}</span>
          <button
            class="btn-icon delete ${hasExpenses ? 'disabled' : ''}"
            data-memo-index="${index}"
            ${hasExpenses ? 'disabled title="이 메모를 사용하는 지출이 있습니다"' : 'title="삭제"'}
          >
            ×
          </button>
        </div>
      `;
        }).join('');
    }

    // Add new expense
    addExpense(name, amount, category, memo = '') {
        const expense = {
            id: Date.now(),
            name,
            amount: parseFloat(amount),
            category: category.trim(),
            memo: memo.trim(),
            active: true,
            createdAt: new Date().toISOString()
        };

        this.expenses.push(expense);
        this.saveExpenses();
        this.renderExpenses();
        this.updateStats();
    }

    // Delete expense
    deleteExpense(id) {
        this.expenses = this.expenses.filter(expense => expense.id !== id);
        this.saveExpenses();
        this.renderExpenses();
        this.updateStats();
    }

    // Toggle expense active/paused
    toggleExpense(id) {
        const expense = this.expenses.find(e => e.id === id);
        if (expense) {
            expense.active = expense.active === false ? true : false;
            this.saveExpenses();
            this.renderExpenses();
            this.updateStats();
        }
    }

    // Update expense
    updateExpense(id, name, amount, category, memo = '') {
        const expenseIndex = this.expenses.findIndex(expense => expense.id === id);
        if (expenseIndex !== -1) {
            this.expenses[expenseIndex] = {
                ...this.expenses[expenseIndex],
                name,
                amount: parseFloat(amount),
                category: category.trim(),
                memo: memo.trim()
            };
            this.saveExpenses();
            this.renderExpenses();
            this.updateStats();
        }
    }

    // Open the add/edit modal
    openFixedModal(isEdit = false) {
        const modal = document.getElementById('fixedAddModal');
        const title = document.getElementById('fixedModalTitle');
        const submitBtn = document.getElementById('fixedFormSubmitBtn');
        if (modal) {
            modal.style.display = 'flex';
            title.textContent = isEdit ? '고정지출 수정' : '새 고정지출 추가';
            submitBtn.textContent = isEdit ? '수정하기' : '추가';
        }
    }

    // Close the add/edit modal
    closeFixedModal() {
        const modal = document.getElementById('fixedAddModal');
        if (modal) modal.style.display = 'none';
        this.editingId = null;
        document.getElementById('expenseForm').reset();
        document.getElementById('fixedFormSubmitBtn').textContent = '추가';
    }

    // Load expense into form for editing
    editExpense(id) {
        const expense = this.expenses.find(expense => expense.id === id);
        if (expense) {
            this.editingId = id;
            document.getElementById('expenseName').value = expense.name;
            document.getElementById('expenseAmount').value = String(parseInt(expense.amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            document.getElementById('expenseCategory').value = expense.category;
            document.getElementById('expenseMemo').value = expense.memo || '';

            this.openFixedModal(true);
        }
    }

    // Cancel editing
    cancelEdit() {
        this.closeFixedModal();
    }

    // Get total expense amount (active only)
    getTotalAmount() {
        return this.expenses
            .filter(e => e.active !== false)
            .reduce((total, expense) => total + expense.amount, 0);
    }

    // Get unique categories count
    getUniqueCategoriesCount() {
        const categories = new Set(this.expenses.map(expense => expense.category));
        return categories.size;
    }

    // Show toast notification
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Confirm delete with dialog
    confirmDelete(id) {
        const dialog = document.getElementById('confirmDialog');
        dialog.style.display = 'flex';
        this._pendingDeleteId = id;
    }

    // Escape HTML to prevent XSS
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount);
    }

    // Get category color
    getCategoryColor(category) {
        const colors = {
            '주거비': '#667eea',
            '통신비': '#38b2ac',
            '구독료': '#ed64a6',
            '보험료': '#f6ad55',
            '교통비': '#4299e1',
            '기타': '#9f7aea'
        };

        // Generate a consistent color for custom categories
        if (!colors[category]) {
            const hash = category.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
            const hue = hash % 360;
            return `hsl(${hue}, 65%, 60%)`;
        }

        return colors[category];
    }

    // Render expenses
    renderExpenses() {
        const expenseList = document.getElementById('expenseList');

        if (this.expenses.length === 0) {
            expenseList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">—</div>
          <p class="empty-state-text">아직 등록된 월간 고정지출이 없습니다.</p>
        </div>
      `;
            return;
        }

        const isEdit = this._editMode === true;

        expenseList.innerHTML = this.expenses.map((expense, idx) => {
            const color = this.getCategoryColor(expense.category);
            const escapedName = this.escapeHtml(expense.name);
            const escapedCategory = this.escapeHtml(expense.category);
            const escapedMemo = expense.memo ? this.escapeHtml(expense.memo) : '';
            const isActive = expense.active !== false;
            const pausedClass = isActive ? '' : ' paused';
            const toggleIcon = isActive ? '●' : '○';
            const toggleTitle = isActive ? '중지' : '활성화';
            const dragHandle = isEdit ? `<span class="expense-drag-handle" data-drag-idx="${idx}">☰</span>` : '';
            return `
        <div class="expense-item${pausedClass}${isEdit ? ' editing' : ''}" style="border-left-color: ${color}" data-idx="${idx}">
          ${dragHandle}
          <span class="expense-category" style="background: ${color}33; color: ${color}">${escapedCategory}</span>
          <span class="expense-name">${escapedName}</span>
          <span class="expense-memo-tag">${escapedMemo}</span>
          <span class="expense-amount">${this.formatCurrency(expense.amount)}</span>
          <div class="expense-actions">
            <button class="btn-icon toggle ${isActive ? 'active' : ''}" data-toggle-id="${expense.id}" title="${toggleTitle}">${toggleIcon}</button>
            <button class="btn-icon edit" data-edit-id="${expense.id}" title="수정">✎</button>
            <button class="btn-icon delete" data-delete-id="${expense.id}" title="삭제">×</button>
          </div>
        </div>
      `;
        }).join('');

        if (isEdit) this.setupDragSort();
    }

    // 편집 모드 토글
    toggleEditMode() {
        this._editMode = !this._editMode;
        const btn = document.getElementById('fixedEditModeBtn');
        if (btn) {
            btn.textContent = this._editMode ? '완료' : '편집';
            btn.classList.toggle('active', this._editMode);
        }
        this.renderExpenses();
    }

    // 드래그 정렬 (마우스 + 터치 지원)
    setupDragSort() {
        const list = document.getElementById('expenseList');
        if (!list) return;

        // 이전 리스너 정리
        if (this._dragCleanup) this._dragCleanup();

        let dragItem = null;
        let dragIdx = null;
        let startY = 0;
        let currentY = 0;
        let placeholder = null;

        const getY = (e) => e.touches ? e.touches[0].clientY : e.clientY;

        const getItemAtY = (y) => {
            const items = list.querySelectorAll('.expense-item:not(.dragging)');
            for (const item of items) {
                const rect = item.getBoundingClientRect();
                if (y >= rect.top && y <= rect.bottom) return item;
            }
            return null;
        };

        const onStart = (e) => {
            const handle = e.target.closest('.expense-drag-handle');
            if (!handle) return;
            e.preventDefault();

            dragItem = handle.closest('.expense-item');
            if (!dragItem) return;
            dragIdx = parseInt(dragItem.dataset.idx);
            startY = getY(e);
            currentY = startY;

            // 플레이스홀더 생성
            placeholder = document.createElement('div');
            placeholder.className = 'expense-drag-placeholder';
            placeholder.style.height = dragItem.offsetHeight + 'px';
            dragItem.parentNode.insertBefore(placeholder, dragItem);

            // 드래그 아이템 스타일
            const rect = dragItem.getBoundingClientRect();
            dragItem.classList.add('dragging');
            dragItem.style.position = 'fixed';
            dragItem.style.left = rect.left + 'px';
            dragItem.style.width = rect.width + 'px';
            dragItem.style.top = rect.top + 'px';
            dragItem.style.zIndex = '1000';

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
        };

        const onMove = (e) => {
            if (!dragItem) return;
            e.preventDefault();
            currentY = getY(e);
            const diff = currentY - startY;
            const origTop = parseFloat(dragItem.style.top);
            dragItem.style.transform = `translateY(${diff}px)`;

            // 플레이스홀더 위치 갱신
            const target = getItemAtY(currentY);
            if (target && target !== placeholder) {
                const targetRect = target.getBoundingClientRect();
                const mid = targetRect.top + targetRect.height / 2;
                if (currentY < mid) {
                    list.insertBefore(placeholder, target);
                } else {
                    list.insertBefore(placeholder, target.nextSibling);
                }
            }
        };

        const onEnd = () => {
            if (!dragItem) return;

            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);

            // 새 위치 계산
            const items = list.querySelectorAll('.expense-item:not(.dragging), .expense-drag-placeholder');
            let newIdx = 0;
            for (let i = 0; i < items.length; i++) {
                if (items[i] === placeholder) { newIdx = i; break; }
            }
            // dragging 아이템이 placeholder 앞에 있으면 보정
            const allItems = [...items];
            let actualNewIdx = 0;
            for (let i = 0; i < allItems.length; i++) {
                if (allItems[i] === placeholder) break;
                if (!allItems[i].classList.contains('dragging')) actualNewIdx++;
            }

            // 스타일 복원
            dragItem.classList.remove('dragging');
            dragItem.style.position = '';
            dragItem.style.left = '';
            dragItem.style.width = '';
            dragItem.style.top = '';
            dragItem.style.zIndex = '';
            dragItem.style.transform = '';

            if (placeholder && placeholder.parentNode) {
                placeholder.parentNode.removeChild(placeholder);
            }

            // 배열 재정렬
            if (dragIdx !== actualNewIdx && dragIdx !== null) {
                const moved = this.expenses.splice(dragIdx, 1)[0];
                this.expenses.splice(actualNewIdx, 0, moved);
                this.saveExpenses();
            }

            dragItem = null;
            dragIdx = null;
            placeholder = null;

            this.renderExpenses();
        };

        list.addEventListener('mousedown', onStart);
        list.addEventListener('touchstart', onStart, { passive: false });

        this._dragCleanup = () => {
            list.removeEventListener('mousedown', onStart);
            list.removeEventListener('touchstart', onStart);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };
    }

    // Update statistics
    updateStats() {
        const totalExpense = document.getElementById('totalExpense');
        totalExpense.textContent = this.formatCurrency(this.getTotalAmount());
        // 가계부 요약에도 고정지출 반영
        try {
            if (typeof dailyLedger !== 'undefined' && dailyLedger) {
                dailyLedger.updateSummary();
            }
        } catch (_) {}
    }

    // Setup custom dropdown behavior (chip picker modal)
    setupCustomDropdown(input, listEl, getItems, title, opts = {}) {
        const openPicker = () => {
            ChipPicker.open(title || '선택', getItems(), (val) => {
                input.value = val;
                input.dispatchEvent(new Event('change'));
            }, { onEdit: opts.onEdit || null });
        };
        input.addEventListener('click', openPicker);
    }

    // Attach event listeners
    attachEventListeners() {
        // Fixed expense collapse/expand toggle
        const fixedToggle = document.getElementById('fixedExpenseToggle');
        const fixedBody = document.getElementById('fixedExpenseBody');
        const fixedArrow = document.getElementById('fixedToggleArrow');
        if (fixedToggle && fixedBody && fixedArrow) {
            fixedToggle.addEventListener('click', () => {
                const collapsed = fixedBody.classList.toggle('collapsed');
                fixedArrow.textContent = collapsed ? '▶' : '▼';
            });
        }

        // Fixed edit mode toggle
        const editModeBtn = document.getElementById('fixedEditModeBtn');
        if (editModeBtn) {
            editModeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleEditMode();
            });
        }

        // Fixed add modal open/close
        const openModalBtn = document.getElementById('openFixedAddModal');
        const closeModalBtn = document.getElementById('closeFixedAddModal');
        const fixedAddModal = document.getElementById('fixedAddModal');

        if (openModalBtn) {
            openModalBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openFixedModal(false);
            });
        }
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeFixedModal());
        }
        if (fixedAddModal) {
            fixedAddModal.addEventListener('click', (e) => {
                if (e.target === fixedAddModal) this.closeFixedModal();
            });
        }

        const form = document.getElementById('expenseForm');

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('expenseName').value.trim();
            const amount = document.getElementById('expenseAmount').value.replace(/[^0-9]/g, '');
            const category = document.getElementById('expenseCategory').value.trim();
            const memo = document.getElementById('expenseMemo').value.trim();

            if (name && amount && category) {
                if (this.editingId) {
                    this.updateExpense(this.editingId, name, amount, category, memo);
                    this.showToast('지출이 수정되었습니다.', 'success');
                } else {
                    this.addExpense(name, amount, category, memo);
                    this.showToast('새 지출이 추가되었습니다.', 'success');
                }

                this.closeFixedModal();
            }
        });

        // Fixed expense amount comma formatting
        const fixedAmountInput = document.getElementById('expenseAmount');
        if (fixedAmountInput) {
            fixedAmountInput.addEventListener('input', () => {
                const raw = fixedAmountInput.value.replace(/[^0-9]/g, '');
                if (raw) {
                    fixedAmountInput.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                } else {
                    fixedAmountInput.value = '';
                }
            });
        }

        // Category management modal
        const modal = document.getElementById('categoryModal');
        const closeModal = document.getElementById('closeModal');
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        const newCategoryInput = document.getElementById('newCategoryInput');

        // openCategoryModal — called from ChipPicker edit button
        this._openCategoryModal = () => {
            modal.style.display = 'flex';
            this.renderCategoryManageList();
        };

        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
            newCategoryInput.value = '';
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                newCategoryInput.value = '';
            }
        });

        // Add category
        addCategoryBtn.addEventListener('click', () => {
            const categoryName = newCategoryInput.value.trim();
            if (categoryName) {
                if (this.addCategory(categoryName)) {
                    newCategoryInput.value = '';
                    // Success feedback
                    addCategoryBtn.textContent = '완료';
                    setTimeout(() => {
                        addCategoryBtn.textContent = '추가';
                    }, 1000);
                } else {
                    this.showToast('이미 존재하는 카테고리입니다.', 'error');
                }
            }
        });

        // Add category on Enter key
        newCategoryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addCategoryBtn.click();
            }
        });

        // Memo management modal
        const memoModal = document.getElementById('memoModal');
        const closeMemoModal = document.getElementById('closeMemoModal');
        const addMemoBtn = document.getElementById('addMemoBtn');
        const newMemoInput = document.getElementById('newMemoInput');

        // openMemoModal — called from ChipPicker edit button
        this._openMemoModal = () => {
            memoModal.style.display = 'flex';
            this.renderMemoManageList();
        };

        closeMemoModal.addEventListener('click', () => {
            memoModal.style.display = 'none';
            newMemoInput.value = '';
        });

        memoModal.addEventListener('click', (e) => {
            if (e.target === memoModal) {
                memoModal.style.display = 'none';
                newMemoInput.value = '';
            }
        });

        addMemoBtn.addEventListener('click', () => {
            const memoName = newMemoInput.value.trim();
            if (memoName) {
                if (this.addMemo(memoName)) {
                    newMemoInput.value = '';
                    addMemoBtn.textContent = '완료';
                    setTimeout(() => {
                        addMemoBtn.textContent = '추가';
                    }, 1000);
                } else {
                    this.showToast('이미 존재하는 메모입니다.', 'error');
                }
            }
        });

        newMemoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addMemoBtn.click();
            }
        });

        // Custom dropdown logic for category
        this.setupCustomDropdown(
            document.getElementById('expenseCategory'),
            document.getElementById('categoryDropdownList'),
            () => this.categories,
            '카테고리',
            { onEdit: () => this._openCategoryModal() }
        );

        // Custom dropdown logic for memo
        this.setupCustomDropdown(
            document.getElementById('expenseMemo'),
            document.getElementById('memoDropdownList'),
            () => this.memos,
            '결제수단',
            { onEdit: () => this._openMemoModal() }
        );

        // Cancel edit button
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                this.cancelEdit();
            });
        }

        // Confirm delete dialog
        const confirmDialog = document.getElementById('confirmDialog');
        document.getElementById('confirmOk').addEventListener('click', () => {
            if (this._pendingDeleteId != null) {
                this.deleteExpense(this._pendingDeleteId);
                this.showToast('지출이 삭제되었습니다.', 'success');
                this._pendingDeleteId = null;
            }
            confirmDialog.style.display = 'none';
        });
        document.getElementById('confirmCancel').addEventListener('click', () => {
            this._pendingDeleteId = null;
            confirmDialog.style.display = 'none';
        });
        confirmDialog.addEventListener('click', (e) => {
            if (e.target === confirmDialog) {
                this._pendingDeleteId = null;
                confirmDialog.style.display = 'none';
            }
        });

        // ESC key to close modals/dialogs
        const dailyCategoryModal = document.getElementById('dailyCategoryModal');
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (confirmDialog.style.display === 'flex') {
                    this._pendingDeleteId = null;
                    confirmDialog.style.display = 'none';
                } else if (dailyCategoryModal && dailyCategoryModal.style.display === 'flex') {
                    dailyCategoryModal.style.display = 'none';
                    const dcInput = document.getElementById('newDailyCategoryInput');
                    if (dcInput) dcInput.value = '';
                } else if (memoModal.style.display === 'flex') {
                    memoModal.style.display = 'none';
                    newMemoInput.value = '';
                } else if (modal.style.display === 'flex') {
                    modal.style.display = 'none';
                    newCategoryInput.value = '';
                }
            }
        });

        // Event delegation for category delete buttons
        const categoryListManage = document.getElementById('categoryListManage');
        categoryListManage.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-cat-index]');
            if (btn && !btn.disabled) {
                const index = parseInt(btn.dataset.catIndex);
                const categoryName = this.categories[index];
                if (categoryName) {
                    this.deleteCategory(categoryName);
                }
            }
        });

        // Event delegation for memo delete buttons
        const memoListManage = document.getElementById('memoListManage');
        memoListManage.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-memo-index]');
            if (btn && !btn.disabled) {
                const index = parseInt(btn.dataset.memoIndex);
                const memoName = this.memos[index];
                if (memoName) {
                    this.deleteMemo(memoName);
                }
            }
        });

        // Event delegation for expense toggle/edit/delete buttons
        const expenseList = document.getElementById('expenseList');
        expenseList.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('[data-toggle-id]');
            const editBtn = e.target.closest('[data-edit-id]');
            const deleteBtn = e.target.closest('[data-delete-id]');
            if (toggleBtn) {
                this.toggleExpense(parseInt(toggleBtn.dataset.toggleId));
            } else if (editBtn) {
                this.editExpense(parseInt(editBtn.dataset.editId));
            } else if (deleteBtn) {
                this.confirmDelete(parseInt(deleteBtn.dataset.deleteId));
            }
        });
    }
}

// ===== Daily Ledger (가계부) =====
class DailyLedger {
    constructor() {
        const now = new Date();
        this.year = now.getFullYear();
        this.month = now.getMonth() + 1; // 1-based
        this.currentType = 'expense';
        this.firebaseReady = false;
        this.listener = null;
        this.items = {};
        this.init();
    }

    init() {
        this.initFirebase();
        this.attachEvents();
        this.updateMonthLabel();
        this.setDefaultDay();
        this.setupDayPicker();
    }

    initFirebase() {
        if (typeof window.db === 'undefined') {
            console.warn('Firebase not available for DailyLedger');
            return;
        }
        this.firebaseReady = true;
        // 1회성: corrupted balances 데이터 삭제
        this.cleanupBalances();
        this.loadMonth();
    }

    getMonthRef() {
        const mm = String(this.month).padStart(2, '0');
        return window.db.ref(`daily/${this.year}/${mm}`);
    }

    loadMonth() {
        // Detach previous listener
        if (this.listener) {
            this.listener.off();
        }
        // 전월 이월 잔액 로드
        this.loadCarryover();
        this.listener = this.getMonthRef();
        this.listener.on('value', (snapshot) => {
            const data = snapshot.val();
            this.items = data || {};
            this.render();
            this.renderInstallments();
            this.renderCardUsage();
            this.updateSummary();
        }, (error) => {
            console.error('DailyLedger Firebase error:', error);
        });
    }

    updateMonthLabel() {
        const label = document.getElementById('currentMonthLabel');
        if (label) label.textContent = `${this.year}년 ${this.month}월`;
    }

    getEffectiveDay() {
        const now = new Date();
        let day = now.getDate();
        if (now.getHours() < 6) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            day = yesterday.getDate();
        }
        return day;
    }

    setDefaultDay() {
        this.selectedDay = this.getEffectiveDay();
        this.updateDayButton();
    }

    updateDayButton() {
        const btn = document.getElementById('dailyDayBtn');
        if (btn) btn.textContent = `${this.selectedDay}일`;
    }

    getDaysInMonth() {
        return new Date(this.year, this.month, 0).getDate();
    }

    renderDayGrid() {
        const grid = document.getElementById('dailyDayGridInner');
        if (!grid) return;

        const daysInMonth = this.getDaysInMonth();
        const today = this.getEffectiveDay();

        let html = '';
        for (let d = 1; d <= daysInMonth; d++) {
            const selectedClass = d === this.selectedDay ? ' selected' : '';
            const todayClass = d === today ? ' today' : '';
            html += `<button type="button" class="daily-day-cell${selectedClass}${todayClass}" data-day="${d}">${d}</button>`;
        }
        grid.innerHTML = html;
    }

    setupDayPicker() {
        const btn = document.getElementById('dailyDayBtn');
        const grid = document.getElementById('dailyDayGrid');
        const gridInner = document.getElementById('dailyDayGridInner');
        if (!btn || !grid || !gridInner) return;

        btn.addEventListener('click', () => {
            this.renderDayGrid();
            grid.classList.toggle('show');
        });

        gridInner.addEventListener('click', (e) => {
            const cell = e.target.closest('.daily-day-cell');
            if (cell) {
                this.selectedDay = parseInt(cell.dataset.day);
                this.updateDayButton();
                grid.classList.remove('show');
            }
        });

        // Close on outside click
        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.daily-day-wrapper')) {
                grid.classList.remove('show');
            }
        });
    }

    changeMonth(delta) {
        this.month += delta;
        if (this.month > 12) {
            this.month = 1;
            this.year++;
        } else if (this.month < 1) {
            this.month = 12;
            this.year--;
        }
        this.updateMonthLabel();
        // Clamp selectedDay to new month's max days
        const maxDays = this.getDaysInMonth();
        if (this.selectedDay > maxDays) {
            this.selectedDay = maxDays;
        }
        this.updateDayButton();
        // 날짜 그리드가 열려있으면 다시 렌더링
        const grid = document.getElementById('dailyDayGrid');
        if (grid && grid.classList.contains('show')) {
            this.renderDayGrid();
        }
        if (this.firebaseReady) {
            this.loadMonth();
        }
    }

    // 결제수단이 카드인지 판별 (이름에 '카드' 포함)
    isCardMethod(method) {
        return method && method.includes('카드');
    }

    // 다음달 연/월 계산 헬퍼
    getNextMonth(year, month, offset = 1) {
        let m = month + offset;
        let y = year;
        while (m > 12) { m -= 12; y++; }
        while (m < 1) { m += 12; y--; }
        return { year: y, month: m };
    }

    addItem(type, day, name, category, amount, method, installment) {
        if (!this.firebaseReady) {
            console.error('DailyLedger: Firebase not ready');
            return;
        }
        const totalAmount = parseFloat(amount);
        const isCard = this.isCardMethod(method);
        const createdAt = new Date().toISOString();

        // 카드 결제 → 다음달 1일에 기록, 일반 → 이번달 해당일에 기록
        const baseOffset = isCard ? 1 : 0;
        const baseDay = isCard ? '01' : String(day).padStart(2, '0');

        const onError = (err) => {
            console.error('DailyLedger addItem error:', err);
            if (typeof tracker !== 'undefined') tracker.showToast('저장 실패: ' + err.message, 'error');
        };

        // 당월 참조용 기록 (카드 결제 시, 합산 제외 / 조회용)
        const writeCardRef = () => {
            if (!isCard) return;
            const dd = String(day).padStart(2, '0');
            const mm = String(this.month).padStart(2, '0');
            const refData = {
                type: type,
                name: name,
                amount: totalAmount,
                createdAt: createdAt,
                cardRef: true
            };
            if (category) refData.category = category;
            if (method) refData.method = method;
            if (installment && installment > 1) {
                refData.installment = installment;
                refData.installmentTotal = totalAmount;
            }
            window.db.ref(`daily/${this.year}/${mm}/${dd}`).push().set(refData).catch(onError);
        };

        if (installment && installment > 1) {
            // 할부: 각 회차를 순차적으로 등록
            const monthlyAmount = Math.round(totalAmount / installment);
            for (let i = 1; i <= installment; i++) {
                const target = this.getNextMonth(this.year, this.month, baseOffset + (i - 1));
                const targetMM = String(target.month).padStart(2, '0');
                const targetDay = isCard ? '01' : String(day).padStart(2, '0');
                const futureRef = window.db.ref(`daily/${target.year}/${targetMM}/${targetDay}`).push();
                const itemData = {
                    type: type,
                    name: name,
                    amount: monthlyAmount,
                    createdAt: createdAt,
                    installment: installment,
                    installmentTotal: totalAmount,
                    installmentMonth: i,
                    installmentStart: `${this.year}-${String(this.month).padStart(2, '0')}`
                };
                if (category) itemData.category = category;
                if (method) itemData.method = method;
                if (isCard) itemData.cardDeferred = true;
                futureRef.set(itemData).catch(onError);
            }
            writeCardRef();
        } else {
            // 일시불
            const target = this.getNextMonth(this.year, this.month, baseOffset);
            const targetMM = String(target.month).padStart(2, '0');
            const ref = window.db.ref(`daily/${target.year}/${targetMM}/${baseDay}`).push();
            const data = {
                type: type,
                name: name,
                amount: totalAmount,
                createdAt: createdAt
            };
            if (category) data.category = category;
            if (method) data.method = method;
            if (isCard) data.cardDeferred = true;
            ref.set(data).catch(onError);
            writeCardRef();
        }
    }

    deleteItem(day, itemId) {
        if (!this.firebaseReady) return;
        const dd = String(day).padStart(2, '0');
        this.getMonthRef().child(dd).child(itemId).remove();
    }

    // Get day of week (한글)
    getDayOfWeek(day) {
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const date = new Date(this.year, this.month - 1, day);
        return days[date.getDay()];
    }

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount);
    }

    // Escape HTML
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    render() {
        const listEl = document.getElementById('dailyList');
        if (!listEl) return;

        // Collect all days, sort descending
        const dayKeys = Object.keys(this.items).sort((a, b) => parseInt(b) - parseInt(a));

        if (dayKeys.length === 0) {
            listEl.innerHTML = '<div class="daily-empty">이번 달 기록이 없습니다</div>';
            return;
        }

        let html = '';
        for (const dd of dayKeys) {
            const dayNum = parseInt(dd);
            const dow = this.getDayOfWeek(dayNum);
            const dayItems = this.items[dd];

            // Sort items within day by createdAt descending
            const itemEntries = Object.entries(dayItems).sort((a, b) => {
                return (b[1].createdAt || '').localeCompare(a[1].createdAt || '');
            });

            // 할부/고정지출 항목 필터 — 별도 섹션에 표시되므로 목록에서 제외
            const filtered = itemEntries.filter(([, item]) => {
                if (!item.cardRef && item.installment && item.installment > 1) return false;
                if (item.fixedExpense) return false;
                return true;
            });

            // 표시할 항목이 없는 날은 건너뛰기
            if (filtered.length === 0) continue;

            html += `<div class="daily-day-group">`;
            html += `<div class="daily-day-header">${dayNum}일 (${dow})</div>`;

            for (const [itemId, item] of filtered) {
                const isIncome = item.type === 'income';
                const isCardRef = item.cardRef === true;
                const isFixed = item.fixedExpense === true;
                const sign = isIncome ? '+' : '-';
                const typeClass = isIncome ? 'income' : 'expense';
                const extraClass = isCardRef ? ' card-ref' : (isFixed ? ' fixed-item' : '');
                const escapedName = this.escapeHtml(item.name);
                const catColor = (item.category && typeof tracker !== 'undefined') ? tracker.getCategoryColor(item.category) : '';
                const categoryHtml = item.category
                    ? `<span class="daily-item-category" style="background:${catColor}33;color:${catColor}">${this.escapeHtml(item.category)}</span>`
                    : '<span class="daily-item-category empty"></span>';
                const methodHtml = item.method ? `<span class="daily-item-method">${this.escapeHtml(item.method)}</span>` : '';

                // 보조 태그
                let badgeHtml = '';
                if (isFixed) {
                    badgeHtml += '<span class="daily-item-fixed-tag">고정</span>';
                } else if (isCardRef) {
                    if (item.installment && item.installment > 1) {
                        badgeHtml += '<span class="daily-item-card-ref-tag">다음달</span>';
                        badgeHtml += `<span class="daily-item-ref-detail">원금 ${this.formatCurrency(item.installmentTotal)}</span>`;
                    } else {
                        badgeHtml += '<span class="daily-item-installment">일시불</span>';
                        badgeHtml += '<span class="daily-item-card-ref-tag">다음달</span>';
                    }
                } else if (item.cardDeferred) {
                    if (!(item.installment && item.installment > 1)) {
                        badgeHtml += '<span class="daily-item-installment">일시불</span>';
                    }
                }

                // 고정지출 항목은 편집 없이 삭제만 가능
                const actionsHtml = isFixed
                    ? `<div class="daily-item-actions"><button class="btn-icon delete" data-day="${dd}" data-id="${itemId}" title="삭제">×</button></div>`
                    : `<div class="daily-item-actions"><button class="btn-icon edit" data-edit-day="${dd}" data-edit-id="${itemId}" title="수정">✎</button><button class="btn-icon delete" data-day="${dd}" data-id="${itemId}" title="삭제">×</button></div>`;

                html += `
                    <div class="daily-item${extraClass}">
                        ${categoryHtml}
                        <span class="daily-item-name">${escapedName}</span>
                        ${methodHtml}
                        ${badgeHtml}
                        <span class="daily-item-amount ${typeClass}">${sign}${this.formatCurrency(item.amount)}</span>
                        ${actionsHtml}
                    </div>`;
            }

            html += `</div>`;
        }

        listEl.innerHTML = html || '<div class="daily-empty">이번 달 기록이 없습니다</div>';
    }

    renderInstallments() {
        const section = document.getElementById('installmentSection');
        const listEl = document.getElementById('installmentList');
        if (!section || !listEl) return;

        // 현재 월 데이터에서 할부 항목(cardDeferred + installment > 1) 수집
        const installments = [];
        for (const dd of Object.keys(this.items)) {
            const dayItems = this.items[dd];
            if (!dayItems || typeof dayItems !== 'object') continue;
            for (const itemId of Object.keys(dayItems)) {
                const item = dayItems[itemId];
                if (!item || item.cardRef) continue;
                if (item.installment && item.installment > 1) {
                    installments.push({ dd, itemId, ...item });
                }
            }
        }

        if (installments.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        // 이름별 그룹핑 (같은 할부 건은 installmentStart+name으로 묶기)
        let html = '';
        for (const inst of installments) {
            const catColor = (inst.category && typeof tracker !== 'undefined') ? tracker.getCategoryColor(inst.category) : '#667eea';
            const catHtml = inst.category
                ? `<span class="daily-item-category" style="background:${catColor}33;color:${catColor}">${this.escapeHtml(inst.category)}</span>`
                : '';
            const progress = Math.round((inst.installmentMonth / inst.installment) * 100);
            html += `
                <div class="installment-item">
                    ${catHtml}
                    <span class="installment-name">${this.escapeHtml(inst.name)}</span>
                    <span class="installment-progress">${inst.installmentMonth}/${inst.installment}</span>
                    <div class="installment-bar"><div class="installment-bar-fill" style="width:${progress}%"></div></div>
                    <span class="installment-amount">${this.formatCurrency(inst.amount)}</span>
                </div>`;
        }
        listEl.innerHTML = html;
    }

    // 카드 실적 목표 (카드명: 목표금액)
    getCardGoals() {
        return {
            '현대카드': 1000000,
            '네이버카드': 300000
        };
    }

    renderCardUsage() {
        const section = document.getElementById('cardUsageSection');
        const listEl = document.getElementById('cardUsageList');
        if (!section || !listEl) return;

        // 카드별 사용액 집계 (cardDeferred 항목 — 실제 청구 기준)
        const cardTotals = {};
        for (const dd of Object.keys(this.items)) {
            const dayItems = this.items[dd];
            if (!dayItems || typeof dayItems !== 'object') continue;
            for (const itemId of Object.keys(dayItems)) {
                const item = dayItems[itemId];
                if (!item || item.cardRef) continue;
                if (item.cardDeferred && item.method) {
                    const card = item.method;
                    cardTotals[card] = (cardTotals[card] || 0) + (item.amount || 0);
                }
            }
        }

        // cardRef 항목도 집계 (당월 사용 기준 — 다음달 청구될 금액)
        for (const dd of Object.keys(this.items)) {
            const dayItems = this.items[dd];
            if (!dayItems || typeof dayItems !== 'object') continue;
            for (const itemId of Object.keys(dayItems)) {
                const item = dayItems[itemId];
                if (!item || !item.cardRef) continue;
                if (item.method) {
                    const card = item.method;
                    const amt = (item.installmentTotal && item.installment > 1) ? item.installmentTotal : (item.amount || 0);
                    cardTotals[card] = (cardTotals[card] || 0) + amt;
                }
            }
        }

        const goals = this.getCardGoals();
        // 목표가 설정된 카드만 표시
        const allCards = Object.keys(goals);

        if (allCards.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        const cardColors = { '현대카드': '#4299e1', '네이버카드': '#48bb78' };
        const defaultColors = ['#f6ad55', '#ed64a6', '#667eea', '#38b2ac'];
        let colorIdx = 0;

        let html = '';
        for (const card of allCards) {
            const used = cardTotals[card] || 0;
            const goal = goals[card] || 0;
            const color = cardColors[card] || defaultColors[colorIdx++ % defaultColors.length];

            if (goal > 0) {
                const pct = Math.min(Math.round((used / goal) * 100), 100);
                const achieved = pct >= 100;
                html += `
                    <div class="card-usage-item">
                        <div class="card-usage-top">
                            <span class="card-usage-name" style="color:${color}">${this.escapeHtml(card)}</span>
                            <span class="card-usage-amounts">
                                <span class="card-usage-used">${this.formatCurrency(used)}</span>
                                <span class="card-usage-sep">/</span>
                                <span class="card-usage-goal">${this.formatCurrency(goal)}</span>
                            </span>
                        </div>
                        <div class="card-usage-bar">
                            <div class="card-usage-bar-fill${achieved ? ' achieved' : ''}" style="width:${pct}%;background:${color}"></div>
                        </div>
                        <div class="card-usage-pct" style="color:${achieved ? '#48bb78' : color}">${pct}%${achieved ? ' 달성' : ''}</div>
                    </div>`;
            } else {
                html += `
                    <div class="card-usage-item">
                        <div class="card-usage-top">
                            <span class="card-usage-name" style="color:${color}">${this.escapeHtml(card)}</span>
                            <span class="card-usage-used">${this.formatCurrency(used)}</span>
                        </div>
                    </div>`;
            }
        }
        listEl.innerHTML = html;
    }

    getFixedTotal() {
        try {
            return (typeof tracker !== 'undefined' && tracker.expenses)
                ? tracker.expenses.filter(e => e.active !== false).reduce((sum, e) => sum + (e.amount || 0), 0)
                : 0;
        } catch (_) { return 0; }
    }

    // 특정 월의 수입/지출 합계 계산 (Promise)
    calcMonthTotals(year, month) {
        return new Promise((resolve) => {
            if (!this.firebaseReady) return resolve({ income: 0, expense: 0 });
            const mm = String(month).padStart(2, '0');
            window.db.ref(`daily/${year}/${mm}`).once('value', (snapshot) => {
                const data = snapshot.val();
                let income = 0, expense = 0;
                if (data) {
                    for (const dd of Object.keys(data)) {
                        const dayItems = data[dd];
                        if (!dayItems || typeof dayItems !== 'object') continue;
                        for (const itemId of Object.keys(dayItems)) {
                            const item = dayItems[itemId];
                            if (!item || item.cardRef) continue;
                            if (item.type === 'income') income += (item.amount || 0);
                            else expense += (item.amount || 0);
                        }
                    }
                }
                resolve({ income, expense });
            }, () => resolve({ income: 0, expense: 0 }));
        });
    }

    // 전월 이월 잔액 로드 (과거 모든 달의 수입-지출 누적으로 계산)
    async loadCarryover() {
        if (!this.firebaseReady) { this._carryover = 0; return; }
        try {
            // daily 전체 데이터를 한 번에 읽어서 현재 달 이전까지 누적
            const snap = await window.db.ref('daily').once('value');
            const allData = snap.val() || {};
            let cumulative = 0;

            for (const yr of Object.keys(allData)) {
                const yearData = allData[yr];
                if (!yearData || typeof yearData !== 'object') continue;
                for (const mm of Object.keys(yearData)) {
                    const y = parseInt(yr);
                    const m = parseInt(mm);
                    // 현재 보고 있는 달 이상이면 skip
                    if (y > this.year || (y === this.year && m >= this.month)) continue;

                    const monthData = yearData[mm];
                    if (!monthData || typeof monthData !== 'object') continue;
                    for (const dd of Object.keys(monthData)) {
                        const dayItems = monthData[dd];
                        if (!dayItems || typeof dayItems !== 'object') continue;
                        for (const itemId of Object.keys(dayItems)) {
                            const item = dayItems[itemId];
                            if (!item || item.cardRef) continue;
                            if (item.fixedExpense) {
                                cumulative -= (item.amount || 0);
                            } else if (item.type === 'income') {
                                cumulative += (item.amount || 0);
                            } else {
                                cumulative -= (item.amount || 0);
                            }
                        }
                    }
                }
            }
            this._carryover = cumulative;
        } catch (err) {
            console.error('loadCarryover error:', err);
            this._carryover = 0;
        }
    }

    // 현재 보고 있는 월이 실제 오늘의 월인지 확인
    isCurrentMonth() {
        const now = new Date();
        return this.year === now.getFullYear() && this.month === (now.getMonth() + 1);
    }

    // Firebase에서 corrupted balances 데이터 삭제 (1회성)
    async cleanupBalances() {
        if (!this.firebaseReady) return;
        try {
            await window.db.ref('balances').remove();
            console.log('Corrupted balances data cleaned up');
        } catch (err) {
            console.error('Failed to cleanup balances:', err);
        }
    }

    // 이번 달에 고정지출이 반영됐는지 확인
    hasFixedApplied() {
        for (const dd of Object.keys(this.items)) {
            const dayItems = this.items[dd];
            if (!dayItems || typeof dayItems !== 'object') continue;
            for (const itemId of Object.keys(dayItems)) {
                const item = dayItems[itemId];
                if (item && item.fixedExpense) return true;
            }
        }
        return false;
    }

    // 고정지출 반영 버튼 상태 업데이트
    updateFixedBtn() {
        const btn = document.getElementById('applyFixedBtn');
        if (!btn) return;
        const applied = this.hasFixedApplied();
        btn.textContent = applied ? '재반영' : '반영';
        btn.classList.toggle('applied', applied);
    }

    // 기존 고정지출 항목 삭제
    async removeFixedItems() {
        if (!this.firebaseReady) return;
        const mm = String(this.month).padStart(2, '0');
        const updates = {};
        for (const dd of Object.keys(this.items)) {
            const dayItems = this.items[dd];
            if (!dayItems || typeof dayItems !== 'object') continue;
            for (const itemId of Object.keys(dayItems)) {
                const item = dayItems[itemId];
                if (item && item.fixedExpense) {
                    updates[`${dd}/${itemId}`] = null;
                }
            }
        }
        if (Object.keys(updates).length > 0) {
            await this.getMonthRef().update(updates);
        }
    }

    // 고정지출을 이번 달 1일에 개별 항목으로 기록 (재반영 시 기존 삭제 후 새로 기록)
    async applyFixed() {
        if (!this.firebaseReady) return;

        const expenses = (typeof tracker !== 'undefined' && tracker.expenses)
            ? tracker.expenses.filter(e => e.active !== false)
            : [];

        if (expenses.length === 0) {
            if (typeof tracker !== 'undefined') tracker.showToast('반영할 고정지출 항목이 없습니다.', 'error');
            return;
        }

        // 기존 고정지출 항목 삭제
        await this.removeFixedItems();

        const mm = String(this.month).padStart(2, '0');
        const createdAt = new Date().toISOString();

        for (const exp of expenses) {
            const ref = window.db.ref(`daily/${this.year}/${mm}/01`).push();
            ref.set({
                type: 'expense',
                name: exp.name,
                amount: exp.amount,
                category: exp.category || '',
                method: exp.memo || '',
                fixedExpense: true,
                createdAt: createdAt
            });
        }

        if (typeof tracker !== 'undefined') tracker.showToast('고정지출이 반영되었습니다.', 'success');
    }

    updateSummary() {
        let totalIncome = 0;
        let totalExpense = 0;
        let fixedTotal = 0;

        for (const dd of Object.keys(this.items)) {
            const dayItems = this.items[dd];
            if (!dayItems || typeof dayItems !== 'object') continue;
            for (const itemId of Object.keys(dayItems)) {
                const item = dayItems[itemId];
                if (!item) continue;
                if (item.cardRef) continue;
                if (item.fixedExpense) {
                    fixedTotal += (item.amount || 0);
                } else if (item.type === 'income') {
                    totalIncome += (item.amount || 0);
                } else {
                    totalExpense += (item.amount || 0);
                }
            }
        }

        const carryover = this._carryover || 0;
        const balance = carryover + totalIncome - totalExpense - fixedTotal;

        const carryoverEl = document.getElementById('dailyCarryover');
        const incomeEl = document.getElementById('dailyIncome');
        const fixedEl = document.getElementById('dailyFixed');
        const expenseEl = document.getElementById('dailyExpense');
        const balanceEl = document.getElementById('dailyBalance');

        if (carryoverEl) carryoverEl.textContent = this.formatCurrency(carryover);
        if (incomeEl) incomeEl.textContent = this.formatCurrency(totalIncome);
        if (fixedEl) fixedEl.textContent = this.formatCurrency(fixedTotal);
        if (expenseEl) expenseEl.textContent = this.formatCurrency(totalExpense);
        if (balanceEl) balanceEl.textContent = this.formatCurrency(balance);

        // 반영 버튼 상태 업데이트
        this.updateFixedBtn();
    }

    attachEvents() {
        // Month navigation
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        if (prevBtn) prevBtn.addEventListener('click', () => this.changeMonth(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.changeMonth(1));

        // 고정지출 반영 버튼
        const applyFixedBtn = document.getElementById('applyFixedBtn');
        if (applyFixedBtn) {
            applyFixedBtn.addEventListener('click', () => this.applyFixed());
        }

        // Type toggle
        const typeBtns = document.querySelectorAll('.daily-type-btn');
        typeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                typeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentType = btn.dataset.type;
                this.toggleMethodInstallment(btn.dataset.type);
            });
        });

        // Add button
        const addBtn = document.getElementById('addDailyBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.handleAdd());
        }

        // Amount comma formatting
        const amountInput = document.getElementById('dailyAmount');
        if (amountInput) {
            amountInput.addEventListener('input', () => {
                const raw = amountInput.value.replace(/[^0-9]/g, '');
                if (raw) {
                    amountInput.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                } else {
                    amountInput.value = '';
                }
            });
        }

        // Daily Category management modal
        this.setupDailyCategoryManagement();

        // Category, Method, Installment dropdowns
        this.setupCategoryDropdown();
        this.setupMethodDropdown();
        this.setupInstallmentDropdown();

        // Enter key on inputs
        const inputs = [
            document.getElementById('dailyName'),
            document.getElementById('dailyCategory'),
            document.getElementById('dailyAmount'),
            document.getElementById('dailyMethod')
        ];
        inputs.forEach(input => {
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleAdd();
                    }
                });
            }
        });

        // Edit & Delete items (event delegation)
        const listEl = document.getElementById('dailyList');
        if (listEl) {
            listEl.addEventListener('click', (e) => {
                const editBtn = e.target.closest('[data-edit-day]');
                const deleteBtn = e.target.closest('[data-day][data-id]:not([data-edit-day])');
                if (editBtn) {
                    const day = editBtn.dataset.editDay;
                    const id = editBtn.dataset.editId;
                    this.startEdit(day, id);
                } else if (deleteBtn) {
                    const day = deleteBtn.dataset.day;
                    const id = deleteBtn.dataset.id;
                    this.deleteItem(parseInt(day), id);
                }
            });
        }
    }

    // 수입/지출 전환 시 결제수단·할부 활성/비활성
    toggleMethodInstallment(type) {
        const methodInput = document.getElementById('dailyMethod');
        const installmentBtn = document.getElementById('dailyInstallmentBtn');
        const methodWrapper = document.querySelector('.daily-method-wrapper');
        const installmentWrapper = document.querySelector('.daily-installment-wrapper');

        const isIncome = type === 'income';

        if (methodInput) {
            methodInput.disabled = isIncome;
            if (isIncome) methodInput.value = '';
        }
        if (installmentBtn) {
            installmentBtn.disabled = isIncome;
            if (isIncome) {
                this.selectedInstallment = 1;
                installmentBtn.textContent = '일시불';
            }
        }
        if (methodWrapper) methodWrapper.classList.toggle('disabled', isIncome);
        if (installmentWrapper) installmentWrapper.classList.toggle('disabled', isIncome);
    }

    setupDailyCategoryManagement() {
        const modal = document.getElementById('dailyCategoryModal');
        const closeBtn = document.getElementById('closeDailyCategoryModal');
        const addBtn = document.getElementById('addDailyCategoryBtn');
        const input = document.getElementById('newDailyCategoryInput');
        const listManage = document.getElementById('dailyCategoryListManage');

        if (!modal) return;

        // openDailyCategoryModal — called from ChipPicker edit button
        this._openDailyCategoryModal = () => {
            modal.style.display = 'flex';
            if (typeof tracker !== 'undefined') tracker.renderDailyCategoryManageList();
        };

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            input.value = '';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                input.value = '';
            }
        });

        addBtn.addEventListener('click', () => {
            const name = input.value.trim();
            if (name && typeof tracker !== 'undefined') {
                if (tracker.addDailyCategory(name)) {
                    input.value = '';
                    tracker.renderDailyCategoryManageList();
                    addBtn.textContent = '완료';
                    setTimeout(() => { addBtn.textContent = '추가'; }, 1000);
                } else {
                    tracker.showToast('이미 존재하는 카테고리입니다.', 'error');
                }
            }
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addBtn.click();
        });

        // Delete delegation
        if (listManage) {
            listManage.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-daily-cat-index]');
                if (btn && !btn.disabled && typeof tracker !== 'undefined') {
                    const index = parseInt(btn.dataset.dailyCatIndex);
                    const name = tracker.dailyCategories[index];
                    if (name) {
                        tracker.deleteDailyCategory(name);
                        tracker.renderDailyCategoryManageList();
                    }
                }
            });
        }
    }

    setupCategoryDropdown() {
        const input = document.getElementById('dailyCategory');
        if (!input) return;

        const getItems = () => {
            try {
                if (typeof tracker !== 'undefined' && tracker.dailyCategories) {
                    return tracker.dailyCategories;
                }
            } catch (_) {}
            return ['식비', '교통', '쇼핑', '의료', '여가', '카페', '기타'];
        };

        input.addEventListener('click', () => {
            ChipPicker.open('카테고리', getItems(), (val) => {
                input.value = val;
            }, { onEdit: () => this._openDailyCategoryModal && this._openDailyCategoryModal() });
        });
    }

    setupMethodDropdown() {
        const input = document.getElementById('dailyMethod');
        if (!input) return;

        const getItems = () => {
            try {
                if (typeof tracker !== 'undefined' && tracker.memos) {
                    return tracker.memos;
                }
            } catch (_) {}
            return ['카드 자동결제', '계좌이체', '현금납부'];
        };

        input.addEventListener('click', () => {
            ChipPicker.open('결제수단', getItems(), (val) => {
                input.value = val;
            }, { onEdit: () => { if (typeof tracker !== 'undefined') tracker._openMemoModal(); } });
        });
    }

    setupInstallmentDropdown() {
        const btn = document.getElementById('dailyInstallmentBtn');
        if (!btn) return;

        this.selectedInstallment = 1;

        const options = [
            { value: 1, label: '일시불', fullWidth: true },
            { value: 3, label: '3개월' },
            { value: 5, label: '5개월' },
            { value: 6, label: '6개월' },
            { value: 12, label: '12개월' },
            { value: 18, label: '18개월' },
            { value: 24, label: '24개월' }
        ];

        btn.addEventListener('click', () => {
            ChipPicker.open('할부', options, (val) => {
                this.selectedInstallment = parseInt(val);
                btn.textContent = this.selectedInstallment === 1 ? '일시불' : `${this.selectedInstallment}개월`;
            }, { activeValue: this.selectedInstallment });
        });
    }

    startEdit(dd, itemId) {
        const dayItems = this.items[dd];
        if (!dayItems || !dayItems[itemId]) return;
        const item = dayItems[itemId];

        this._editingDay = dd;
        this._editingId = itemId;

        const nameInput = document.getElementById('dailyName');
        const categoryInput = document.getElementById('dailyCategory');
        const amountInput = document.getElementById('dailyAmount');
        const methodInput = document.getElementById('dailyMethod');
        const addBtn = document.getElementById('addDailyBtn');

        // 타입 전환
        const typeBtns = document.querySelectorAll('.daily-type-btn');
        typeBtns.forEach(b => {
            b.classList.toggle('active', b.dataset.type === item.type);
        });
        this.currentType = item.type;
        this.toggleMethodInstallment(item.type);

        // 날짜
        this.selectedDay = parseInt(dd);
        this.updateDayButton();

        // 값 채우기
        nameInput.value = item.name || '';
        if (categoryInput) categoryInput.value = item.category || '';
        amountInput.value = String(parseInt(item.amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        if (methodInput) methodInput.value = item.method || '';

        // 버튼 텍스트 변경
        addBtn.textContent = '수정';
        addBtn.classList.add('editing');

        nameInput.focus();
    }

    cancelEdit() {
        this._editingDay = null;
        this._editingId = null;

        const nameInput = document.getElementById('dailyName');
        const categoryInput = document.getElementById('dailyCategory');
        const amountInput = document.getElementById('dailyAmount');
        const methodInput = document.getElementById('dailyMethod');
        const addBtn = document.getElementById('addDailyBtn');
        const installmentBtn = document.getElementById('dailyInstallmentBtn');

        nameInput.value = '';
        if (categoryInput) categoryInput.value = '';
        amountInput.value = '';
        if (methodInput) methodInput.value = '';
        this.selectedInstallment = 1;
        if (installmentBtn) installmentBtn.textContent = '일시불';
        addBtn.textContent = '+ 추가';
        addBtn.classList.remove('editing');
    }

    handleAdd() {
        const nameInput = document.getElementById('dailyName');
        const categoryInput = document.getElementById('dailyCategory');
        const amountInput = document.getElementById('dailyAmount');
        const methodInput = document.getElementById('dailyMethod');
        const installmentBtn = document.getElementById('dailyInstallmentBtn');

        const day = this.selectedDay;
        const name = nameInput.value.trim();
        const category = categoryInput ? categoryInput.value.trim() : '';
        const rawAmount = amountInput.value.replace(/[^0-9]/g, '');
        const amount = parseFloat(rawAmount);
        const method = (this.currentType === 'income') ? '' : (methodInput ? methodInput.value.trim() : '');
        const installment = (this.currentType === 'income') ? 1 : (this.selectedInstallment || 1);

        if (!day || day < 1 || day > 31) {
            return;
        }
        if (!name) {
            nameInput.focus();
            return;
        }
        if (!amount || amount <= 0) {
            amountInput.focus();
            return;
        }

        if (this._editingDay && this._editingId) {
            // 수정 모드: 기존 항목 삭제 후 새로 등록 (카드/할부 속성 재계산)
            const dd = this._editingDay;
            const id = this._editingId;
            const existing = this.items[dd] && this.items[dd][id];

            // 기존 항목 삭제
            const mm = String(this.month).padStart(2, '0');
            window.db.ref(`daily/${this.year}/${mm}/${dd}/${id}`).remove();

            // cardRef 항목 수정 시 → cardRef는 조회용이므로 단순 업데이트
            if (existing && existing.cardRef) {
                const updateData = {
                    type: this.currentType,
                    name: name,
                    amount: amount,
                    cardRef: true,
                    createdAt: existing.createdAt || new Date().toISOString()
                };
                if (category) updateData.category = category;
                if (method) updateData.method = method;
                if (existing.installment) updateData.installment = existing.installment;
                if (existing.installmentTotal) updateData.installmentTotal = existing.installmentTotal;
                window.db.ref(`daily/${this.year}/${mm}/${dd}`).push().set(updateData);
            }
            // cardDeferred 항목 수정 시 → 할부 속성 보존하며 업데이트
            else if (existing && existing.cardDeferred) {
                const updateData = {
                    type: this.currentType,
                    name: name,
                    amount: amount,
                    cardDeferred: true,
                    createdAt: existing.createdAt || new Date().toISOString()
                };
                if (category) updateData.category = category;
                if (method) updateData.method = method;
                if (existing.installmentStart) updateData.installmentStart = existing.installmentStart;
                if (existing.installmentMonth) updateData.installmentMonth = existing.installmentMonth;
                if (existing.installment) updateData.installment = existing.installment;
                if (existing.installmentTotal) updateData.installmentTotal = existing.installmentTotal;
                window.db.ref(`daily/${this.year}/${mm}/${dd}`).push().set(updateData);
            }
            // 일반 항목 수정 → 새로 addItem (카드면 이월 처리됨)
            else {
                this.addItem(this.currentType, parseInt(dd), name, category, amount, method, installment);
            }

            this.cancelEdit();
            if (typeof tracker !== 'undefined') tracker.showToast('항목이 수정되었습니다.', 'success');
        } else {
            // 추가 모드
            this.addItem(this.currentType, day, name, category, amount, method, installment);
        }

        // Clear
        nameInput.value = '';
        if (categoryInput) categoryInput.value = '';
        amountInput.value = '';
        if (methodInput) methodInput.value = '';
        this.selectedInstallment = 1;
        if (installmentBtn) installmentBtn.textContent = '일시불';
        const addBtn = document.getElementById('addDailyBtn');
        addBtn.textContent = '+ 추가';
        addBtn.classList.remove('editing');
        nameInput.focus();
    }
}

// Initialize the app
ChipPicker.init();
const tracker = new ExpenseTracker();
const dailyLedger = new DailyLedger();
