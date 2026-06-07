/**
 * UI Controller
 * Handles sidebar, dropdowns and shared UI interactions
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
            themeBtn.innerHTML = theme === 'light' ? '<i class="fas fa-moon"></i> <span>Modo Oscuro</span>' : '<i class="fas fa-sun"></i> <span>Modo Claro</span>';
        }
        Storage.saveTheme(theme);
    },

    setupSidebar() {
        const openBtn = document.getElementById('open-sidebar');
        const closeBtn = document.getElementById('close-sidebar');
        const sidebar = document.getElementById('sidebar');

        // Validación defensiva
        if (!sidebar) {
            console.warn("Sidebar element not found");
            return;
        }

        if (openBtn) {
            openBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Evita que el click llegue al document inmediatamente
                sidebar.classList.add('show');
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                sidebar.classList.remove('show');
            });
        }

        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            const isClickInsideSidebar = sidebar.contains(e.target);
            const isClickOnOpenBtn = openBtn && openBtn.contains(e.target);

            if (window.innerWidth <= 1024 && !isClickInsideSidebar && !isClickOnOpenBtn) {
                sidebar.classList.remove('show');
            }
    });
},

    setupDropdowns() {
        const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
        
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = toggle.nextElementSibling;
                
                // Close other dropdowns
                document.querySelectorAll('.dropdown-menu').forEach(m => {
                    if (m !== menu) m.classList.remove('show');
                });
                
                menu.classList.toggle('show');
            });
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-menu').forEach(m => {
                m.classList.remove('show');
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', () => UIController.init());