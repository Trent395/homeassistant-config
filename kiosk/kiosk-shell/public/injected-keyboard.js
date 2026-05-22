(function () {
    if (window.__kioskKeyboardLoaded) {
        return;
    }
    window.__kioskKeyboardLoaded = true;

    const keyboard = document.createElement('div');
    keyboard.id = 'kiosk-touch-keyboard';
    keyboard.style.cssText = [
        'position:fixed',
        'left:0',
        'right:0',
        'bottom:0',
        'z-index:2147483647',
        'background:rgba(7,11,18,0.96)',
        'backdrop-filter:blur(10px)',
        'padding:10px 8px calc(10px + env(safe-area-inset-bottom, 0px)) 8px',
        'box-shadow:0 -14px 40px rgba(0,0,0,0.35)',
        'display:none',
        'font-family:system-ui,sans-serif',
        'touch-action:none'
    ].join(';');

    const style = document.createElement('style');
    style.textContent = `
        #kiosk-touch-keyboard .kb-row { display:flex; gap:6px; margin:0 0 6px 0; }
        #kiosk-touch-keyboard .kb-key {
            flex:1; min-height:44px; border:0; border-radius:10px;
            background:#1b2432; color:#f4f7fb; font-size:18px; font-weight:600;
        }
        #kiosk-touch-keyboard .kb-key.wide { flex:1.8; }
        #kiosk-touch-keyboard .kb-key.action { background:#285ea8; }
        #kiosk-touch-keyboard .kb-key.close { background:#6b7280; }
    `;
    document.documentElement.appendChild(style);

    const rows = [
        ['1','2','3','4','5','6','7','8','9','0'],
        ['q','w','e','r','t','y','u','i','o','p'],
        ['a','s','d','f','g','h','j','k','l'],
        ['shift','z','x','c','v','b','n','m','backspace'],
        ['close','space','enter']
    ];

    let activeElement = null;
    let shiftEnabled = false;

    function isTextTarget(el) {
        if (!el) return false;
        if (el.isContentEditable) return true;
        if (el.tagName === 'TEXTAREA') return true;
        if (el.tagName !== 'INPUT') return false;
        const type = (el.type || 'text').toLowerCase();
        return ['text', 'search', 'url', 'tel', 'email', 'password', 'number'].includes(type);
    }

    function focusTarget(el) {
        activeElement = el;
        if (el && typeof el.focus === 'function') {
            el.focus({ preventScroll: true });
        }
    }

    function showKeyboard(el) {
        focusTarget(el);
        keyboard.style.display = 'block';
        document.body.style.paddingBottom = `${keyboard.offsetHeight || 260}px`;
    }

    function hideKeyboard() {
        keyboard.style.display = 'none';
        document.body.style.paddingBottom = '';
        activeElement = null;
    }

    function updateShiftKeys() {
        keyboard.querySelectorAll('[data-char]').forEach((key) => {
            const base = key.getAttribute('data-char');
            key.textContent = shiftEnabled ? base.toUpperCase() : base.toLowerCase();
        });
    }

    function insertText(text) {
        if (!activeElement) return;
        focusTarget(activeElement);
        if (activeElement.isContentEditable) {
            document.execCommand('insertText', false, text);
        } else if (typeof activeElement.setRangeText === 'function') {
            const start = activeElement.selectionStart ?? activeElement.value.length;
            const end = activeElement.selectionEnd ?? activeElement.value.length;
            activeElement.setRangeText(text, start, end, 'end');
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
            activeElement.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (shiftEnabled) {
            shiftEnabled = false;
            updateShiftKeys();
        }
    }

    function backspace() {
        if (!activeElement) return;
        focusTarget(activeElement);
        if (activeElement.isContentEditable) {
            document.execCommand('delete', false);
            return;
        }
        const value = activeElement.value || '';
        let start = activeElement.selectionStart ?? value.length;
        let end = activeElement.selectionEnd ?? value.length;
        if (start === end && start > 0) {
            start -= 1;
        }
        activeElement.setRangeText('', start, end, 'end');
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        activeElement.dispatchEvent(new Event('change', { bubbles: true }));
    }

    rows.forEach((rowDef) => {
        const row = document.createElement('div');
        row.className = 'kb-row';

        rowDef.forEach((keyDef) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'kb-key';

            if (keyDef === 'space') {
                button.textContent = 'space';
                button.classList.add('wide');
                button.addEventListener('click', () => insertText(' '));
            } else if (keyDef === 'enter') {
                button.textContent = 'enter';
                button.classList.add('action');
                button.addEventListener('click', () => insertText('\n'));
            } else if (keyDef === 'backspace') {
                button.textContent = '⌫';
                button.classList.add('action');
                button.addEventListener('click', backspace);
            } else if (keyDef === 'shift') {
                button.textContent = 'shift';
                button.classList.add('action');
                button.addEventListener('click', () => {
                    shiftEnabled = !shiftEnabled;
                    updateShiftKeys();
                });
            } else if (keyDef === 'close') {
                button.textContent = 'hide';
                button.classList.add('close');
                button.addEventListener('click', hideKeyboard);
            } else {
                button.textContent = keyDef;
                button.setAttribute('data-char', keyDef);
                button.addEventListener('click', () => insertText(shiftEnabled ? keyDef.toUpperCase() : keyDef));
            }

            row.appendChild(button);
        });

        keyboard.appendChild(row);
    });

    document.documentElement.appendChild(keyboard);

    document.addEventListener('focusin', (event) => {
        if (isTextTarget(event.target)) {
            showKeyboard(event.target);
        }
    }, true);

    document.addEventListener('pointerdown', (event) => {
        if (keyboard.contains(event.target)) {
            return;
        }
        if (isTextTarget(event.target)) {
            showKeyboard(event.target);
            return;
        }
        const path = event.composedPath ? event.composedPath() : [];
        if (!path.some((node) => isTextTarget(node))) {
            hideKeyboard();
        }
    }, true);

    window.addEventListener('resize', () => {
        if (keyboard.style.display !== 'none') {
            document.body.style.paddingBottom = `${keyboard.offsetHeight || 260}px`;
        }
    });
})();
