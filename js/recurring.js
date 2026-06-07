document.addEventListener('DOMContentLoaded', async () => {
    await Auth.protect();
    UIController.applyTheme(AppDB.getTheme());

    // ── Theme & Auth ──────────────────────────────────────────────────────────
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        const current = AppDB.getTheme();
        UIController.applyTheme(current === 'light' ? 'dark' : 'light');
    });
    document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

    // ── Modal helpers ─────────────────────────────────────────────────────────
    const modal = document.getElementById('modal-recurring');
    const recTypeSelect = document.getElementById('rec-type');
    const quotaGroup = document.getElementById('quota-count-group');
    const activeGroup = document.getElementById('active-group');

    const openAddModal = () => {
        document.getElementById('modal-title').textContent = 'Nueva Suscripción / Cuota';
        document.getElementById('recurring-form').reset();
        document.getElementById('rec-id').value = '';
        document.getElementById('rec-start-date').valueAsDate = new Date();
        quotaGroup.classList.add('hidden');
        activeGroup.style.display = 'none';
        modal.classList.add('show');
    };

    document.getElementById('btn-add-recurring')?.addEventListener('click', openAddModal);
    document.getElementById('btn-add-recurring-sidebar')?.addEventListener('click', openAddModal);
    document.getElementById('close-modal-rec')?.addEventListener('click', () => modal.classList.remove('show'));
    window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });

    recTypeSelect?.addEventListener('change', () => {
        quotaGroup.classList.toggle('hidden', recTypeSelect.value !== 'quota');
    });

    // ── Render ────────────────────────────────────────────────────────────────
    const renderRecurring = async () => {
        const body = document.getElementById('recurring-body');
        if (!body) return;
        try {
            const items = await AppDB.getRecurring();
            if (items.length === 0) {
                body.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted); font-style:italic;">No hay pagos recurrentes configurados</td></tr>';
                return;
            }
            body.innerHTML = items.map(item => `
                <tr>
                    <td><strong>${item.name}</strong></td>
                    <td>$${Number(item.amount).toFixed(2)}/mes</td>
                    <td>${item.type === 'subscription' ? '<span class="badge badge-income">Suscripción</span>' : `<span class="badge" style="background:#6B8E23;color:white;">Cuota (${item.quotas})</span>`}</td>
                    <td>${item.start_date || item.startDate || '—'}</td>
                    <td><span class="badge ${item.active ? 'badge-income' : 'badge-expense'}">${item.active ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                        <button class="btn-edit" onclick="openEditRecurring('${item.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete" onclick="deleteRecurring('${item.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            body.innerHTML = `<tr><td colspan="6" class="error-state">Error al cargar datos</td></tr>`;
            console.error(err);
        }
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────
    document.getElementById('recurring-form')?.addEventListener('submit', async (e) => {
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

        try {
            if (id) {
                await AppDB.updateRecurring(id, data);
                await UI.alert('Pago recurrente actualizado');
            } else {
                await AppDB.saveRecurring(data);
                await UI.alert('Pago recurrente guardado');
            }
            modal.classList.remove('show');
            await renderRecurring();
        } catch (err) {
            await UI.alert('Error al guardar: ' + err.message);
        }
    });

    window.openEditRecurring = async (id) => {
        const items = await AppDB.getRecurring();
        const item = items.find(i => i.id === id);
        if (!item) return;

        document.getElementById('modal-title').textContent = 'Editar Pago Recurrente';
        document.getElementById('rec-id').value = item.id;
        document.getElementById('rec-name').value = item.name;
        document.getElementById('rec-amount').value = item.amount;
        document.getElementById('rec-type').value = item.type;
        document.getElementById('rec-quotas').value = item.quotas || '';
        document.getElementById('rec-start-date').value = item.start_date || item.startDate || '';
        document.getElementById('rec-active').value = item.active.toString();

        quotaGroup.classList.toggle('hidden', item.type !== 'quota');
        activeGroup.style.display = 'flex';

        modal.classList.add('show');
    };

    window.deleteRecurring = async (id) => {
        const confirmed = await UI.confirm('¿Estás seguro de que querés eliminar este pago recurrente?');
        if (!confirmed) return;
        try {
            await AppDB.deleteRecurring(id);
            await renderRecurring();
            await UI.alert('Eliminado correctamente');
        } catch (err) {
            await UI.alert('Error al eliminar: ' + err.message);
        }
    };

    // ── Init ──────────────────────────────────────────────────────────────────
    await renderRecurring();
});
