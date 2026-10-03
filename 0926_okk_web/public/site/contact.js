import { apiPath } from '../shared/paths.js';

export function setupContact(dialog) {
    const form = dialog.querySelector('form');
    const status = dialog.querySelector('#form-status');
    const button = form.querySelector('.submit');
    let opener, sending = false;

    function open(trigger) {
        opener = trigger;
        dialog.showModal();
        document.body.classList.add('modal-open');
        form.querySelector('input').focus();
    }

    dialog.querySelector('.close').onclick = () => dialog.close();
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

    function validate() {
        let invalid;
        form.querySelectorAll('input,textarea').forEach(input => {
            const error = input.value.trim() === '' ? '필수 항목을 입력해주세요.'
                : !input.validity.valid ? '올바른 형식으로 입력해주세요.' : '';
            input.setAttribute('aria-invalid', String(!!error));
            const hint = input.parentElement.querySelector('.error');
            hint.id = `error-${input.name}`;
            input.setAttribute('aria-describedby', hint.id);
            hint.textContent = error;
            if (error && !invalid) invalid = input;
        });
        invalid?.focus();
        return !invalid;
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (sending || !validate()) return;
        sending = true;
        button.disabled = true;
        button.textContent = '전송 중…';
        status.textContent = '';
        try {
            const response = await fetch(apiPath('contact'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(form))),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || '전송하지 못했습니다. 잠시 후 다시 시도해주세요.');
            status.textContent = '문의가 접수되었습니다. 메일로 답변드리겠습니다.';
            form.reset();
        } catch (error) {
            status.textContent = error.message === 'Failed to fetch'
                ? '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' : error.message;
        } finally {
            sending = false;
            button.disabled = false;
            button.innerHTML = '접수하기 <span>↗</span>';
        }
    });
}
