const $ = (s, root = document) => root.querySelector(s);
const BASE = '/okk';
const asset = (path) => `${BASE}/assets/${path}`;

const redirectedPath = new URLSearchParams(location.search).get('path');
if (redirectedPath) {
    history.replaceState({}, '', `${BASE}${redirectedPath}`);
}

const main = $('#main');
const siteHeader = $('#site-header');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const works = Array.from({ length: 6 }, (_, i) => ({ slug: `project-${String(i + 1).padStart(2, '0')}`, number: `0${i + 1}`, title: `Project ${String(i + 1).padStart(2, '0')}`, color: ['lavender', 'lime', 'pink', 'sky', 'lime', 'lavender'][i] }));
const logos = [['1', 'peripera'], ['2', 'NHR'], ['3', 'the SMC GROUP'], ['4', 'SUNSOFT'], ['5', 'oVice'], ['6', 'Finset N'], ['7', 'heaventree'], ['8', '울산광역정신건강복지센터'], ['9', '대구대학교 산학협력단'], ['10', 'MVM'], ['sk', 'SK'], ['Artygen', 'Artygen Space'], ['사회평론', '사회평론'], ['앳홈', 'ATHOME'], ['망고', 'MANGO board']];
let cleanup = () => { };
let introPlayed = false;
const placeholder = (label, number = '', color = 'lavender') => `<div class="image-placeholder ${color}"><span class="placeholder-corner">STUDIO OKK — IMAGE SPACE</span><div class="placeholder-center"><span class="placeholder-icon">↗</span><span>${label}</span></div><span class="placeholder-bottom">IMAGE COMING SOON</span><span class="placeholder-number">${number}</span></div>`;
const cards = () => works.map(w => `<a class="work-card" href="${BASE}/works/${w.slug}" aria-label="${w.title} 상세 보기">${placeholder('프로젝트 이미지 준비 중', w.number, w.color)}<div class="work-caption"><div><h3>${w.title}</h3><p>작업명과 프로젝트 소개가 들어갈 자리</p></div><span class="card-arrow">↗</span></div></a>`).join('');
const contactSection = () => `<section class="contact-section"><div class="contact-top"><span class="eyebrow">HAVE SOMETHING IN MIND?</span><span>좋은 시작은, 가벼운 인사에서.</span></div><button data-contact class="big-contact">Let’s make<br><span>something <i>okk!</i></span><b>↗</b></button><div class="contact-bottom"><span>새로운 이야기를 기다립니다.</span><span>ouog22@gmail.com</span></div></section>`;
function charactersSection() {
    return `<section class="characters-section" aria-labelledby="characters-title"><div class="section-heading"><div><span class="eyebrow">THE CHARACTERS / OUR BLUE DREAM</span><h2 id="characters-title">Meet our friends<span class="blue">.</span></h2></div><p>같은 푸른 꿈을 품은 두 친구.</p></div><article class="character-profile"><img class="character-poster" src="${asset('okk-poster.jpg')}" alt="파란 비니와 윙크가 매력적인 오키키 포스터" width="1080" height="1351" loading="lazy"><div class="character-story"><span class="eyebrow">01 / THE DREAMER</span><h3>오키키 <span>OKK</span></h3><p>하늘과 바다의 푸르름, 그리고 꿈과 희망을 간직한 푸른 원석에서 태어난 옥돌 소년 오키키! 세상에서 가장 독보적인 보석이 되고 싶은 당찬 열망을 품고 있습니다. 머리에 눌러쓴 파란 비니는 오키키가 품은 식지 않는 푸른 꿈의 상징입니다.</p><p>찡긋한 윙크와 장난스러운 미소는 오키키만의 시그니처입니다. 당차고 쾌활한 매력에 귀여운 뒷모습까지, 어느 방향에서 보아도 즐거운 반전을 선사합니다.</p><p class="character-english" lang="en">OKK’s key feature is his playful expression, complete with a scrunched wink and smile! This signature look highlights his bold, cheerful charm, while his cute backside adds a delightful twist from behind.</p><details><summary>오키키의 다양한 모습 <span>＋</span></summary><img src="${asset('okk-turnaround.jpg')}" alt="오키키의 정면, 측면, 후면과 색상 가이드" width="1080" height="1351" loading="lazy"></details></div></article><article class="character-profile"><img class="character-poster" src="${asset('okkimong-poster.jpg')}" alt="오키키와 같은 파란 비니를 쓴 원숭이 친구 오키몽 포스터" width="1080" height="1351" loading="lazy"><div class="character-story"><span class="eyebrow">02 / THE MOOD MAKER</span><h3>오키몽 <span>OKKIMONG</span></h3><p>오키키가 원석 상태일 때부터 곁을 지켜온 신비로운 원숭이 친구! 귀여운 외형에 오키키와 커플로 맞춰 쓴 파란 비니가 매력 포인트입니다. 오키키가 외롭거나 좌절할 때 특유의 엉뚱함과 장난기로 웃음을 터뜨리게 만들어 주는 분위기 메이커입니다.</p><p>오키키와 닮은 찡긋한 윙크, 원숭이의 특징을 살린 하트 같은 뒷모습이 오키몽만의 매력을 완성합니다.</p><p class="character-english" lang="en">OKKIMONG’s key feature is matching OKK’s signature scrunched wink! Embracing his monkey traits, a heart-like backside was added, completing OKKIMONG’s unique charm.</p><details><summary>오키몽의 다양한 모습 <span>＋</span></summary><img src="${asset('okkimong-turnaround.jpg')}" alt="오키몽의 정면, 측면, 후면과 색상 가이드" width="1080" height="1351" loading="lazy"></details></div></article></section>`;
}
function home() {
    return `<section class="hero"><div class="hero-top"><span>INDEPENDENT CREATIVE STUDIO</span><span class="hello-note">A little different.<br>A lot of fun.</span></div><div class="hero-stage"><div class="intro-circle"></div><span class="orbit-note">A NEW POINT OF VIEW ↘</span><div class="mascot-position hero-friends"><div class="hero-friend friend-okk"><button type="button" class="mascot" data-character="okk" aria-label="오키키에게 인사하기"><img class="mascot-image" src="${asset('okk-cutout.png')}" alt="파란 비니를 쓰고 윙크하는 오키키" fetchpriority="high"><span class="mascot-fallback" hidden>OKK<br><small>오키키</small></span></button><span class="hello-bubble">Oh, hello! <span>↗</span></span></div><div class="hero-friend friend-mong"><button type="button" class="mascot" data-character="okkimong" aria-label="오키몽에게 인사하기" aria-expanded="false" aria-controls="mong-greeting"><img class="mascot-image" src="${asset('okkimong-cutout.png')}" alt="파란 비니를 쓰고 윙크하는 오키몽" fetchpriority="high"><span class="mascot-fallback" hidden>HI !<br><small>오키몽</small></span></button><span id="mong-greeting" class="hello-bubble mong-bubble" hidden>HI !</span></div></div><span class="stage-sticker">NICE TO<br>MEET YOU!</span><span class="click-note">click & say hello ⤴</span></div><h1 class="hero-title" aria-label="studio okk">${[...'studio okk'].map((x, i) => x === ' ' ? '<span class="word-space"></span>' : `<span aria-hidden="true" style="--i:${i}">${x}</span>`).join('')}<sup>®</sup></h1><div class="hero-bottom"><p>조금 다른 시선, 꽤 즐거운 결과.<br>우리는 스튜디오 오키키입니다.</p><a href="#selected">SCROLL TO EXPLORE <span>↓</span></a></div></section><section class="works-section" id="selected"><div class="section-heading"><div><span class="eyebrow">01 / SELECTED WORKS</span><h2>Good work.<br><span>Good energy.</span><i aria-hidden="true"><img class="star-icon" src="${asset('star_b.png')}" alt="" width="111" height="111"></i></h2></div><a class="pill" href="${BASE}/works">모든 작업 보기 <span>↗</span></a></div><div class="work-grid">${cards()}</div></section><section class="clients-section"><div class="section-heading"><div><span class="eyebrow">02 / OUR CLIENTS</span><h2>Better together<span class="blue">.</span></h2></div><p>함께해서 더 좋은 장면들.</p></div><div class="logos">${logos.map(([f, n]) => `<div><img src="${asset(`${encodeURIComponent(f)}.png`)}" alt="${n}" loading="lazy" width="200" height="90"></div>`).join('')}</div></section>${contactSection()}`;
}
function render() {
    cleanup();
    main.before(siteHeader);
    let path = location.pathname;
    if (path.startsWith(BASE)) path = path.slice(BASE.length);
    path = path.replace(/\/$/, '') || '/';

    document.querySelectorAll('nav a').forEach(a => {
        a.removeAttribute('aria-current');
        let navPath = new URL(a.href, location.origin).pathname;
        if (navPath.startsWith(BASE)) navPath = navPath.slice(BASE.length);
        navPath = navPath.replace(/\/$/, '') || '/';
        if (navPath !== '/' && path.startsWith(navPath)) a.setAttribute('aria-current', 'page');
        if (navPath === '/' && path === '/') a.setAttribute('aria-current', 'page');
    });
    if (path === '/') { main.innerHTML = home(); $('.hero').after(siteHeader); document.title = 'STUDIO OKK — A little different. A lot of fun.'; setupHero(); }
    else if (path === '/works') { main.innerHTML = `<section class="page-section"><div class="page-intro"><span class="eyebrow">OUR CREATIVE PLAYGROUND</span><h1>Works<span class="blue">.</span></h1><p>우리의 시선이 담긴 작업들.</p><span class="draft-note">작업 자료 준비 중 · 아래는 이미지와 소개를 위한 자리입니다.</span></div><div class="work-grid">${cards()}</div></section>${contactSection()}`; document.title = 'Works — STUDIO OKK'; }
    else if (path === '/about') { main.innerHTML = `<section class="page-section about"><div class="page-intro"><span class="eyebrow">HELLO, WE ARE STUDIO OKK</span><h1>A little different.<br><em>A lot of fun.</em></h1><p>조금 다른 시선으로, 함께 만드는 즐거운 가능성.</p><span class="draft-note">소개 문구 초안 · 최종 스튜디오 소개는 준비 중입니다.</span></div><figure class="friends-image"><img src="${asset('okk-friends.jpg')}" alt="푸른 꿈을 함께하는 오키키와 오키몽" width="1080" height="1351"></figure><div class="about-copy"><h2>Meet studio okk<span class="blue">.</span></h2><div><p>스튜디오의 이야기, 제공 서비스와 작업 방식을 소개할 공간입니다.</p><p class="muted">최종 소개 문구와 이미지가 준비되면 이곳에 반영됩니다.</p><button class="pill" data-contact>함께 이야기하기 ↗</button></div></div>${charactersSection()}</section>${contactSection()}`; document.title = 'Studio — STUDIO OKK'; }
    else { const w = works.find(w => path === `/works/${w.slug}`); if (w) { main.innerHTML = `<article class="page-section detail"><a class="back-link" href="${BASE}/works">← 모든 작업</a><div class="page-intro"><span class="eyebrow">PROJECT ${w.number} / PREVIEW</span><h1>${w.title}<span class="blue">.</span></h1><p>프로젝트 제목과 소개가 들어갈 자리입니다.</p></div>${placeholder('프로젝트 대표 이미지', w.number, w.color)}<div class="project-info"><h2>About the project</h2><div><p>작업 소개와 프로젝트의 배경, 과정 및 결과를 담을 공간입니다. 실제 프로젝트 자료는 준비 중입니다.</p><dl><div><dt>CLIENT</dt><dd>자료 준비 중</dd></div><div><dt>YEAR</dt><dd>자료 준비 중</dd></div><div><dt>SCOPE</dt><dd>자료 준비 중</dd></div></dl></div></div>${placeholder('프로젝트 상세 이미지', '', 'sky')}<a class="pill" href="${BASE}/works">목록으로 돌아가기 ↗</a></article>`; document.title = `${w.title} — STUDIO OKK`; } else { main.innerHTML = '<section class="page-section page-intro"><h1>Oops!</h1><p>페이지를 찾을 수 없습니다.</p><a class="pill" href="${BASE}/">홈으로 돌아가기 ↗</a></section>'; document.title = '페이지를 찾을 수 없습니다 — STUDIO OKK'; } }
}
function setupHero() {
    const hero = $('.hero'), position = $('.mascot-position');
    const friends = [...hero.querySelectorAll('.hero-friend')];
    let timers = [], scrolled = false;
    const title = $('.hero-title', hero);
    let titleObserver;
    // Play the title when it becomes visible, independently of character interactions.
    if (!introPlayed && !reduced.matches) {
        title.classList.add('title-waiting');
        const playTitle = () => {
            title.classList.remove('title-waiting');
            title.classList.add('title-playing');
            titleObserver?.disconnect();
        };
        if ('IntersectionObserver' in window) {
            titleObserver = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) playTitle();
            }, { threshold: .15 });
            titleObserver.observe(title);
        } else playTitle();
    }
    function finish() { hero.classList.remove('intro'); hero.classList.add('ready'); }
    function react(friend) {
        finish();
        if (reduced.matches || friend.classList.contains('reacting')) return;
        friend.classList.add('reacting');
        timers.push(setTimeout(() => friend.classList.remove('reacting'), 800));
    }
    if (!introPlayed && !reduced.matches) { hero.classList.add('intro'); timers.push(setTimeout(finish, 3600)); } else finish();
    introPlayed = true;
    friends.forEach(friend => {
        const button = $('.mascot', friend), img = $('.mascot-image', friend);
        button.addEventListener('click', () => {
            if (button.dataset.character === 'okkimong') {
                const open = button.getAttribute('aria-expanded') !== 'true';
                button.setAttribute('aria-expanded', String(open));
                $('#mong-greeting', friend).hidden = !open;
            }
            react(friend);
        });
        const imageFailed = () => { img.hidden = true; $('.mascot-fallback', friend).hidden = false; finish(); };
        img.addEventListener('error', imageFailed, { once: true });
        if (img.complete && !img.naturalWidth) imageFailed();
    });
    const scroll = () => {
        if (scrollY > 20 && hero.classList.contains('intro')) finish();
        if (scrollY > 140 && !scrolled) { scrolled = true; react(friends[0]); }
    };
    const move = e => {
        if (reduced.matches || !matchMedia('(pointer:fine)').matches) return;
        const r = hero.getBoundingClientRect();
        position.style.setProperty('--tilt', `${(e.clientX - r.left - r.width / 2) / r.width * 5}deg`);
    };
    const leave = () => position.style.setProperty('--tilt', '0deg');
    const change = () => { if (reduced.matches) { titleObserver?.disconnect(); title.classList.remove('title-waiting', 'title-playing'); finish(); leave(); friends.forEach(friend => friend.classList.remove('reacting')); } };
    addEventListener('scroll', scroll, { passive: true });
    hero.addEventListener('pointermove', move); hero.addEventListener('pointerleave', leave); reduced.addEventListener('change', change);
    cleanup = () => { titleObserver?.disconnect(); timers.forEach(clearTimeout); removeEventListener('scroll', scroll); reduced.removeEventListener('change', change); };
}
const dialog = $('#contact'); let opener;
function openContact(button) { opener = button; dialog.showModal(); document.body.classList.add('modal-open'); $('input', dialog).focus(); }
$('.close', dialog).onclick = () => dialog.close();
dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); opener?.focus(); });
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
document.addEventListener('click', e => {
    const contact = e.target.closest('[data-contact]'); if (contact) { openContact(contact); return; }
    const a = e.target.closest('a'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.hasAttribute('data-top')) { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduced.matches ? 'instant' : 'smooth' }); return; }
    if (a.origin === location.origin && a.pathname.startsWith(BASE)) {
        e.preventDefault();
        history.pushState({}, '', a.href);
        render();
        window.scrollTo(0, 0);
        main.focus({ preventScroll: true });
    }
});
window.addEventListener('popstate', () => { render(); });
const form = $('form', dialog), status = $('#form-status'); let sending = false;
form.addEventListener('submit', async e => {
    e.preventDefault(); if (sending) return; let invalid;
    form.querySelectorAll('input,textarea').forEach(input => { const error = input.value.trim() === '' ? '필수 항목을 입력해주세요.' : !input.validity.valid ? '올바른 형식으로 입력해주세요.' : ''; input.setAttribute('aria-invalid', !!error); const small = $('.error', input.parentElement); small.id = `error-${input.name}`; input.setAttribute('aria-describedby', small.id); small.textContent = error; if (error && !invalid) invalid = input; });
    if (invalid) { invalid.focus(); return; } sending = true; const button = $('.submit'); button.disabled = true; button.textContent = '전송 중…'; status.textContent = '';
    try { const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || '전송하지 못했습니다. 잠시 후 다시 시도해주세요.'); status.textContent = '문의가 접수되었습니다. 메일로 답변드리겠습니다.'; form.reset(); }
    catch (err) { status.textContent = err.message === 'Failed to fetch' ? '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' : err.message; }
    finally { sending = false; button.disabled = false; button.innerHTML = '접수하기 <span>↗</span>'; }
});
$('#year').textContent = new Date().getFullYear(); render();
