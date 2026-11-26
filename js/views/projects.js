import { t, loc } from '../core/i18n.js';
import { html, icon, fmtDate, projectNo, reveal, emptyState, errorState, skeleton, $, $$ } from '../core/ui.js';
import { listProjects, getServices, projectCovers } from '../core/api.js';
import { getPreferences, sortProjects, rememberedFilter, rememberFilter } from '../core/preferences.js';

export const STATUSES = ['new', 'awaiting', 'brief_approved', 'concept', 'production', 'review', 'revisions', 'done'];
let filter = 'all';

export async function render(el) {
  const ws = getPreferences().workspace; // 3.0: view, sorting, list size, remembered filter
  filter = rememberedFilter('projects', 'all');
  let shown = ws.page_size;
  el.innerHTML = String(html`
    <header class="af-page-head" data-reveal><div><span class="af-kicker">AF CLIENT SPACE</span><h2>${t('projects.title')}</h2><p>${t('projects.sub')}</p></div>
      <a class="af-btn af-btn--gold" href="#/builder">${icon('plus')}<span>${t('builder.newProject')}</span></a></header>
    <div class="af-chips" data-filters style="margin-bottom:20px"></div>
    <div class="af-grid af-grid--3 ${ws.projects_view === 'list' ? 'pr-list' : ''}" data-list>${skeleton(3)}</div>
    <div class="ws-more" data-more hidden></div>`);
  reveal(el);
  let projects, services, covers;
  try {
    [projects, services] = await Promise.all([listProjects(), getServices()]);
    covers = await projectCovers(projects);
  } catch (e) { console.error(e); $('[data-list]', el).innerHTML = String(errorState()); return; }
  if (!el.isConnected) return;
  projects = sortProjects(projects, ws.projects_sort);
  const svc = Object.fromEntries(services.map((s) => [s.id, s]));
  const used = STATUSES.filter((s) => projects.some((p) => p.status === s));
  if (filter !== 'all' && !used.includes(filter)) filter = 'all';

  function paint() {
    $('[data-filters]', el).innerHTML = projects.length ? String(html`
      <button type="button" class="af-chip ${filter === 'all' ? 'is-on' : ''}" data-f="all">${t('projects.all')} · ${projects.length}</button>
      ${used.map((s) => html`<button type="button" class="af-chip ${filter === s ? 'is-on' : ''}" data-f="${s}">${t('status.' + s)} · ${projects.filter((p) => p.status === s).length}</button>`)}`) : '';
    $$('[data-f]', el).forEach((b) => b.addEventListener('click', () => { filter = b.dataset.f; rememberFilter('projects', filter); shown = ws.page_size; paint(); }));
    const all = projects.filter((p) => filter === 'all' || p.status === filter);
    const list = all.slice(0, shown);
    const more = $('[data-more]', el);
    more.hidden = all.length <= shown;
    more.innerHTML = all.length > shown ? String(html`<button type="button" class="af-btn af-btn--ghost">${t('ws.showMore', { n: Math.min(ws.page_size, all.length - shown), total: all.length })}</button>`) : '';
    $('button', more)?.addEventListener('click', () => { shown += ws.page_size; paint(); });
    $('[data-list]', el).innerHTML = projects.length ? String(html`${list.map((p) => html`
      <a class="af-card af-card--hover pr-card" href="#/projects/${p.id}">
        <div class="pr-card__img">${covers[p.id] ? html`<img src="${covers[p.id]}" alt="" loading="lazy" />` : html`<span>${projectNo(p.number)}</span>`}</div>
        <div class="pr-card__body">
          <div class="af-row af-row--between"><span class="pr-no">${projectNo(p.number)}</span><span class="af-pill af-pill--${p.status}">${t('status.' + p.status)}</span></div>
          <h3>${p.title}</h3>
          <div class="pr-card__meta">
            <span>${t('projects.service')}<b>${loc(svc[p.service_id], 'title') || '—'}</b></span>
            <span>${t('projects.created')}<b>${fmtDate(p.created_at)}</b></span>
            <span>${t('projects.updated')}<b>${fmtDate(p.updated_at)}</b></span>
            <span>${t('projects.deadline')}<b>${p.deadline ? fmtDate(p.deadline) : '—'}</b></span>
          </div>
          <span class="af-link">${t('common.open')} →</span>
        </div>
      </a>`)}`)
      : String(emptyState(t('projects.empty'), t('projects.emptySub'), html`<a class="af-btn af-btn--gold" href="#/builder">${t('builder.newProject')}</a>`));
    if (window.gsap) window.gsap.fromTo($$('.pr-card', el), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out' });
  }
  paint();
}
