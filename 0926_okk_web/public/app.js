import { sitePath, normalizeSitePath } from './shared/paths.js';
import { createCollection } from './site/data.js';
import { homePage } from './site/pages/home.js';
import { aboutPage } from './site/pages/about.js';
import { worksPage } from './site/pages/works.js';
import { projectPage } from './site/pages/project.js';
import { projectCards } from './site/projects.js';
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
        main.innerHTML = worksPage(projects.state);
        document.title = 'Works — STUDIO OKK';
    } else if (path === '/about') {
        main.innerHTML = aboutPage();
        document.title = 'Studio — STUDIO OKK';
    } else {
        const page = projectPage(path, projects.state);
        main.innerHTML = page.markup;
        document.title = page.title;
    }
}

setupContact(document.querySelector('#contact'));
setupNavigation({ main, render });
document.querySelector('#year').textContent = new Date().getFullYear();
render();

projects.load().then(() => {
    const path = normalizeSitePath(location.pathname);
    const grid = main.querySelector('.work-grid');
    if (grid && (path === '/' || path === '/works')) grid.innerHTML = projectCards(projects.state, path === '/');
    else if (path.startsWith('/works/')) render();
});
clients.load().then(() => {
    const grid = main.querySelector('.logos');
    if (grid) grid.innerHTML = clientLogos(clients.state);
});
