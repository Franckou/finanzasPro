document.addEventListener('DOMContentLoaded', () => {
    // Protect Route
    Auth.protect();

    // DOM Elements
    const themeToggle = document.getElementById('theme-toggle');
    const btnLogout = document.getElementById('btn-logout');
    const searchInput = document.getElementById('search-transaction');
    const historyBody = document.getElementById('history-body');
    const modalEdit = document.getElementById('modal-edit');
    const closeModal = document.querySelector('.close-modal');
    const editForm = document.getElementById('edit-form');

    const editTypeSelect = document.getElementById('edit-type');
    const editCategorySelect = document.getElementById('edit-category');

    // --- Theme Logic ---
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = Storage.getTheme();
            UIController.applyTheme(currentTheme === 'light' ? 'dark' : 'light');
        });
    }

    UIController.applyTheme(Storage.getTheme());

    // --- Auth Logic ---
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            Auth.logout();
        });
    }

    // --- Dynamic Categories Logic ---
    const updateEditCategories = () => {
        if (!editTypeSelect || !editCategorySelect) return;
        const type = editTypeSelect.value;
        const categories = Storage.getCategories(type);
        
        editCategorySelect.innerHTML = '';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            editCategorySelect.appendChild(option);
        });
    };

    if (editTypeSelect) {
        editTypeSelect.addEventListener('change', updateEditCategories);
    }

    // --- History Rendering ---
    const renderHistory = () => {
        if (!historyBody) return;
        const transactions = Storage.getTransactions();
        const filterText = searchInput ? searchInput.value : '';
        const dateFromEl = document.getElementById('filter-date-from');
        const dateToEl = document.getElementById('filter-date-to');
        const typeFilterEl = document.getElementById('filter-type');

        const dateFrom = dateFromEl ? dateFromEl.value : '';
        const dateTo = dateToEl ? dateToEl.value : '';
        const typeFilter = typeFilterEl ? typeFilterEl.value : 'all';

        historyBody.innerHTML = '';

        const filtered = transactions.filter(t => {
            const matchesText = t.detail.toLowerCase().includes(filterText.toLowerCase()) || 
                               (t.category && t.category.toLowerCase().includes(filterText.toLowerCase()));
            const matchesType = typeFilter === 'all' || t.type === typeFilter;
            const matchesDateFrom = !dateFrom || t.date >= dateFrom;
            const matchesDateTo = !dateTo || t.date <= dateTo;

            return matchesText && matchesType && matchesDateFrom && matchesDateTo;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filtered.length === 0) {
            historyBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding: 2rem; font-style: italic;">No se encontraron movimientos que coincidan con la búsqueda</td></tr>';
            return;
        }

        filtered.forEach(t => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${t.date}</td>
                <td>${t.detail}</td>
                <td>${t.category || 'General'}</td>
                <td><span class="badge ${t.type === 'income' ? 'badge-income' : 'badge-expense'}">${t.type === 'income' ? 'Ingreso' : 'Egreso'}</span></td>
                <td class="item-amount ${t.type === 'income' ? 'amount-income' : 'amount-expense'}">
                    $${t.amount.toFixed(2)}
                </td>
                <td>
                    <button class="btn-edit" onclick="openEditModal('${t.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteTransaction('${t.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            historyBody.appendChild(row);
        });
    };

    // --- Action Handlers ---
    window.deleteTransaction = async (id) => {
        const confirmed = await UI.confirm('¿Estás seguro de que deseas eliminar este movimiento?');
        if (confirmed) {
            Storage.deleteTransaction(id);
            renderHistory();
        }
    };

    window.openEditModal = (id) => {
        const transactions = Storage.getTransactions();
        const t = transactions.find(t => t.id === id);
        if (!t) return;

        const editIdEl = document.getElementById('edit-id');
        const editTypeEl = document.getElementById('edit-type');
        const editCategoryEl = document.getElementById('edit-category');
        const editAmountEl = document.getElementById('edit-amount');
        const editDateEl = document.getElementById('edit-date');
        const editDetailEl = document.getElementById('edit-detail');

        if (editIdEl) editIdEl.value = t.id;
        if (editTypeEl) editTypeEl.value = t.type;
        
        updateEditCategories(); // Fill categories first
        if (editCategoryEl) editCategoryEl.value = t.category || 'General';
        
        if (editAmountEl) editAmountEl.value = t.amount;
        if (editDateEl) editDateEl.value = t.date;
        if (editDetailEl) editDetailEl.value = t.detail;

        if (modalEdit) modalEdit.classList.add('show');
    };

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (modalEdit) modalEdit.classList.remove('show');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modalEdit) {
            if (modalEdit) modalEdit.classList.remove('show');
        }
    });

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            const updatedData = {
                type: document.getElementById('edit-type').value,
                category: document.getElementById('edit-category').value,
                amount: document.getElementById('edit-amount').value,
                date: document.getElementById('edit-date').value,
                detail: document.getElementById('edit-detail').value
            };

            Storage.updateTransaction(id, updatedData);
            if (modalEdit) modalEdit.classList.remove('show');
            renderHistory();
            await UI.alert('Movimiento actualizado correctamente');
        });
    }

    if (searchInput) searchInput.addEventListener('input', renderHistory);
    
    const filterDateFrom = document.getElementById('filter-date-from');
    if (filterDateFrom) filterDateFrom.addEventListener('change', renderHistory);
    
    const filterDateTo = document.getElementById('filter-date-to');
    if (filterDateTo) filterDateTo.addEventListener('change', renderHistory);
    
    const filterType = document.getElementById('filter-type');
    if (filterType) filterType.addEventListener('change', renderHistory);

    // Initial load
    renderHistory();

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('SW registered'))
                .catch(err => console.log('SW registration failed', err));
        });
    }
});