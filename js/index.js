document.addEventListener('DOMContentLoaded', async () => {
    // ── Route protection ──────────────────────────────────────────────────────
    await Auth.protect();
    UIController.applyTheme(AppDB.getTheme());

    // ── Chart instances ───────────────────────────────────────────────────────
    let expenseChart = null;
    let evolutionChart = null;

    // ── Theme ─────────────────────────────────────────────────────────────────
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        const current = AppDB.getTheme();
        UIController.applyTheme(current === 'light' ? 'dark' : 'light');
    });

    // ── Logout ────────────────────────────────────────────────────────────────
    document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

    // ── Category helper ───────────────────────────────────────────────────────
    const populateCategories = (typeSelectId, categorySelectId) => {
        const typeEl = document.getElementById(typeSelectId);
        const catEl = document.getElementById(categorySelectId);
        if (!typeEl || !catEl) return;
        const cats = AppDB.getCategories(typeEl.value);
        catEl.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
    };

    // ── Transaction Modal ─────────────────────────────────────────────────────
    const modalTransaction = document.getElementById('modal-transaction');

    const openTransactionModal = () => {
        populateCategories('type', 'category');
        document.getElementById('date').valueAsDate = new Date();
        document.getElementById('transaction-form').reset();
        // Reset after reset so date stays
        document.getElementById('date').valueAsDate = new Date();
        populateCategories('type', 'category');
        modalTransaction.classList.add('show');
    };

    document.getElementById('btn-add-transaction')?.addEventListener('click', openTransactionModal);
    document.getElementById('close-modal-transaction')?.addEventListener('click', () => modalTransaction.classList.remove('show'));
    window.addEventListener('click', (e) => { if (e.target === modalTransaction) modalTransaction.classList.remove('show'); });

    document.getElementById('type')?.addEventListener('change', () => populateCategories('type', 'category'));

    document.getElementById('transaction-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-transaction');
        const spinner = document.getElementById('save-spinner');
        btn.disabled = true;
        spinner.classList.remove('hidden');
        try {
            await AppDB.saveTransaction({
                type: document.getElementById('type').value,
                category: document.getElementById('category').value,
                amount: document.getElementById('amount').value,
                date: document.getElementById('date').value,
                detail: document.getElementById('detail').value
            });
            modalTransaction.classList.remove('show');
            document.getElementById('transaction-form').reset();
            await updateDashboard();
            await UI.alert('Movimiento guardado correctamente');
        } catch (err) {
            await UI.alert('Error al guardar: ' + err.message);
        } finally {
            btn.disabled = false;
            spinner.classList.add('hidden');
        }
    });

    // ── Recurring Modal ───────────────────────────────────────────────────────
    const modalRecurring = document.getElementById('modal-recurring');
    const recTypeSelect = document.getElementById('rec-type');
    const quotaCountGroup = document.getElementById('quota-count-group');

    const openRecurringModal = () => {
        document.getElementById('recurring-form').reset();
        document.getElementById('rec-start-date').valueAsDate = new Date();
        quotaCountGroup.classList.add('hidden');
        modalRecurring.classList.add('show');
    };

    document.getElementById('btn-add-recurring-sidebar')?.addEventListener('click', openRecurringModal);
    document.getElementById('close-modal-recurring')?.addEventListener('click', () => modalRecurring.classList.remove('show'));
    window.addEventListener('click', (e) => { if (e.target === modalRecurring) modalRecurring.classList.remove('show'); });

    recTypeSelect?.addEventListener('change', () => {
        quotaCountGroup.classList.toggle('hidden', recTypeSelect.value !== 'quota');
    });

    document.getElementById('recurring-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await AppDB.saveRecurring({
                name: document.getElementById('rec-name').value,
                amount: document.getElementById('rec-amount').value,
                type: recTypeSelect.value,
                quotas: document.getElementById('rec-quotas').value || null,
                startDate: document.getElementById('rec-start-date').value
            });
            modalRecurring.classList.remove('show');
            document.getElementById('recurring-form').reset();
            await updateRecurringDropdown();
            await updateDashboard();
            await UI.alert('Suscripción guardada correctamente');
        } catch (err) {
            await UI.alert('Error al guardar: ' + err.message);
        }
    });

    // ── Recurring dropdown toggle ─────────────────────────────────────────────
    window.toggleRecurring = async (id, currentState) => {
        try {
            await AppDB.updateRecurring(id, { active: !currentState });
            await updateRecurringDropdown();
            await updateDashboard();
        } catch (err) {
            console.error('toggleRecurring:', err);
        }
    };

    const updateRecurringDropdown = async () => {
        const content = document.querySelector('#recurring-dropdown .dropdown-content');
        if (!content) return;
        const recurring = await AppDB.getRecurring();
        if (recurring.length === 0) {
            content.innerHTML = '<p class="empty-msg">No hay suscripciones</p>';
            return;
        }
        content.innerHTML = recurring.map(item => `
            <div class="dropdown-item">
                <span>${item.name} ($${Number(item.amount).toFixed(2)})</span>
                <input type="checkbox" ${item.active ? 'checked' : ''}
                    onchange="toggleRecurring('${item.id}', ${item.active})">
            </div>
        `).join('');
    };

    // ── Budget ────────────────────────────────────────────────────────────────
    const updateBudgetUI = async (transactions) => {
        const budget = await AppDB.getBudget();
        const budgetInput = document.getElementById('budget-amount');
        const fill = document.getElementById('budget-progress-fill');
        const label = document.getElementById('budget-percentage');
        if (budgetInput) budgetInput.value = budget || '';

        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);
        const monthExpenses = (transactions || [])
            .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
            .reduce((s, t) => s + Number(t.amount), 0);

        if (budget > 0 && fill && label) {
            const pct = Math.min((monthExpenses / budget) * 100, 100);
            fill.style.width = `${pct}%`;
            fill.style.backgroundColor = pct >= 100 ? 'var(--expense-color)' : pct >= 80 ? '#ffc107' : 'var(--primary-color)';
            label.textContent = `${Math.round((monthExpenses / budget) * 100)}% utilizado`;
        } else if (fill && label) {
            fill.style.width = '0%';
            label.textContent = 'Sin presupuesto';
        }
    };

    document.getElementById('btn-save-budget')?.addEventListener('click', async () => {
        const amount = parseFloat(document.getElementById('budget-amount').value);
        if (amount > 0) {
            await AppDB.saveBudget(amount);
            const txs = await AppDB.getTransactions();
            await updateBudgetUI(txs);
            await UI.alert('Presupuesto actualizado');
        }
    });

    // ── Export ────────────────────────────────────────────────────────────────
    document.getElementById('btn-export-json')?.addEventListener('click', async () => {
        const data = await AppDB.exportJSON();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finanzas_pro_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // ── Period filter ─────────────────────────────────────────────────────────
    const periodFilter = document.getElementById('period-filter');
    const monthPicker = document.getElementById('month-picker');

    periodFilter?.addEventListener('change', () => {
        monthPicker.classList.toggle('hidden', periodFilter.value !== 'custom');
        updateDashboard();
    });
    monthPicker?.addEventListener('change', () => updateDashboard());

    // ── Financials calculation ────────────────────────────────────────────────
    const calculateFinancials = (transactions, recurring, period, selectedMonth) => {
        const now = new Date();
        const currentMonthStr = now.toISOString().slice(0, 7);
        const currentYearStr = now.getFullYear().toString();

        // Filter transactions by period
        let filtered = transactions;
        if (period === 'current') {
            filtered = transactions.filter(t => t.date.startsWith(currentMonthStr));
        } else if (period === 'custom' && selectedMonth) {
            filtered = transactions.filter(t => t.date.startsWith(selectedMonth));
        } else if (period === 'annual') {
            filtered = transactions.filter(t => t.date.startsWith(currentYearStr));
        }

        // Calculate recurring expenses
        const activeRecurring = recurring.filter(r => r.active);
        let recurringTotal = 0;
        const targetMonth = period === 'custom' && selectedMonth ? selectedMonth : currentMonthStr;

        activeRecurring.forEach(r => {
            const amount = Number(r.amount);
            const start = new Date(r.start_date || r.startDate);

            if (r.type === 'subscription') {
                if (period === 'annual') {
                    const months = Math.min(
                        (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1,
                        12
                    );
                    if (months > 0) recurringTotal += amount * months;
                } else {
                    recurringTotal += amount;
                }
            } else if (r.type === 'quota') {
                const totalQuotas = parseInt(r.quotas);
                if (period === 'annual') {
                    for (let i = 0; i < totalQuotas; i++) {
                        const qDate = new Date(start);
                        qDate.setMonth(start.getMonth() + i);
                        if (qDate.getFullYear() === now.getFullYear()) recurringTotal += amount;
                    }
                } else {
                    const target = new Date(targetMonth + '-01');
                    const diff = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
                    if (diff >= 0 && diff < totalQuotas) recurringTotal += amount;
                }
            }
        });

        let income = 0, expense = 0;
        filtered.forEach(t => {
            if (t.type === 'income') income += Number(t.amount);
            else expense += Number(t.amount);
        });

        return { income, expense: expense + recurringTotal, balance: income - (expense + recurringTotal), filtered };
    };

    // ── Dashboard render ──────────────────────────────────────────────────────
    const updateDashboard = async () => {
        const [transactions, recurring] = await Promise.all([
            AppDB.getTransactions(),
            AppDB.getRecurring()
        ]);

        await updateBudgetUI(transactions);

        const period = periodFilter?.value || 'current';
        const selectedMonth = monthPicker?.value || '';
        const { income, expense, balance, filtered } = calculateFinancials(transactions, recurring, period, selectedMonth);

        document.getElementById('total-income').textContent = `$${income.toFixed(2)}`;
        document.getElementById('total-expense').textContent = `$${expense.toFixed(2)}`;
        document.getElementById('total-balance').textContent = `$${balance.toFixed(2)}`;

        // Recent transactions
        const recentList = document.getElementById('recent-list');
        if (recentList) {
            const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
            if (sorted.length === 0) {
                recentList.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-style:italic; padding:1rem;">No hay movimientos recientes</p>';
            } else {
                recentList.innerHTML = sorted.map(t => `
                    <div class="transaction-item">
                        <div class="item-details">
                            <span class="detail">${t.detail}</span>
                            <span class="date">${t.date} · ${t.category || 'General'}</span>
                        </div>
                        <span class="item-amount ${t.type === 'income' ? 'amount-income' : 'amount-expense'}">
                            ${t.type === 'income' ? '+' : '-'}$${Number(t.amount).toFixed(2)}
                        </span>
                    </div>
                `).join('');
            }
        }

        updateCharts(filtered, transactions);
    };

    // ── Charts ────────────────────────────────────────────────────────────────
    const updateCharts = (filteredData, allTransactions) => {
        // Expense donut
        const expenseData = filteredData.filter(t => t.type === 'expense');
        const catTotals = {};
        expenseData.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount); });

        const pieLabels = Object.keys(catTotals);
        const pieValues = Object.values(catTotals);
        const COLORS = ['#4B5320', '#6B8E23', '#8FBC8F', '#556B2F', '#A9BA9D', '#2F4F4F', '#BDB76B', '#DAA520'];

        const pieCtx = document.getElementById('expenseChart')?.getContext('2d');
        if (pieCtx) {
            if (expenseChart) {
                expenseChart.data.labels = pieLabels;
                expenseChart.data.datasets[0].data = pieValues;
                expenseChart.update();
            } else {
                expenseChart = new Chart(pieCtx, {
                    type: 'doughnut',
                    data: { labels: pieLabels, datasets: [{ data: pieValues, backgroundColor: COLORS, borderWidth: 1 }] },
                    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
                });
            }
        }

        // Monthly evolution line
        const monthlyStats = {};
        allTransactions.forEach(t => {
            const month = t.date.slice(0, 7);
            if (!monthlyStats[month]) monthlyStats[month] = { income: 0, expense: 0 };
            if (t.type === 'income') monthlyStats[month].income += Number(t.amount);
            else monthlyStats[month].expense += Number(t.amount);
        });

        const sortedMonths = Object.keys(monthlyStats).sort();
        const lineCtx = document.getElementById('evolutionChart')?.getContext('2d');
        if (lineCtx) {
            if (evolutionChart) {
                evolutionChart.data.labels = sortedMonths;
                evolutionChart.data.datasets[0].data = sortedMonths.map(m => monthlyStats[m].income);
                evolutionChart.data.datasets[1].data = sortedMonths.map(m => monthlyStats[m].expense);
                evolutionChart.update();
            } else {
                evolutionChart = new Chart(lineCtx, {
                    type: 'line',
                    data: {
                        labels: sortedMonths,
                        datasets: [
                            { label: 'Ingresos', data: sortedMonths.map(m => monthlyStats[m].income), borderColor: '#2e7d32', backgroundColor: 'rgba(46,125,50,0.1)', fill: true, tension: 0.3 },
                            { label: 'Egresos', data: sortedMonths.map(m => monthlyStats[m].expense), borderColor: '#c62828', backgroundColor: 'rgba(198,40,40,0.1)', fill: true, tension: 0.3 }
                        ]
                    },
                    options: { responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { position: 'bottom' } } }
                });
            }
        }
    };

    // ── Initial load ──────────────────────────────────────────────────────────
    await Promise.all([updateDashboard(), updateRecurringDropdown()]);
});
