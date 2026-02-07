// Firebase Authentication lock screen — server-side verification, bypass-proof
(function () {
    const AUTH_EMAIL = 'admin@expense-tracker.app';

    // Block page immediately
    document.documentElement.style.overflow = 'hidden';

    function removeOverlay() {
        const el = document.getElementById('authOverlay');
        if (el) el.remove();
        document.documentElement.style.overflow = '';
    }

    function createOverlay() {
        if (document.getElementById('authOverlay')) return;
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
                        -webkit-appearance:none;
                    ">
                    <button id="authSubmitBtn" type="button" style="
                        width:100%;margin-top:0.75rem;padding:0.7rem 1rem;
                        background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border:none;border-radius:0.5rem;
                        color:#fff;font-size:0.9rem;font-weight:700;
                        font-family:inherit;cursor:pointer;
                        transition:opacity 0.2s;
                    ">로그인</button>
                    <div id="authError" style="
                        margin-top:0.75rem;font-size:0.72rem;
                        color:#f56565;opacity:0;transition:opacity 0.2s;
                    ">비밀번호가 틀렸습니다</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    async function attemptLogin() {
        const input = document.getElementById('authInput');
        const error = document.getElementById('authError');
        const btn = document.getElementById('authSubmitBtn');
        const pw = input.value;
        if (!pw) return;

        // Disable while authenticating
        input.disabled = true;
        btn.disabled = true;
        input.style.opacity = '0.5';
        btn.style.opacity = '0.5';

        try {
            await firebase.auth().signInWithEmailAndPassword(AUTH_EMAIL, pw);
            // Success — onAuthStateChanged will remove overlay
        } catch (err) {
            error.style.opacity = '1';
            input.value = '';
            input.disabled = false;
            btn.disabled = false;
            input.style.opacity = '1';
            btn.style.opacity = '1';
            input.style.borderColor = '#f56565';
            setTimeout(() => { input.style.borderColor = 'rgba(255,255,255,0.12)'; }, 800);
            input.focus();
        }
    }

    function attachEvents() {
        const input = document.getElementById('authInput');
        const error = document.getElementById('authError');
        const btn = document.getElementById('authSubmitBtn');
        if (!input) return;

        input.focus();

        // Enter key (desktop + mobile)
        input.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') { error.style.opacity = '0'; return; }
            e.preventDefault();
            attemptLogin();
        });

        // Button click (mobile primary)
        btn.addEventListener('click', () => {
            attemptLogin();
        });

        // Also handle 'Go' button on mobile keyboards via form submit simulation
        input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                attemptLogin();
            }
        });

        input.addEventListener('focus', () => { input.style.borderColor = '#667eea'; });
        input.addEventListener('blur', () => { input.style.borderColor = 'rgba(255,255,255,0.12)'; });
    }

    function init() {
        if (typeof firebase === 'undefined' || !firebase.auth) return;

        // Local persistence (stays logged in across pages & tabs until browser closes)
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                removeOverlay();
            } else {
                createOverlay();
                attachEvents();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
