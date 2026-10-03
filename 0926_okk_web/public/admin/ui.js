export const $ = selector => document.querySelector(selector);
let busy = false, noticeTimer, nextFocus;
export const isBusy = () => busy;

export function notice(text = '', error = false) {
    clearTimeout(noticeTimer);
    const toast = $('#notice');
    toast.textContent = text;
    toast.classList.toggle('error', error);
    if (text) noticeTimer = setTimeout(() => {
        toast.textContent = '';
        toast.classList.remove('error');
    }, 3000);
}

export function focusOn(element) {
    if (busy) nextFocus = element;
    else element?.focus();
}

function setBusy(value) {
    busy = value;
    for (const form of document.querySelectorAll('#project-form, #client-form')) {
        form.inert = value;
        form.setAttribute('aria-busy', String(value));
    }
    document.querySelectorAll('#admin-nav button,#clients-workspace button,#clients-workspace input,#clients-workspace select,#client-editor button,#client-visible,#save,#publish,#featured,#new,#logout,#back,#refresh,#search,#filter,.row-actions button,.image-actions button,input[type=file]')
        .forEach(button => button.disabled = value);
}

export async function run(fn) {
    if (busy) return;
    const active = document.activeElement;
    nextFocus = null;
    setBusy(true);
    try { await fn(); }
    catch (error) { notice(error.message, true); }
    finally {
        setBusy(false);
        if (!$('#relogin').open) {
            if (nextFocus?.isConnected) nextFocus.focus();
            else if (active?.isConnected && document.activeElement === document.body) active.focus();
        }
    }
}
