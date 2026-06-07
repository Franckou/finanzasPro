document.addEventListener('DOMContentLoaded', async () => {
    await Auth.protect();
    UIController.applyTheme(AppDB.getTheme());

    let expenseChart = null;
    let evolutionChart = null;

    // ── Theme / Logout ────────────────────────────────────────────────────────
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        UIController.applyTheme(AppDB.getTheme() === 'light' ? 'dark' : 'light');
    });
    document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

    // ── Attach calculators to amount inputs ───────────────────────────────────
    UI.attachCalculator('amount');
    UI.attachCalculator('rec-amount');

    // ── Category helper ───────────────────────────────────────────────────────
    const populateCategories = (typeId, catId) => {
        const typeEl = document.getElementById(typeId);
        const catEl  = document.getElementById(catId);
        if (!typeEl || !catEl) return;
        catEl.innerHTML = AppDB.getCategories(typeEl.value)
            .map(c => `<option value="${c}">${c}</option>`).join('');
    };

    // ── Transaction Modal ─────────────────────────────────────────────────────
    const modalTx = document.getElementById('modal-transaction');

    const openTxModal = () => {
        document.getElementById('transaction-form').reset();
        document.getElementById('date').valueAsDate = new Date();
        populateCategories('type', 'category');
        modalTx.classList.add('show');
    };

    document.getElementById('btn-add-transaction')?.addEventListener('click', openTxModal);
    document.getElementById('close-modal-transaction')?.addEventListener('click', () => modalTx.classList.remove('show'));
    window.addEventListener('click', e => { if (e.target === modalTx) modalTx.classList.remove('show'); });
    document.getElementById('type')?.addEventListener('change', () => populateCategories('type', 'category'));

    document.getElementById('transaction-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-transaction');
        const spinner = document.getElementById('save-spinner');
        btn.disabled = true; spinner.classList.remove('hidden');
        try {
            await AppDB.saveTransaction({
                type:     document.getElementById('type').value,
                category: document.getElementById('category').value,
                amount:   document.getElementById('amount').value,
                date:     document.getElementById('date').value,
                detail:   document.getElementById('detail').value,
            });
            modalTx.classList.remove('show');
            document.getElementById('transaction-form').reset();
            await updateDashboard();
            await UI.alert('Movimiento guardado correctamente');
        } catch (err) {
            await UI.alert('Error al guardar: ' + err.message);
        } finally {
            btn.disabled = false; spinner.classList.add('hidden');
        }
    });

    // ── Recurring Modal ───────────────────────────────────────────────────────
    const modalRec = document.getElementById('modal-recurring');
    const recTypeSelect   = document.getElementById('rec-type');
    const quotaCountGroup = document.getElementById('quota-count-group');

    const openRecModal = () => {
        document.getElementById('recurring-form').reset();
        document.getElementById('rec-start-date').valueAsDate = new Date();
        quotaCountGroup.classList.add('hidden');
        modalRec.classList.add('show');
    };

    document.getElementById('btn-add-recurring-sidebar')?.addEventListener('click', openRecModal);
    document.getElementById('close-modal-recurring')?.addEventListener('click', () => modalRec.classList.remove('show'));
    window.addEventListener('click', e => { if (e.target === modalRec) modalRec.classList.remove('show'); });
    recTypeSelect?.addEventListener('change', () => {
        quotaCountGroup.classList.toggle('hidden', recTypeSelect.value !== 'quota');
    });

    document.getElementById('recurring-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            await AppDB.saveRecurring({
                name:      document.getElementById('rec-name').value,
                amount:    document.getElementById('rec-amount').value,
                type:      recTypeSelect.value,
                quotas:    document.getElementById('rec-quotas').value || null,
                startDate: document.getElementById('rec-start-date').value,
            });
            modalRec.classList.remove('show');
            document.getElementById('recurring-form').reset();
            await Promise.all([updateRecurringDropdown(), updateDashboard()]);
            await UI.alert('Suscripción guardada correctamente');
        } catch (err) {
            await UI.alert('Error al guardar: ' + err.message);
        }
    });

    // ── Recurring dropdown ────────────────────────────────────────────────────
    window.toggleRecurring = async (id, currentState) => {
        try {
            await AppDB.updateRecurring(id, { active: !currentState });
            await Promise.all([updateRecurringDropdown(), updateDashboard()]);
        } catch (err) { console.error('toggleRecurring:', err); }
    };

    const updateRecurringDropdown = async () => {
        const content = document.querySelector('#recurring-dropdown .dropdown-content');
        if (!content) return;
        const recurring = await AppDB.getRecurring();
        if (!recurring.length) {
            content.innerHTML = '<p class="empty-msg">No hay suscripciones</p>';
            return;
        }
        content.innerHTML = recurring.map(r => `
            <div class="dropdown-item">
                <span>${r.name} (${UI.formatMoney(r.amount)})</span>
                <input type="checkbox" ${r.active ? 'checked' : ''}
                    onchange="toggleRecurring('${r.id}', ${r.active})">
            </div>
        `).join('');
    };

    // ── Budget ────────────────────────────────────────────────────────────────
    // Bug fix: budget now includes recurring in the current month expense total
    const updateBudgetUI = async (transactions, recurring) => {
        const budget = await AppDB.getBudget();
        const budgetInput = document.getElementById('budget-amount');
        const fill  = document.getElementById('budget-progress-fill');
        const label = document.getElementById('budget-percentage');
        if (budgetInput && budget > 0) budgetInput.value = budget;

        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);

        // Regular expenses this month
        const txExpenses = (transactions || [])
            .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
            .reduce((s, t) => s + Number(t.amount), 0);

        // Recurring expenses active this month
        const recExpenses = calcRecurringForMonth(recurring || [], currentMonth, now);

        const totalExpenses = txExpenses + recExpenses;

        if (budget > 0 && fill && label) {
            const pct = Math.min((totalExpenses / budget) * 100, 100);
            fill.style.width = `${pct}%`;
            fill.style.backgroundColor = pct >= 100 ? 'var(--expense-color)' : pct >= 80 ? '#ffc107' : 'var(--primary-color)';
            label.textContent = `${Math.round((totalExpenses / budget) * 100)}% utilizado`;
        } else if (fill && label) {
            fill.style.width = '0%';
            label.textContent = 'Sin presupuesto';
        }
    };

    document.getElementById('btn-save-budget')?.addEventListener('click', async () => {
        const raw = document.getElementById('budget-amount').value;
        const amount = parseFloat(raw);
        if (!amount || amount <= 0) { await UI.alert('Ingresá un monto válido'); return; }
        try {
            await AppDB.saveBudget(amount);
            const [txs, recs] = await Promise.all([AppDB.getTransactions(), AppDB.getRecurring()]);
            await updateBudgetUI(txs, recs);
            await UI.alert('Presupuesto actualizado');
        } catch (err) { await UI.alert('Error al guardar presupuesto: ' + err.message); }
    });

    // ── Export ────────────────────────────────────────────────────────────────
    document.getElementById('btn-export-json')?.addEventListener('click', async () => {
        const data = await AppDB.exportJSON();
        const blob = new Blob([data], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `finanzas_pro_${new Date().toISOString().slice(0,10)}.json`;
        a.click(); URL.revokeObjectURL(url);
    });

    // ── Period filter ─────────────────────────────────────────────────────────
    const periodFilter = document.getElementById('period-filter');
    const monthPicker  = document.getElementById('month-picker');
    periodFilter?.addEventListener('change', () => {
        monthPicker.classList.toggle('hidden', periodFilter.value !== 'custom');
        updateDashboard();
    });
    monthPicker?.addEventListener('change', updateDashboard);

    // ── Helper: recurring amount applicable to a given month string ───────────
    // Returns total recurring expenses for that month
    const calcRecurringForMonth = (recurring, monthStr, now) => {
        const activeRec = recurring.filter(r => r.active);
        let total = 0;
        activeRec.forEach(r => {
            const amount = Number(r.amount);
            const start  = new Date((r.start_date || r.startDate) + 'T00:00:00');
            const target = new Date(monthStr + '-01T00:00:00');
            if (r.type === 'subscription') {
                // Active if target >= start month
                const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
                if (target >= startMonth) total += amount;
            } else if (r.type === 'quota') {
                const totalQuotas = parseInt(r.quotas) || 0;
                const diffMonths = (target.getFullYear() - start.getFullYear()) * 12
                                 + (target.getMonth()    - start.getMonth());
                if (diffMonths >= 0 && diffMonths < totalQuotas) total += amount;
            }
        });
        return total;
    };

    // Helper: recurring amount applicable to a year
    const calcRecurringForYear = (recurring, year, now) => {
        const activeRec = recurring.filter(r => r.active);
        let total = 0;
        activeRec.forEach(r => {
            const amount = Number(r.amount);
            const start  = new Date((r.start_date || r.startDate) + 'T00:00:00');
            if (r.type === 'subscription') {
                for (let m = 0; m < 12; m++) {
                    const monthDate = new Date(year, m, 1);
                    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
                    if (monthDate >= startMonth && monthDate <= now) total += amount;
                }
            } else if (r.type === 'quota') {
                const totalQuotas = parseInt(r.quotas) || 0;
                for (let i = 0; i < totalQuotas; i++) {
                    const qDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
                    if (qDate.getFullYear() === year) total += amount;
                }
            }
        });
        return total;
    };

    // ── Financials calculation ────────────────────────────────────────────────
    const calculateFinancials = (transactions, recurring, period, selectedMonth) => {
        const now = new Date();
        const currentMonthStr = now.toISOString().slice(0, 7);
        const currentYear = now.getFullYear();

        let filtered = transactions;
        let recurringExpense = 0;

        if (period === 'current') {
            filtered = transactions.filter(t => t.date.startsWith(currentMonthStr));
            recurringExpense = calcRecurringForMonth(recurring, currentMonthStr, now);
        } else if (period === 'custom' && selectedMonth) {
            filtered = transactions.filter(t => t.date.startsWith(selectedMonth));
            recurringExpense = calcRecurringForMonth(recurring, selectedMonth, now);
        } else if (period === 'annual') {
            filtered = transactions.filter(t => t.date.startsWith(String(currentYear)));
            recurringExpense = calcRecurringForYear(recurring, currentYear, now);
        }

        let income = 0, expense = 0;
        filtered.forEach(t => {
            if (t.type === 'income') income += Number(t.amount);
            else expense += Number(t.amount);
        });

        return {
            income,
            expense: expense + recurringExpense,
            balance: income - expense - recurringExpense,
            filtered,
            recurringExpense,
        };
    };

    // ── Dashboard render ──────────────────────────────────────────────────────
    const updateDashboard = async () => {
        const [transactions, recurring] = await Promise.all([
            AppDB.getTransactions(),
            AppDB.getRecurring(),
        ]);

        await updateBudgetUI(transactions, recurring);

        const period        = periodFilter?.value || 'current';
        const selectedMonth = monthPicker?.value  || '';
        const { income, expense, balance, filtered, recurringExpense } =
            calculateFinancials(transactions, recurring, period, selectedMonth);

        // Stats cards
        document.getElementById('total-income').textContent  = UI.formatMoney(income);
        document.getElementById('total-expense').textContent = UI.formatMoney(expense);
        document.getElementById('total-balance').textContent = UI.formatMoney(balance);

        // ── Recent activity (transactions + recurring this month) ──────────────
        const now = new Date();
        const currentMonthStr = now.toISOString().slice(0, 7);
        const recentList = document.getElementById('recent-list');
        if (recentList) {
            // 5 latest real transactions
            const sortedTx = [...transactions]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5);

            // Active recurring of this month as pseudo-entries
            const activeRec = recurring.filter(r => r.active);
            const recEntries = [];
            activeRec.forEach(r => {
                const amount = Number(r.amount);
                const start  = new Date((r.start_date || r.startDate) + 'T00:00:00');
                const target = new Date(currentMonthStr + '-01T00:00:00');
                let applies = false;
                if (r.type === 'subscription') {
                    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
                    applies = target >= startMonth;
                } else if (r.type === 'quota') {
                    const diff = (target.getFullYear() - start.getFullYear()) * 12
                               + (target.getMonth()    - start.getMonth());
                    applies = diff >= 0 && diff < (parseInt(r.quotas) || 0);
                }
                if (applies) {
                    recEntries.push({
                        detail: r.name,
                        date:   currentMonthStr + '-01',
                        amount,
                        type:   'expense',
                        category: r.type === 'subscription' ? 'Suscripción' : 'Cuota',
                        isRecurring: true,
                    });
                }
            });

            const allRecent = [...sortedTx, ...recEntries]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 7);

            if (!allRecent.length) {
                recentList.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-style:italic;padding:1rem;">No hay movimientos recientes</p>';
            } else {
                recentList.innerHTML = allRecent.map(t => `
                    <div class="transaction-item">
                        <div class="item-details">
                            <span class="detail">
                                ${t.isRecurring ? '<i class="fas fa-redo" style="font-size:0.75rem;opacity:0.6;margin-right:4px;"></i>' : ''}
                                ${t.detail}
                            </span>
                            <span class="date">${t.date} · ${t.category || 'General'}</span>
                        </div>
                        <span class="item-amount ${t.type === 'income' ? 'amount-income' : 'amount-expense'}">
                            ${t.type === 'income' ? '+' : '-'}${UI.formatMoney(t.amount)}
                        </span>
                    </div>
                `).join('');
            }
        }

        updateCharts(filtered, transactions, recurring, period, selectedMonth);
    };

    // ── Charts ────────────────────────────────────────────────────────────────
    const COLORS = ['#4B5320','#6B8E23','#8FBC8F','#556B2F','#A9BA9D','#2F4F4F','#BDB76B','#DAA520','#8B6914','#4a7c59'];

    const updateCharts = (filteredData, allTransactions, recurring, period, selectedMonth) => {
        const now = new Date();

        // ── 1. Expense donut - include recurring ──────────────────────────────
        const catTotals = {};
        filteredData.filter(t => t.type === 'expense').forEach(t => {
            catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
        });

        // Add recurring expenses to donut
        const currentMonthStr = now.toISOString().slice(0, 7);
        const activeRec = (recurring || []).filter(r => r.active);
        activeRec.forEach(r => {
            const amount = Number(r.amount);
            const start  = new Date((r.start_date || r.startDate) + 'T00:00:00');

            const applies = (targetMonth) => {
                const target = new Date(targetMonth + '-01T00:00:00');
                if (r.type === 'subscription') {
                    return target >= new Date(start.getFullYear(), start.getMonth(), 1);
                } else {
                    const diff = (target.getFullYear() - start.getFullYear()) * 12
                               + (target.getMonth()    - start.getMonth());
                    return diff >= 0 && diff < (parseInt(r.quotas) || 0);
                }
            };

            const label = r.name; // each recurring gets its own slice

            if (period === 'current' && applies(currentMonthStr)) {
                catTotals[label] = (catTotals[label] || 0) + amount;
            } else if (period === 'custom' && selectedMonth && applies(selectedMonth)) {
                catTotals[label] = (catTotals[label] || 0) + amount;
            } else if (period === 'annual') {
                for (let m = 0; m < 12; m++) {
                    const mStr = `${now.getFullYear()}-${String(m+1).padStart(2,'0')}`;
                    if (applies(mStr)) catTotals[label] = (catTotals[label] || 0) + amount;
                }
            }
        });

        const pieLabels = Object.keys(catTotals);
        const pieValues = Object.values(catTotals);

        const pieCtx = document.getElementById('expenseChart')?.getContext('2d');
        if (pieCtx) {
            if (expenseChart) {
                expenseChart.data.labels = pieLabels;
                expenseChart.data.datasets[0].data   = pieValues;
                expenseChart.data.datasets[0].backgroundColor = COLORS.slice(0, pieLabels.length);
                expenseChart.update();
            } else {
                expenseChart = new Chart(pieCtx, {
                    type: 'doughnut',
                    data: {
                        labels: pieLabels,
                        datasets: [{ data: pieValues, backgroundColor: COLORS, borderWidth: 2, borderColor: 'var(--card-bg)' }],
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'bottom', labels: { padding: 12, font: { size: 12 } } },
                            tooltip: {
                                callbacks: {
                                    label: ctx => ` ${ctx.label}: ${UI.formatMoney(ctx.raw)}`
                                }
                            }
                        }
                    },
                });
            }
        }

        // ── 2. Evolution bar chart (income vs expense per month) ──────────────
        // Build monthly stats from ALL transactions + recurring per month
        const allMonths = new Set();
        allTransactions.forEach(t => allMonths.add(t.date.slice(0, 7)));

        // Also add the last 6 months so chart isn't empty if no transactions
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            allMonths.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
        }

        const sortedMonths = [...allMonths].sort();
        const monthlyIncome  = {};
        const monthlyExpense = {};
        sortedMonths.forEach(m => { monthlyIncome[m] = 0; monthlyExpense[m] = 0; });

        allTransactions.forEach(t => {
            const m = t.date.slice(0, 7);
            if (t.type === 'income') monthlyIncome[m]  += Number(t.amount);
            else                     monthlyExpense[m] += Number(t.amount);
        });

        // Add recurring to each month's expense
        sortedMonths.forEach(m => {
            const mDate = new Date(m + '-01T00:00:00');
            activeRec.forEach(r => {
                const amount = Number(r.amount);
                const start  = new Date((r.start_date || r.startDate) + 'T00:00:00');
                if (r.type === 'subscription') {
                    if (mDate >= new Date(start.getFullYear(), start.getMonth(), 1)) {
                        monthlyExpense[m] += amount;
                    }
                } else {
                    const diff = (mDate.getFullYear() - start.getFullYear()) * 12
                               + (mDate.getMonth()    - start.getMonth());
                    if (diff >= 0 && diff < (parseInt(r.quotas) || 0)) {
                        monthlyExpense[m] += amount;
                    }
                }
            });
        });

        // Pretty month labels: "Jun 25"
        const monthLabels = sortedMonths.map(m => {
            const [y, mo] = m.split('-');
            return new Date(+y, +mo-1, 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
        });

        const lineCtx = document.getElementById('evolutionChart')?.getContext('2d');
        if (lineCtx) {
            if (evolutionChart) {
                evolutionChart.data.labels = monthLabels;
                evolutionChart.data.datasets[0].data = sortedMonths.map(m => monthlyIncome[m]);
                evolutionChart.data.datasets[1].data = sortedMonths.map(m => monthlyExpense[m]);
                evolutionChart.update();
            } else {
                evolutionChart = new Chart(lineCtx, {
                    type: 'bar',
                    data: {
                        labels: monthLabels,
                        datasets: [
                            {
                                label: 'Ingresos',
                                data: sortedMonths.map(m => monthlyIncome[m]),
                                backgroundColor: 'rgba(46,125,50,0.75)',
                                borderColor: '#2e7d32',
                                borderWidth: 1,
                                borderRadius: 4,
                            },
                            {
                                label: 'Egresos',
                                data: sortedMonths.map(m => monthlyExpense[m]),
                                backgroundColor: 'rgba(198,40,40,0.75)',
                                borderColor: '#c62828',
                                borderWidth: 1,
                                borderRadius: 4,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        interaction: { mode: 'index', intersect: false },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: v => UI.formatMoney(v),
                                },
                            },
                        },
                        plugins: {
                            legend: { position: 'bottom' },
                            tooltip: {
                                callbacks: {
                                    label: ctx => ` ${ctx.dataset.label}: ${UI.formatMoney(ctx.raw)}`
                                }
                            }
                        },
                    },
                });
            }
        }
    };

    // ── Initial load ──────────────────────────────────────────────────────────
    await Promise.all([updateDashboard(), updateRecurringDropdown()]);
});
