// =====================================================================
// AF COMMAND CENTER — Overview (#/overview)
// Every number, project, event and favourite comes from Supabase via the
// existing API layer. The hero reuses the 3D Lab procedural model library
// (js/three/models.js) through the existing showcase (js/three/showcase.js):
// one WebGL scene, disposed when the route changes.
// =====================================================================
import { t, loc, locj, getLang } from '../core/i18n.js';
import { html, icon, fmtRelative, projectNo, reveal, magnetic, skeleton, reducedMotion, $, $$ } from '../core/ui.js';
import { auth } from '../core/auth.js';
import { supabase } from '../lib/supabase.js';
import { listProjects, getServices, getFavorites, getPortfolio, withMedia, projectCovers, listThreads, listNotifications, listFiles, markNotificationsRead } from '../core/api.js';
import { countUp } from '../legacy/widgets.js';
import { mountShowcase } from '../three/showcase.js';
import { MODELS } from '../three/models.js';
import { STATUSES } from './projects.js';
import { ABOUT } from '../data/about.js';

// Showcase order — real ids of the 3D Lab library
export const SHOWCASE_IDS = ['watch', 'perfume', 'headphones', 'car', 'pavilion', 'chair', 'lamp', 'robot', 'sculpture', 'crystal'];

// ---------------------------------------------------------------- pure helpers (unit-tested)
export const isActive = (p) => !['new', 'done'].includes(p.status);
export function firstName(profile, email) {
  const n = String(profile?.full_name || '').trim();
  return n ? n.split(/\s+/)[0] : String(email || '').split('@')[0];
}
/** Which project the "Continue" card shows: newest active → newest new request → none. */
export function pickContinue(projects) {
  const byUpd = [...(projects || [])].sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  return byUpd.find(isActive) || byUpd.find((p) => p.status === 'new') || null;
}
/** Greeting scenario from real data. */
export function scenario(projects) {
  const list = projects || [];
  if (!list.length) return 'scNew';
  if (list.some(isActive)) return 'scActive';
  if (list.some((p) => p.status === 'new')) return 'scRequest';
  return 'scDone';
}
/** Merge notifications, threads and files into one real activity feed. */
export function buildActivity({ notifications = [], threads = [], files = [] }, limit = 6) {
  const items = [];
  const threadIdsInNotifs = new Set(notifications.map((n) => n.payload?.thread_id).filter(Boolean));
  notifications.forEach((n) => items.push({ kind: 'notif', at: n.created_at, n }));
  threads.filter((th) => !threadIdsInNotifs.has(th.id)).forEach((th) => items.push({ kind: 'thread', at: th.last_message_at, th }));
  files.forEach((f) => items.push({ kind: 'file', at: f.created_at, f }));
  return items.filter((i) => i.at).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit);
}

const NOTIF_ICON = { project_created: 'projects', project_status: 'refresh', project_done: 'check', message: 'messages', comment: 'pin', review_request: 'image', review_decision: 'check', new_user: 'user' };
const CAT_KEY = { product: 'portfolio.fProduct', arch: 'portfolio.fArch', character: 'portfolio.fCharacter', motion: 'portfolio.fMotion' };

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const errBox = () => html`<div class="cc-error">${icon('refresh')}<span>${t('cc.loadError')}</span></div>`;

// =====================================================================
export async function render(el) {
  const L = getLang();
  const name = firstName(auth.profile, auth.user?.email);
  const models = SHOWCASE_IDS.map((id) => MODELS.find((m) => m.id === id)).filter(Boolean);

  el.innerHTML = String(html`
  <div class="cc">
    <section class="cc-hero" data-reveal>
      <div class="cc-hero__text">
        <span class="cc-kicker"><i></i>${t('cc.kicker')}</span>
        <h2 class="cc-hero__title">${t('cc.hello', { name })}</h2>
        <p class="cc-hero__ready">${t('cc.ready')}</p>
        <p class="cc-hero__lead">${t('cc.lead')}</p>
        <p class="cc-hero__scenario" data-scenario aria-live="polite"></p>
        <div class="cc-hero__cta">
          <a class="af-btn af-btn--gold magnetic" href="#/builder">${icon('builder')}<span>${t('cc.create')}</span></a>
          <a class="af-btn af-btn--ghost magnetic" href="#/lab" data-lab-btn>${icon('lab')}<span>${t('cc.openLab')}</span></a>
        </div>
      </div>
      <div class="cc-stage" data-stage>
        <span class="cc-stage__glow" aria-hidden="true"></span>
        <span class="cc-stage__ring" aria-hidden="true"></span>
        <span class="cc-stage__shadow" aria-hidden="true"></span>
        <canvas class="cc-stage__canvas" aria-label="${t('cc.fromLab')}"></canvas>
        <div class="cc-stage__fallback" hidden><span class="cc-orb" aria-hidden="true"></span><p>${t('cc.noWebgl')}</p></div>
        <div class="cc-stage__bar">
          <button type="button" class="cc-nav" data-prev aria-label="${t('cc.prevModel')}">${icon('arrowL')}</button>
          <div class="cc-stage__caption"><b data-model-name>${models[0]?.title[L] || ''}</b><small>${t('cc.fromLab')} · <span data-model-pos>1 / ${models.length}</span></small></div>
          <button type="button" class="cc-nav" data-next aria-label="${t('cc.nextModel')}">${icon('arrowR')}</button>
        </div>
        <div class="cc-dots" role="tablist" data-dots>${models.map((m, i) => html`<button type="button" role="tab" class="${i === 0 ? 'is-on' : ''}" data-i="${i}" aria-label="${m.title[L]}" aria-selected="${i === 0}"></button>`)}</div>
        <span class="cc-stage__hint">${t('cc.dragHint')}</span>
      </div>
    </section>

    ${auth.isAdmin ? html`<section class="ov-admin cc-admin" data-io><div><b>${t('overview.adminTitle')}</b><p class="af-muted" style="font-size:13px">${t('overview.adminText')}</p></div>
      <a class="af-btn af-btn--primary af-btn--sm" href="admin.html">${icon('admin')}<span>${t('nav.admin')}</span></a></section>` : ''}

    <section class="cc-stats" data-stats aria-live="polite">
      ${[['projects', 'stTotal', '#/projects'], ['spark', 'stActive', '#/projects'], ['heart', 'stFav', '#/favorites'], ['bell', 'stUnread', '#/notifications']].map(([ic, k, href]) => html`
        <a class="cc-stat" href="${href}" data-stat="${k}" data-io>
          <span class="cc-stat__icon">${icon(ic)}</span>
          <span class="cc-stat__body"><b data-num><span class="af-skel cc-skel-num"></span></b><span>${t('cc.' + k)}</span></span>
          <span class="cc-stat__arrow">${icon('arrowR')}</span>
        </a>`)}
    </section>

    <section class="cc-row cc-row--60">
      <article class="af-card cc-card cc-continue" data-io>
        <header class="cc-card__head"><h3>${t('cc.continue')}</h3><span data-continue-badge></span></header>
        <div data-continue>${skeleton(1, 'cc-skel-block')}</div>
      </article>
      <article class="af-card cc-card" data-io>
        <header class="cc-card__head"><h3>${t('cc.quick')}</h3></header>
        <div class="cc-quick">
          ${[['ai', '#/ai', 'qaAi'], ['calc', '#/calculator', 'qaCalc'], ['lab', '#/lab', 'qaLab'], ['builder', '#/builder', 'qaBuilder']].map(([ic, href, k]) => html`
            <a class="cc-qa" href="${href}"><span class="cc-qa__icon">${icon(ic)}</span><span class="cc-qa__text"><b>${t('cc.' + k)}</b><small>${t('cc.' + k + 'Sub')}</small></span><span class="cc-qa__arrow">${icon('arrowR')}</span></a>`)}
        </div>
      </article>
    </section>

    <section class="cc-row cc-row--40">
      <article class="af-card cc-card" data-io>
        <header class="cc-card__head"><h3>${t('cc.activity')}</h3><a class="af-link" href="#/notifications">${t('cc.allEvents')} →</a></header>
        <ol class="cc-feed" data-activity>${skeleton(4, 'cc-skel-row')}</ol>
      </article>
      <article class="af-card cc-card" data-io>
        <header class="cc-card__head"><h3>${t('cc.favTitle')}</h3>
          <div class="cc-gal-nav"><button type="button" class="cc-nav" data-gal="-1" aria-label="${t('common.back')}">${icon('arrowL')}</button><button type="button" class="cc-nav" data-gal="1" aria-label="${t('common.next')}">${icon('arrowR')}</button></div></header>
        <div class="cc-gallery" data-favs>${skeleton(3, 'cc-skel-tile')}</div>
      </article>
    </section>

    <section class="cc-ai" data-io>
      <div class="cc-ai__art" aria-hidden="true"><span class="cc-gem"></span><span class="cc-ai__orbit"></span>${Array.from({ length: 7 }, (_, i) => html`<i style="--i:${i}"></i>`)}</div>
      <div class="cc-ai__text"><h3>${t('cc.aiTitle')}</h3><p>${t('cc.aiText')}</p></div>
      <a class="af-btn af-btn--gold magnetic" href="#/ai">${icon('ai')}<span>${t('cc.aiBtn')}</span></a>
    </section>

    <section class="af-card cc-about" data-io>
      <div><span class="af-kicker">${t('cc.aboutTitle')}</span><p>${locj(ABOUT.lead)}</p></div>
      <a class="af-btn af-btn--ghost af-btn--sm" href="#/services">${t('cc.aboutMore')} →</a>
    </section>
  </div>`);
  reveal(el); magnetic(el);

  // ---------------------------------------------------------------- 3D hero (single scene)
  const stage = $('[data-stage]', el);
  let show = null; let gone = false;
  const setModel = (i) => {
    const m = models[i]; if (!m) return;
    $('[data-model-name]', el).textContent = m.title[getLang()];
    $('[data-model-pos]', el).textContent = `${i + 1} / ${models.length}`;
    $$('[data-dots] button', el).forEach((b, k) => { b.classList.toggle('is-on', k === i); b.setAttribute('aria-selected', k === i); });
  };
  let cur = 0;
  if (webglOk()) {
    try {
      show = await mountShowcase($('.cc-stage__canvas', el), { ids: models.map((m) => m.id), interval: 7000, onChange: (i) => { cur = i; setModel(i); } });
      if (gone || !el.isConnected) { show?.dispose(); show = null; } else stage.classList.add('is-live');
    } catch (e) { console.warn('[overview] showcase', e); show = null; }
  }
  if (!show && el.isConnected) { stage.classList.add('is-fallback'); $('.cc-stage__fallback', el).hidden = false; }
  const go = (i) => { if (!show) return; show.go((i + models.length) % models.length); };
  $$('[data-dots] button', el).forEach((b) => b.addEventListener('click', () => go(+b.dataset.i)));
  $('[data-prev]', el).addEventListener('click', () => go(cur - 1));
  $('[data-next]', el).addEventListener('click', () => go(cur + 1));
  const lab = $('[data-lab-btn]', el);
  lab.addEventListener('mouseenter', () => stage.classList.add('is-peek'));
  lab.addEventListener('mouseleave', () => stage.classList.remove('is-peek'));
  lab.addEventListener('focus', () => stage.classList.add('is-peek'));
  lab.addEventListener('blur', () => stage.classList.remove('is-peek'));

  const cleanup = () => { gone = true; show?.dispose(); show = null; };

  // ---------------------------------------------------------------- data (each section independent)
  const [rProjects, rServices, rFavs, rNotifs, rUnread, rThreads, rFiles] = await Promise.allSettled([
    listProjects(), getServices(), getFavorites(), listNotifications(8),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', auth.user.id).is('read_at', null).then((r) => { if (r.error) throw r.error; return r.count || 0; }),
    listThreads(), listFiles(),
  ]);
  if (!el.isConnected) return cleanup;
  const ok = (r) => r.status === 'fulfilled';
  const projects = ok(rProjects) ? rProjects.value : null;
  const favs = ok(rFavs) ? rFavs.value : null;
  const unread = ok(rUnread) ? rUnread.value : null;

  // scenario line
  const sc = $('[data-scenario]', el);
  if (projects) {
    sc.innerHTML = String(html`<span>${t('cc.' + scenario(projects))}</span>${unread ? html` <a class="cc-pill" href="#/notifications">${icon('bell')}${t('cc.newEvents', { n: unread })}</a>` : ''}`);
    sc.classList.add('is-in');
  }

  // stats
  const stats = { stTotal: projects?.length, stActive: projects?.filter(isActive).length, stFav: favs?.size, stUnread: unread };
  Object.entries(stats).forEach(([k, v]) => {
    const b = $(`[data-stat="${k}"] [data-num]`, el);
    if (v == null) { b.textContent = '—'; b.title = t('cc.loadError'); return; }
    b.innerHTML = `<span data-count="${v}">0</span>`;
  });
  countUp($('[data-stats]', el));

  // continue
  const cBox = $('[data-continue]', el); const cBadge = $('[data-continue-badge]', el);
  if (!projects) cBox.innerHTML = String(errBox());
  else {
    const p = pickContinue(projects);
    if (!p) {
      cBox.innerHTML = String(html`<div class="cc-empty"><span class="cc-empty__orb" aria-hidden="true"></span><div><b>${t('cc.emptyTitle')}</b><p>${t('cc.emptySub')}</p></div>
        <a class="af-btn af-btn--gold af-btn--sm" href="#/builder">${icon('plus')}<span>${t('cc.create')}</span></a></div>`);
      if (projects.length) cBadge.innerHTML = String(html`<a class="af-link" href="#/projects">${t('cc.allProjects')} →</a>`);
    } else {
      const services = ok(rServices) ? rServices.value : [];
      const svc = services.find((s) => s.id === p.service_id);
      let cover = '';
      try { cover = (await projectCovers([p]))[p.id] || ''; } catch { /* no cover */ }
      if (!el.isConnected) return cleanup;
      const idx = STATUSES.indexOf(p.status); const isNew = p.status === 'new';
      cBadge.innerHTML = String(html`<span class="af-pill af-pill--${p.status}">${t(isNew ? 'cc.badgeNew' : 'cc.badgeActive')}</span>`);
      cBox.innerHTML = String(html`
        <a class="cc-project" href="#/projects/${p.id}">
          <span class="cc-project__cover">${cover ? html`<img src="${cover}" alt="" loading="lazy" />` : html`<span>${projectNo(p.number)}</span>`}</span>
          <span class="cc-project__body">
            <small class="cc-project__no">${projectNo(p.number)} · ${loc(svc, 'title') || t('cc.noService')}</small>
            <b class="cc-project__title">${p.title}</b>
            <span class="cc-project__meta"><span class="af-pill af-pill--${p.status}">${t('status.' + p.status)}</span><span>${t('cc.updated', { date: fmtRelative(p.updated_at || p.created_at) })}</span></span>
            ${isNew ? html`<span class="cc-project__note">${t('cc.requestNote')}</span>` : ''}
          </span>
        </a>
        <div class="pr-steps cc-steps" aria-label="${t('cc.stage', { status: t('status.' + p.status) })}">${STATUSES.map((s, i) => html`<div class="${i < idx ? 'is-done' : ''} ${i === idx ? 'is-on' : ''}"><i></i><span>${t('status.' + s)}</span></div>`)}</div>
        <div class="cc-project__actions"><a class="af-btn af-btn--gold af-btn--sm" href="#/projects/${p.id}">${t('cc.openProject')} →</a>
          <a class="af-btn af-btn--ghost af-btn--sm" href="#/messages">${icon('messages')}<span>${t('nav.messages')}</span></a></div>`);
    }
  }

  // activity
  const aBox = $('[data-activity]', el);
  const nList = ok(rNotifs) ? rNotifs.value : null; const tList = ok(rThreads) ? rThreads.value : null; const fList = ok(rFiles) ? rFiles.value : [];
  if (!nList && !tList) aBox.innerHTML = `<li>${String(errBox())}</li>`;
  else {
    const { notifText, openNotifLink } = await import('../app/shell.js');
    if (!el.isConnected) return cleanup;
    const feed = buildActivity({ notifications: nList || [], threads: tList || [], files: fList.slice(0, 4) });
    aBox.innerHTML = feed.length ? String(html`${feed.map((it, i) => {
      if (it.kind === 'notif') {
        const n = it.n; const p = n.payload || {};
        const sub = p.preview || (p.to ? t('status.' + p.to) : '') || (p.title || '');
        return html`<li style="--d:${i}"><button type="button" class="cc-ev ${n.read_at ? '' : 'is-unread'}" data-n="${n.id}">
          <span class="cc-ev__icon">${icon(NOTIF_ICON[n.type] || 'bell')}</span><span class="cc-ev__body"><b>${notifText(n)}</b>${sub ? html`<small>${sub}</small>` : ''}</span><time>${fmtRelative(n.created_at)}</time></button></li>`;
      }
      if (it.kind === 'thread') {
        const th = it.th;
        return html`<li style="--d:${i}"><a class="cc-ev" href="#/messages/${th.id}"><span class="cc-ev__icon">${icon('messages')}</span>
          <span class="cc-ev__body"><b>${th.subject}</b><small>${t(th.last_from_admin ? 'cc.evThreadStudio' : 'cc.evThreadMe')}</small></span><time>${fmtRelative(th.last_message_at)}</time></a></li>`;
      }
      const f = it.f;
      return html`<li style="--d:${i}"><a class="cc-ev" href="${f.project_id ? '#/projects/' + f.project_id + '?tab=files' : '#/files'}"><span class="cc-ev__icon">${icon('upload')}</span>
        <span class="cc-ev__body"><b>${t('cc.evFile')}</b><small>${f.name}</small></span><time>${fmtRelative(f.created_at)}</time></a></li>`;
    })}`) : String(html`<li class="cc-feed__empty"><span class="cc-empty__orb" aria-hidden="true"></span><p>${t('cc.activityEmpty')}</p></li>`);
    $$('[data-n]', aBox).forEach((b) => b.addEventListener('click', async () => {
      const n = (nList || []).find((x) => x.id === b.dataset.n); if (!n) return;
      if (!n.read_at) markNotificationsRead([n.id]);
      if (n.link) openNotifLink(n); else location.hash = '#/notifications';
    }));
  }

  // favourites
  const gBox = $('[data-favs]', el);
  if (!favs) gBox.innerHTML = String(errBox());
  else if (!favs.size) {
    gBox.innerHTML = String(html`<div class="cc-empty cc-empty--wide"><span class="cc-empty__orb" aria-hidden="true"></span><div><b>${t('cc.favEmpty')}</b></div>
      <a class="af-btn af-btn--ghost af-btn--sm" href="#/portfolio">${icon('portfolio')}<span>${t('cc.openPortfolio')}</span></a></div>`);
    $$('[data-gal]', el).forEach((b) => (b.hidden = true));
  } else {
    try {
      const items = await withMedia((await getPortfolio()).filter((p) => favs.has(p.id)));
      if (!el.isConnected) return cleanup;
      gBox.innerHTML = items.length ? String(html`${items.map((p) => html`
        <a class="cc-tile" href="#/portfolio/${p.id}"><span class="cc-tile__img"><img src="${p.cover_url}" alt="${loc(p, 'title')}" loading="lazy" decoding="async" referrerpolicy="no-referrer" /></span>
          <span class="cc-tile__cap"><b>${loc(p, 'title')}</b><small>${t(CAT_KEY[p.category] || 'portfolio.works')}</small></span></a>`)}`)
        : String(html`<div class="cc-empty cc-empty--wide"><b>${t('cc.favEmpty')}</b><a class="af-btn af-btn--ghost af-btn--sm" href="#/portfolio">${t('cc.openPortfolio')}</a></div>`);
      if (items.length < 3) $$('[data-gal]', el).forEach((b) => (b.hidden = true));
    } catch { gBox.innerHTML = String(errBox()); }
  }
  $$('[data-gal]', el).forEach((b) => b.addEventListener('click', () => gBox.scrollBy({ left: +b.dataset.gal * gBox.clientWidth * 0.8, behavior: reducedMotion() ? 'auto' : 'smooth' })));

  return cleanup;
}

