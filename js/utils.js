/**
 * UI Utilities - custom modal dialogs
 */
const UI = {
    alert(message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'custom-modal';
            modal.innerHTML = `
                <div class="custom-modal-content">
                    <h3>Aviso</h3>
                    <p>${message}</p>
                    <button class="btn-submit modal-close">Aceptar</button>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('.modal-close').onclick = () => {
                document.body.removeChild(modal);
                resolve();
            };
        });
    },

    confirm(message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'custom-modal';
            modal.innerHTML = `
                <div class="custom-modal-content">
                    <h3>Confirmación</h3>
                    <p>${message}</p>
                    <div class="modal-actions">
                        <button class="btn-cancel">Cancelar</button>
                        <button class="btn-submit">Confirmar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('.btn-cancel').onclick = () => { document.body.removeChild(modal); resolve(false); };
            modal.querySelector('.btn-submit').onclick = () => { document.body.removeChild(modal); resolve(true); };
        });
    },

    showLoading(container, msg = 'Cargando...') {
        container.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> ${msg}</div>`;
    },

    showError(container, msg = 'Error al cargar datos') {
        container.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i> ${msg}</div>`;
    }
};
