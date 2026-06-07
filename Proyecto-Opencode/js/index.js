document.addEventListener('DOMContentLoaded', () => {
    // Protect Route
    Auth.protect();

    // DOM Elements
    const themeToggle = document.getElementById('theme-toggle');
    const btnLogout = document.getElementById('btn-logout');
    const btnAddTransaction = document.getElementById('btn-add-transaction');
    const modalTransaction = document.getElementById('modal-transaction');
    const closeModal = document.querySelector('.close-modal');
    const transactionForm = document.getElementById('transaction-form');
    const periodFilter = document.getElementById('period-filter');
    const monthPicker = document.getElementById('month-picker');
    
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const totalBalanceEl = document.getElementById('total-balance');
    const recentListEl = document.getElementById('recent-list');

    const budgetAmountInput = document.getElementById('budget-amount');
    const btnSaveBudget = document.getElementById('btn-save-budget');
    const budgetProgressFill = document.getElementById('budget-progress-fill');
    const budgetPercentageEl = document.getElementById('budget-percentage');
    const btnExportJson = document.getElementById('btn-export-json');

    const typeSelect = document.getElementById('type');
    const categorySelect = document.getElementById('category');

    // Recurring Elements
    const btnAddRecurring = document.getElementById('btn-add-recurring');
    const btnAddRecurringSidebar = document.getElementById('btn-add-recurring-sidebar');
    const modalRecurring = document.getElementById('modal-recurring');
    const closeModalRec = document.querySelector('.close-modal-rec');
    const recurringForm = document.getElementById('recurring-form');
    const recTypeSelect = document.getElementById('rec-type');
    const quotaCountGroup = document.getElementById('quota-count-group');
    const recurringDropdownContent = document.querySelector('.dropdown-content');

    let expenseChart = null;
    let evolutionChart = null;

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
        btnLogout.addEventListener('click', () => Auth.logout());
    }

    // --- Recurring Payments Logic ---
    const openRecurringModal = () => {
        if (modalRecurring) {
            modalRecurring.classList.add('show');
            const startDateInput = document.getElementById('rec-start-date');
            if (startDateInput) startDateInput.valueAsDate = new Date();
        }
    };

    if (btnAddRecurring) btnAddRecurring.addEventListener('click', openRecurringModal);
    if (btnAddRecurringSidebar) btnAddRecurringSidebar.addEventListener('click', openRecurringModal);

    if (closeModalRec) {
        closeModalRec.addEventListener('click', () => {
            if (modalRecurring) modalRecurring.classList.remove('show');
        });
    }

    if (recTypeSelect) {
        recTypeSelect.addEventListener('change', () => {
            quotaCountGroup.classList.toggle('hidden', recTypeSelect.value !== 'quota');
        });
    }

    if (recurringForm) {
        recurringForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const recItem = {
                name: document.getElementById('rec-name').value,
                amount: document.getElementById('rec-amount').value,
                type: recTypeSelect.value,
                quotas: document.getElementById('rec-quotas').value || null,
                startDate: document.getElementById('rec-start-date').value
            };
            Storage.saveRecurring(recItem);
            recurringForm.reset();
            if (modalRecurring) modalRecurring.classList.remove('show');
            updateRecurringDropdown();
            updateDashboard();
            await UI.alert('Suscripción guardada correctamente');
        });
    }

    const updateRecurringDropdown = () => {
        if (!recurringDropdownContent) return;
        const recurring = Storage.getRecurring();
        recurringDropdownContent.innerHTML = '';

        if (recurring.length === 0) {
            recurringDropdownContent.innerHTML = '<p class="empty-msg">No hay suscripciones</p>';
            return;
        }

        recurring.forEach(item => {
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            div.innerHTML = `
                <span>${item.name} ($${item.amount.toFixed(2)})</span>
                <input type="checkbox" ${item.active ? 'checked' : ''} onchange="toggleRecurring('${item.id}')">
            `;
            recurringDropdownContent.appendChild(div);
        });
    };

    window.toggleRecurring = (id) => {
        const recurring = Storage.getRecurring();
        const item = recurring.find(r => r.id === id);
        if (item) {
            Storage.updateRecurring(id, { active: !item.active });
            updateRecurringDropdown();
            updateDashboard();
        }
    };

    // --- Dynamic Categories Logic ---
    const updateCategories = () => {
        if (!typeSelect || !categorySelect) return;
        const type = typeSelect.value;
        const categories = Storage.getCategories(type);
        
        categorySelect.innerHTML = '';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
    };

    if (typeSelect) typeSelect.addEventListener('change', updateCategories);

    // --- Budget Logic ---
    const updateBudgetUI = () => {
        if (!budgetAmountInput || !budgetProgressFill || !budgetPercentageEl) return;
        const budget = Storage.getBudget();
        budgetAmountInput.value = budget;
        
        const transactions = Storage.getTransactions();
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);
        
        const currentMonthExpenses = transactions
            .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
            .reduce((sum, t) => sum + t.amount, 0);

        if (budget > 0) {
            const percentage = Math.min((currentMonthExpenses / budget) * 100, 100);
            budgetProgressFill.style.width = `${percentage}%`;
            budgetPercentageEl.textContent = `${Math.round((currentMonthExpenses / budget) * 100)}% utilizado`;
            
            if (percentage >= 100) budgetProgressFill.style.backgroundColor = 'var(--expense-color)';
            else if (percentage >= 80) budgetProgressFill.style.backgroundColor = '#ffc107';
            else budgetProgressFill.style.backgroundColor = 'var(--primary-color)';
        } else {
            budgetProgressFill.style.width = '0%';
            budgetPercentageEl.textContent = 'Sin presupuesto';
        }
    };

    if (btnSaveBudget) {
        btnSaveBudget.addEventListener('click', async () => {
            const amount = parseFloat(budgetAmountInput.value);
            if (amount > 0) {
                Storage.saveBudget(amount);
                updateBudgetUI();
                updateDashboard();
                await UI.alert('Presupuesto actualizado');
            }
        });
    }

    if (btnExportJson) {
        btnExportJson.addEventListener('click', () => {
            const data = Storage.exportJSON();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `finanzas_pro_backup_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // --- Modal Logic ---
    if (btnAddTransaction) {
        btnAddTransaction.addEventListener('click', () => {
            if (modalTransaction) {
                modalTransaction.classList.add('show');
                const dateInput = document.getElementById('date');
                if (dateInput) dateInput.valueAsDate = new Date();
            }
            updateCategories();
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (modalTransaction) modalTransaction.classList.remove('show');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modalTransaction) modalTransaction.classList.remove('show');
        if (e.target === modalRecurring) modalRecurring.classList.remove('show');
    });

    // --- Transaction Logic ---
    if (transactionForm) {
        transactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const transaction = {
                type: document.getElementById('type').value,
                category: document.getElementById('category').value,
                amount: document.getElementById('amount').value,
                date: document.getElementById('date').value,
                detail: document.getElementById('detail').value
            };

            Storage.saveTransaction(transaction);
            transactionForm.reset();
            if (modalTransaction) modalTransaction.classList.remove('show');
            updateDashboard();
            await UI.alert('Movimiento guardado correctamente');
        });
    }

    // --- Dashboard Logic ---
    const getDashboardData = () => {
        return {
            transactions: Storage.getTransactions(),
            recurring: Storage.getRecurring().filter(r => r.active)
        };
    };

    const calculateFinancials = (data, period, selectedMonth) => {
        const { transactions, recurring } = data;
        const now = new Date();
        const currentMonthStr = now.toISOString().slice(0, 7);
        
        let targetMonth = currentMonthStr;
        if (period === 'custom' && selectedMonth) targetMonth = selectedMonth;
        else if (period === 'annual') targetMonth = currentMonthStr.slice(0, 4);

        let recurringTotal = 0;
        recurring.forEach(r => {
            if (r.type === 'subscription') {
                if (period === 'annual') {
                    const start = new Date(r.startDate);
                    const current = new Date();
                    const monthsDiff = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth()) + 1;
                    if (monthsDiff > 0) recurringTotal += r.amount * Math.min(monthsDiff, 12);
                } else {
                    recurringTotal += r.amount;
                }
            } else if (r.type === 'quota') {
                const start = new Date(r.startDate);
                const totalQuotas = parseInt(r.quotas);
                if (period === 'annual') {
                    const currentYear = now.getFullYear();
                    for(let i=0; i<totalQuotas; i++) {
                        const qDate = new Date(start);
                        qDate.setMonth(start.getMonth() + i);
                        if(qDate.getFullYear() === currentYear) recurringTotal += r.amount;
                    }
                } else {
                    const targetDate = new Date(targetMonth + '-01');
                    const diffMonths = (targetDate.getFullYear() - start.getFullYear()) * 12 + (targetDate.getMonth() - start.getMonth());
                    if (diffMonths >= 0 && diffMonths < totalQuotas) {
                        recurringTotal += r.amount;
                    }
                }
            }
        });

        let filtered = transactions;
        if (period === 'current') {
            filtered = transactions.filter(t => t.date.startsWith(currentMonthStr));
        } else if (period === 'custom' && selectedMonth) {
            filtered = transactions.filter(t => t.date.startsWith(selectedMonth));
        } else if (period === 'annual') {
            const currentYear = now.getFullYear().toString();
            filtered = transactions.filter(t => t.date.startsWith(currentYear));
        }

        let income = 0;
        let expense = 0;
        filtered.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
        });

        return {
            income,
            expense: expense + recurringTotal,
            balance: income - (expense + recurringTotal),
            filteredTransactions: filtered
        };
    };

    const renderDashboardUI = (financials) => {
        if (totalIncomeEl) totalIncomeEl.textContent = `$${financials.income.toFixed(2)}`;
        if (totalExpenseEl) totalExpenseEl.textContent = `$${financials.expense.toFixed(2)}`;
        if (totalBalanceEl) totalBalanceEl.textContent = `$${financials.balance.toFixed(2)}`;

        const allTransactions = Storage.getTransactions();
        const sorted = [...allTransactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        
        if (recentListEl) {
            recentListEl.innerHTML = '';
            if (sorted.length === 0) {
                recentListEl.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-style: italic; padding: 1rem;">No hay movimientos recientes para mostrar</p>';
            } else {
                sorted.forEach(t => {
                    const item = document.createElement('div');
                    item.className = 'transaction-item';
                    item.innerHTML = `
                        <div class="item-details">
                            <span class="detail">${t.detail}</span>
                            <span class="date">${t.date}</span>
                        </div>
                        <span class="item-amount ${t.type === 'income' ? 'amount-income' : 'amount-expense'}">
                            ${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}
                        </span>
                    `;
                    recentListEl.appendChild(item);
                });
            }
        }
    };

    const updateDashboard = () => {
        updateBudgetUI();
        const data = getDashboardData();
        const financials = calculateFinancials(data, periodFilter.value, monthPicker.value);
        renderDashboardUI(financials);
        updateCharts(financials.filteredTransactions);
    };

    if (periodFilter) {
        periodFilter.addEventListener('change', () => {
            if (periodFilter.value === 'custom') {
                if (monthPicker) monthPicker.classList.remove('hidden');
            } else {
                if (monthPicker) monthPicker.classList.add('hidden');
            }
            updateDashboard();
        });
    }

    if (monthPicker) monthPicker.addEventListener('change', updateDashboard);

    const updateCharts = (data) => {
        const expenseData = data.filter(t => t.type === 'expense');
        const categoryTotals = {};
        expenseData.forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });

        const pieLabels = Object.keys(categoryTotals);
        const pieValues = Object.values(categoryTotals);

        if (expenseChart) {
            expenseChart.data.labels = pieLabels;
            expenseChart.data.datasets[0].data = pieValues;
            expenseChart.update();
        } else {
            const pieCtx = document.getElementById('expenseChart')?.getContext('2d');
            if (pieCtx) {
                expenseChart = new Chart(pieCtx, {
                    type: 'doughnut',
                    data: {
                        labels: pieLabels,
                        datasets: [{
                            data: pieValues,
                            backgroundColor: [
                                '#4B5320', '#6B8E23', '#8FBC8F', '#556B2F', '#A9BA9D', '#2F4F4F', '#BDB76B', '#DAA520'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'bottom' }
                        }
                    }
                });
            }
        }

        const allTransactions = Storage.getTransactions();
        const monthlyStats = {};
        allTransactions.forEach(t => {
            const month = t.date.slice(0, 7);
            if (!monthlyStats[month]) monthlyStats[month] = { income: 0, expense: 0 };
            if (t.type === 'income') monthlyStats[month].income += t.amount;
            else monthlyStats[month].expense += t.amount;
        });

        const sortedMonths = Object.keys(monthlyStats).sort();
        const incomeLine = sortedMonths.map(m => monthlyStats[m].income);
        const expenseLine = sortedMonths.map(m => monthlyStats[m].expense);

        if (evolutionChart) {
            evolutionChart.data.labels = sortedMonths;
            evolutionChart.data.datasets[0].data = incomeLine;
            evolutionChart.data.datasets[1].data = expenseLine;
            evolutionChart.update();
        } else {
            const lineCtx = document.getElementById('evolutionChart')?.getContext('2d');
            if (lineCtx) {
                evolutionChart = new Chart(lineCtx, {
                    type: 'line',
                    data: {
                        labels: sortedMonths,
                        datasets: [
                            {
                                label: 'Ingresos',
                                data: incomeLine,
                                borderColor: '#2e7d32',
                                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                                fill: true,
                                tension: 0.3
                            },
                            {
                                label: 'Egresos',
                                data: expenseLine,
                                borderColor: '#c62828',
                                backgroundColor: 'rgba(198, 40, 40, 0.1)',
                                fill: true,
                                tension: 0.3
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: { beginAtZero: true }
                        },
                        plugins: {
                            legend: { position: 'bottom' }
                        }
                    }
                });
            }
        }
    };

    // Initial load
    updateBudgetUI();
    updateDashboard();
    updateRecurringDropdown();
});