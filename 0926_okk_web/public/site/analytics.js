import { normalizeSitePath } from '../shared/paths.js';

const MEASUREMENT_ID = 'G-H0HPRR40E7';
let lastPageUrl;

function pageUrl() {
    return location.origin + location.pathname + location.search;
}

export function trackPageView() {
    const url = pageUrl();
    if (url === lastPageUrl) return;
    const referrer = lastPageUrl || document.referrer;
    lastPageUrl = url;
    window.gtag?.('event', 'page_view', {
        send_to: MEASUREMENT_ID,
        page_location: url,
        page_title: document.title,
        page_referrer: referrer,
    });
}

export function setupProjectTracking({ projects, worksFeed }) {
    function onProjectClick(event) {
        if (event.type === 'click' && event.button !== 0) return;
        if (event.type === 'auxclick' && event.button !== 1) return;
        const link = event.target.closest?.('.work-card, .work-row');
        if (!link) return;
        const path = normalizeSitePath(new URL(link.href).pathname);
        const project = worksFeed.findProject(path)
            || projects.state.items.find(item => path === `/works/${item.slug}`);
        if (!project?.id) return;
        window.gtag?.('event', 'select_content', {
            send_to: MEASUREMENT_ID,
            content_type: 'project',
            content_id: `project_${project.id}`,
            project_title: project.title,
            click_location: link.closest('#selected') ? 'home_selected' : 'works_list',
            display_mode: link.classList.contains('work-row') ? 'list' : 'grid',
        });
    }
    document.addEventListener('click', onProjectClick, true);
    document.addEventListener('auxclick', onProjectClick, true);
}
