// Firebase Authentication lock screen — server-side verification, bypass-proof
// 클라이언트 사이드 무차별 대입 방어 포함
(function () {
    const AUTH_EMAIL = 'admin@expense-tracker.app';
    const MAX_ATTEMPTS = 5;        // 잠금 전 최대 시도 횟수
    const LOCKOUT_BASE = 60;       // 기본 잠금 시간 (초)
    const STORAGE_KEY = 'authBrute';

    // Block page immediately
    document.documentElement.style.overflow = 'hidden';

    // 무차별 대입 방어 상태 (sessionStorage 기반)
    function loadBruteState() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { fails: 0, lockedUntil: 0, lockCount: 0 };
    }

    function saveBruteState(state) {
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    }

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
                background:#05060f;
                background-image:
                    radial-gradient(ellipse 600px 400px at 20% 30%, rgba(50,40,100,0.25) 0%, transparent 70%),
                    radial-gradient(ellipse 500px 350px at 80% 70%, rgba(30,50,90,0.2) 0%, transparent 70%);
                display:flex;align-items:center;justify-content:center;
                font-family:'Inter',sans-serif;
            ">
                <div style="text-align:center;width:280px;">
                    <div style="font-size:2.5rem;margin-bottom:1rem;">🔒</div>
                    <div style="font-size:1rem;font-weight:700;color:#d8dce8;margin-bottom:0.5rem;">비밀번호 입력</div>
                    <div style="font-size:0.72rem;color:#555c72;margin-bottom:1.5rem;">접근이 제한된 페이지입니다</div>
                    <input id="authInput" type="password" placeholder="비밀번호" autocomplete="off" style="
                        width:100%;padding:0.75rem 1rem;
                        background:rgba(255,255,255,0.06);
                        border:1px solid rgba(255,255,255,0.12);
                        border-radius:0.5rem;
                        color:#d8dce8;font-size:1.1rem;font-family:inherit;
                        text-align:center;letter-spacing:0.3em;
                        outline:none;transition:border-color 0.2s;
                        -webkit-appearance:none;
                    ">
                    <button id="authSubmitBtn" type="button" style="
                        width:100%;margin-top:0.75rem;padding:0.7rem 1rem;
                        background:#5c6cb8;
                        border:none;border-radius:0.5rem;
                        color:#d8dce8;font-size:0.9rem;font-weight:700;
                        font-family:inherit;cursor:pointer;
                        transition:opacity 0.2s;
                    ">로그인</button>
                    <div id="authError" style="
                        margin-top:0.75rem;font-size:0.72rem;
                        color:#c45454;opacity:0;transition:opacity 0.2s;
                    ">비밀번호가 틀렸습니다</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    // 잠금 상태 확인 + 카운트다운 표시
    let lockTimer = null;
    function checkLockout() {
        const state = loadBruteState();
        const now = Date.now();
        if (state.lockedUntil > now) {
            setLocked(true, state.lockedUntil);
            return true;
        }
        return false;
    }

    function setLocked(locked, until) {
        const input = document.getElementById('authInput');
        const btn = document.getElementById('authSubmitBtn');
        const error = document.getElementById('authError');
        if (!input || !btn || !error) return;

        if (locked) {
            input.disabled = true;
            btn.disabled = true;
            input.style.opacity = '0.3';
            btn.style.opacity = '0.3';
            input.value = '';

            // 카운트다운 시작
            if (lockTimer) clearInterval(lockTimer);
            lockTimer = setInterval(() => {
                const remain = Math.ceil((until - Date.now()) / 1000);
                if (remain <= 0) {
                    clearInterval(lockTimer);
                    lockTimer = null;
                    input.disabled = false;
                    btn.disabled = false;
                    input.style.opacity = '1';
                    btn.style.opacity = '1';
                    error.textContent = '다시 시도할 수 있습니다';
                    error.style.color = '#7a8bbf';
                    error.style.opacity = '1';
                    setTimeout(() => {
                        error.style.opacity = '0';
                        error.style.color = '#c45454';
                    }, 2000);
                    input.focus();
                    return;
                }
                const mm = Math.floor(remain / 60);
                const ss = remain % 60;
                const timeStr = mm > 0 ? `${mm}분 ${ss}초` : `${ss}초`;
                error.textContent = `너무 많은 시도 — ${timeStr} 후 재시도`;
                error.style.opacity = '1';
            }, 200);
            // 즉시 한 번 실행
            const remain = Math.ceil((until - Date.now()) / 1000);
            const mm = Math.floor(remain / 60);
            const ss = remain % 60;
            const timeStr = mm > 0 ? `${mm}분 ${ss}초` : `${ss}초`;
            error.textContent = `너무 많은 시도 — ${timeStr} 후 재시도`;
            error.style.opacity = '1';
        }
    }

    function recordFail() {
        const state = loadBruteState();
        state.fails += 1;
        if (state.fails >= MAX_ATTEMPTS) {
            // 잠금 시간: 기본 60초, 잠금 반복 시 2배씩 증가 (최대 30분)
            state.lockCount += 1;
            const lockSec = Math.min(LOCKOUT_BASE * Math.pow(2, state.lockCount - 1), 1800);
            state.lockedUntil = Date.now() + lockSec * 1000;
            state.fails = 0;
        }
        saveBruteState(state);
        return state;
    }

    function resetBrute() {
        try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    }

    async function attemptLogin() {
        // 잠금 확인
        if (checkLockout()) return;

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
            // 성공 — 실패 기록 초기화
            resetBrute();
            // onAuthStateChanged will remove overlay
        } catch (err) {
            const state = recordFail();

            // 잠금 발동 시
            if (state.lockedUntil > Date.now()) {
                setLocked(true, state.lockedUntil);
                return;
            }

            // 남은 시도 횟수 표시
            const remaining = MAX_ATTEMPTS - state.fails;
            error.textContent = `비밀번호가 틀렸습니다 (${remaining}회 남음)`;
            error.style.opacity = '1';
            input.value = '';
            input.disabled = false;
            btn.disabled = false;
            input.style.opacity = '1';
            btn.style.opacity = '1';
            input.style.borderColor = '#c45454';
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

        // Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') { error.style.opacity = '0'; return; }
            e.preventDefault();
            attemptLogin();
        });

        // Button click
        btn.addEventListener('click', () => attemptLogin());

        input.addEventListener('focus', () => { input.style.borderColor = '#5b6abf'; });
        input.addEventListener('blur', () => { input.style.borderColor = 'rgba(255,255,255,0.12)'; });

        // 페이지 로드 시 기존 잠금 확인
        checkLockout();
    }

    function init() {
        if (typeof firebase === 'undefined' || !firebase.auth) return;

        // Local persistence (stays logged in across pages & tabs until browser closes)
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                resetBrute();
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
