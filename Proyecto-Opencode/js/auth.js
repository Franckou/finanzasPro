/**
 * Auth Service
 * Handles user sessions and mock authentication
 */
window.Auth = window.Auth || {
    // Mock credentials for testing
    MOCK_USER: 'admin',
    MOCK_PASS: 'admin123',

    // Check if user is logged in
    isAuthenticated() {
        return !!localStorage.getItem('finanzas_pro_user');
    },

    // Get current user ID
    getUserId() {
        return localStorage.getItem('finanzas_pro_user');
    },

    // Login user
    login(username, password) {
        if (username === this.MOCK_USER && password === this.MOCK_PASS) {
            localStorage.setItem('finanzas_pro_user', username);
            return true;
        }
        return false;
    },

    // Logout user
    logout() {
        localStorage.removeItem('finanzas_pro_user');
        window.location.href = 'login.html';
    },

    // Middleware to protect routes
    protect() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
        }
    }
};

// Handle login form submission
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        const errorEl = document.getElementById('auth-error');

        if (Auth.login(user, pass)) {
            window.location.href = 'index.html';
        } else {
            errorEl.style.display = 'block';
        }
    });
}