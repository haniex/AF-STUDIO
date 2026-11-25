// AF ADMIN — entry. Access requires a server-verified session AND is_admin() === true
// (role lives in public.user_roles, which clients can never write). Every admin
// action is re-checked by RLS / SECURITY DEFINER functions on the server.
import { isConfigured } from '../config.js';
import { bootstrap, auth, signOut } from '../core/auth.js';
import { initTheme, applyTheme, getTheme } from '../core/theme.js';
import { route, startRouter } from '../core/router.js';
import { html, icon, initials, $, $$, reducedMotion } from '../core/ui.js';
import { setLang, getLang, onLang } from '../core/i18n.js';
import { a } from './i18n.js';

const NAV = [
  ['/dashboard', 'dashboard', 'overview'], ['/projects', 'projects', 'projects'], ['/messages', 'messages', 'messages'], ['/users', 'users', 'user'],
  ['/content/portfolio_items', 'portfolio', 'portfolio'], ['/content/before_after', 'beforeAfter', 'layers'], ['/content/lab_models', 'labModels', 'lab'],
  ['/content/services', 'services', 'services'], ['/content/pricing_categories', 'pricing', 'calc'], ['/content/pricing_factors', 'factors', 'calc'],
  ['/content/reviews', 'reviews', 'heart'], ['/content/kb_articles', 'kb', 'files'], ['/ai', 'ai', 'ai'], ['/audit', 'audit', 'shield'],
];

route('/dashboard', () => import('./dashboard.js'), { title: 'dashboard' });
route('/projects', () => import('./projects.js'), { title: 'projects' });
route('/projects/:id', () => import('./projects.js'), { title: 'projects' });
route('/messages', () => import('./messages.js'), { title: 'messages' });
route('/messages/:id', () => import('./messages.js'), { title: 'messages' });
route('/users', () => import('./users.js'), { title: 'users' });
route('/content/:table', () => import('./content.js'), { title: 'content' });
route('/ai', () => import('./ai-settings.js'), { title: 'ai' });
route('/audit', () => import('./audit.js'), { title: 'audit' });
route('/overview', () => import('./dashboard.js'), { title: 'dashboard' });

const app = $('#af-app');
function hideBoot() { const b = $('#af-boot'); if (!b) return; b.classList.add('is-done'); setTimeout(() => b.remove(), reducedMotion() ? 0 : 700); }

function denied() {
  app.hidden = false;
  app.innerHTML = String(html`<div class="adm-denied"><div><div class="af-empty__orb" style="margin:0 auto 18px"></div>
    <h2 class="af-h3" style="font-size:24px">${a('denied')}</h2><p class="af-muted" style="margin:8px 0 20px">${a('deniedText')}</p>
    <a class="af-btn af-btn--primary" href="index.html">AF STUDIO →</a></div></div>`);
  hideBoot();
}

function shell() {
  const name = auth.profile?.full_name || auth.user.email;
  app.innerHTML = String(html`<div class="af-shell">
    <aside class="af-side">
      <a class="af-side__brand" href="#/dashboard"><span class="af-mark">AF</span><span class="af-side__studio">ADMIN</span></a>
      <nav class="af-nav"><div class="af-nav__group">${NAV.map(([p, k, ic]) => html`<a class="af-nav__item" href="#${p}" data-path="${p}">${icon(ic)}<span>${a('nav.' + k)}</span></a>`)}</div>
        <div class="af-nav__group"><a class="af-nav__item af-nav__item--admin" href="index.html">${icon('arrowL')}<span>AF STUDIO</span></a></div></nav>
      <div class="af-side__foot"><div class="af-side__user"><span class="af-avatar">${initials(name)}</span><span class="af-side__who"><b>${name}</b><small>admin</small></span></div></div>
    </aside>
    <div class="af-scrim" data-close-nav></div>
    <div class="af-main">
      <header class="af-top">
        <button type="button" class="af-icon-btn" data-open-nav style="display:none" aria-label="menu">${icon('menu')}</button>
        <div class="af-top__title"><span class="af-top__crumb">AF ADMIN</span><h1 id="af-title"></h1></div>
        <div class="af-top__actions">
          <div class="af-seg"><button type="button" data-lang="ru" class="${getLang() === 'ru' ? 'is-on' : ''}">RU</button><button type="button" data-lang="en" class="${getLang() === 'en' ? 'is-on' : ''}">EN</button></div>
          <button type="button" class="af-icon-btn" data-theme aria-label="theme">${icon(getTheme() === 'dark' ? 'sun' : 'moon')}</button>
          <button type="button" class="af-icon-btn" data-logout aria-label="logout">${icon('logout')}</button>
        </div>
      </header>
      <main id="af-view" class="af-view"></main>
    </div></div>
    <style>@media (max-width:860px){[data-open-nav]{display:inline-grid!important}}</style>`);
  $$('[data-lang]', app).forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  $('[data-theme]', app).addEventListener('click', (e) => { const n = getTheme() === 'dark' ? 'light' : 'dark'; applyTheme(n); e.currentTarget.innerHTML = String(icon(n === 'dark' ? 'sun' : 'moon')); });
  $('[data-logout]', app).addEventListener('click', () => signOut());
  $('[data-open-nav]', app).addEventListener('click', () => document.body.classList.add('af-nav-open'));
  $('[data-close-nav]', app).addEventListener('click', () => document.body.classList.remove('af-nav-open'));
  $$('.af-nav a', app).forEach((x) => x.addEventListener('click', () => document.body.classList.remove('af-nav-open')));
  return $('#af-view', app);
}

(async function start() {
  initTheme();
  if (!isConfigured()) return denied();
  let res;
  try { res = await bootstrap(); } catch { return denied(); }
  if (!res.user) { sessionStorage.setItem('af.returnTo', '#/overview'); location.replace('index.html'); return; }
  if (!auth.isAdmin) return denied();
  auth.on('signedout', () => location.replace('index.html'));
  document.body.classList.add('af-app-on');
  if (!location.hash || location.hash === '#') history.replaceState(null, '', '#/dashboard');
  app.hidden = false;
  let view = shell();
  const onRoute = (r, params) => {
    const path = location.hash.slice(1).split('?')[0];
    const key = r.meta.title === 'content' ? (NAV.find(([p]) => p === path)?.[1] || 'content') : r.meta.title;
    $('#af-title').textContent = a('nav.' + key);
    document.title = a('nav.' + key) + ' — AF Admin';
    $$('[data-path]', app).forEach((x) => x.classList.toggle('is-active', path === x.dataset.path || path.startsWith(x.dataset.path + '/')));
  };
  startRouter(view, { onRouteChange: onRoute, onAccessDenied: () => location.replace('index.html') });
  onLang(() => location.reload());
  hideBoot();
})();
