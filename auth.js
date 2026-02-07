// Simple password lock screen
(function () {
    const HASH = 'c4460bedafb9b5256d45b61a26c8a70a5000f2e05dd14239c5114844a10fc1bf';
    const SESSION_KEY = 'expense_auth';

    // Already authenticated this session
    if (sessionStorage.getItem(SESSION_KEY) === 'true') return;

    // Block page
    document.documentElement.style.overflow = 'hidden';

    async function sha256(text) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Create lock screen
    const overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.innerHTML = `
        <div style="
            position:fixed;inset:0;z-index:99999;
            background:#0a0e27;
            display:flex;align-items:center;justify-content:center;
            font-family:'Inter',sans-serif;
        ">
            <div style="text-align:center;width:280px;">
                <div style="font-size:2.5rem;margin-bottom:1rem;">🔒</div>
                <div style="font-size:1rem;font-weight:700;color:#fff;margin-bottom:0.5rem;">비밀번호 입력</div>
                <div style="font-size:0.72rem;color:#718096;margin-bottom:1.5rem;">접근이 제한된 페이지입니다</div>
                <input id="authInput" type="password" inputmode="numeric" placeholder="비밀번호" autocomplete="off" style="
                    width:100%;padding:0.75rem 1rem;
                    background:rgba(255,255,255,0.06);
                    border:1px solid rgba(255,255,255,0.12);
                    border-radius:0.5rem;
                    color:#fff;font-size:1.1rem;font-family:inherit;
                    text-align:center;letter-spacing:0.3em;
                    outline:none;transition:border-color 0.2s;
                ">
                <div id="authError" style="
                    margin-top:0.75rem;font-size:0.72rem;
                    color:#f56565;opacity:0;transition:opacity 0.2s;
                ">비밀번호가 틀렸습니다</div>
            </div>
        </div>
    `;

    // Insert immediately
    if (document.body) {
        document.body.appendChild(overlay);
    } else {
        document.addEventListener('DOMContentLoaded', () => document.body.appendChild(overlay));
    }

    function attachEvents() {
        const input = document.getElementById('authInput');
        const error = document.getElementById('authError');
        if (!input) return;

        input.focus();

        input.addEventListener('keydown', async (e) => {
            if (e.key !== 'Enter') { error.style.opacity = '0'; return; }
            const hash = await sha256(input.value);
            if (hash === HASH) {
                sessionStorage.setItem(SESSION_KEY, 'true');
                overlay.remove();
                document.documentElement.style.overflow = '';
            } else {
                error.style.opacity = '1';
                input.value = '';
                input.style.borderColor = '#f56565';
                setTimeout(() => { input.style.borderColor = 'rgba(255,255,255,0.12)'; }, 800);
            }
        });

        input.addEventListener('focus', () => { input.style.borderColor = '#667eea'; });
        input.addEventListener('blur', () => { input.style.borderColor = 'rgba(255,255,255,0.12)'; });
    }

    if (document.body) attachEvents();
    else document.addEventListener('DOMContentLoaded', attachEvents);
})();
