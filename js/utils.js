/**
 * UI Utilities
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
            modal.querySelector('.modal-close').onclick = () => { document.body.removeChild(modal); resolve(); };
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
        if (container) container.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> ${msg}</div>`;
    },

    showError(container, msg = 'Error al cargar datos') {
        if (container) container.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i> ${msg}</div>`;
    },

    // ── Formateo de moneda AR (punto miles, coma decimal) ─────────────────────
    // Ej: 400000.5 → "400.000,50"
    formatMoney(value) {
        const num = parseFloat(value) || 0;
        return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    // ── Calculadora desplegable ───────────────────────────────────────────────
    attachCalculator(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        // Remove existing spinner arrows via CSS class
        input.classList.add('no-spinner');

        // Build wrapper if not already wrapped
        if (!input.parentElement.classList.contains('calc-input-wrap')) {
            const wrap = document.createElement('div');
            wrap.className = 'calc-input-wrap';
            input.parentNode.insertBefore(wrap, input);
            wrap.appendChild(input);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'calc-trigger';
            btn.innerHTML = '<i class="fas fa-calculator"></i>';
            btn.title = 'Abrir calculadora';
            wrap.appendChild(btn);

            // Build calculator panel
            const panel = document.createElement('div');
            panel.className = 'calc-panel';
            panel.innerHTML = `
                <div class="calc-display" id="calc-display-${inputId}">0</div>
                <div class="calc-keys">
                    <button type="button" class="calc-key calc-fn" data-val="C">C</button>
                    <button type="button" class="calc-key calc-fn" data-val="±">±</button>
                    <button type="button" class="calc-key calc-fn" data-val="%">%</button>
                    <button type="button" class="calc-key calc-op" data-val="÷">÷</button>

                    <button type="button" class="calc-key" data-val="7">7</button>
                    <button type="button" class="calc-key" data-val="8">8</button>
                    <button type="button" class="calc-key" data-val="9">9</button>
                    <button type="button" class="calc-key calc-op" data-val="×">×</button>

                    <button type="button" class="calc-key" data-val="4">4</button>
                    <button type="button" class="calc-key" data-val="5">5</button>
                    <button type="button" class="calc-key" data-val="6">6</button>
                    <button type="button" class="calc-key calc-op" data-val="-">−</button>

                    <button type="button" class="calc-key" data-val="1">1</button>
                    <button type="button" class="calc-key" data-val="2">2</button>
                    <button type="button" class="calc-key" data-val="3">3</button>
                    <button type="button" class="calc-key calc-op" data-val="+">+</button>

                    <button type="button" class="calc-key calc-zero" data-val="0">0</button>
                    <button type="button" class="calc-key" data-val=".">.</button>
                    <button type="button" class="calc-key calc-eq" data-val="=">=</button>
                </div>
                <button type="button" class="calc-use">Usar este monto</button>
            `;
            wrap.appendChild(panel);

            // Calculator state
            let calcState = { display: '0', prev: null, op: null, reset: false };

            const display = panel.querySelector(`#calc-display-${inputId}`);
            const updateDisplay = () => { display.textContent = calcState.display; };

            panel.querySelectorAll('.calc-key').forEach(key => {
                key.addEventListener('click', () => {
                    const v = key.dataset.val;

                    if (v === 'C') {
                        calcState = { display: '0', prev: null, op: null, reset: false };
                    } else if (v === '±') {
                        calcState.display = String(parseFloat(calcState.display) * -1);
                    } else if (v === '%') {
                        calcState.display = String(parseFloat(calcState.display) / 100);
                    } else if (['+', '-', '×', '÷'].includes(v)) {
                        calcState.prev = parseFloat(calcState.display);
                        calcState.op = v;
                        calcState.reset = true;
                    } else if (v === '=') {
                        if (calcState.op && calcState.prev !== null) {
                            const a = calcState.prev, b = parseFloat(calcState.display);
                            let result;
                            if (calcState.op === '+') result = a + b;
                            else if (calcState.op === '-') result = a - b;
                            else if (calcState.op === '×') result = a * b;
                            else if (calcState.op === '÷') result = b !== 0 ? a / b : 0;
                            // Round to 2 decimals to avoid floating point mess
                            calcState.display = String(Math.round(result * 100) / 100);
                            calcState.prev = null; calcState.op = null; calcState.reset = false;
                        }
                    } else if (v === '.') {
                        if (calcState.reset) { calcState.display = '0.'; calcState.reset = false; }
                        else if (!calcState.display.includes('.')) calcState.display += '.';
                    } else {
                        if (calcState.display === '0' || calcState.reset) {
                            calcState.display = v;
                            calcState.reset = false;
                        } else {
                            calcState.display += v;
                        }
                    }
                    updateDisplay();
                });
            });

            // "Usar este monto" → write value into input and close
            panel.querySelector('.calc-use').addEventListener('click', () => {
                const val = parseFloat(calcState.display);
                if (!isNaN(val) && val > 0) {
                    input.value = val;
                    input.dispatchEvent(new Event('input'));
                }
                panel.classList.remove('open');
            });

            // Toggle panel
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close all other open calculators
                document.querySelectorAll('.calc-panel.open').forEach(p => { if (p !== panel) p.classList.remove('open'); });
                panel.classList.toggle('open');
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!wrap.contains(e.target)) panel.classList.remove('open');
            }, true);
        }
    }
};
