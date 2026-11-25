// Hash router with a single, centralized auth guard.
// Routes are lazy-loaded view modules exporting render(container, ctx) → cleanup?
import { auth } from './auth.js';

const routes = [];
let container = null;
let cleanup = null;
let onChange = () => {};
let onDenied = () => {};
let started = false;
let token = 0;

/** pattern like '/projects/:id' */
export function route(pattern, loader, meta = {}) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/\/:(\w+)/g, (_, k) => { keys.push(k); return '/([^/?]+)'; }) + '/?$');
  routes.push({ pattern, re, keys, loader, meta });
}

// Old one-page anchors of the original AF site → platform routes (all still guarded)
const ALIASES = { '/hero': '/overview', '/about': '/overview', '/works': '/portfolio', '/process': '/services',
  '/reviews': '/services', '/contact': '/services', '/studio': '/overview', '/support': '/messages' };

export function parseHash(hash = location.hash) {
  const h = hash.replace(/^#/, '') || '/overview';
  const [p, qs] = h.split('?');
  let path = p.startsWith('/') ? p : '/' + p;
  if (ALIASES[path]) path = ALIASES[path];
  return { path, query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

export function navigate(path, { replace = false } = {}) {
  const target = '#' + (path.startsWith('/') ? path : '/' + path);
  if (replace) { history.replaceState(null, '', target); resolve(); } else if (location.hash === target) resolve(); else location.hash = target;
}

export const currentPath = () => parseHash().path;

async function resolve() {
  if (!started) return;
  const my = ++token;
  // ---- CENTRAL GUARD: no verified session → no view is ever rendered
  if (!auth.user) {
    sessionStorage.setItem('af.returnTo', location.hash || '#/overview');
    onDenied();
    return;
  }
  const { path, query } = parseHash();
  let match = null; let params = {};
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) { match = r; r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]))); break; }
  }
  if (!match) { navigate('/overview', { replace: true }); return; }
  if (match.meta.admin && !auth.isAdmin) { navigate('/overview', { replace: true }); return; }

  if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.error(e); } }
  cleanup = null;
  onChange(match, params, query);
  try {
    const mod = await match.loader();
    if (my !== token) return; // a newer navigation happened
    container.innerHTML = '';
    container.scrollTop = 0; window.scrollTo(0, 0);
    // Each view gets its own element: when the user navigates away it is detached,
    // so late async work of the previous view can never paint into the new one.
    const viewEl = document.createElement('div');
    viewEl.className = 'af-view__inner';
    container.appendChild(viewEl);
    const c = await mod.render(viewEl, { params, query, meta: match.meta });
    if (my !== token) { if (typeof c === 'function') { try { c(); } catch (_) { /* noop */ } } return; }
    cleanup = c;
  } catch (e) {
    console.error('[router]', e);
    if (my === token) {
      const { errorState } = await import('./ui.js');
      container.innerHTML = String(errorState());
    }
  }
}

export function startRouter(el, { onRouteChange, onAccessDenied } = {}) {
  container = el; onChange = onRouteChange || onChange; onDenied = onAccessDenied || onDenied;
  if (!started) window.addEventListener('hashchange', resolve);
  started = true;
  resolve();
}

export function stopRouter() {
  started = false;
  window.removeEventListener('hashchange', resolve);
  if (typeof cleanup === 'function') { try { cleanup(); } catch (_) { /* noop */ } }
  cleanup = null;
  if (container) container.innerHTML = '';
}

export const refreshRoute = () => resolve();
