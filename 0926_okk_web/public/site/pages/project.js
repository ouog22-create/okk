import { detail } from '../../project-view.js';
import { sitePath } from '../../shared/paths.js';

export function projectPage(path, projects) {
    if (path.startsWith('/works/') && (projects.loading || projects.error)) {
        const message = projects.loading ? '작업을 불러오는 중입니다.' : '작업을 불러오지 못했습니다. 잠시 후 새로고침해주세요.';
        return { title: 'Work — STUDIO OKK', markup: `<section class="page-section"><h1>Work</h1><p role="status">${message}</p></section>` };
    }
    const project = projects.items.find(item => path === `/works/${item.slug}`);
    if (project) return { title: `${project.title} — STUDIO OKK`, markup: detail(project) };
    return {
        title: '페이지를 찾을 수 없습니다 — STUDIO OKK',
        markup: `<section class="page-section page-intro"><h1>Oops!</h1><p>페이지를 찾을 수 없습니다.</p><a class="pill" href="${sitePath()}">홈으로 돌아가기 ↗</a></section>`,
    };
}
