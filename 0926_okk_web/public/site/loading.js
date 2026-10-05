export function workLoadingMarkup() {
    const text = '로딩중...';
    const letters = [...text].map((letter, index) =>
        `<span class="nav-letter" style="--letter-index:${index}">${letter}</span>`).join('');
    return `<span class="loading-flicker" aria-hidden="true">${letters}</span><span class="loading-sr-only">${text}</span>`;
}
