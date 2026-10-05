import { card } from '../project-view.js';
import { esc } from '../shared/html.js';
import { projectPath } from '../shared/paths.js';
import { workLoadingMarkup } from './loading.js';

let displayMode = 'grid';

export function getProjectDisplayMode() { return displayMode; }

export function toggleProjectDisplayMode() {
    displayMode = displayMode === 'grid' ? 'list' : 'grid';
    window.dispatchEvent(new CustomEvent('okk:work-view-change'));
    return displayMode;
}

export function projectViewControl() {
    const isList = displayMode === 'list';
    return `<button class="work-view-toggle" type="button" data-work-view-toggle aria-label="${isList ? '그리드 보기' : '목록 보기'}" aria-pressed="${isList}"><span>${isList ? 'GRID' : 'LIST'}</span><span aria-hidden="true">${isList ? '▦' : '☷'}</span></button>`;
}

export function projectList(items) {
    return `<div class="work-list" aria-label="프로젝트 목록">${items.map((project, index) => {
        const title = project.title || '';
        const client = project.client || '';
        const year = project.year || '';
        return `<a class="work-row" href="${projectPath(project.slug)}"><span class="work-row__title">${esc(title)}</span><span class="work-row__client">${esc(client)}</span><span class="work-row__year">${esc(year)}</span><span class="work-row__number">/${String(index + 1).padStart(3, '0')}</span></a>`;
    }).join('')}</div>`;
}

export function projectCards(state, featured = false) {
    if (state.loading) return `<p role="status">${workLoadingMarkup()}</p>`;
    if (state.error) return '<p role="status">작업을 불러오지 못했습니다. 잠시 후 새로고침해주세요.</p>';
    const items = state.items.filter(project => !featured || project.featured);
    return items.map(project => card(project, featured ? 3 : 2)).join('')
        || '<p>새로운 작업을 준비하고 있습니다.</p>';
}
