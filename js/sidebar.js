/**
 * sidebar.js - Shared sidebar HTML injected into every page
 * Each page sets data-page="dashboard|history|recurring" on <body>
 */
(function() {
    const page = document.body.dataset.page || '';

    const nav = [
        { href: 'index.html',     icon: 'fa-chart-pie',  label: 'Dashboard',    key: 'dashboard'  },
        { href: 'history.html',   icon: 'fa-history',    label: 'Historial',    key: 'history'    },
        { href: 'recurring.html', icon: 'fa-redo',       label: 'Recurrentes',  key: 'recurring'  },
    ];

    const navItems = nav.map(n =>
        `<li><a href="${n.href}" ${page === n.key ? 'class="active"' : ''}>
            <i class="fas ${n.icon}"></i> ${n.label}
        </a></li>`
    ).join('');

    const sidebarHTML = `
    <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <h1 class="logo">Finanzas<span>Pro</span></h1>
            <button id="close-sidebar" class="btn-icon mobile-only"><i class="fas fa-times"></i></button>
        </div>
        <nav class="sidebar-nav">
            <ul>${navItems}</ul>
        </nav>
        <div class="sidebar-footer">
            <button id="theme-toggle" class="btn-theme"><i class="fas fa-moon"></i> <span>Modo Oscuro</span></button>
            <button id="btn-logout" class="btn-theme" style="background-color:var(--expense-color);opacity:0.9;">
                <i class="fas fa-sign-out-alt"></i> <span>Cerrar Sesión</span>
            </button>
            <button id="btn-add-recurring-sidebar" class="btn-primary-small">
                <i class="fas fa-plus-circle"></i> Suscripciones/Cuotas
            </button>
        </div>
    </aside>`;

    // Inject at start of body
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
})();
