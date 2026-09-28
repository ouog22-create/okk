addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'okk-preview') return;
    const project = { ...event.data.project, title: event.data.project.title || '프로젝트 제목' };
    const top = scrollY;
    document.querySelector('#preview').innerHTML = event.data.mode === 'card'
        ? `<h1 class="preview-label">목록 카드 미리보기</h1><div class="work-grid preview-card">${OKKProject.card(project, 2)}</div>`
        : OKKProject.detail(project);
    scrollTo({ top, behavior: 'instant' });
});
document.addEventListener('click', event => { if (event.target.closest('a')) event.preventDefault(); });
parent.postMessage({ type: 'okk-preview-ready' }, location.origin);
