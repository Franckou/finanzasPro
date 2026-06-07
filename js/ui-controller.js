/**
 * UI Controller - Sidebar, Dropdowns, Theme
 */
const UIController = {
    init() {
        this.setupSidebar();
        this.setupDropdowns();
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.innerHTML = theme === 'light'
                ? '<i class="fas fa-moon"></i> <span>Modo Oscuro</span>'
                : '<i class="fas fa-sun"></i> <span>Modo Claro</span>';
        }
        AppDB.saveTheme(theme);
    },

    setupSidebar() {
        const openBtn = document.getElementById('open-sidebar');
        const closeBtn = document.getElementById('close-sidebar');
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        if (openBtn) {
            openBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.add('show');
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => sidebar.classList.remove('show'));
        }
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024 && !sidebar.contains(e.target) && (!openBtn || !openBtn.contains(e.target))) {
                sidebar.classList.remove('show');
            }
        });
    },

    setupDropdowns() {
        document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = toggle.nextElementSibling;
                document.querySelectorAll('.dropdown-menu').forEach(m => { if (m !== menu) m.classList.remove('show'); });
                menu.classList.toggle('show');
            });
        });
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
        });
    }
};

document.addEventListener('DOMContentLoaded', () => UIController.init());
