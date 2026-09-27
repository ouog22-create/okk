'use strict';
(() => {
    const game = document.querySelector('.playground');
    const world = game.querySelector('.play-world');
    const player = game.querySelector('.play-player');
    const art = game.querySelector('.player-art');
    const sprite = game.querySelector('.player-sprite');
    const shadow = game.querySelector('.player-shadow');
    const stars = [...game.querySelectorAll('[data-spark]')];
    const score = game.querySelector('#play-score');
    const status = game.querySelector('#play-status');
    const controls = [...game.querySelectorAll('[data-move]')];
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const keys = new Set();
    const pointers = new Map();
    let x = 0, y = 0, vy = 0, width = 0, size = 0, facing = 1;
    let destination = null, running = false, last = 0, raf = 0, visible = true, phase = 0;
    const limit = n => Math.max(0, Math.min(Math.max(0, width - size), n));
    const direction = () => {
        const left = keys.has('ArrowLeft') || keys.has('KeyA') || [...pointers.values()].includes(-1);
        const right = keys.has('ArrowRight') || keys.has('KeyD') || [...pointers.values()].includes(1);
        return Number(right) - Number(left);
    };
    function draw(moving = false) {
        player.style.transform = `translate3d(${x}px, ${-y}px, 0)`;
        const bob = moving && y === 0 && !motion.matches ? Math.abs(Math.sin(phase)) * 4 : 0;
        art.style.transform = `translateY(${-bob}px) rotate(${moving && !motion.matches ? Math.sin(phase) * 2 : 0}deg) scaleX(${moving ? facing : 1})`;
        sprite.style.backgroundPosition = moving ? '25% 53.0421%' : '0% 0%';
        sprite.style.backgroundSize = moving ? '500% 294.2424%' : '500% 285.5882%';
        shadow.style.transform = `translateX(${x + size * .225}px) scale(${Math.max(.45, 1 - y / 230)})`;
        shadow.style.opacity = Math.max(.25, 1 - y / 200);
        controls.forEach(button => button.classList.toggle('is-pressed', direction() === Number(button.dataset.move)));
    }
    function collect() {
        // Stars require a jump; collecting uses the character's center in world coordinates.
        if (y < 35) return;
        for (const star of stars) {
            if (star.classList.contains('is-collected')) continue;
            const sx = star.offsetLeft;
            const sy = world.clientHeight - star.offsetTop - star.offsetHeight / 2;
            if (Math.abs(x + size / 2 - sx) < size * .34 && Math.abs(y + size * .55 - sy) < size * .45) {
                star.classList.add('is-collected');
                const count = stars.filter(s => s.classList.contains('is-collected')).length;
                score.value = `${count} / 3`;
                status.textContent = count === 3 ? '별 세 개를 모두 모았어요! 다시 시작 버튼으로 한 번 더 놀아보세요.' : `별 ${count}개를 모았어요.`;
                game.classList.toggle('all-collected', count === 3);
            }
        }
    }
    function frame(now) {
        const dt = Math.min((now - last) / 1000, .035);
        last = now;
        let dx = direction();
        if (dx) destination = null;
        else if (destination !== null) {
            const distance = destination - x;
            if (Math.abs(distance) < 4) { x = destination; destination = null; }
            else dx = Math.sign(distance);
        }
        const previous = x;
        const speed = width < 768 ? 230 : 310;
        if (dx) {
            facing = dx;
            const step = dx * speed * dt;
            x = limit(destination === null ? x + step : x + Math.sign(step) * Math.min(Math.abs(step), Math.abs(destination - x)));
        }
        if (y > 0 || vy > 0) { vy -= 1550 * dt; y = Math.max(0, y + vy * dt); if (!y) vy = 0; }
        phase += dt * 15;
        collect();
        draw(Math.abs(x - previous) > .05);
        if (visible && (dx || destination !== null || y > 0)) raf = requestAnimationFrame(frame);
        else { running = false; draw(); }
    }
    function start() {
        if (running || !visible) return;
        running = true; last = performance.now(); raf = requestAnimationFrame(frame);
    }
    function jump() { if (!visible || y > 0) return; vy = 650; start(); }
    function stop() {
        keys.clear(); pointers.clear(); destination = null;
        cancelAnimationFrame(raf); running = false; y = 0; vy = 0; draw();
    }
    function resize() {
        const progress = width > size ? x / (width - size) : .43;
        width = world.clientWidth; size = player.offsetWidth;
        x = limit((width - size) * progress); destination = null; draw();
    }
    new ResizeObserver(resize).observe(world);
    resize();
    game.addEventListener('keydown', e => {
        if (e.altKey || e.metaKey || e.ctrlKey || e.target.closest('input,textarea,select')) return;
        if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
            e.preventDefault(); keys.add(e.code); start();
        } else if (['Space', 'ArrowUp', 'KeyW'].includes(e.code) && !e.target.closest('button')) {
            e.preventDefault(); if (!e.repeat) jump();
        }
    });
    addEventListener('keyup', e => { if (keys.delete(e.code)) { draw(); start(); } });
    controls.forEach(button => {
        button.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            e.preventDefault(); button.focus({ preventScroll: true });
            button.setPointerCapture(e.pointerId); pointers.set(e.pointerId, Number(button.dataset.move)); start();
        });
        const release = e => { pointers.delete(e.pointerId); draw(); };
        button.addEventListener('pointerup', release);
        button.addEventListener('pointercancel', release);
        button.addEventListener('lostpointercapture', release);
        button.addEventListener('keydown', e => {
            if (['Space', 'Enter'].includes(e.code)) { e.preventDefault(); pointers.set(button, Number(button.dataset.move)); start(); }
        });
        button.addEventListener('keyup', e => {
            if (['Space', 'Enter'].includes(e.code)) { e.preventDefault(); pointers.delete(button); draw(); }
        });
        button.addEventListener('blur', () => { pointers.delete(button); });
    });
    game.querySelector('[data-jump]').addEventListener('click', jump);
    const companion = game.querySelector('.play-friend');
    companion.addEventListener('click', e => {
        e.stopPropagation();
        stop();
        const monkey = game.dataset.character !== 'okkimong';
        game.dataset.character = monkey ? 'okkimong' : 'okk';
        const name = monkey ? '오키몽' : '오키키';
        const nextName = monkey ? '오키키' : '오키몽';
        player.setAttribute('aria-label', `직접 움직이는 ${name}`);
        game.setAttribute('aria-label', `${name} 캐릭터 놀이터`);
        companion.setAttribute('aria-label', `${nextName}으로 변경`);
        status.textContent = `${name}으로 변경했어요. 이동과 점프를 계속해보세요.`;
        game.focus({ preventScroll: true });
        draw();
    });
    world.addEventListener('click', e => {
        game.focus({ preventScroll: true });
        destination = limit(e.clientX - world.getBoundingClientRect().left - size / 2); start();
    });
    game.querySelector('.play-reset').addEventListener('click', () => {
        stop(); x = limit((width - size) * .43); stars.forEach(s => s.classList.remove('is-collected'));
        score.value = '0 / 3'; game.classList.remove('all-collected'); status.textContent = '새로운 놀이를 시작해요.'; draw();
    });
    game.addEventListener('focusout', e => { if (!game.contains(e.relatedTarget)) stop(); });
    addEventListener('blur', stop);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (!visible) stop();
    }, { threshold: 0 }).observe(world);
})();
