document.addEventListener('DOMContentLoaded', async () => {
    await Auth.protect();
    UIController.applyTheme(AppDB.getTheme());

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        UIController.applyTheme(AppDB.getTheme() === 'light' ? 'dark' : 'light');
    });
    document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

    // Attach calculators
    UI.attachCalculator('edit-amount');

    // ── Category helper ───────────────────────────────────────────────────────
    const populateEditCategories = (selectedCat = null) => {
        const typeEl = document.getElementById('edit-type');
        const catEl  = document.getElementById('edit-category');
        if (!typeEl || !catEl) return;
        catEl.innerHTML = AppDB.getCategories(typeEl.value)
            .map(c => `<option value="${c}" ${c === selectedCat ? 'selected' : ''}>${c}</option>`).join('');
    };
    document.getElementById('edit-type')?.addEventListener('change', () => populateEditCategories());

    // ── Modal ─────────────────────────────────────────────────────────────────
    const modalEdit = document.getElementById('modal-edit');
    document.getElementById('close-modal-edit')?.addEventListener('click', () => modalEdit.classList.remove('show'));
    window.addEventListener('click', e => { if (e.target === modalEdit) modalEdit.classList.remove('show'); });

    // ── Data ──────────────────────────────────────────────────────────────────
    let allTransactions = [];

    const renderHistory = () => {
        const historyBody = document.getElementById('history-body');
        if (!historyBody) return;

        const search     = document.getElementById('search-transaction')?.value.toLowerCase() || '';
        const dateFrom   = document.getElementById('filter-date-from')?.value || '';
        const dateTo     = document.getElementById('filter-date-to')?.value   || '';
        const typeFilter = document.getElementById('filter-type')?.value      || 'all';

        const filtered = allTransactions.filter(t => {
            const matchText = t.detail.toLowerCase().includes(search) || (t.category||'').toLowerCase().includes(search);
            const matchType = typeFilter === 'all' || t.type === typeFilter;
            const matchFrom = !dateFrom || t.date >= dateFrom;
            const matchTo   = !dateTo   || t.date <= dateTo;
            return matchText && matchType && matchFrom && matchTo;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (!filtered.length) {
            historyBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;font-style:italic;">No se encontraron movimientos</td></tr>`;
            return;
        }

        historyBody.innerHTML = filtered.map(t => `
            <tr>
                <td>${t.date}</td>
                <td>${t.detail}</td>
                <td>${t.category || 'General'}</td>
                <td><span class="badge ${t.type === 'income' ? 'badge-income' : 'badge-expense'}">
                    ${t.type === 'income' ? 'Ingreso' : 'Egreso'}
                </span></td>
                <td class="item-amount ${t.type === 'income' ? 'amount-income' : 'amount-expense'}">
                    ${UI.formatMoney(t.amount)}
                </td>
                <td>
                    <button class="btn-edit"   onclick="openEditModal('${t.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteTransaction('${t.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    };

    const loadTransactions = async () => {
        const body = document.getElementById('history-body');
        UI.showLoading(body, 'Cargando movimientos...');
        try {
            allTransactions = await AppDB.getTransactions();
            renderHistory();
        } catch (err) {
            UI.showError(body, 'Error al cargar los movimientos');
        }
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────
    window.deleteTransaction = async (id) => {
        if (!await UI.confirm('¿Estás seguro de que querés eliminar este movimiento?')) return;
        try {
            await AppDB.deleteTransaction(id);
            allTransactions = allTransactions.filter(t => t.id !== id);
            renderHistory();
        } catch (err) { await UI.alert('Error al eliminar: ' + err.message); }
    };

    window.openEditModal = (id) => {
        const t = allTransactions.find(t => t.id === id);
        if (!t) return;
        document.getElementById('edit-id').value     = t.id;
        document.getElementById('edit-type').value   = t.type;
        populateEditCategories(t.category);
        document.getElementById('edit-amount').value = t.amount;
        document.getElementById('edit-date').value   = t.date;
        document.getElementById('edit-detail').value = t.detail;
        modalEdit.classList.add('show');
    };

    document.getElementById('edit-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const id      = document.getElementById('edit-id').value;
        const updated = {
            type:     document.getElementById('edit-type').value,
            category: document.getElementById('edit-category').value,
            amount:   document.getElementById('edit-amount').value,
            date:     document.getElementById('edit-date').value,
            detail:   document.getElementById('edit-detail').value,
        };
        try {
            await AppDB.updateTransaction(id, updated);
            const idx = allTransactions.findIndex(t => t.id === id);
            if (idx !== -1) allTransactions[idx] = { ...allTransactions[idx], ...updated, amount: parseFloat(updated.amount) };
            modalEdit.classList.remove('show');
            renderHistory();
            await UI.alert('Movimiento actualizado correctamente');
        } catch (err) { await UI.alert('Error al actualizar: ' + err.message); }
    });

    // ── Filters ───────────────────────────────────────────────────────────────
    document.getElementById('search-transaction')?.addEventListener('input', renderHistory);
    document.getElementById('filter-date-from')?.addEventListener('change', renderHistory);
    document.getElementById('filter-date-to')?.addEventListener('change', renderHistory);
    document.getElementById('filter-type')?.addEventListener('change', renderHistory);

    await loadTransactions();
});
