document.addEventListener('DOMContentLoaded', () => {
    // Protect Route
    Auth.protect();

    // DOM Elements
    const themeToggle = document.getElementById('theme-toggle');
    const btnLogout = document.getElementById('btn-logout');
    const btnAddRecurring = document.getElementById('btn-add-recurring');
    const btnAddRecurringSidebar = document.getElementById('btn-add-recurring-sidebar');
    const modalRecurring = document.getElementById('modal-recurring');
    const closeModalRec = document.querySelector('.close-modal-rec');
    const recurringForm = document.getElementById('recurring-form');
    const recTypeSelect = document.getElementById('rec-type');
    const quotaCountGroup = document.getElementById('quota-count-group');
    const recurringBody = document.getElementById('recurring-body');

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

    // --- Rendering ---
    const renderRecurring = () => {
        if (!recurringBody) return;
        const items = Storage.getRecurring();
        recurringBody.innerHTML = '';

        if (items.length === 0) {
            recurringBody.innerHTML = '<tr><td colspan="6" style="text-align:center">No hay pagos recurrentes configurados</td></tr>';
            return;
        }

        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>$${item.amount.toFixed(2)}</td>
                <td>${item.type === 'subscription' ? 'Suscripción' : 'Cuota (' + item.quotas + ')'}</td>
                <td>${item.startDate}</td>
                <td><span class="badge ${item.active ? 'badge-income' : 'badge-expense'}">${item.active ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                    <button class="btn-edit" onclick="openEditRecurring('${item.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteRecurring('${item.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            recurringBody.appendChild(row);
        });
    };

    // --- Modal Logic ---
    const openAddRecurringModal = () => {
        if (!modalRecurring) return;
        document.getElementById('modal-title').textContent = 'Nueva Suscripción / Cuota';
        recurringForm.reset();
        document.getElementById('rec-id').value = '';
        document.getElementById('rec-start-date').valueAsDate = new Date();
        
        if (recTypeSelect) {
            recTypeSelect.value = 'subscription';
        }
        if (quotaCountGroup) {
            quotaCountGroup.classList.add('hidden');
        }
        
        modalRecurring.classList.add('show');
    };

    if (btnAddRecurring) btnAddRecurring.addEventListener('click', openAddRecurringModal);
    if (btnAddRecurringSidebar) btnAddRecurringSidebar.addEventListener('click', openAddRecurringModal);

    if (closeModalRec) {
        closeModalRec.addEventListener('click', () => {
            if (modalRecurring) modalRecurring.classList.remove('show');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modalRecurring) {
            if (modalRecurring) modalRecurring.classList.remove('show');
        }
    });

    if (recTypeSelect) {
        recTypeSelect.addEventListener('change', () => {
            quotaCountGroup.classList.toggle('hidden', recTypeSelect.value !== 'quota');
        });
    }

    // --- CRUD Operations ---
    if (recurringForm) {
        recurringForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = document.getElementById('rec-id').value;
            const data = {
                name: document.getElementById('rec-name').value,
                amount: document.getElementById('rec-amount').value,
                type: recTypeSelect.value,
                quotas: document.getElementById('rec-quotas').value || null,
                startDate: document.getElementById('rec-start-date').value,
                active: document.getElementById('rec-active').value === 'true'
            };

            if (id) {
                Storage.updateRecurring(id, data);
                await UI.alert('Pago recurrente actualizado');
            } else {
                Storage.saveRecurring(data);
                await UI.alert('Pago recurrente guardado');
            }

            if (modalRecurring) modalRecurring.classList.remove('show');
            renderRecurring();
        });
    }

    window.openEditRecurring = (id) => {
        if (!modalRecurring) return;
        const items = Storage.getRecurring();
        const item = items.find(i => i.id === id);
        if (!item) return;

        document.getElementById('modal-title').textContent = 'Editar Pago Recurrente';
        document.getElementById('rec-id').value = item.id;
        document.getElementById('rec-name').value = item.name;
        document.getElementById('rec-amount').value = item.amount;
        document.getElementById('rec-type').value = item.type;
        document.getElementById('rec-quotas').value = item.quotas || '';
        document.getElementById('rec-start-date').value = item.startDate;
        document.getElementById('rec-active').value = item.active.toString();

        if (quotaCountGroup) {
            quotaCountGroup.classList.toggle('hidden', item.type !== 'quota');
        }

        modalRecurring.classList.add('show');
    };

    window.deleteRecurring = async (id) => {
        const confirmed = await UI.confirm('¿Estás seguro de que deseas eliminar este pago recurrente?');
        if (confirmed) {
            Storage.deleteRecurring(id);
            renderRecurring();
            await UI.alert('Eliminado correctamente');
        }
    };

    renderRecurring();
});
