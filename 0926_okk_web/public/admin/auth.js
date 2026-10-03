import { $, notice, focusOn, run } from './ui.js';
import { api, setSession } from './api.js';

export function setupAuth({ onLogin, onRelogin, hasChanges, onLogout }) {
    async function authenticate(form, status) {
        const button = form.querySelector('button');
        button.disabled = true;
        status.textContent = '';
        try {
            setSession((await api('login', Object.fromEntries(new FormData(form)))).csrf);
            form.reset();
            return true;
        } catch (error) {
            status.textContent = error.message;
            return false;
        } finally { button.disabled = false; }
    }

    function showWorkspace() {
        $('#login-view').hidden = true;
        $('#workspace').hidden = false;
        $('#logout').hidden = false;
        $('#admin-nav').hidden = false;
    }

    $('#login-form').onsubmit = async event => {
        event.preventDefault();
        if (await authenticate(event.target, $('#login-status'))) {
            showWorkspace();
            await run(async () => { await onLogin(); focusOn($('#list-title')); });
        }
    };
    $('#relogin-form').onsubmit = async event => {
        event.preventDefault();
        if (await authenticate(event.target, $('#relogin-status'))) {
            $('#relogin').close();
            notice('다시 로그인했습니다. 작업을 다시 실행해주세요.');
            onRelogin();
        }
    };
    $('#logout').onclick = () => run(async () => {
        if (hasChanges() && !confirm('변경사항을 저장하지 않고 로그아웃할까요?')) return;
        await api('logout', {});
        onLogout();
        location.reload();
    });
    return (async () => {
        try { setSession((await api('session')).csrf); }
        catch { return; }
        showWorkspace();
        await run(onLogin);
    })();
}
