// AF STUDIO shell: sidebar, top bar, notifications center, profile menu, mobile nav.
import { t, getLang, setLang, onLang, applyI18n } from '../core/i18n.js';
import { html, raw, $, $$, icon, initials, fmtRelative, projectNo, toast, modal, magnetic, reducedMotion, esc } from '../core/ui.js';
import { auth, signOut, updateProfile } from '../core/auth.js';
import { supabase, signedUrl } from '../lib/supabase.js';
import { listNotifications, markNotificationsRead } from '../core/api.js';
import { navigate, refreshRoute } from '../core/router.js';
import { applyTheme, getTheme } from '../core/theme.js';

export const NAV = [
  { group: 'nav.groupStudio', items: [
    { path: '/overview', key: 'overview', icon: 'overview' },
    { path: '/portfolio', key: 'portfolio', icon: 'portfolio' },
    { path: '/services', key: 'services', icon: 'services' },
    { path: '/lab', key: 'lab', icon: 'lab' },
  ] },
  { group: 'nav.groupCreate', items: [
    { path: '/ai', key: 'ai', icon: 'ai' },
    { path: '/builder', key: 'builder', icon: 'builder' },
    { path: '/calculator', key: 'calculator', icon: 'calc' },
    { path: '/moodboard', key: 'moodboard', icon: 'mood' },
  ] },
  { group: 'nav.groupSpace', items: [
    { path: '/projects', key: 'projects', icon: 'projects' },
    { path: '/files', key: 'files', icon: 'files' },
    { path: '/messages', key: 'messages', icon: 'messages', badge: 'messages' },
    { path: '/favorites', key: 'favorites', icon: 'heart' },
    { path: '/settings', key: 'settings', icon: 'settings' },
  ] },
];
const MOBILE_TABS = ['/overview', '/portfolio', '/ai', '/projects'];

let root; let channel; let offLang; let notifs = []; let unreadMsgs = 0; let docClick;

export function mountShell(el) {
  root = el;
  document.body.classList.add('af-app-on');
  render();
  offLang = onLang(() => { render(); highlight(); refreshRoute(); });
  subscribeRealtime();
  loadNotifications();
  maybeOnboard();
  docClick = (e) => {
    if (!e.target.closest('.af-pop, [data-pop]')) closePops();
  };
  document.addEventListener('click', docClick);
  document.addEventListener('keydown', onKey);
  return $('#af-view', root);
}

export function unmountShell() {
  offLang?.(); offLang = null;
  if (channel) { supabase.removeChannel(channel); channel = null; }
  document.removeEventListener('click', docClick);
  document.removeEventListener('keydown', onKey);
  if (root) root.innerHTML = '';
  document.body.classList.remove('af-app-on', 'af-nav-open');
  notifs = [];
}

const onKey = (e) => { if (e.key === 'Escape') { closePops(); document.body.classList.remove('af-nav-open'); } };

function navItem(it) {
  return html`<a class="af-nav__item magnetic-soft" href="#${it.path}" data-path="${it.path}">
    ${icon(it.icon)}<span>${t('nav.' + it.key)}</span>${it.badge ? html`<em class="af-badge" data-badge="${it.badge}" hidden></em>` : ''}</a>`;
}

function render() {
  const p = auth.profile || {};
  const name = p.full_name || auth.user?.email || '';
  const keepView = $('#af-view', root);
  root.innerHTML = String(html`
  <div class="af-shell">
    <aside class="af-side" aria-label="${t('nav.menu')}">
      <a class="af-side__brand" href="#/overview"><span class="af-mark">AF</span><span class="af-side__studio">STUDIO</span></a>
      <nav class="af-nav">
        ${NAV.map((g) => html`<div class="af-nav__group"><p class="af-nav__label">${t(g.group)}</p>${g.items.map(navItem)}</div>`)}
        ${auth.isAdmin ? html`<div class="af-nav__group"><a class="af-nav__item af-nav__item--admin" href="admin.html">${icon('admin')}<span>${t('nav.admin')}</span></a></div>` : ''}
      </nav>
      <div class="af-side__foot">
        <button type="button" class="af-side__user" data-pop="profile">
          <span class="af-avatar" data-avatar>${initials(name)}</span>
          <span class="af-side__who"><b>${name}</b><small>${auth.user?.email || ''}</small></span>
        </button>
      </div>
    </aside>
    <div class="af-scrim" data-close-nav></div>

    <div class="af-main">
      <header class="af-top">
        <button type="button" class="af-icon-btn af-top__menu" data-open-nav aria-label="${t('nav.menu')}">${icon('menu')}</button>
        <a class="af-top__logo" href="#/overview" aria-label="AF STUDIO">AF</a>
        <div class="af-top__title"><span class="af-top__crumb">AF STUDIO</span><h1 id="af-title">${t('nav.overview')}</h1></div>
        <div class="af-top__actions">
          <div class="af-seg" role="group" aria-label="Language">
            <button type="button" data-lang="ru" class="${getLang() === 'ru' ? 'is-on' : ''}">RU</button>
            <button type="button" data-lang="en" class="${getLang() === 'en' ? 'is-on' : ''}">EN</button>
          </div>
          <button type="button" class="af-icon-btn" data-theme aria-label="${t('nav.theme')}">${icon(getTheme() === 'dark' ? 'sun' : 'moon')}</button>
          <div class="af-pop-wrap">
            <button type="button" class="af-icon-btn af-bell" data-pop="notif" aria-label="${t('notif.title')}" aria-haspopup="true">
              ${icon('bell')}<em class="af-dot-count" hidden></em></button>
            <div class="af-pop af-pop--notif" data-pop-panel="notif" hidden>
              <header><b>${t('notif.title')}</b><button type="button" class="af-link" data-mark-all>${t('notif.markAll')}</button></header>
              <div class="af-notif-list"></div>
              <a class="af-pop__foot" href="#/notifications">${t('common.viewAll')}</a>
            </div>
          </div>
          <div class="af-pop-wrap">
            <button type="button" class="af-top__avatar" data-pop="profile" aria-label="${t('nav.profile')}"><span class="af-avatar" data-avatar>${initials(name)}</span></button>
            <div class="af-pop af-pop--profile" data-pop-panel="profile" hidden>
              <div class="af-pop__me"><span class="af-avatar af-avatar--lg" data-avatar>${initials(name)}</span><div><b>${name}</b><small>${auth.user?.email || ''}</small></div></div>
              <a href="#/settings">${icon('settings')}<span>${t('nav.settings')}</span></a>
              <a href="#/projects">${icon('projects')}<span>${t('nav.projects')}</span></a>
              ${auth.isAdmin ? html`<a href="admin.html">${icon('admin')}<span>${t('nav.admin')}</span></a>` : ''}
              <button type="button" data-logout class="af-pop__danger">${icon('logout')}<span>${t('nav.logout')}</span></button>
            </div>
          </div>
        </div>
      </header>
      <main id="af-view" class="af-view" tabindex="-1"></main>
    </div>

    <nav class="af-tabbar" aria-label="${t('nav.menu')}">
      ${NAV.flatMap((g) => g.items).filter((i) => MOBILE_TABS.includes(i.path)).map((it) => html`
        <a href="#${it.path}" data-path="${it.path}">${icon(it.icon)}<span>${t('nav.' + it.key)}</span></a>`)}
      <button type="button" data-open-nav>${icon('more')}<span>${t('common.more')}</span><em class="af-badge af-badge--dot" data-badge="messages" hidden></em></button>
    </nav>
  </div>`);

  $$('[data-lang]', root).forEach((b) => b.addEventListener('click', async () => {
    setLang(b.dataset.lang);
    try { await updateProfile({ lang: b.dataset.lang }); } catch (_) { /* non-critical */ }
  }));
  $('[data-theme]', root).addEventListener('click', async (e) => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    e.currentTarget.innerHTML = String(icon(next === 'dark' ? 'sun' : 'moon'));
    try { await updateProfile({ theme: next }); } catch (_) { /* non-critical */ }
  });
  $$('[data-pop]', root).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); togglePop(b.dataset.pop, b); }));
  $('[data-mark-all]', root).addEventListener('click', async () => { await markNotificationsRead(); notifs.forEach((n) => (n.read_at = n.read_at || new Date().toISOString())); paintNotifs(); });
  $$('[data-logout]', root).forEach((b) => b.addEventListener('click', () => signOut()));
  $$('[data-open-nav]', root).forEach((b) => b.addEventListener('click', () => document.body.classList.add('af-nav-open')));
  $('[data-close-nav]', root).addEventListener('click', () => document.body.classList.remove('af-nav-open'));
  $$('.af-nav a, .af-tabbar a', root).forEach((a) => a.addEventListener('click', () => document.body.classList.remove('af-nav-open')));
  if (keepView) $('#af-view', root).replaceWith(keepView);
  paintNotifs(); paintAvatar(); paintBadges();
  magnetic(root);
}

function paintIdentity() {
  const p = auth.profile || {};
  const name = p.full_name || auth.user?.email || '';
  $$('.af-side__who b, .af-pop__me b', root).forEach((b) => (b.textContent = name));
  $$('[data-avatar]', root).forEach((a) => (a.textContent = initials(name)));
  paintAvatar();
}

function togglePop(name, anchor) {
  if (name === 'profile' && anchor.closest('.af-side')) { // sidebar user button → profile menu in top bar
    name = 'profile';
  }
  const panel = $(`[data-pop-panel="${name}"]`, root);
  const open = panel.hidden;
  closePops();
  if (open) { panel.hidden = false; requestAnimationFrame(() => panel.classList.add('is-open')); if (name === 'notif') loadNotifications(); }
}
function closePops() { $$('.af-pop', root || document).forEach((p) => { p.classList.remove('is-open'); p.hidden = true; }); }

/** Called by the router on every navigation */
export function setActive(path, titleKey) {
  $('#af-title', root) && ($('#af-title', root).textContent = t(titleKey));
  document.title = `${t(titleKey)} — AF STUDIO`;
  highlight(path);
  closePops();
}
let lastPath = '/overview';
function highlight(path = lastPath) {
  lastPath = path;
  $$('[data-path]', root).forEach((a) => {
    const on = path === a.dataset.path || path.startsWith(a.dataset.path + '/');
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

// ---------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------
export async function paintAvatar() {
  const p = auth.profile;
  if (!p?.avatar_path) return;
  const url = await signedUrl('avatars', p.avatar_path);
  if (!url) return;
  $$('[data-avatar]', root).forEach((a) => { a.innerHTML = ''; const img = new Image(); img.alt = ''; img.src = url; a.appendChild(img); });
}
auth.on('profile', () => { if (root?.isConnected && root.firstElementChild) paintIdentity(); });

// ---------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------
export function notifText(n) {
  const p = n.payload || {};
  const no = p.number ? projectNo(p.number) : '';
  const map = {
    project_created: () => t('notif.project_created', { no }),
    project_status: () => t('notif.project_status', { no, status: t('status.' + p.to) }),
    project_done: () => t('notif.project_done', { no }),
    message: () => t('notif.message', { subject: p.subject || '' }),
    comment: () => t('notif.comment', { title: p.title || '' }),
    review_request: () => t('notif.review_request', { title: p.title || '', version: p.version || 1 }),
    review_decision: () => t('notif.review_decision', { title: p.title || '' }),
    new_user: () => t('notif.new_user', { email: p.email || '' }),
  };
  return (map[n.type] || (() => t('notif.generic')))();
}
export function openNotifLink(n) {
  if (!n.link) return;
  if (n.link.startsWith('admin.html')) location.href = n.link;
  else if (n.link.startsWith('#/')) navigate(n.link.slice(1));
}

async function loadNotifications() {
  try {
    notifs = await listNotifications(30);
    const { count } = await supabase.from('messages').select('id, threads!inner(client_id)', { count: 'exact', head: true })
      .eq('threads.client_id', auth.user.id).eq('from_admin', true).is('read_at', null);
    unreadMsgs = count || 0;
  } catch (e) { console.warn('notifications', e); }
  paintNotifs(); paintBadges();
}

function paintNotifs() {
  const list = $('.af-notif-list', root);
  if (!list) return;
  const unread = notifs.filter((n) => !n.read_at).length;
  const dot = $('.af-dot-count', root);
  dot.hidden = !unread; dot.textContent = unread > 9 ? '9+' : String(unread);
  list.innerHTML = notifs.length ? String(html`${notifs.slice(0, 8).map((n) => html`
    <button type="button" class="af-notif ${n.read_at ? '' : 'is-unread'}" data-nid="${n.id}">
      <span class="af-notif__dot"></span>
      <span class="af-notif__body"><b>${notifText(n)}</b>${n.payload?.preview ? html`<small>${n.payload.preview}</small>` : ''}<time>${fmtRelative(n.created_at)}</time></span>
    </button>`)}`) : String(html`<p class="af-notif-empty">${t('notif.empty')}</p>`);
  $$('[data-nid]', list).forEach((b) => b.addEventListener('click', async () => {
    const n = notifs.find((x) => x.id === b.dataset.nid);
    if (!n.read_at) { n.read_at = new Date().toISOString(); markNotificationsRead([n.id]); paintNotifs(); }
    closePops(); openNotifLink(n);
  }));
}
export const getNotifs = () => notifs;

function paintBadges() {
  $$('[data-badge="messages"]', root).forEach((b) => { b.hidden = !unreadMsgs; if (!b.classList.contains('af-badge--dot')) b.textContent = unreadMsgs > 9 ? '9+' : String(unreadMsgs); });
}
export function bumpUnreadMessages(delta) { unreadMsgs = Math.max(0, unreadMsgs + delta); paintBadges(); }
export const refreshNotifications = () => loadNotifications();

function subscribeRealtime() {
  channel = supabase.channel('af-user-' + auth.user.id)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${auth.user.id}` }, (payload) => {
      const n = payload.new;
      notifs.unshift(n); notifs = notifs.slice(0, 30);
      paintNotifs();
      if (n.type === 'message') { unreadMsgs++; paintBadges(); }
      toast(notifText(n), 'info');
      const bell = $('.af-bell', root);
      if (bell && !reducedMotion()) { bell.classList.remove('is-ring'); void bell.offsetWidth; bell.classList.add('is-ring'); }
      window.dispatchEvent(new CustomEvent('af:notification', { detail: n }));
    })
    .subscribe();
}

// ---------------------------------------------------------------------
// Onboarding (first visit)
// ---------------------------------------------------------------------
async function maybeOnboard() {
  if (!auth.profile || auth.profile.onboarded) return;
  const steps = [1, 2, 3];
  let i = 0;
  const body = document.createElement('div');
  const paint = () => {
    body.innerHTML = String(html`<div class="af-onb">
      <div class="af-onb__art af-onb__art--${i + 1}" aria-hidden="true"><span></span><span></span><span></span></div>
      <h3>${t(`overview.onbTitle${i + 1}`)}</h3><p>${t(`overview.onbText${i + 1}`)}</p>
      <div class="af-onb__dots">${steps.map((s, k) => html`<i class="${k === i ? 'is-on' : ''}"></i>`)}</div></div>`);
  };
  paint();
  await modal({
    title: 'AF STUDIO', size: 'sm', body,
    actions: [{
      label: t('common.next'), primary: true,
      onClick: (_, close) => { if (i < steps.length - 1) { i++; paint(); const b = $('.af-modal [data-act="0"]'); if (i === steps.length - 1 && b) b.textContent = t('overview.onbDone'); return false; } close(true); return false; },
    }],
  });
  try { await updateProfile({ onboarded: true }); } catch (_) { /* noop */ }
}
export { esc, applyI18n };
