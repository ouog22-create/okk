import { esc } from './shared/html.js';
import { projectPath, sitePath } from './shared/paths.js';

const colors = ['lavender', 'lime', 'pink', 'sky'];

export function image(src, alt, color = 'lavender') {
    if (/^\/media\/[a-f0-9]{32}\.webp$/.test(src || '')) {
        return `<img class="project-image" src="${src}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
    }
    return `<div class="image-placeholder ${colors.includes(color) ? color : 'lavender'}"><span class="placeholder-center">프로젝트 이미지 준비 중</span></div>`;
}

export function card(project, heading = 3) {
    const level = heading === 2 ? 2 : 3;
    return [
        `<a class="work-card" href="${projectPath(project.slug)}">`,
        image(project.thumbnail || project.cover, '', project.color),
        `<div class="work-caption"><div><h${level}>${esc(project.title)}</h${level}>`,
        `<p>${esc(project.summary)}</p></div><span class="card-arrow" aria-hidden="true">↗</span></div></a>`,
    ].join('');
}

export function detail(project) {
    const metadata = [['CLIENT', project.client], ['YEAR', project.year], ['SCOPE', project.scope]]
        .filter(([, value]) => value)
        .map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('');
    const gallery = (project.gallery || []).map(item => [
        '<figure class="project-gallery">',
        image(item.src, item.alt || project.title),
        item.caption ? `<figcaption>${esc(item.caption)}</figcaption>` : '',
        '</figure>',
    ].join('')).join('');
    return [
        `<article class="page-section detail"><a class="back-link" href="${sitePath('works')}">← 모든 작업</a>`,
        '<div class="page-intro"><span class="eyebrow">STUDIO OKK / WORK</span>',
        `<h1>${esc(project.title)}<span class="blue">.</span></h1><p>${esc(project.summary)}</p></div>`,
        image(project.cover || project.thumbnail, project.title, project.color),
        '<div class="project-info"><h2>About the project</h2><div>',
        `<p class="project-copy">${esc(project.description)}</p><dl>${metadata}</dl></div></div>`,
        gallery,
        `<a class="pill" href="${sitePath('works')}">목록으로 돌아가기 ↗</a></article>`,
    ].join('');
}
