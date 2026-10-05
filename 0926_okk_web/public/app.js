import { sitePath, normalizeSitePath } from './shared/paths.js';
import { createCollection } from './site/data.js';
import { homePage } from './site/pages/home.js';
import { aboutPage } from './site/pages/about.js';
import { worksPage } from './site/pages/works.js';
import { createWorksFeed } from './site/works-feed.js';
import { projectPage } from './site/pages/project.js';
import { projectCards, projectViewControl, toggleProjectDisplayMode } from './site/projects.js';
import { clientLogos } from './site/clients.js';
import { setupHero } from './site/hero.js';
import { setupContact } from './site/contact.js';
import { setupNavigation, updateNavigation } from './site/navigation.js';

const redirectedPath = new URLSearchParams(location.search).get('path');
if (redirectedPath) history.replaceState({}, '', sitePath(redirectedPath));

const main = document.querySelector('#main');
const header = document.querySelector('#site-header');
const projects = createCollection('projects');
const clients = createCollection('clients');
const worksFeed = createWorksFeed();
let projectsRequest;
let cleanup;

function render() {
    cleanup?.();
    cleanup = undefined;
    main.before(header);
    const path = normalizeSitePath(location.pathname);
    updateNavigation(path);
    if (path === '/') {
        main.innerHTML = homePage(projects.state, clients.state);
        const hero = main.querySelector('.hero');
        hero.after(header);
        document.title = 'STUDIO OKK — A little different. A lot of fun.';
        cleanup = setupHero(hero);
    } else if (path === '/works') {
        main.innerHTML = worksPage();
        cleanup = worksFeed.mount(main);
        document.title = 'Works — STUDIO OKK';
    } else if (path === '/about') {
        main.innerHTML = aboutPage();
        document.title = 'Studio — STUDIO OKK';
    } else {
        const page = projectPage(path, projects.state);
        main.innerHTML = page.markup;
        document.title = page.title;
    }
    if (path === '/' || path.startsWith('/works/')) loadProjects();
}

setupContact(document.querySelector('#contact'));
setupNavigation({ main, render });
decorateNavigation();
document.addEventListener('click', event => {
    const control = event.target.closest('[data-work-view-toggle]');
    if (!control) return;
    toggleProjectDisplayMode();
    control.outerHTML = projectViewControl();
});
document.querySelector('#year').textContent = new Date().getFullYear();
render();

function decorateNavigation() {
    document.querySelectorAll('#site-header nav a, #site-header nav button[data-contact]').forEach(item => {
        const label = [...item.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        if (!label) return;
        const text = label.textContent.trim();
        item.setAttribute('aria-label', text);
        const wrapper = document.createElement('span');
        wrapper.className = 'nav-label';
        wrapper.setAttribute('aria-hidden', 'true');
        [...text].forEach((character, index) => {
            const letter = document.createElement('span');
            letter.className = 'nav-letter';
            letter.style.setProperty('--letter-index', index);
            letter.textContent = character === ' ' ? '\u00a0' : character;
            wrapper.append(letter);
        });
        label.replaceWith(wrapper);
    });
}

function loadProjects() {
    if (projectsRequest) return;
    projectsRequest = projects.load().then(() => {
        const path = normalizeSitePath(location.pathname);
        const grid = main.querySelector('.work-grid');
        if (grid && path === '/') grid.innerHTML = projectCards(projects.state, true);
        else if (path.startsWith('/works/')) render();
    });
}
clients.load().then(() => {
    const grid = main.querySelector('.logos');
    if (grid) grid.innerHTML = clientLogos(clients.state);
});
