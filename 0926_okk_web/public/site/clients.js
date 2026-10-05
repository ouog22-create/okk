import { esc } from '../shared/html.js';
import { workLoadingMarkup } from './loading.js';

export function clientLogos(state) {
    if (state.loading) return `<p role="status">${workLoadingMarkup()}</p>`;
    if (state.error) return '<p role="status">클라이언트를 불러오지 못했습니다. 잠시 후 새로고침해주세요.</p>';
    return state.items.map(client => `<div><img src="${esc(client.logo)}" alt="${esc(client.name)}" loading="lazy" decoding="async" width="200" height="90"></div>`).join('');
}
