import { contactSection } from '../contact-section.js';

export function worksPage() {
    return `<section class="page-section"><div class="page-intro"><span class="eyebrow">OUR CREATIVE PLAYGROUND</span><h1>Works<span class="blue">.</span></h1><p>우리의 시선이 담긴 작업들.</p></div><div class="work-grid" aria-busy="true"></div><div class="works-loading"><p id="works-status" role="status" aria-live="polite"></p><button id="works-more" class="pill" type="button" hidden>더 불러오기</button><div id="works-sentinel" aria-hidden="true"></div></div></section>${contactSection()}`;
}
