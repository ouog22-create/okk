import { esc } from '../shared/html.js';
import { $, notice, focusOn, run, isBusy } from './ui.js';
import { api } from './api.js';
import { moveRow } from './order.js';

export function createClientsEditor() {
    let dirty = false, uploads = 0;
    let clients = [], clientCurrent = null, clientLogo = '';
    const clientForm = $('#client-form');

    function renderClients() {
        const filter = $('#client-filter').value, query = $('#client-search').value.trim().toLowerCase();
        const rows = clients.filter(item => (filter === 'trash' ? item.trashed : !item.trashed) && (filter !== 'visible' || item.visible) && (filter !== 'hidden' || !item.visible) && item.name.toLowerCase().includes(query));
        $('#client-count').textContent = `${rows.length}개 클라이언트`;
        $('#client-list').innerHTML = rows.map(item => {
            const button = (action, label, text = label) => `<button data-client-action="${action}" aria-label="${esc(item.name)} ${label}">${text}</button>`;
            return `<article class="row" data-client-id="${item.id}"><img class="thumb" src="${esc(item.logo)}" alt="" width="108" height="80" loading="lazy"><div class="row-info"><h2>${esc(item.name)}</h2><span class="badge ${item.visible ? 'live' : ''}">${item.trashed ? '휴지통' : item.visible ? '노출' : '비노출'}</span></div><div class="row-actions">${item.trashed ? button('restore', '복구') : button('up', '위로 이동', '↑') + button('down', '아래로 이동', '↓') + button('edit', '편집') + button('trash', '휴지통')}</div></article>`;
        }).join('') || '<div class="empty">표시할 클라이언트가 없습니다.</div>';
    }
    async function refreshClients() { clients = (await api('clients')).clients; renderClients(); }
    function clientPreview() { $('#client-logo-preview').innerHTML = clientLogo ? `<img src="${esc(clientLogo)}" alt="${esc(clientForm.elements.name.value || '클라이언트 로고 미리보기')}">` : '<span>로고를 선택해주세요.</span>'; }
    function clientSwitch() { $('#client-visible-value').textContent = $('#client-visible').checked ? 'ON' : 'OFF'; }
    function editClient(item) {
        clientCurrent = item || null;
        clientLogo = item?.logo || '';
        clientForm.reset(); clientForm.elements.name.value = item?.name || '';
        $('#client-visible').checked = !!item?.visible;
        clientSwitch(); clientPreview(); dirty = false; notice();
        $('#clients-workspace').hidden = true; $('#client-editor').hidden = false;
        $('#client-editor-title').textContent = item ? '클라이언트 편집' : '클라이언트 등록';
        focusOn($('#client-editor-title')); window.scrollTo(0, 0);
    }
    $('#client-new').onclick = () => editClient();
    $('#client-refresh').onclick = () => run(refreshClients);
    $('#client-search').oninput = renderClients;
    $('#client-filter').onchange = renderClients;
    clientForm.oninput = () => { dirty = true; clientPreview(); };
    $('#client-visible').onchange = () => { dirty = true; clientSwitch(); };
    clientForm.onsubmit = event => { event.preventDefault(); $('#client-save').click(); };
    $('#client-upload').onchange = event => {
        const file = event.target.files[0];
        if (!file) return;
        run(async () => {
            uploads++;
            try {
                if (file.size > 12 * 1024 * 1024) throw new Error('파일당 최대 12MB까지 업로드할 수 있습니다.');
                const data = new FormData(); data.append('file', file);
                clientLogo = (await api('media', data, true)).url;
                dirty = true; clientPreview(); notice('로고를 업로드했습니다. 저장을 눌러주세요.');
            } finally { uploads--; event.target.value = ''; }
        });
    };
    $('#client-save').onclick = () => run(async () => {
        clientForm.inert = false;
        if (!clientForm.reportValidity()) return;
        clientForm.inert = true;
        if (!clientLogo) throw new Error('클라이언트 로고를 선택해주세요.');
        const data = { name: clientForm.elements.name.value, logo: clientLogo, visible: $('#client-visible').checked };
        if (clientCurrent) data.version = clientCurrent.version;
        clientCurrent = (await api(clientCurrent ? 'clients/' + clientCurrent.id : 'clients', data)).client;
        dirty = false;
        $('#client-editor-title').textContent = '클라이언트 편집';
        notice(clientCurrent.visible ? '저장했습니다. 메인 화면에 반영되었습니다.' : '저장했습니다. 현재 비노출 상태입니다.');
    });
    $('#client-list').onclick = event => {
        const button = event.target.closest('[data-client-action]');
        if (!button || isBusy()) return;
        const item = clients.find(item => item.id === button.closest('[data-client-id]').dataset.clientId);
        const action = button.dataset.clientAction;
        if (action === 'edit') { editClient(item); return; }
        run(async () => {
            if (action === 'up' || action === 'down') {
                const moved = await moveRow(clients, item.id, action, $('#client-list'), 'data-client-id', ids => api('clients/order', { ids }));
                if (!moved) { notice('이미 목록의 끝입니다.'); return; }
            } else {
                if (!confirm(action === 'trash' ? '휴지통으로 이동하고 메인 화면에서 숨길까요?' : '비노출 상태로 복구할까요?')) return;
                await api('clients/' + item.id, { version: item.version, action });
                await refreshClients();
            }
            notice('변경했습니다.');
            focusOn($(`[data-client-id="${item.id}"] [data-client-action="${action}"]`) || $('#clients-title'));
        });
    };

    function reset() {
        dirty = false;
        clientCurrent = null;
        clientLogo = '';
    }
    return {
        refresh: refreshClients,
        reset,
        hasChanges: () => dirty || uploads > 0,
        focusTarget: () => $('#client-editor').hidden ? $('#clients-title') : $('#client-save'),
    };
}
