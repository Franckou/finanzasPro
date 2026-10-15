document.addEventListener('DOMContentLoaded', async () => {
    await Auth.protect();
    UIController.applyTheme(AppDB.getTheme());

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        UIController.applyTheme(AppDB.getTheme() === 'light' ? 'dark' : 'light');
    });
    document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

    // Attach calculator to amount input if UI helper exists
    if (typeof UI !== 'undefined' && UI.attachCalculator) {
        UI.attachCalculator('rec-amount');
    }

    const body = document.getElementById('recurring-body');
    const modal = document.getElementById('modal-recurring');
    const openBtn = document.getElementById('btn-add-recurring');
    const closeBtn = document.getElementById('close-modal-rec');
    const form = document.getElementById('recurring-form');
    const quotaGroup = document.getElementById('quota-count-group');
    const typeEl = document.getElementById('rec-type');

    // Helpers to safely get elements inside modal
    const $ = id => document.getElementById(id);

    const showModal = (mode = 'new', item = null) => {
        $('modal-title') && ($('modal-title').textContent = mode === 'new' ? 'Nueva Suscripción / Cuota' : 'Editar Suscripción / Cuota');
        $('rec-id').value = item?.id || '';
        $('rec-name').value = item?.name || '';
        $('rec-amount').value = item?.amount ?? '';
        $('rec-type').value = item?.type || 'subscription';
        $('rec-quotas').value = item?.quotas ?? '';
        // start_date may be ISO or date-only
        if (item?.start_date) {
            $('rec-start-date').value = item.start_date.split('T')[0];
        } else {
            $('rec-start-date').value = '';
        }
        if ($('rec-active')) {
            $('rec-active').value = item?.active ? 'true' : 'false';
        }
        // Show/hide quotas input
        if (quotaGroup) quotaGroup.classList.toggle('hidden', $('rec-type').value !== 'quota');
        modal?.classList.add('show');
    };

    const closeModal = () => modal?.classList.remove('show');

    openBtn?.addEventListener('click', () => showModal('new'));
    closeBtn?.addEventListener('click', closeModal);
    window.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    typeEl?.addEventListener('change', () => {
        if (!quotaGroup) return;
        quotaGroup.classList.toggle('hidden', typeEl.value !== 'quota');
    });

    let all = [];

    const formatDate = (d) => {
        if (!d) return '';
        try {
            return d.split ? d.split('T')[0] : new Date(d).toISOString().split('T')[0];
        } catch {
            return String(d);
        }
    };

    const render = () => {
        if (!body) return;
        if (!all.length) {
            body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;font-style:italic;">No hay pagos recurrentes</td></tr>`;
            return;
        }

        body.innerHTML = all.map(r => `
            <tr>
                <td>${r.name}</td>
                <td class="item-amount">${UI?.formatMoney ? UI.formatMoney(r.amount) : (r.amount ?? '')}</td>
                <td>${r.type === 'subscription' ? 'Suscripción' : 'Cuota'}</td>
                <td>${formatDate(r.start_date)}</td>
                <td>${r.active ? '<span class="badge badge-income">Activo</span>' : '<span class="badge badge-expense">Inactivo</span>'}</td>
                <td>
                    <button class="btn-edit" onclick="openRecurringEdit('${r.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteRecurringItem('${r.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    };

    window.openRecurringEdit = (id) => {
        const item = all.find(x => x.id === id);
        if (!item) return;
        showModal('edit', item);
    };

    window.deleteRecurringItem = async (id) => {
        if (!await UI.confirm('¿Seguro querés eliminar este pago recurrente?')) return;
        try {
            await AppDB.deleteRecurring(id);
            all = all.filter(x => x.id !== id);
            render();
            await UI.alert('El pago recurrente fue eliminado');
        } catch (err) {
            await UI.alert('Error al eliminar: ' + (err?.message || err));
        }
    };

    const load = async () => {
        if (!body) return;
        UI.showLoading?.(body, 'Cargando recurrentes...');
        try {
            all = await AppDB.getRecurring();
            render();
        } catch (err) {
            UI.showError?.(body, 'Error al cargar recurrentes');
            console.error('getRecurring error', err);
        }
    };

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = $('rec-id').value;
        const payload = {
            name: $('rec-name').value.trim(),
            amount: $('rec-amount').value,
            type: $('rec-type').value,
            quotas: $('rec-quotas').value ? parseInt($('rec-quotas').value, 10) : null,
            startDate: $('rec-start-date').value,
            active: $('rec-active') ? $('rec-active').value === 'true' : true
        };

        // Basic validation
        if (!payload.name) return UI.alert('El nombre es requerido');
        if (!payload.amount || isNaN(parseFloat(payload.amount))) return UI.alert('Monto inválido');
        if (!payload.startDate) return UI.alert('Fecha de inicio requerida');

        try {
            if (id) {
                await AppDB.updateRecurring(id, payload);
                const idx = all.findIndex(x => x.id === id);
                if (idx !== -1) {
                    all[idx] = { ...all[idx], ...payload, amount: parseFloat(payload.amount), start_date: payload.startDate, quotas: payload.quotas, active: payload.active };
                }
                await UI.alert('Pago recurrente actualizado');
            } else {
                const created = await AppDB.saveRecurring(payload);
                // Ensure consistent shape
                created.amount = parseFloat(created.amount);
                all.unshift(created);
                await UI.alert('Pago recurrente creado');
            }
            closeModal();
            render();
        } catch (err) {
            await UI.alert('Error al guardar: ' + (err?.message || err));
            console.error('save/update recurring error', err);
        }
    });

    // Inicial load
    await load();
});
