export function setupContact(dialog) {
    let opener;
    const card = dialog.querySelector('.contact-card');
    const star = dialog.querySelector('.contact-star');
    const front = dialog.querySelector('.contact-card-front');
    const back = dialog.querySelector('.contact-card-back');
    const returnButton = dialog.querySelector('.contact-card-return');

    function setFlipped(flipped) {
        card.classList.toggle('is-flipped', flipped);
        front.inert = flipped;
        back.inert = !flipped;
        star.setAttribute('aria-expanded', String(flipped));
        (flipped ? returnButton : star).focus();
    }

    function open(trigger) {
        opener = trigger;
        card.classList.remove('is-flipped');
        front.inert = false;
        back.inert = true;
        star.setAttribute('aria-expanded', 'false');
        dialog.showModal();
        document.body.classList.add('modal-open');
        star.focus();
    }

    dialog.addEventListener('close', () => {
        document.body.classList.remove('modal-open');
        opener?.focus();
    });
    star.addEventListener('click', () => setFlipped(true));
    returnButton.addEventListener('click', () => setFlipped(false));
    dialog.querySelector('.contact-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    document.addEventListener('click', event => {
        const trigger = event.target.closest('[data-contact]');
        if (trigger) open(trigger);
    });
}
