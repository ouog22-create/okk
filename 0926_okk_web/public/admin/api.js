import { adminApiPath } from '../shared/paths.js';
import { $ } from './ui.js';

let csrf = '';
export function setSession(token) { csrf = token; }

export async function api(path, data, multipart = false) {
    const options = { headers: {} };
    if (data !== undefined) {
        options.method = 'POST';
        options.headers['X-CSRF-Token'] = csrf;
        if (multipart) options.body = data;
        else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }
    }
    let response;
    try { response = await fetch(adminApiPath(path), options); }
    catch { throw new Error('서버에 연결할 수 없습니다. 입력 내용은 유지됩니다.'); }
    const result = await response.json().catch(() => ({ error: '요청을 처리하지 못했습니다.' }));
    if (!response.ok) {
        if (response.status === 401 && path !== 'login' && $('#login-view').hidden) {
            if (!$('#relogin').open) $('#relogin').showModal();
        }
        throw new Error(result.error || '요청을 처리하지 못했습니다.');
    }
    return result;
}
