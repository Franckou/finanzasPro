/**
 * Supabase Client & App Services
 * Replaces localStorage with Supabase auth + database
 * NOTE: window.Storage was renamed to AppDB to avoid collision with native browser Storage API
 */

// ⚠️ CONFIGURACIÓN: Reemplazá SUPABASE_ANON_KEY con tu clave anon real.
// La encontrás en: Supabase Dashboard → Project Settings → API → "anon public"
const SUPABASE_URL = 'https://hqdrqxgpzxjzcwrphbrd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZHJxeGdwenhqemN3cnBoYnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3ODg1OTIsImV4cCI6MjA5NjM2NDU5Mn0.Dprg6GrZ9Rzw1MKZ9OgiXd7G2Cz7EPieEE2XiDC-dUY'; // <-- Reemplazar

// Load Supabase from CDN
let _supabase = null;

async function getSupabase() {
    if (_supabase) return _supabase;
    // Wait for supabase to be available from CDN script
    if (typeof window.supabase !== 'undefined') {
        _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return _supabase;
    }
    throw new Error('Supabase SDK not loaded');
}

// ─── Auth Service ───────────────────────────────────────────────────────────
window.Auth = {
    _client: null,

    async client() {
        if (!this._client) this._client = await getSupabase();
        return this._client;
    },

    async getSession() {
        const sb = await this.client();
        const { data } = await sb.auth.getSession();
        return data.session;
    },

    async getUser() {
        const session = await this.getSession();
        return session?.user || null;
    },

    async isAuthenticated() {
        const user = await this.getUser();
        return !!user;
    },

    async protect() {
        const authenticated = await this.isAuthenticated();
        if (!authenticated) {
            window.location.href = 'login.html';
        }
    },

    async signUp(email, password) {
        const sb = await this.client();
        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/login.html`
            }
        });
        if (error) throw error;
        return data;
    },

    async login(email, password) {
        const sb = await this.client();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    async logout() {
        const sb = await this.client();
        await sb.auth.signOut();
        window.location.href = 'login.html';
    },

    onAuthChange(callback) {
        getSupabase().then(sb => {
            sb.auth.onAuthStateChange((event, session) => {
                callback(event, session);
            });
        });
    }
};

// ─── Database Service ────────────────────────────────────────────────────────
// Renamed from window.Storage to window.AppDB to avoid collision with native Storage API
window.AppDB = {
    _client: null,

    async client() {
        if (!this._client) this._client = await getSupabase();
        return this._client;
    },

    async getUserId() {
        const user = await Auth.getUser();
        return user?.id || null;
    },

    // ── Transactions ──────────────────────────────────────────────────────────
    async getTransactions() {
        const sb = await this.client();
        const { data, error } = await sb
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });
        if (error) { console.error('getTransactions:', error); return []; }
        return data || [];
    },

    async saveTransaction(transaction) {
        const sb = await this.client();
        const userId = await this.getUserId();
        const payload = {
            user_id: userId,
            type: transaction.type,
            category: transaction.category,
            amount: parseFloat(transaction.amount),
            date: transaction.date,
            detail: transaction.detail
        };
        const { data, error } = await sb.from('transactions').insert(payload).select().single();
        if (error) throw error;
        return data;
    },

    async updateTransaction(id, updatedData) {
        const sb = await this.client();
        const payload = {
            type: updatedData.type,
            category: updatedData.category,
            amount: parseFloat(updatedData.amount),
            date: updatedData.date,
            detail: updatedData.detail
        };
        const { error } = await sb.from('transactions').update(payload).eq('id', id);
        if (error) throw error;
        return true;
    },

    async deleteTransaction(id) {
        const sb = await this.client();
        const { error } = await sb.from('transactions').delete().eq('id', id);
        if (error) throw error;
    },

    // ── Recurring Payments ────────────────────────────────────────────────────
    async getRecurring() {
        const sb = await this.client();
        const { data, error } = await sb
            .from('recurring_payments')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) { console.error('getRecurring:', error); return []; }
        return data || [];
    },

    async saveRecurring(item) {
        const sb = await this.client();
        const userId = await this.getUserId();
        const payload = {
            user_id: userId,
            name: item.name,
            amount: parseFloat(item.amount),
            type: item.type,
            quotas: item.quotas ? parseInt(item.quotas) : null,
            start_date: item.startDate,
            active: true
        };
        const { data, error } = await sb.from('recurring_payments').insert(payload).select().single();
        if (error) throw error;
        return data;
    },

    async updateRecurring(id, updatedData) {
        const sb = await this.client();
        const payload = {};
        if (updatedData.name !== undefined) payload.name = updatedData.name;
        if (updatedData.amount !== undefined) payload.amount = parseFloat(updatedData.amount);
        if (updatedData.type !== undefined) payload.type = updatedData.type;
        if (updatedData.quotas !== undefined) payload.quotas = updatedData.quotas ? parseInt(updatedData.quotas) : null;
        if (updatedData.startDate !== undefined) payload.start_date = updatedData.startDate;
        if (updatedData.active !== undefined) payload.active = updatedData.active;
        const { error } = await sb.from('recurring_payments').update(payload).eq('id', id);
        if (error) throw error;
        return true;
    },

    async deleteRecurring(id) {
        const sb = await this.client();
        const { error } = await sb.from('recurring_payments').delete().eq('id', id);
        if (error) throw error;
    },

    // ── Budget ────────────────────────────────────────────────────────────────
    async getBudget() {
        const sb = await this.client();
        const userId = await this.getUserId();
        const { data } = await sb.from('user_settings').select('budget').eq('user_id', userId).single();
        return data?.budget || 0;
    },

    async saveBudget(amount) {
        const sb = await this.client();
        const userId = await this.getUserId();
        await sb.from('user_settings').upsert({ user_id: userId, budget: amount }, { onConflict: 'user_id' });
    },

    // ── Theme (local only, no auth needed) ───────────────────────────────────
    saveTheme(theme) {
        localStorage.setItem('finanzas_pro_theme', theme);
    },

    getTheme() {
        return localStorage.getItem('finanzas_pro_theme') || 'light';
    },

    // ── Export ────────────────────────────────────────────────────────────────
    async exportJSON() {
        const data = await this.getTransactions();
        return JSON.stringify(data, null, 2);
    },

    // ── Categories ────────────────────────────────────────────────────────────
    getCategories(type) {
        const categories = {
            income: ['Sueldo', 'Ventas', 'Inversiones', 'Regalos', 'Otros'],
            expense: ['Alimentación', 'Transporte', 'Vivienda', 'Salud', 'Ocio', 'Servicios', 'Otros']
        };
        return categories[type] || [];
    }
};
