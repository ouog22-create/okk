export function setupContact(dialog) {
    let opener;

    function open(trigger) {
        opener = trigger;
        dialog.showModal();
        document.body.classList.add('modal-open');
        dialog.querySelector('.contact-email').focus();
    }

    dialog.addEventListener('close', () => {
        document.body.classList.remove('modal-open');
        opener?.focus();
    });
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
