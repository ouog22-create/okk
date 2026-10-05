// Observe content added by navigation, pagination, and asynchronous collections.
const targets = [
    '.hero-top', '.hero-bottom', '.section-heading', '.page-intro',
    '.work-card', '.work-row', '.logos > div', '.friends-image',
    '.about-copy', '.character-poster', '.character-story',
    '.detail > .project-image', '.detail > .image-placeholder',
    '.project-info', '.project-gallery', '.detail > .pill',
    '.contact-top', '.big-contact', 'body > footer',
].join(',');

export function setupReveals() {
    if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const seen = new WeakSet();
    const pending = new Set();
    const animations = new Map();
    const observer = new IntersectionObserver(entries => {
        let order = 0;
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const element = entry.target;
            observer.unobserve(element);
            pending.delete(element);
            element.classList.remove('reveal-pending');
            if (reduced.matches || element.contains(document.activeElement)) continue;
            const animation = element.animate([
                { opacity: 0, translate: '0 24px' },
                { opacity: 1, translate: '0 0' },
            ], {
                duration: 700,
                delay: Math.min(order++, 3) * 65,
                easing: 'cubic-bezier(.22, 1, .36, 1)',
                fill: 'backwards',
            });
            animations.set(element, animation);
            animation.onfinish = animation.oncancel = () => animations.delete(element);
        }
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

    function scan() {
        for (const element of pending) {
            if (!element.isConnected) {
                observer.unobserve(element);
                pending.delete(element);
            }
        }
        for (const [element, animation] of animations) {
            if (!element.isConnected) animation.cancel();
        }
        document.querySelectorAll(targets).forEach(element => {
            if (seen.has(element)) return;
            seen.add(element);
            if (reduced.matches) return;
            element.classList.add('reveal-pending');
            pending.add(element);
            observer.observe(element);
        });
    }

    // Keyboard navigation must never land on an invisible control.
    document.addEventListener('focusin', event => {
        for (const element of pending) {
            if (!element.contains(event.target)) continue;
            element.classList.remove('reveal-pending');
            observer.unobserve(element);
            pending.delete(element);
        }
        for (const [element, animation] of animations) {
            if (element.contains(event.target)) animation.cancel();
        }
    });
    reduced.addEventListener('change', () => {
        if (!reduced.matches) return;
        observer.disconnect();
        pending.forEach(element => element.classList.remove('reveal-pending'));
        pending.clear();
        animations.forEach(animation => animation.cancel());
    });
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    scan();
}
