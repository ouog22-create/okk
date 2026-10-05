import { apiPath } from '../shared/paths.js';
import { card } from '../project-view.js';
import { getProjectDisplayMode, projectList } from './projects.js';
import { workLoadingMarkup } from './loading.js';

export function createWorksFeed() {
    const state = { items: [], nextOffset: 0, loading: false, error: false };
    const listeners = new Set();
    const notify = () => listeners.forEach(listener => listener());

    async function loadNext() {
        if (state.loading || state.nextOffset === null) return;
        state.loading = true;
        state.error = false;
        notify();
        try {
            const params = new URLSearchParams({ limit: '10', offset: String(state.nextOffset) });
            const response = await fetch(`${apiPath('projects')}?${params}`);
            if (!response.ok) throw new Error();
            const result = await response.json();
            if (!Array.isArray(result.projects) || !(result.next_offset === null || Number.isInteger(result.next_offset) && result.next_offset > state.nextOffset)) throw new Error();
            const slugs = new Set(state.items.map(project => project.slug));
            state.items.push(...result.projects.filter(project => !slugs.has(project.slug)));
            state.nextOffset = result.next_offset;
        } catch { state.error = true; }
        finally { state.loading = false; notify(); }
    }

    function mount(root) {
        const grid = root.querySelector('.work-grid');
        const status = root.querySelector('#works-status');
        const button = root.querySelector('#works-more');
        const sentinel = root.querySelector('#works-sentinel');
        let rendered = 0;
        let renderedMode = getProjectDisplayMode();
        const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) loadNext();
        }, { rootMargin: '0px 0px 200px 0px' }) : null;

        function update() {
            const mode = getProjectDisplayMode();
            if (mode !== renderedMode) {
                grid.replaceChildren();
                rendered = 0;
                renderedMode = mode;
            }
            if (mode === 'list' && state.items.length !== rendered) {
                grid.innerHTML = projectList(state.items);
                rendered = state.items.length;
            } else if (mode === 'grid' && state.items.length > rendered) {
                if (!rendered) grid.replaceChildren();
                grid.insertAdjacentHTML('beforeend', state.items.slice(rendered).map(project => card(project, 2)).join(''));
                rendered = state.items.length;
            }
            if (!state.items.length && state.nextOffset === null) grid.innerHTML = '<p>새로운 작업을 준비하고 있습니다.</p>';
            grid.setAttribute('aria-busy', String(state.loading));
            status.innerHTML = state.loading ? workLoadingMarkup()
                : state.error ? '작업을 불러오지 못했습니다. 다시 시도해주세요.'
                : state.nextOffset === null && state.items.length ? '모든 작업을 불러왔습니다.' : '';
            button.hidden = state.loading || state.nextOffset === null;
            button.textContent = state.error ? '다시 시도' : '더 불러오기';
            observer?.disconnect();
            if (!state.loading && !state.error && state.nextOffset !== null) observer?.observe(sentinel);
        }

        button.addEventListener('click', loadNext);
        window.addEventListener('okk:work-view-change', update);
        listeners.add(update);
        update();
        if (!state.items.length && !state.error) loadNext();
        return () => {
            observer?.disconnect();
            listeners.delete(update);
            button.removeEventListener('click', loadNext);
            window.removeEventListener('okk:work-view-change', update);
        };
    }

    return { mount };
}
