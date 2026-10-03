export const SITE_BASE = '/okk';
const API_BASE = '/api';
const join = (base, path = '') => `${base}/${String(path).replace(/^\/+/, '')}`;

export const sitePath = (path = '') => join(SITE_BASE, path);
export const assetPath = path => sitePath(`assets/${path}`);
export const projectPath = slug => sitePath(`works/${encodeURIComponent(slug)}`);
export const apiPath = path => join(API_BASE, path);
export const adminApiPath = path => apiPath(`admin/${path}`);

export function normalizeSitePath(pathname) {
    if (pathname === SITE_BASE || pathname.startsWith(`${SITE_BASE}/`)) {
        pathname = pathname.slice(SITE_BASE.length);
    }
    return pathname.replace(/\/$/, '') || '/';
}

export function isSitePath(pathname) {
    return pathname === SITE_BASE || pathname.startsWith(`${SITE_BASE}/`);
}
