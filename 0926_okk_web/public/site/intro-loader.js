const loader = document.getElementById('intro-loader');

if (loader) {
    const bar = loader.querySelector('.intro-loader__progress span');
    const value = loader.querySelector('.intro-loader__value');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let progress = 0;
    const startedAt = performance.now();

    function paint(next) {
        progress = Math.min(100, next);
        bar.style.width = `${progress}%`;
        value.textContent = String(Math.round(progress)).padStart(2, '0');
    }

    const timer = setInterval(() => {
        if (progress < 90) paint(Math.min(90, progress + Math.max(.35, (90 - progress) * .035)));
    }, 45);

    function finish() {
        clearInterval(timer);
        const delay = Math.max(0, (reducedMotion ? 0 : 650) - (performance.now() - startedAt));
        setTimeout(() => {
            paint(100);
            setTimeout(() => {
                loader.classList.add('is-leaving');
                loader.addEventListener('transitionend', () => loader.remove(), { once: true });
                if (reducedMotion) loader.remove();
            }, reducedMotion ? 0 : 220);
        }, delay);
    }

    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish, { once: true });
}
