'use strict';
history.scrollRestoration = 'manual';
const $ = (s, root = document) => root.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const shortScreen = matchMedia('(max-height: 700px)');
const works = [
    { id: 'okk', code: 'A1', title: '오키키', en: 'OKK / THE DREAMER', image: 'okk-poster.jpg', turnaround: 'okk-turnaround.jpg', sprite: true, copy: '하늘과 바다의 푸르름, 꿈과 희망을 간직한 푸른 원석에서 태어난 옥돌 소년. 세상에서 가장 독보적인 보석이 되고 싶은 당찬 열망을 품고 있습니다. 파란 비니와 장난스러운 윙크는 오키키만의 시그니처입니다.' },
    { id: 'okkimong', code: 'A2', title: '오키몽', en: 'OKKIMONG / THE MOOD MAKER', image: 'okkimong-poster.jpg', turnaround: 'okkimong-turnaround.jpg', copy: '오키키가 원석일 때부터 곁을 지켜온 신비로운 원숭이 친구. 오키키와 맞춰 쓴 파란 비니와 시그니처 윙크, 하트 같은 뒷모습을 가지고 있습니다. 엉뚱함과 장난기로 친구에게 웃음을 주는 분위기 메이커입니다.' },
    { id: 'friends', code: 'A3', title: '함께라서 OKK!', en: 'OKK & OKKIMONG / FRIENDS', image: 'okk-friends.jpg', copy: '푸른 꿈을 품은 오키키와 언제나 곁을 지키는 오키몽. 서로 다른 매력이 만나 더 즐거운 이야기가 됩니다. 두 친구의 세계를 만나보세요.' },
    { id: 'okk-turnaround', code: 'B1', title: '오키키의 모든 순간', en: 'OKK / TURNAROUND', image: 'okk-turnaround.jpg', copy: '정면부터 옆모습, 뒷모습까지. 파란 비니와 장난스러운 표정, 둥근 실루엣에 담긴 오키키의 캐릭터 설정을 살펴보세요.' },
    { id: 'okkimong-turnaround', code: 'B2', title: '오키몽의 모든 순간', en: 'OKKIMONG / TURNAROUND', image: 'okkimong-turnaround.jpg', copy: '어느 방향에서도 오키몽다운 모습. 파란 비니부터 하트 같은 뒷모습까지, 오키몽의 다양한 모습을 담은 캐릭터 설정 자료입니다.' },
    { id: 'blue-dream', code: 'B3', title: '우리의 푸른 꿈', en: 'OKK FRIENDS / CHARACTER STORY', image: 'okk-friends.jpg', copy: '독보적인 보석이 되고 싶은 오키키와 그 곁을 지키는 오키몽. 함께 있는 포스터를 통해 두 친구가 나누는 푸른 꿈과 우정의 이야기를 소개합니다.' }
];
const packageColors = ['#df76a9', '#a2bf43', '#54b5d6', '#a897d4', '#e99761', '#72b9ae'];
function packageFigure(kind, back = false) {
    if (kind === 'monkey') return `<img class="package-monkey" src="/okk/b/assets/okkimong-cutout.png" alt="오키몽" onerror="this.onerror=null;this.src='/okk/assets/okkimong-poster.jpg'">`;
    return `<div class="package-okk ${back ? 'back-view' : ''}"><div class="slot-sprite" role="img" aria-label="오키키${back ? ' 뒷모습' : ''}"></div><img class="slot-image" src="/okk/assets/okk-poster.jpg" alt="오키키" loading="lazy"></div>`;
}
$('#work-grid').innerHTML = works.map((w, i) => `<article class="work-slot" style="--pack-accent:${packageColors[i]}"><div class="toy-package"><div class="package-label"><span class="hang-tab"></span><strong>OKK! FRIENDS</strong><b class="package-number" aria-hidden="true">${String(i + 1).padStart(2, '0')}</b><span class="package-edition">ORIGINAL</span><span class="package-series">✦ CHARACTER COLLECTION</span></div><div class="slot-stage"><div class="package-art ${i === 2 || i === 5 ? 'duo' : ''} variant-${i}">${i === 1 || i === 4 ? packageFigure('monkey') : i === 2 || i === 5 ? packageFigure('okk') + packageFigure('monkey') : packageFigure('okk', i === 3)}</div><div class="package-caption"><b>${w.title}</b><span>STUDIO OKK ORIGINAL</span></div></div></div><div class="slot-info"><button class="select-work" data-project="${w.id}" aria-label="${w.title} 상세 보기" aria-haspopup="dialog"><span>상세 보기</span></button></div></article>`).join('');
const logos = [['1', 'peripera'], ['2', 'NHR'], ['3', 'the SMC GROUP'], ['4', 'SUNSOFT'], ['5', 'oVice'], ['6', 'Finset N'], ['7', 'heaventree'], ['8', '울산광역정신건강복지센터'], ['9', '대구대학교 산학협력단'], ['10', 'MVM'], ['sk', 'SK'], ['Artygen', 'Artygen Space'], ['사회평론', '사회평론'], ['앳홈', 'ATHOME'], ['망고', 'MANGO board']];
const logoImages = logos.map(([file, name]) => `<img src="/okk/assets/${encodeURIComponent(file)}.png" alt="${name}" width="105" height="42">`).join('');
$('#logos').innerHTML = `<div class="logo-group">${logoImages}</div><div class="logo-group" aria-hidden="true">${logoImages}</div>`;
const logosMotion = $('.logos-motion');
let logosPaused = reduced.matches;
function syncLogosMotion() {
    $('#logos').classList.toggle('is-paused', logosPaused);
    logosMotion.hidden = reduced.matches;
    logosMotion.textContent = logosPaused ? '로고 움직임 재생하기' : '로고 움직임 멈추기';
}
logosMotion.onclick = () => { logosPaused = !logosPaused; syncLogosMotion(); };
reduced.addEventListener('change', () => { logosPaused = reduced.matches; syncLogosMotion(); });
syncLogosMotion();
const scene = $('.page-scene');
function sizeScene() { scene.style.setProperty('--scene-top', `${Math.min(0, innerHeight - scene.offsetHeight)}px`); }
new ResizeObserver(sizeScene).observe(scene);
addEventListener('resize', sizeScene);
sizeScene();
$('#year').textContent = new Date().getFullYear();
const sprite = new Image(); sprite.onload = () => document.body.classList.add('sprite-ready'); sprite.src = '/okk/b/assets/okk-rotation.png';
const track = $('.hero-track'), stage = $('.hero-stage'), studio = $('#studio'), character = $('.hero-character');
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const ease = p => p * p * (3 - 2 * p);
let staticHero = false, ticking = false;
function configure() {
    staticHero = reduced.matches || shortScreen.matches;
    document.body.classList.toggle('static-hero', staticHero);
    update();
}
// 고정된 장면에서도 문서 기준 위치를 사용한다.
function layoutTop(element) {
    let top = 0;
    for (let node = element; node && node !== scene; node = node.offsetParent) top += node.offsetTop;
    return top;
}
function studioY() { return staticHero ? layoutTop(studio) - 100 : track.offsetTop + (track.offsetHeight - stage.offsetHeight) * .9; }
function update() {
    ticking = false;
    const p = staticHero ? 0 : clamp((scrollY - track.offsetTop) / (track.offsetHeight - stage.offsetHeight));
    const movement = ease(clamp((p - .1) / .75));
    const copy = staticHero ? 1 : clamp((p - .55) / .25);
    stage.style.setProperty('--p', p);
    stage.style.setProperty('--title-opacity', 1 - clamp((p - .12) / .43));
    stage.style.setProperty('--copy-opacity', copy);
    const mobile = innerWidth < 768;
    const x = mobile ? innerWidth * .18 : innerWidth * .24;
    stage.style.setProperty('--move-x', `${movement * x}px`);
    stage.style.setProperty('--move-y', `${movement * (mobile ? stage.offsetHeight * .18 : -stage.offsetHeight * .09)}px`);
    stage.style.setProperty('--scale', 1 - movement * (mobile ? .25 : .03));
    const frame = Math.round(movement * 14);
    character.style.setProperty('--sprite-x', `${frame % 5 * 25}%`);
    const row = Math.floor(frame / 5);
    character.style.setProperty('--sprite-y', `${[0, 53.0421, 100][row]}%`);
    character.style.setProperty('--sprite-height', `${[285.5882, 294.2424, 322.5914][row]}%`);
    studio.classList.toggle('is-visible', copy > 0);
    studio.inert = copy < .95;
    studio.setAttribute('aria-hidden', String(copy === 0));
    $('.hero-copy').setAttribute('aria-hidden', String(p > .55));
    $('.hero-bottom').inert = p > .55;
    const current = scrollY + 140;
    let active = scrollY >= studioY() - 140 ? 'studio' : 'home';
    ['works', 'clients', 'contact'].forEach(id => { if ($('#' + id).getBoundingClientRect().top + scrollY <= current) active = id; });
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) active = 'contact';
    document.querySelectorAll('nav a').forEach(a => { if (a.hash === '#' + active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
addEventListener('resize', configure); reduced.addEventListener('change', configure); shortScreen.addEventListener('change', configure);
const menu = $('.menu-toggle'), nav = $('nav');
function closeMenu() { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
menu.onclick = () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); };
addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menu.focus(); } });
let focusTimer;
function navigate(hash, behavior = 'smooth', focus = false) {
    const target = $(hash || '#home'); if (!target) return;
    closeMenu();
    const y = hash === '#studio' ? studioY() : hash === '#home' ? 0 : layoutTop(target) - (hash === '#contact' ? 0 : 100);
    scrollTo({ top: Math.max(0, y), behavior: reduced.matches ? 'instant' : behavior });
    clearTimeout(focusTimer);
    if (focus) focusTimer = setTimeout(() => { if (target === studio) update(); target.focus({ preventScroll: true }); }, behavior === 'instant' || reduced.matches ? 0 : 650);
}
document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); history.pushState({}, '', a.hash); navigate(a.hash, 'smooth', true);
});
const project = $('#project-dialog'), contact = $('#contact'); let projectOpener, projectY = 0;
function openProject(id, record = true) {
    const w = works.find(w => w.id === id); if (!w) return;
    projectOpener = $(`[data-project="${id}"]`);
    projectY = scrollY;
    $('#project-content').innerHTML = `<div class="project-heading"><span class="eyebrow">${w.code} / STUDIO OKK ORIGINAL</span><h2 id="project-title">${w.title}</h2><p>${w.en}</p></div><img class="project-art" src="/okk/assets/${w.image}" alt="${w.title} 포스터"><div class="project-description"><h3>Meet our friend.</h3><p>${w.copy}</p>${w.turnaround ? `<img src="/okk/assets/${w.turnaround}" alt="${w.title} 정면, 측면, 후면 설정" loading="lazy">` : ''}</div>`;
    if (record) history.pushState({ project: id, returnY: scrollY }, '', `#work-${id}`);
    if (!project.open) project.showModal(); project.scrollTop = 0; document.body.classList.add('modal-open'); $('.project-close').focus();
}
function closeProject() { if (history.state?.project) { history.back(); } else project.close(); }
$('.project-close').onclick = closeProject;
project.addEventListener('cancel', e => { e.preventDefault(); closeProject(); });
project.addEventListener('close', () => { document.body.classList.remove('modal-open'); scrollTo({ top: projectY, behavior: 'instant' }); projectOpener?.focus({ preventScroll: true }); });
document.addEventListener('click', e => { const b = e.target.closest('[data-project]'); if (b) openProject(b.dataset.project); });
project.addEventListener('click', e => {
    if (e.target !== project) return;
    const r = project.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeProject();
});

function restore() {
    if (location.hash.startsWith('#work-')) { openProject(location.hash.slice(6), false); return; }
    const wasOpen = project.open; if (wasOpen) project.close();
    if (!wasOpen) navigate(location.hash || '#home', 'instant');
}
addEventListener('popstate', restore);
const form = $('form', contact), status = $('#form-status'); let sending = false;
form.addEventListener('submit', async e => {
    e.preventDefault(); if (sending) return; let invalid;
    form.querySelectorAll('input,textarea').forEach(input => { const error = input.value.trim() === '' ? '필수 항목을 입력해주세요.' : !input.validity.valid ? '올바른 형식으로 입력해주세요.' : ''; input.setAttribute('aria-invalid', String(!!error)); const small = $('.error', input.parentElement); small.id = `error-${input.name}`; input.setAttribute('aria-describedby', small.id); small.textContent = error; if (error && !invalid) invalid = input; });
    if (invalid) { invalid.focus(); return; } sending = true; const button = $('.submit'); button.disabled = true; button.textContent = '전송 중…'; status.textContent = '';
    try { const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || '전송하지 못했습니다. 잠시 후 다시 시도해주세요.'); status.textContent = '문의가 접수되었습니다. 메일로 답변드리겠습니다.'; form.reset(); }
    catch (err) { status.textContent = err.message === 'Failed to fetch' ? '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' : err.message; }
    finally { sending = false; button.disabled = false; button.innerHTML = '접수하기 <span>↗</span>'; }
});
configure();
requestAnimationFrame(() => {
    if (location.hash.startsWith('#work-')) { const id = location.hash.slice(6); history.replaceState({}, '', '#works'); navigate('#works', 'instant'); openProject(id); }
    else navigate(location.hash || '#home', 'instant');
});
// 이미지 배치 후 브라우저의 해시 스크롤을 보정한다.
addEventListener('load', () => { if (!location.hash.startsWith('#work-')) navigate(location.hash || '#home', 'instant'); }, { once: true });
