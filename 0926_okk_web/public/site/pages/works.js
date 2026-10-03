import { projectCards } from '../projects.js';
import { contactSection } from '../contact-section.js';

export function worksPage(projects) {
    return `<section class="page-section"><div class="page-intro"><span class="eyebrow">OUR CREATIVE PLAYGROUND</span><h1>Works<span class="blue">.</span></h1><p>우리의 시선이 담긴 작업들.</p></div><div class="work-grid">${projectCards(projects)}</div></section>${contactSection()}`;
}
