import { esc } from '../shared/html.js';
import { $, notice, focusOn, run, isBusy } from './ui.js';
import { api } from './api.js';
import { moveRow } from './order.js';

export function createWorkEditor() {
    const form = $('#project-form');
    let projects = [], current = null;
    let dirty = false, uploads = 0, mode = 'detail';
    let previewTimer, editorOpener;

    function state(project) {
        if (project.trashed) return '휴지통';
        if (project.published) return project.dirty ? '공개 · 수정 초안 있음' : '공개';
        return '초안·비공개';
    }

    async function refresh() {
        projects = (await api('projects')).projects;
        renderList();
    }

    function renderList() {
        const query = $('#search').value.trim().toLowerCase(), filter = $('#filter').value;
        const visible = projects.filter(project =>
            (filter === 'trash' ? project.trashed : !project.trashed) &&
            (filter !== 'published' || project.published) &&
            (filter !== 'draft' || !project.published) &&
            `${project.draft.title} ${project.draft.client}`.toLowerCase().includes(query));
        $('#list-count').textContent = `${visible.length}개 프로젝트`;
        $('#list').innerHTML = visible.map(project => {
            const title = esc(project.draft.title);
            const updated = new Date(project.updated.replace(' ', 'T') + 'Z').toLocaleString('ko-KR');
            const action = (name, label) => `<button data-action="${name}" aria-label="${title} ${label}">${label}</button>`;
            const image = project.draft.thumbnail || project.draft.cover;
            return `<article class="row" data-id="${project.id}">
                ${image ? `<img class="thumb" src="${esc(image)}" alt="" loading="lazy" decoding="async" width="108" height="80">` : '<div class="thumb" aria-hidden="true">✳</div>'}
                <div class="row-info"><h2>${title}</h2><span class="badge ${project.published ? 'live' : ''}">${state(project)}</span><p>${esc(project.draft.client || '클라이언트 미입력')} · ${esc(updated)}</p></div>
                <div class="row-actions">${project.trashed ? action('restore', '복구') : `
                    <button data-action="up" aria-label="${title} 위로 이동">↑</button>
                    <button data-action="down" aria-label="${title} 아래로 이동">↓</button>
                    ${action('edit', '편집')}${project.published ? action('unpublish', '비공개') : ''}${action('trash', '휴지통')}`}</div>
            </article>`;
        }).join('') || '<div class="empty">표시할 프로젝트가 없습니다.</div>';
    }

    function syncPublish() {
        $('#publish').checked = !!current?.published;
        $('#publish-value').textContent = current?.published ? 'ON' : 'OFF';
    }

    function blank() {
        return { title: '', slug: `project-${crypto.randomUUID()}`, subtitle: 'STUDIO OKK / WORK', summary: '', client: '', year: '', scope: '', description: '', color: 'lavender', featured: true, thumbnail: '', cover: '', gallery: [] };
    }

    function values() {
        return { ...current.draft, ...Object.fromEntries(new FormData(form)), subtitle: 'STUDIO OKK / WORK',
            featured: form.elements.featured.checked, slug: current.draft.slug, gallery: current.draft.gallery };
    }

    function preview() {
        clearTimeout(previewTimer);
        if (current) $('#preview-frame').contentWindow.postMessage({ type: 'okk-preview', project: values(), mode }, location.origin);
    }

    function markDirty() {
        if (!dirty) $('#editor-state').textContent = '저장하지 않은 변경사항';
        dirty = true;
        clearTimeout(previewTimer);
        previewTimer = setTimeout(preview, 160);
    }

    function showEditor(project) {
        editorOpener = project?.id;
        current = project ? structuredClone(project) : { draft: blank() };
        dirty = false;
        $('#workspace').hidden = true;
        $('#editor').hidden = false;
        for (const [key, value] of Object.entries(current.draft)) {
            if (!form.elements[key]) continue;
            if (key === 'featured') form.elements[key].checked = value;
            else form.elements[key].value = value;
        }
        $('#editor-title').textContent = current.id ? '프로젝트 편집' : '새 프로젝트 등록';
        $('#editor-state').textContent = current.id ? state(current) : '새 프로젝트';
        syncPublish();
        renderImages();
        preview();
        window.scrollTo(0, 0);
        focusOn($('#editor-title'));
    }

    function renderImages() {
        $('#covers').innerHTML = ['thumbnail', 'cover'].map(key => {
            const label = key === 'thumbnail' ? '목록 썸네일' : '상세 대표 이미지';
            const guide = key === 'thumbnail'
                ? '권장 1,600 × 1,200px (4:3) · 중앙 기준 크롭'
                : '권장 1,920 × 1,080px (16:9) · 원본 비율 유지';
            return `<div class="image-block"><h3>${label}</h3><p id="${key}-help" class="hint">${guide}</p>
                ${current.draft[key] ? `<img src="${esc(current.draft[key])}" alt="${label}" decoding="async"><button type="button" data-remove="${key}" aria-label="${label} 제거">이미지 제거</button>` : ''}
                <label class="upload">${label} ${current.draft[key] ? '교체' : '선택'}<input type="file" data-upload="${key}" aria-describedby="upload-help ${key}-help" accept="image/jpeg,image/png,image/webp"></label></div>`;
        }).join('');
        $('#gallery-count').textContent = `${current.draft.gallery.length}/40`;
        $('#gallery').innerHTML = current.draft.gallery.map((image, index) => `<div class="image-block" data-index="${index}">
            <img src="${esc(image.src)}" alt="${esc(image.alt || `상세 이미지 ${index + 1}`)}" loading="lazy" decoding="async">
            <label>이미지 ${index + 1} 대체 텍스트<input data-field="alt" value="${esc(image.alt)}" maxlength="500"></label>
            <label>이미지 ${index + 1} 설명<input data-field="caption" value="${esc(image.caption)}" maxlength="500"></label>
            <div class="image-actions"><button type="button" data-image="up" aria-label="이미지 ${index + 1} 위로 이동">↑</button>
            <button type="button" data-image="down" aria-label="이미지 ${index + 1} 아래로 이동">↓</button>
            <button type="button" data-image="remove" aria-label="이미지 ${index + 1} 제거">제거</button></div></div>`).join('');
    }

    async function save(publish = !!current.published) {
        if (uploads) throw new Error('이미지 업로드가 끝난 후 저장해주세요.');
        // 기본 입력 검사가 잘못된 필드에 포커스를 줄 수 있게 잠시 해제한다.
        form.inert = false;
        if (!form.reportValidity()) throw new Error('필수 입력 항목을 확인해주세요.');
        form.inert = true;
        const project = values();
        const result = await api(current.id ? 'projects/' + current.id : 'projects', current.id ? { action: 'save', version: current.version, project, publish } : { ...project, publish });
        current = result.project;
        dirty = false;
        $('#editor-state').textContent = state(current);
        $('#editor-title').textContent = '프로젝트 편집';
        syncPublish();
        preview();
    }

    $('#save').onclick = () => run(async () => {
        await save();
        notice(current.published ? '저장했습니다. 변경사항이 사이트에 반영되었습니다.' : '저장했습니다. 현재 비공개 상태입니다.');
    });
    $('#publish').onchange = () => {
        const publish = $('#publish').checked;
        run(async () => {
            try {
                if (publish) {
                    await save(true);
                    notice('공개했습니다. A 화면의 Work에서 확인할 수 있습니다.');
                } else if (current.id) {
                    const pending = values();
                    const result = await api('projects/' + current.id, { action: 'unpublish', version: current.version });
                    current = { ...result.project, draft: pending };
                    $('#editor-state').textContent = dirty ? '저장하지 않은 변경사항 · 비공개' : state(current);
                    notice('비공개로 전환했습니다.' + (dirty ? ' 입력 중인 변경사항은 저장을 눌러주세요.' : ''));
                }
            } finally { syncPublish(); }
        });
    };
    $('#new').onclick = () => { notice(); showEditor(); };
    $('#back').onclick = () => run(async () => {
        if (dirty && !confirm('저장하지 않은 변경사항을 버리고 목록으로 이동할까요?')) return;
        await refresh();
        reset();
        $('#editor').hidden = true;
        $('#workspace').hidden = false;
        notice();
        focusOn($(`[data-id="${editorOpener}"] [data-action="edit"]`) || $('#list-title'));
    });
    $('#refresh').onclick = () => run(refresh);
    $('#search').oninput = renderList;
    $('#filter').onchange = renderList;
    $('#list').onclick = event => {
        const button = event.target.closest('[data-action]');
        if (!button || isBusy()) return;
        const project = projects.find(project => project.id === button.closest('[data-id]').dataset.id);
        const action = button.dataset.action;
        if (action === 'edit') { notice(); showEditor(project); return; }
        run(async () => {
            if (action === 'up' || action === 'down') {
                const moved = await moveRow(projects, project.id, action, $('#list'), 'data-id', ids => api('order', { ids }));
                if (!moved) { notice('이미 목록의 끝입니다.'); return; }
                notice('노출 순서를 변경했습니다.');
            } else {
                const question = action === 'trash' ? '휴지통으로 이동하고 사이트에서 숨길까요?' : action === 'unpublish' ? '사이트에서 비공개로 전환할까요?' : '초안 상태로 복구할까요?';
                if (!confirm(question)) return;
                await api('projects/' + project.id, { action, version: project.version });
                notice(action === 'restore' ? '초안으로 복구했습니다.' : '변경했습니다.');
                await refresh();
            }
            focusOn($(`[data-id="${project.id}"] [data-action="${action}"]`) || $(`[data-id="${project.id}"] [data-action="edit"]`) || $('#list-title'));
        });
    };

    $('#featured').addEventListener('input', markDirty);

    form.onsubmit = event => { event.preventDefault(); $('#save').click(); };
    form.addEventListener('input', event => {
        if (event.target.dataset.field) {
            const index = Number(event.target.closest('[data-index]').dataset.index);
            current.draft.gallery[index][event.target.dataset.field] = event.target.value;
        }
        markDirty();
    });
    form.addEventListener('click', event => {
        const remove = event.target.closest('[data-remove]');
        if (remove) {
            const key = remove.dataset.remove;
            current.draft[key] = '';
            renderImages(); markDirty();
            focusOn($(`[data-upload="${key}"]`));
            notice('이미지를 제거했습니다. 저장하면 반영됩니다.');
            return;
        }
        const button = event.target.closest('[data-image]');
        if (!button) return;
        const index = Number(button.closest('[data-index]').dataset.index), images = current.draft.gallery;
        const action = button.dataset.image;
        let next = index;
        if (action === 'remove') { images.splice(index, 1); next = Math.min(index, images.length - 1); }
        else {
            next = index + (action === 'up' ? -1 : 1);
            if (next < 0 || next >= images.length) { notice('이미 이미지 목록의 끝입니다.'); return; }
            [images[index], images[next]] = [images[next], images[index]];
        }
        renderImages(); markDirty();
        focusOn($(`[data-index="${next}"] [data-image="${action}"]`) || $('#gallery-upload'));
        notice(action === 'remove' ? '이미지를 제거했습니다.' : `이미지를 ${next + 1}번째로 이동했습니다.`);
    });
    form.addEventListener('change', event => {
        if (event.target.type !== 'file') return;
        const files = [...event.target.files], key = event.target.dataset.upload;
        if (!files.length) return;
        run(async () => {
            uploads++;
            try {
                for (const file of files) {
                    if (!key && current.draft.gallery.length >= 40) throw new Error('상세 이미지는 최대 40장입니다.');
                    if (file.size > 12 * 1024 * 1024) throw new Error('파일당 최대 12MB까지 업로드할 수 있습니다.');
                    const data = new FormData(); data.append('file', file);
                    notice(`${file.name} 업로드 중…`);
                    const result = await api('media', data, true);
                    if (key) current.draft[key] = result.url;
                    else current.draft.gallery.push({ src: result.url, alt: '', caption: '' });
                    markDirty();
                }
                notice('이미지를 업로드했습니다. 저장을 눌러주세요.');
            } finally {
                uploads--; event.target.value = '';
                renderImages(); preview();
                focusOn(key ? $(`[data-upload="${key}"]`) : $('#gallery-upload'));
            }
        });
    });
    $('#preview-mode').onchange = event => { mode = event.target.value; preview(); };
    addEventListener('message', event => {
        if (event.origin === location.origin && event.source === $('#preview-frame').contentWindow && event.data?.type === 'okk-preview-ready') preview();
    });
    function reset() {
        dirty = false;
        current = null;
        clearTimeout(previewTimer);
    }
    return {
        refresh,
        reset,
        preview,
        hasChanges: () => dirty || uploads > 0,
        focusTarget: () => $('#editor').hidden ? $('#list-title') : $('#save'),
    };
}
