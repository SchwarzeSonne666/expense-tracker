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

    // Load expense into form for editing
    editExpense(id) {
        const expense = this.expenses.find(expense => expense.id === id);
        if (expense) {
            this.editingId = id;
            document.getElementById('expenseName').value = expense.name;
            document.getElementById('expenseAmount').value = expense.amount;
            document.getElementById('expenseCategory').value = expense.category;
            document.getElementById('expenseMemo').value = expense.memo || '';

            // Update button text and visual mode
            const submitBtn = document.querySelector('.btn-primary');
            submitBtn.textContent = '수정하기';
            const formCard = document.getElementById('formCard');
            formCard.classList.add('card--editing');
            document.getElementById('editBanner').style.display = 'flex';

            // Scroll to form
            formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Cancel editing
    cancelEdit() {
        this.editingId = null;
        document.getElementById('expenseForm').reset();
        const submitBtn = document.querySelector('.btn-primary');
        submitBtn.textContent = '+ 추가하기';
        const formCard = document.getElementById('formCard');
        formCard.classList.remove('card--editing');
        document.getElementById('editBanner').style.display = 'none';
    }

    // Get total expense amount
    getTotalAmount() {
        return this.expenses.reduce((total, expense) => total + expense.amount, 0);
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
            return `
        <div class="expense-item" style="border-left-color: ${color}">
          <div class="expense-info">
            <div class="expense-name">${escapedName}</div>
            <div class="expense-meta">
              <span class="expense-category" style="background: ${color}33; color: ${color}">${escapedCategory}</span>
              ${escapedMemo ? `<span>${escapedMemo.replace(' · ', '')}</span>` : ''}
            </div>
          </div>
          <div class="expense-amount">${this.formatCurrency(expense.amount)}</div>
          <div class="expense-actions">
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
    }

    // Setup custom dropdown behavior
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
                    return `<div class="dropdown-item" data-value="${escaped}"><span class="dropdown-item-dot"></span>${escaped}</div>`;
                }).join('');
            }
            listEl.classList.add('show');
        };

        input.addEventListener('focus', showFiltered);
        input.addEventListener('input', showFiltered);

        listEl.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent blur before click registers
            const item = e.target.closest('.dropdown-item');
            if (item) {
                input.value = item.dataset.value;
                listEl.classList.remove('show');
                input.dispatchEvent(new Event('change'));
            }
        });

        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            const visibleItems = listEl.querySelectorAll('.dropdown-item');
            const activeItem = listEl.querySelector('.dropdown-item.active');
            let index = Array.from(visibleItems).indexOf(activeItem);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (index < visibleItems.length - 1) index++;
                else index = 0;
                visibleItems.forEach(el => el.classList.remove('active'));
                visibleItems[index]?.classList.add('active');
                visibleItems[index]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (index > 0) index--;
                else index = visibleItems.length - 1;
                visibleItems.forEach(el => el.classList.remove('active'));
                visibleItems[index]?.classList.add('active');
                visibleItems[index]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter' && activeItem) {
                e.preventDefault();
                input.value = activeItem.dataset.value;
                listEl.classList.remove('show');
            } else if (e.key === 'Escape') {
                listEl.classList.remove('show');
            }
        });

        // Close on blur (delayed to allow mousedown on list)
        input.addEventListener('blur', () => {
            setTimeout(() => listEl.classList.remove('show'), 150);
        });
    }

    // Attach event listeners
    attachEventListeners() {
        const form = document.getElementById('expenseForm');

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('expenseName').value.trim();
            const amount = document.getElementById('expenseAmount').value;
            const category = document.getElementById('expenseCategory').value.trim();
            const memo = document.getElementById('expenseMemo').value.trim();

            if (name && amount && category) {
                if (this.editingId) {
                    // Update existing expense
                    this.updateExpense(this.editingId, name, amount, category, memo);
                    this.editingId = null;
                    document.getElementById('formCard').classList.remove('card--editing');
                    document.getElementById('editBanner').style.display = 'none';

                    const submitBtn = form.querySelector('.btn-primary');
                    submitBtn.textContent = '수정 완료';
                    this.showToast('지출이 수정되었습니다.', 'success');
                    setTimeout(() => {
                        submitBtn.textContent = '+ 추가하기';
                    }, 1500);
                } else {
                    // Add new expense
                    this.addExpense(name, amount, category, memo);
                    this.showToast('새 지출이 추가되었습니다.', 'success');

                    const submitBtn = form.querySelector('.btn-primary');
                    submitBtn.textContent = '추가 완료';
                    setTimeout(() => {
                        submitBtn.textContent = '+ 추가하기';
                    }, 1500);
                }

                form.reset();
            }
        });

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
        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            this.cancelEdit();
        });

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

        // Event delegation for expense edit/delete buttons
        const expenseList = document.getElementById('expenseList');
        expenseList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('[data-edit-id]');
            const deleteBtn = e.target.closest('[data-delete-id]');
            if (editBtn) {
                this.editExpense(parseInt(editBtn.dataset.editId));
            } else if (deleteBtn) {
                this.confirmDelete(parseInt(deleteBtn.dataset.deleteId));
            }
        });
    }
}

// Initialize the app
const tracker = new ExpenseTracker();
