import { card } from '../project-view.js';

export function projectCards(state, featured = false) {
    if (state.loading) return '<p role="status">작업을 불러오는 중입니다.</p>';
    if (state.error) return '<p role="status">작업을 불러오지 못했습니다. 잠시 후 새로고침해주세요.</p>';
    return state.items.filter(project => !featured || project.featured)
        .map(project => card(project, featured ? 3 : 2)).join('')
        || '<p>새로운 작업을 준비하고 있습니다.</p>';
}
