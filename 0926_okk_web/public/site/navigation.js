import { normalizeSitePath, isSitePath } from '../shared/paths.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

export function updateNavigation(path) {
    document.querySelectorAll('nav a').forEach(link => {
        link.removeAttribute('aria-current');
        const target = normalizeSitePath(new URL(link.href, location.origin).pathname);
        if (target === '/' ? path === '/' : path.startsWith(target)) {
            link.setAttribute('aria-current', 'page');
        }
    });
}

export function setupNavigation({ main, render }) {
    document.addEventListener('click', event => {
        const link = event.target.closest('a');
        if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        if (link.hasAttribute('data-top')) {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: reduced.matches ? 'instant' : 'smooth' });
            return;
        }
        if (link.origin === location.origin && link.pathname === location.pathname && link.hash) {
            const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
            if (target) {
                event.preventDefault();
                history.pushState({}, '', link.hash);
                target.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth' });
                target.focus({ preventScroll: true });
            }
            return;
        }
        if (link.origin === location.origin && !link.hasAttribute('download') && !link.target && isSitePath(link.pathname)) {
            event.preventDefault();
            history.pushState({}, '', link.href);
            render();
            window.scrollTo(0, 0);
            main.focus({ preventScroll: true });
        }
    });
    window.addEventListener('popstate', () => {
        render();
        main.focus({ preventScroll: true });
    });
}
