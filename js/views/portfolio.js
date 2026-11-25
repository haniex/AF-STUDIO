import { t, loc } from '../core/i18n.js';
import { html, raw, icon, reveal, toast, emptyState, skeleton, errorState, $, $$ } from '../core/ui.js';
import { getPortfolio, getFavorites, toggleFavorite, withMedia, getBeforeAfter } from '../core/api.js';
import { mediaUrls } from '../lib/supabase.js';
import { navigate } from '../core/router.js';
import { tilt } from '../legacy/widgets.js';

const FILTERS = [['all', 'common.all'], ['product', 'portfolio.fProduct'], ['arch', 'portfolio.fArch'], ['character', 'portfolio.fCharacter'], ['motion', 'portfolio.fMotion']];
let filter = 'all';

export async function render(el, { params, query }) {
  if (params.id) return renderDetail(el, params.id);
  const tab = query.tab === 'compare' ? 'compare' : 'works';
  el.innerHTML = String(html`
    <header class="af-page-head" data-reveal>
      <div><span class="af-kicker">02 · AF STUDIO</span><h2>${t('portfolio.title')}</h2><p>${t('portfolio.sub')}</p></div>
    </header>
    <div class="af-tabs" role="tablist">
      <a href="#/portfolio" class="${tab === 'works' ? 'is-on' : ''}" role="tab">${t('portfolio.works')}</a>
      <a href="#/portfolio?tab=compare" class="${tab === 'compare' ? 'is-on' : ''}" role="tab">${t('portfolio.compare')}</a>
    </div>
    <div data-body>${tab === 'works' ? html`<div class="pf-grid">${skeleton(6)}</div>` : skeleton(1)}</div>`);
  reveal(el);
  const body = $('[data-body]', el);
  try {
    if (tab === 'compare') return await renderCompare(body);
    const [items, favs] = await Promise.all([getPortfolio().then((r) => withMedia(r)), getFavorites()]);
    return paintGrid(body, items, favs, { withFilters: true });
  } catch (e) { console.error(e); body.innerHTML = String(errorState()); }
}

export function cardHtml(p, favs) {
  const on = favs.has(p.id);
  return html`
  <article class="work-card tilt-card" data-category="${p.category}" data-id="${p.id}">
    <button type="button" class="pf-fav ${on ? 'is-on' : ''}" data-fav="${p.id}" aria-pressed="${on}" aria-label="${t(on ? 'portfolio.removeFav' : 'portfolio.addFav')}">${icon(on ? 'heartFill' : 'heart')}</button>
    <a href="#/portfolio/${p.id}" class="work-link">
      <div class="work-image" data-label="${loc(p, 'title')}">
        <img src="${p.cover_url}" alt="${loc(p, 'title')}" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
        <div class="work-overlay">
          <span class="work-year">${p.year || ''}</span>
          <h3 class="work-title">${loc(p, 'title')}</h3>
          <p class="work-tags">${p.tags || ''}</p>
          <span class="work-open">${t('portfolio.view')}</span>
        </div>
      </div>
      <div class="work-info"><h3>${loc(p, 'title')}</h3><p>${loc(p, 'card')}</p></div>
    </a>
  </article>`;
}

export function bindFavs(root, favs, onChange) {
  $$('[data-fav]', root).forEach((b) => b.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    b.disabled = true;
    try {
      const on = await toggleFavorite(b.dataset.fav);
      b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on);
      b.setAttribute('aria-label', t(on ? 'portfolio.removeFav' : 'portfolio.addFav'));
      b.innerHTML = String(icon(on ? 'heartFill' : 'heart'));
      b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop');
      toast(t(on ? 'portfolio.favAdded' : 'portfolio.favRemoved'), 'ok', 2000);
      onChange?.(b.dataset.fav, on);
    } catch { toast(t('errors.generic'), 'err'); }
    b.disabled = false;
  }));
}

function paintGrid(body, items, favs, { withFilters }) {
  body.innerHTML = String(html`
    ${withFilters ? html`<div class="pf-filters" role="tablist">${FILTERS.map(([k, label]) => html`
      <button type="button" class="af-chip ${filter === k ? 'is-on' : ''}" data-filter="${k}" aria-pressed="${filter === k}">${t(label)}</button>`)}</div>` : ''}
    <div class="pf-grid">${items.map((p) => cardHtml(p, favs))}</div>`);
  const apply = () => $$('.work-card', body).forEach((c) => c.classList.toggle('hidden', filter !== 'all' && c.dataset.category !== filter));
  $$('[data-filter]', body).forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.filter;
    $$('[data-filter]', body).forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
    apply();
  }));
  apply();
  bindFavs(body, favs);
  if (window.gsap) window.gsap.fromTo($$('.work-card', body), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'opacity' });
  return tilt(body);
}

// ---------------------------------------------------------------------
// Project detail (replaces the legacy project.html, now behind auth)
// ---------------------------------------------------------------------
async function renderDetail(el, id) {
  el.innerHTML = String(skeleton(1, 'af-skel-card'));
  let items, favs;
  try { [items, favs] = await Promise.all([getPortfolio(), getFavorites()]); }
  catch { el.innerHTML = String(errorState()); return; }
  const i = items.findIndex((p) => p.id === id);
  if (i < 0) { el.innerHTML = String(emptyState(t('portfolio.notFound'), '', html`<a class="af-btn af-btn--ghost" href="#/portfolio">${t('portfolio.allWorks')}</a>`)); return; }
  const [p] = await withMedia([items[i]], ['cover', 'gallery']);
  const prev = items[(i - 1 + items.length) % items.length]; const next = items[(i + 1) % items.length];
  const gallery = (p.gallery_url?.length ? p.gallery_url : [p.cover_url]);
  const on = favs.has(p.id);
  el.innerHTML = String(html`
    <a class="af-link" href="#/portfolio">${t('portfolio.allWorks')}</a>
    <header class="pd-hero" data-reveal style="margin-top:18px">
      <div class="pd-meta"><span class="af-pill af-pill--plain">${p.year}</span><span class="af-pill af-pill--plain">${p.tags}</span></div>
      <div class="af-row af-row--between"><h1 class="pd-title">${loc(p, 'title')}</h1>
        <button type="button" class="af-btn af-btn--ghost" data-fav-detail aria-pressed="${on}">${icon(on ? 'heartFill' : 'heart')}<span>${t(on ? 'portfolio.removeFav' : 'portfolio.addFav')}</span></button></div>
      <p class="pd-lead">${loc(p, 'lead')}</p>
    </header>
    <section class="pd-gallery" data-reveal>
      <figure class="pd-main"><img data-main src="${gallery[0]}" alt="${loc(p, 'title')}" decoding="async" referrerpolicy="no-referrer" /></figure>
      ${gallery.length > 1 ? html`<div class="pd-thumbs">${gallery.map((src, k) => html`<button type="button" class="${k === 0 ? 'is-on' : ''}" data-src="${src}" aria-label="${k + 1}"><img src="${src}" alt="" loading="lazy" referrerpolicy="no-referrer" /></button>`)}</div>` : ''}
    </section>
    <section class="pd-body" data-reveal>
      <div>
        <h3>${t('portfolio.about')}</h3><p>${loc(p, 'desc')}</p>
        <h3>${t('portfolio.brief')}</h3><p>${loc(p, 'brief')}</p>
        <h3>${t('portfolio.solution')}</h3><p>${loc(p, 'solution')}</p>
      </div>
      <aside class="pd-side af-card">
        <div><h4>${t('portfolio.tools')}</h4><div class="af-chips">${(p.tools || []).map((x) => html`<span class="af-pill af-pill--plain">${x}</span>`)}</div></div>
        <div><h4>${t('portfolio.time')}</h4><p>${loc(p, 'time')}</p></div>
        <div><h4>${t('portfolio.result')}</h4><p>${loc(p, 'result')}</p></div>
        <a class="af-btn af-btn--gold af-btn--block" href="#/builder?service=${p.category}&ref=${p.id}">${t('portfolio.orderSimilar')}</a>
      </aside>
    </section>
    <nav class="pd-nav">
      <a href="#/portfolio/${prev.id}"><span>${t('portfolio.prev')}</span><strong>${loc(prev, 'title')}</strong></a>
      <a href="#/portfolio/${next.id}"><span>${t('portfolio.next')}</span><strong>${loc(next, 'title')}</strong></a>
    </nav>`);
  reveal(el);
  const main = $('[data-main]', el);
  $$('.pd-thumbs button', el).forEach((b) => b.addEventListener('click', () => {
    main.style.opacity = 0;
    setTimeout(() => { main.src = b.dataset.src; main.onload = () => { main.style.opacity = 1; }; }, 150);
    $$('.pd-thumbs button', el).forEach((x) => x.classList.toggle('is-on', x === b));
  }));
  $('[data-fav-detail]', el).addEventListener('click', async (e) => {
    const b = e.currentTarget; b.disabled = true;
    try {
      const v = await toggleFavorite(p.id);
      b.setAttribute('aria-pressed', v); b.innerHTML = String(html`${icon(v ? 'heartFill' : 'heart')}<span>${t(v ? 'portfolio.removeFav' : 'portfolio.addFav')}</span>`);
      toast(t(v ? 'portfolio.favAdded' : 'portfolio.favRemoved'), 'ok', 2000);
    } catch { toast(t('errors.generic'), 'err'); }
    b.disabled = false;
  });
  const onKey = (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowLeft') navigate('/portfolio/' + prev.id);
    if (e.key === 'ArrowRight') navigate('/portfolio/' + next.id);
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

// ---------------------------------------------------------------------
// Before / After — only real materials from the before_after table
// ---------------------------------------------------------------------
async function renderCompare(body) {
  const rows = await getBeforeAfter();
  if (!rows.length) { body.innerHTML = String(emptyState(t('portfolio.compare'), t('portfolio.baEmpty'))); return; }
  const urls = await mediaUrls(rows.flatMap((r) => [r.source_path, r.draft_path, r.final_path]).filter(Boolean));
  const cleanups = [];
  body.innerHTML = String(html`<div class="af-grid af-grid--2">${rows.map((r) => {
    const stages = [['source', r.source_path, 'portfolio.baSource'], ['draft', r.draft_path, 'portfolio.baDraft'], ['final', r.final_path, 'portfolio.baFinal']].filter((s) => s[1]);
    return html`<article class="af-card ba-card" data-ba="${r.id}">
      <div class="ba-card__bar"><h3 class="af-h3" style="margin:0">${loc(r, 'title')}</h3>
        ${stages.length > 2 ? html`<div class="af-chips" data-pair>${[[0, 1], [1, 2], [0, 2]].map(([a, b], k) => html`<button type="button" class="af-chip ${k === 2 ? 'is-on' : ''}" data-a="${a}" data-b="${b}">${t(stages[a][2])} / ${t(stages[b][2])}</button>`)}</div>` : ''}</div>
      ${baSlider(stages.map((s) => ({ url: urls[s[1]] || s[1], label: t(s[2]) })), stages.length > 2 ? [0, 2] : [0, stages.length - 1])}
    </article>`;
  })}</div>`);
  $$('[data-ba]', body).forEach((card) => {
    const r = rows.find((x) => x.id === card.dataset.ba);
    const stages = [[r.source_path, 'portfolio.baSource'], [r.draft_path, 'portfolio.baDraft'], [r.final_path, 'portfolio.baFinal']].filter((s) => s[0]).map((s) => ({ url: urls[s[0]] || s[0], label: t(s[1]) }));
    cleanups.push(bindBa($('.ba', card)));
    $$('[data-pair] button', card).forEach((b) => b.addEventListener('click', () => {
      $$('[data-pair] button', card).forEach((x) => x.classList.toggle('is-on', x === b));
      const ba = $('.ba', card); const a = stages[+b.dataset.a]; const z = stages[+b.dataset.b];
      $('.ba__bottom', ba).src = z.url; $('.ba__top', ba).src = a.url;
      $('.ba__label--l', ba).textContent = a.label; $('.ba__label--r', ba).textContent = z.label;
    }));
  });
  return () => cleanups.forEach((f) => f());
}

export function baSlider(stages, [a, b]) {
  const L = stages[a]; const R = stages[b];
  return html`<div class="ba" style="--pos:50%">
    <img class="ba__bottom" src="${R.url}" alt="${R.label}" />
    <img class="ba__top" src="${L.url}" alt="${L.label}" />
    <span class="ba__label ba__label--l">${L.label}</span><span class="ba__label ba__label--r">${R.label}</span>
    <div class="ba__handle"><button type="button" class="ba__knob" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-label="${t('portfolio.baHint')}">${raw('&#8596;')}</button></div>
  </div>`;
}

export function bindBa(ba) {
  if (!ba) return () => {};
  const knob = $('.ba__knob', ba);
  let dragging = false; let target = 50; let cur = 50; let raf = 0;
  const set = (pct) => { target = Math.max(0, Math.min(100, pct)); if (!raf) raf = requestAnimationFrame(step); };
  const step = () => { cur += (target - cur) * 0.35; if (Math.abs(target - cur) < 0.1) cur = target; ba.style.setProperty('--pos', cur + '%'); knob.setAttribute('aria-valuenow', Math.round(cur)); raf = cur === target ? 0 : requestAnimationFrame(step); };
  const fromEvent = (e) => { const r = ba.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
  const down = (e) => { dragging = true; ba.setPointerCapture?.(e.pointerId); fromEvent(e); };
  const move = (e) => { if (dragging) fromEvent(e); };
  const up = () => { dragging = false; };
  const key = (e) => { if (e.key === 'ArrowLeft') set(target - 5); if (e.key === 'ArrowRight') set(target + 5); if (e.key === 'Home') set(0); if (e.key === 'End') set(100); };
  ba.addEventListener('pointerdown', down); ba.addEventListener('pointermove', move);
  ba.addEventListener('pointerup', up); ba.addEventListener('pointercancel', up); knob.addEventListener('keydown', key);
  return () => { cancelAnimationFrame(raf); ba.removeEventListener('pointerdown', down); ba.removeEventListener('pointermove', move); ba.removeEventListener('pointerup', up); knob.removeEventListener('keydown', key); };
}
