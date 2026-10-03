import { $, notice, focusOn, run } from './ui.js';
import { createWorkEditor } from './work.js';
import { createClientsEditor } from './clients.js';
import { setupAuth } from './auth.js';

const editors = { work: createWorkEditor(), clients: createClientsEditor() };
let section = 'work';
const hasChanges = () => Object.values(editors).some(editor => editor.hasChanges());

async function switchSection(next) {
    if (hasChanges() && !confirm('저장하지 않은 변경사항을 버리고 이동할까요?')) return;
    await editors[next].refresh();
    Object.values(editors).forEach(editor => editor.reset());
    section = next;
    $('#editor').hidden = true;
    $('#client-editor').hidden = true;
    $('#workspace').hidden = section !== 'work';
    $('#clients-workspace').hidden = section !== 'clients';
    for (const name of Object.keys(editors)) {
        if (name === section) $('#nav-' + name).setAttribute('aria-current', 'page');
        else $('#nav-' + name).removeAttribute('aria-current');
    }
    notice();
    focusOn(editors[section].focusTarget());
}

for (const name of Object.keys(editors)) {
    $('#nav-' + name).onclick = () => run(() => switchSection(name));
}
$('#client-back').onclick = () => run(() => switchSection('clients'));
addEventListener('beforeunload', event => {
    if (hasChanges()) { event.preventDefault(); event.returnValue = ''; }
});
setupAuth({
    onLogin: () => editors.work.refresh(),
    onRelogin: () => {
        editors[section].preview?.();
        focusOn(editors[section].focusTarget());
    },
    hasChanges,
    onLogout: () => Object.values(editors).forEach(editor => editor.reset()),
});
