const $ = (selector, root) => root.querySelector(selector);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let introPlayed = false;

export function setupHero(hero) {
    const friends = [...hero.querySelectorAll('.hero-friend')];
    let timers = [], scrolled = false;
    const title = $('.hero-title', hero);
    let titleObserver;
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
        img.addEventListener('error', imageFailed);
        if (img.complete && !img.naturalWidth) imageFailed();
    });
    const scroll = () => {
        if (scrollY > 20 && hero.classList.contains('intro')) finish();
        if (scrollY > 140 && !scrolled) { scrolled = true; react(friends[0]); }
    };
    const change = () => { if (reduced.matches) { titleObserver?.disconnect(); title.classList.remove('title-waiting', 'title-playing'); finish(); friends.forEach(friend => friend.classList.remove('reacting')); } };
    addEventListener('scroll', scroll, { passive: true });
    reduced.addEventListener('change', change);
    return () => { titleObserver?.disconnect(); timers.forEach(clearTimeout); removeEventListener('scroll', scroll); reduced.removeEventListener('change', change); };
}
