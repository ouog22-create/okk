/* A 화면과 어드민 미리보기의 공통 렌더러. */
window.OKKProject = (() => {
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const colors = ['lavender','lime','pink','sky'];
    const image = (src, alt, color='lavender') => /^\/media\/[a-f0-9]{32}\.webp$/.test(src || '') ? `<img class="project-image" src="${src}" alt="${esc(alt)}" loading="lazy" decoding="async">` : `<div class="image-placeholder ${colors.includes(color) ? color : 'lavender'}"><span class="placeholder-center">프로젝트 이미지 준비 중</span></div>`;
    const card = (p, heading = 3) => `<a class="work-card" href="/okk/works/${esc(p.slug)}">${image(p.thumbnail || p.cover,'',p.color)}<div class="work-caption"><div><h${heading === 2 ? 2 : 3}>${esc(p.title)}</h${heading === 2 ? 2 : 3}><p>${esc(p.summary)}</p></div><span class="card-arrow" aria-hidden="true">↗</span></div></a>`;
    const detail = p => `<article class="page-section detail"><a class="back-link" href="/okk/works">← 모든 작업</a><div class="page-intro"><span class="eyebrow">STUDIO OKK / WORK</span><h1>${esc(p.title)}<span class="blue">.</span></h1><p>${esc(p.summary)}</p></div>${image(p.cover || p.thumbnail,p.title,p.color)}<div class="project-info"><h2>About the project</h2><div><p class="project-copy">${esc(p.description)}</p><dl>${[['CLIENT',p.client],['YEAR',p.year],['SCOPE',p.scope]].filter(([,v])=>v).map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div></div>${(p.gallery || []).map(i=>`<figure class="project-gallery">${image(i.src,i.alt || p.title)}${i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ''}</figure>`).join('')}<a class="pill" href="/okk/works">목록으로 돌아가기 ↗</a></article>`;
    return {esc,image,card,detail};
})();
