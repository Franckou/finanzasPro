/**
 * Storage Service
 * Simulates a JSON database using localStorage
 */
window.Storage = window.Storage || {
    // Get the current user ID or fallback to a guest
    getUserId() {
        return localStorage.getItem('finanzas_pro_user') || 'guest';
    },

    // Generate a user-specific key for a given data type
    getKey(type) {
        return `finanzas_pro_${this.getUserId()}_${type}`;
    },

    // Initialize data if not exists
    init() {
        const key = this.getKey('db');
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify([]));
        }
    },

    // Get all transactions
    getTransactions() {
        const data = localStorage.getItem(this.getKey('db'));
        return JSON.parse(data) || [];
    },

    // Save a new transaction
    saveTransaction(transaction) {
        const transactions = this.getTransactions();
        const newTransaction = {
            id: Date.now().toString(),
            ...transaction,
            amount: parseFloat(transaction.amount)
        };
        transactions.push(newTransaction);
        localStorage.setItem(this.getKey('db'), JSON.stringify(transactions));
        return newTransaction;
    },

    // Update an existing transaction
    updateTransaction(id, updatedData) {
        const transactions = this.getTransactions();
        const index = transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            transactions[index] = { 
                ...transactions[index], 
                ...updatedData, 
                amount: parseFloat(updatedData.amount) 
            };
            localStorage.setItem(this.getKey('db'), JSON.stringify(transactions));
            return true;
        }
        return false;
    },

    // Delete a transaction
    deleteTransaction(id) {
        const transactions = this.getTransactions().filter(t => t.id !== id);
        localStorage.setItem(this.getKey('db'), JSON.stringify(transactions));
    },

    // --- Recurring Payments Storage ---
    getRecurring() {
        const data = localStorage.getItem(this.getKey('recurring'));
        return JSON.parse(data) || [];
    },

    saveRecurring(item) {
        const recurring = this.getRecurring();
        const newItem = {
            id: Date.now().toString(),
            active: true,
            ...item,
            amount: parseFloat(item.amount)
        };
        recurring.push(newItem);
        localStorage.setItem(this.getKey('recurring'), JSON.stringify(recurring));
        return newItem;
    },

    updateRecurring(id, updatedData) {
        const recurring = this.getRecurring();
        const index = recurring.findIndex(r => r.id === id);
        if (index !== -1) {
            recurring[index] = { ...recurring[index], ...updatedData };
            localStorage.setItem(this.getKey('recurring'), JSON.stringify(recurring));
            return true;
        }
        return false;
    },

    deleteRecurring(id) {
        const recurring = this.getRecurring().filter(r => r.id !== id);
        localStorage.setItem(this.getKey('recurring'), JSON.stringify(recurring));
    },

    // Theme Management (Global)
    saveTheme(theme) {
        localStorage.setItem('finanzas_pro_theme', theme);
    },

    getTheme() {
        return localStorage.getItem('finanzas_pro_theme') || 'light';
    },

    saveBudget(amount) {
        localStorage.setItem(`finanzas_pro_budget_${this.getUserId()}`, amount);
    },

    getBudget() {
        return parseFloat(localStorage.getItem(`finanzas_pro_budget_${this.getUserId()}`)) || 0;
    },

    exportJSON() {
        const data = this.getTransactions();
        return JSON.stringify(data, null, 2);
    },

    // Category Definitions
    getCategories(type) {
        const categories = {
            income: ['Sueldo', 'Ventas', 'Inversiones', 'Regalos', 'Otros'],
            expense: ['Alimentación', 'Transporte', 'Vivienda', 'Salud', 'Ocio', 'Servicios', 'Otros']
        };
        return categories[type] || [];
    }
};

// Initialize DB on load
Storage.init();
