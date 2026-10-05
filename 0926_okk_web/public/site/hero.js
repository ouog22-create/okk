import { assetPath as asset } from '../shared/paths.js';

const $ = (selector, root) => root.querySelector(selector);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let introPlayed = false;

export function setupHero(hero) {
    const position = $('.mascot-position', hero);
    const friends = [...hero.querySelectorAll('.hero-friend')];
    let timers = [], scrolled = false;
    const updateImages = [];
    let heroVisible = true;
    let disposed = false;
    function syncMotion() {
        updateImages.forEach(updateImage => updateImage());
    }
    const motionVisibility = () => syncMotion();
    document.addEventListener('visibilitychange', motionVisibility);
    const heroObserver = new IntersectionObserver(entries => {
        heroVisible = entries[0].isIntersecting;
        syncMotion();
    });
    heroObserver.observe(hero);
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
        const still = img.getAttribute('src');
        const animated = asset(`${button.dataset.character}-loop.webp`);
        let animationReady = false;
        let animationRequested = false;
        let animationFailed = false;
        const preload = new Image();
        preload.fetchPriority = 'low';
        preload.onload = () => {
            if (disposed) return;
            animationReady = true;
            updateImage();
        };
        preload.onerror = () => { animationFailed = true; };
        const requestAnimation = () => {
            if (disposed || animationRequested || animationFailed || reduced.matches || !heroVisible || document.hidden || !img.complete || !img.naturalWidth) return;
            animationRequested = true;
            preload.src = animated;
        };
        const updateImage = () => {
            const playing = animationReady && !animationFailed && !reduced.matches && heroVisible && !document.hidden;
            const next = playing ? animated : still;
            if (img.getAttribute('src') !== next) img.src = next;
            friend.classList.toggle('frame-playing', playing);
            if (!animationRequested) timers.push(setTimeout(requestAnimation, 1200));
        };
        updateImages.push(updateImage);
        button.addEventListener('click', () => {
            if (button.dataset.character === 'okkimong') {
                const open = button.getAttribute('aria-expanded') !== 'true';
                button.setAttribute('aria-expanded', String(open));
                $('#mong-greeting', friend).hidden = !open;
            }
            react(friend);
        });
        const imageFailed = () => { if (img.getAttribute('src') !== still) return; img.hidden = true; $('.mascot-fallback', friend).hidden = false; finish(); };
        img.addEventListener('error', () => {
            if (img.getAttribute('src') === animated) {
                animationFailed = true;
                img.src = still;
                friend.classList.remove('frame-playing');
            } else imageFailed();
        });
        img.addEventListener('load', () => {
            if (!animationRequested && !disposed) timers.push(setTimeout(requestAnimation, 1200));
        });
        if (img.complete && !img.naturalWidth) imageFailed();
        updateImage();
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
    syncMotion();
    const change = () => { syncMotion(); if (reduced.matches) { titleObserver?.disconnect(); title.classList.remove('title-waiting', 'title-playing'); finish(); leave(); friends.forEach(friend => friend.classList.remove('reacting')); } };
    addEventListener('scroll', scroll, { passive: true });
    hero.addEventListener('pointermove', move); hero.addEventListener('pointerleave', leave); reduced.addEventListener('change', change);
    return () => { disposed = true; heroObserver.disconnect(); document.removeEventListener('visibilitychange', motionVisibility); titleObserver?.disconnect(); timers.forEach(clearTimeout); removeEventListener('scroll', scroll); hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', leave); reduced.removeEventListener('change', change); };
}
