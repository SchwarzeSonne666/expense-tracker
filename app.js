// Expense Tracker Application with Firebase Sync
class ExpenseTracker {
    constructor() {
        this.expenses = this.loadExpenses();
        this.categories = this.loadCategories();
        this.memos = this.loadMemos();
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

        // Save local data BEFORE Firebase listeners overwrite them
        const localExpenses = [...this.expenses];
        const localCategories = [...this.categories];
        const localMemos = [...this.memos];

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
        };

        // First sync local data, then start listeners
        this.syncLocalToFirebase(localExpenses, localCategories, localMemos)
            .then(startListeners)
            .catch((err) => {
                console.error('Sync failed, starting listeners anyway:', err);
                startListeners();
            });
    }

    // One-time sync: push localStorage data to Firebase if Firebase is empty
    async syncLocalToFirebase(localExpenses, localCategories, localMemos) {
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
          <p class="empty-state-text">아직 등록된 월간 고정지출이 없습니다.<br>왼쪽 폼에서 새로운 지출을 추가해보세요!</p>
        </div>
      `;
            return;
        }

        expenseList.innerHTML = this.expenses.map(expense => {
            const color = this.getCategoryColor(expense.category);
            const escapedName = this.escapeHtml(expense.name);
            const escapedCategory = this.escapeHtml(expense.category);
            const escapedMemo = expense.memo ? ` · ${this.escapeHtml(expense.memo)}` : '';
            const isActive = expense.active !== false;
            const pausedClass = isActive ? '' : ' paused';
            const toggleIcon = isActive ? '●' : '○';
            const toggleTitle = isActive ? '중지' : '활성화';
            return `
        <div class="expense-item${pausedClass}" style="border-left-color: ${color}">
          <div class="expense-info">
            <div class="expense-name">${escapedName}</div>
            <div class="expense-meta">
              <span class="expense-category" style="background: ${color}33; color: ${color}">${escapedCategory}</span>
              ${escapedMemo ? `<span>${escapedMemo.replace(' · ', '')}</span>` : ''}
            </div>
          </div>
          <div class="expense-amount">${this.formatCurrency(expense.amount)}</div>
          <div class="expense-actions">
            <button class="btn-icon toggle ${isActive ? 'active' : ''}" data-toggle-id="${expense.id}" title="${toggleTitle}">
              ${toggleIcon}
            </button>
            <button class="btn-icon edit" data-edit-id="${expense.id}" title="수정">
              ✎
            </button>
            <button class="btn-icon delete" data-delete-id="${expense.id}" title="삭제">
              ×
            </button>
          </div>
        </div>
      `;
        }).join('');
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

    // Setup custom dropdown behavior (chip grid style)
    setupCustomDropdown(input, listEl, getItems) {
        const showFiltered = () => {
            const val = input.value.toLowerCase();
            const items = getItems();
            const filtered = val ? items.filter(item => item.toLowerCase().includes(val)) : items;

            if (filtered.length === 0) {
                listEl.innerHTML = '<div class="dropdown-empty">일치하는 항목 없음</div>';
            } else {
                listEl.innerHTML = filtered.map(item => {
                    const escaped = this.escapeHtml(item);
                    return `<div class="chip-item" data-value="${escaped}">${escaped}</div>`;
                }).join('');
            }
            listEl.classList.add('show');
        };

        input.addEventListener('focus', showFiltered);
        input.addEventListener('input', showFiltered);

        listEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const item = e.target.closest('.chip-item');
            if (item) {
                input.value = item.dataset.value;
                listEl.classList.remove('show');
                input.dispatchEvent(new Event('change'));
            }
        });

        // Close on blur (delayed to allow mousedown on list)
        input.addEventListener('blur', () => {
            setTimeout(() => listEl.classList.remove('show'), 150);
        });
    }

    // Attach event listeners
    attachEventListeners() {
        // Fixed add modal open/close
        const openModalBtn = document.getElementById('openFixedAddModal');
        const closeModalBtn = document.getElementById('closeFixedAddModal');
        const fixedAddModal = document.getElementById('fixedAddModal');

        if (openModalBtn) {
            openModalBtn.addEventListener('click', () => this.openFixedModal(false));
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
        const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
        const closeModal = document.getElementById('closeModal');
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        const newCategoryInput = document.getElementById('newCategoryInput');

        manageCategoriesBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            this.renderCategoryManageList();
        });

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
        const manageMemosBtn = document.getElementById('manageMemosBtn');
        const closeMemoModal = document.getElementById('closeMemoModal');
        const addMemoBtn = document.getElementById('addMemoBtn');
        const newMemoInput = document.getElementById('newMemoInput');

        manageMemosBtn.addEventListener('click', () => {
            memoModal.style.display = 'flex';
            this.renderMemoManageList();
        });

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
            () => this.categories
        );

        // Custom dropdown logic for memo
        this.setupCustomDropdown(
            document.getElementById('expenseMemo'),
            document.getElementById('memoDropdownList'),
            () => this.memos
        );

        // Close all dropdowns on outside click
        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.custom-dropdown')) {
                document.querySelectorAll('.dropdown-list.show').forEach(el => el.classList.remove('show'));
            }
        });

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
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (confirmDialog.style.display === 'flex') {
                    this._pendingDeleteId = null;
                    confirmDialog.style.display = 'none';
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
        this.listener = this.getMonthRef();
        this.listener.on('value', (snapshot) => {
            const data = snapshot.val();
            this.items = data || {};
            this.render();
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
            this.updateDayButton();
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
        if (!this.firebaseReady) return;
        const totalAmount = parseFloat(amount);
        const isCard = this.isCardMethod(method);
        const createdAt = new Date().toISOString();

        // 카드 결제 → 다음달 1일에 기록, 일반 → 이번달 해당일에 기록
        const baseOffset = isCard ? 1 : 0;
        const baseDay = isCard ? '01' : String(day).padStart(2, '0');

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
                futureRef.set(itemData);
            }
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
            ref.set(data);
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

            html += `<div class="daily-day-group">`;
            html += `<div class="daily-day-header">${dayNum}일 (${dow})</div>`;

            // Sort items within day by createdAt descending
            const itemEntries = Object.entries(dayItems).sort((a, b) => {
                return (b[1].createdAt || '').localeCompare(a[1].createdAt || '');
            });

            for (const [itemId, item] of itemEntries) {
                const isIncome = item.type === 'income';
                const sign = isIncome ? '+' : '-';
                const typeClass = isIncome ? 'income' : 'expense';
                const escapedName = this.escapeHtml(item.name);

                let categoryTag = '';
                if (item.category) {
                    const catColor = (typeof tracker !== 'undefined') ? tracker.getCategoryColor(item.category) : '#667eea';
                    categoryTag = `<span class="daily-item-category" style="background:${catColor}33;color:${catColor}">${this.escapeHtml(item.category)}</span>`;
                }

                const methodTag = item.method ? `<span class="daily-item-method">${this.escapeHtml(item.method)}</span>` : '';

                let installmentTag = '';
                let installmentDetail = '';
                if (item.installment && item.installment > 1) {
                    installmentTag = `<span class="daily-item-installment">${item.installmentMonth}/${item.installment}개월</span>`;
                    installmentDetail = `<span class="daily-item-installment-detail">원금 ${this.formatCurrency(item.installmentTotal)}</span>`;
                }

                const cardTag = item.cardDeferred ? '<span class="daily-item-card-deferred">카드결제</span>' : '';

                html += `
                    <div class="daily-item">
                        <span class="daily-item-name">${escapedName}</span>
                        <span class="daily-item-amount ${typeClass}">${sign}${this.formatCurrency(item.amount)}</span>
                        <div class="daily-item-tags">
                            ${categoryTag}${methodTag}${installmentTag}${installmentDetail}${cardTag}
                        </div>
                        <button class="daily-item-delete" data-day="${dd}" data-id="${itemId}" title="삭제">×</button>
                    </div>`;
            }

            html += `</div>`;
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

    updateSummary() {
        let totalIncome = 0;
        let totalExpense = 0;

        for (const dd of Object.keys(this.items)) {
            const dayItems = this.items[dd];
            if (!dayItems || typeof dayItems !== 'object') continue;
            for (const itemId of Object.keys(dayItems)) {
                const item = dayItems[itemId];
                if (!item) continue;
                if (item.type === 'income') {
                    totalIncome += (item.amount || 0);
                } else {
                    totalExpense += (item.amount || 0);
                }
            }
        }

        const fixedTotal = this.getFixedTotal();

        const incomeEl = document.getElementById('dailyIncome');
        const fixedEl = document.getElementById('dailyFixed');
        const expenseEl = document.getElementById('dailyExpense');
        const balanceEl = document.getElementById('dailyBalance');

        if (incomeEl) incomeEl.textContent = this.formatCurrency(totalIncome);
        if (fixedEl) fixedEl.textContent = this.formatCurrency(fixedTotal);
        if (expenseEl) expenseEl.textContent = this.formatCurrency(totalExpense);
        if (balanceEl) balanceEl.textContent = this.formatCurrency(totalIncome - totalExpense - fixedTotal);
    }

    attachEvents() {
        // Month navigation
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        if (prevBtn) prevBtn.addEventListener('click', () => this.changeMonth(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.changeMonth(1));

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

        // Delete items (event delegation)
        const listEl = document.getElementById('dailyList');
        if (listEl) {
            listEl.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.daily-item-delete');
                if (deleteBtn) {
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

    setupCategoryDropdown() {
        const input = document.getElementById('dailyCategory');
        const listEl = document.getElementById('dailyCategoryList');
        if (!input || !listEl) return;

        const getItems = () => {
            try {
                if (typeof tracker !== 'undefined' && tracker.categories) {
                    return tracker.categories;
                }
            } catch (_) {}
            return ['주거비', '통신비', '구독료', '보험료', '교통비', '기타'];
        };

        const renderList = () => {
            const items = getItems();
            if (items.length === 0) {
                listEl.innerHTML = '<div class="dropdown-empty">없음</div>';
            } else {
                listEl.innerHTML = items.map(item => {
                    const escaped = this.escapeHtml(item);
                    return `<div class="chip-item" data-value="${escaped}">${escaped}</div>`;
                }).join('');
            }
            listEl.classList.add('show');
        };

        input.addEventListener('click', renderList);
        input.addEventListener('focus', renderList);

        listEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const item = e.target.closest('.chip-item');
            if (item) {
                input.value = item.dataset.value;
                listEl.classList.remove('show');
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(() => listEl.classList.remove('show'), 150);
        });

        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.daily-category-wrapper')) {
                listEl.classList.remove('show');
            }
        });
    }

    setupMethodDropdown() {
        const input = document.getElementById('dailyMethod');
        const listEl = document.getElementById('dailyMethodList');
        if (!input || !listEl) return;

        const getItems = () => {
            try {
                if (typeof tracker !== 'undefined' && tracker.memos) {
                    return tracker.memos;
                }
            } catch (_) {}
            return ['카드 자동결제', '계좌이체', '현금납부'];
        };

        const renderList = () => {
            const items = getItems();
            if (items.length === 0) {
                listEl.innerHTML = '<div class="dropdown-empty">없음</div>';
            } else {
                listEl.innerHTML = items.map(item => {
                    const escaped = this.escapeHtml(item);
                    return `<div class="chip-item" data-value="${escaped}">${escaped}</div>`;
                }).join('');
            }
            listEl.classList.add('show');
        };

        input.addEventListener('click', renderList);
        input.addEventListener('focus', renderList);

        listEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const item = e.target.closest('.chip-item');
            if (item) {
                input.value = item.dataset.value;
                listEl.classList.remove('show');
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(() => listEl.classList.remove('show'), 150);
        });

        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.daily-method-wrapper')) {
                listEl.classList.remove('show');
            }
        });
    }

    setupInstallmentDropdown() {
        const btn = document.getElementById('dailyInstallmentBtn');
        const listEl = document.getElementById('dailyInstallmentList');
        if (!btn || !listEl) return;

        this.selectedInstallment = 1;

        const options = [
            { value: 1, label: '일시불' },
            { value: 3, label: '3개월' },
            { value: 6, label: '6개월' },
            { value: 12, label: '12개월' },
            { value: 24, label: '24개월' }
        ];

        const renderList = () => {
            listEl.innerHTML = options.map(opt => {
                const selected = opt.value === this.selectedInstallment ? ' active' : '';
                return `<div class="chip-item${selected}" data-value="${opt.value}">${opt.label}</div>`;
            }).join('');
            listEl.classList.add('show');
        };

        btn.addEventListener('click', () => {
            renderList();
        });

        listEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const item = e.target.closest('.chip-item');
            if (item) {
                this.selectedInstallment = parseInt(item.dataset.value);
                btn.textContent = this.selectedInstallment === 1 ? '일시불' : `${this.selectedInstallment}개월`;
                listEl.classList.remove('show');
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.daily-installment-wrapper')) {
                listEl.classList.remove('show');
            }
        });
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

        this.addItem(this.currentType, day, name, category, amount, method, installment);

        // Clear name, category, amount, method, reset installment — keep day
        nameInput.value = '';
        if (categoryInput) categoryInput.value = '';
        amountInput.value = '';
        if (methodInput) methodInput.value = '';
        this.selectedInstallment = 1;
        if (installmentBtn) installmentBtn.textContent = '일시불';
        nameInput.focus();
    }
}

// Initialize the app
const tracker = new ExpenseTracker();
const dailyLedger = new DailyLedger();
