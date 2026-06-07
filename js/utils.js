/**
 * UI Utilities
 */
const UI = {
    // Create and show a custom alert
    alert(message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'custom-modal';
            modal.style.display = 'flex';
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

    // Create and show a custom confirmation dialog
    confirm(message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'custom-modal';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="custom-modal-content">
                    <h3>Confirmación</h3>
                    <p>${message}</p>
                    <div class="modal-actions">
                        <button class="btn-cancel modal-close">Cancelar</button>
                        <button class="btn-submit modal-close">Confirmar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            const buttons = modal.querySelectorAll('.modal-close');
            buttons[0].onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
            };
            buttons[1].onclick = () => {
                document.body.removeChild(modal);
                resolve(true);
            };
        });
    }
};