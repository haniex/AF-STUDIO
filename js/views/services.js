import { t, loc, locj } from '../core/i18n.js';
import { html, icon, reveal, magnetic, modal, toast, skeleton, errorState, initials, $, setBusy } from '../core/ui.js';
import { getServices, getReviews, createThread } from '../core/api.js';
import { navigate } from '../core/router.js';
import { CONFIG } from '../config.js';
import { PROCESS } from '../data/process.js';
import { processTimeline, reviewsGallery } from '../legacy/widgets.js';

export async function render(el) {
  el.innerHTML = String(html`<div class="sv-wrap">
    <header class="af-page-head" data-reveal><div><span class="af-kicker">04 · AF STUDIO</span><h2>${t('services.title')}</h2><p>${t('services.sub')}</p></div>
      <a class="af-btn af-btn--gold magnetic" href="#/calculator">${icon('calc')}<span>${t('services.calc')}</span></a></header>
    <div class="services-grid" data-services>${skeleton(4)}</div>
    ${processHtml()}
    <div data-reviews></div>
    <section class="af-card" data-reveal>
      <div class="af-card__head"><h3>${t('services.contactsTitle')}</h3><button type="button" class="af-btn af-btn--primary af-btn--sm" data-write>${icon('messages')}<span>${t('services.writeUs')}</span></button></div>
      <div class="sv-contacts">
        <a href="mailto:${CONFIG.CONTACTS.email}"><small>Email</small><b>${CONFIG.CONTACTS.email}</b></a>
        <a href="https://t.me/${CONFIG.CONTACTS.telegram}" target="_blank" rel="noopener"><small>Telegram</small><b>@${CONFIG.CONTACTS.telegram}</b></a>
        <a href="tel:${CONFIG.CONTACTS.phone.replace(/[^+\d]/g, '')}"><small>${t('builder.contactPhone')}</small><b>${CONFIG.CONTACTS.phone}</b></a>
        <div><small>Location</small><b>${t('services.location')}</b></div>
      </div>
    </section></div>`);
  reveal(el); magnetic(el);
  const cleanups = [processTimeline($('.process', el))];
  $('[data-write]', el).addEventListener('click', () => writeToStudio());

  try {
    const [services, reviews] = await Promise.all([getServices(), getReviews()]);
    if (!el.isConnected) return () => cleanups.forEach((f) => f());
    $('[data-services]', el).innerHTML = String(html`${services.map((s, i) => html`
      <div class="service-card" data-reveal>
        <span class="service-num">${String(i + 1).padStart(2, '0')}</span>
        <h3>${loc(s, 'title')}</h3><p>${loc(s, 'desc')}</p>
        <ul class="service-list">${(s.features || []).map((f) => html`<li>${locj(f)}</li>`)}</ul>
        <div class="sv-actions">
          <a class="af-btn af-btn--primary af-btn--sm" href="#/builder?service=${s.id}">${t('services.discuss')}</a>
          <a class="af-btn af-btn--ghost af-btn--sm" href="#/calculator?category=${s.id}">${t('services.calc')}</a>
        </div>
      </div>`)}`);
    reveal($('[data-services]', el));
    if (reviews.length) {
      $('[data-reviews]', el).innerHTML = String(reviewsHtml(reviews));
      cleanups.push(reviewsGallery($('.reviews', el), { onMore: (i) => openReview(reviews[i], i, reviews.length) }));
    }
  } catch (e) { console.error(e); $('[data-services]', el).innerHTML = String(errorState()); }
  return () => cleanups.forEach((f) => f());
}

function processHtml() {
  return html`<section class="process section" data-process-root>
    <div class="process-ambient" aria-hidden="true"></div>
    <div class="container process-container">
      <header class="process-hero">
        <p class="process-kicker">${t('services.processKicker')}</p>
        <h2 class="process-headline">${t('services.processTitle')}</h2>
        <p class="process-sub">${t('services.processSub')}</p>
        <div class="process-orbit" aria-hidden="true"><div class="po-ring po-ring-1"></div><div class="po-ring po-ring-2"></div>
          <div class="po-core"><span class="po-dot"></span><span class="po-dot"></span><span class="po-dot"></span><span class="po-dot"></span></div>
          <div class="po-float po-f1"></div><div class="po-float po-f2"></div><div class="po-float po-f3"></div></div>
      </header>
      <div class="process-nav-bar">
        <button type="button" class="pt-nav-btn pt-prev" aria-label="${t('common.back')}" disabled>${icon('arrowL')}</button>
        <div class="pt-dots" role="tablist">${PROCESS.map((_, i) => html`<button type="button" class="pt-dot ${i === 0 ? 'is-active' : ''}" data-index="${i}" aria-label="${i + 1}"></button>`)}</div>
        <button type="button" class="pt-nav-btn pt-next" aria-label="${t('common.next')}">${icon('arrowR')}</button>
      </div>
      <div class="process-timeline" tabindex="0">
        <div class="pt-track" aria-hidden="true"><div class="pt-progress"></div></div>
        ${PROCESS.map((s, i) => html`<article class="pt-step ${i === 0 ? 'is-active' : ''}" data-step="${i}">
          <button type="button" class="pt-marker" aria-expanded="${i === 0}" aria-controls="pt-panel-${i}"><span class="pt-num">${String(i + 1).padStart(2, '0')}</span></button>
          <div class="pt-panel" id="pt-panel-${i}">
            <div class="pt-visual" aria-hidden="true"><div class="pv-scene ${s.scene}">${s.parts.map((c) => html`<span class="${c}"></span>`)}</div></div>
            <div class="pt-content"><h3 class="pt-title">${locj(s.title)}</h3><p class="pt-desc">${locj(s.desc)}</p>
              <p class="pt-result"><span>${t('services.outcome')}</span> <span>${locj(s.result)}</span></p></div>
          </div></article>`)}
      </div>
      <div class="process-close"><div class="process-close-actions">
        <a href="#/builder" class="btn btn-primary">${t('services.discuss')}</a><a href="#/portfolio" class="btn btn-outline">${t('overview.qPortfolio')}</a></div></div>
    </div></section>`;
}

function reviewsHtml(reviews) {
  const n = String(reviews.length).padStart(2, '0');
  return html`<section class="reviews section" data-reviews-root>
    <div class="reviews-ambient" aria-hidden="true"></div>
    <div class="container reviews-container">
      <header class="reviews-intro"><p class="reviews-kicker">${t('services.reviewsKicker')}</p><h2 class="reviews-title section-title">${t('services.reviewsTitle')}</h2></header>
      <div class="reviews-gallery" tabindex="0" role="region" aria-roledescription="carousel">
        <div class="reviews-stage">${reviews.map((r, i) => html`
          <article class="rx-card ${i === 0 ? 'is-active' : ''}" data-index="${i}">
            <div class="rx-card-inner">
              <div class="rx-meta"><span class="rx-index">${String(i + 1).padStart(2, '0')} / ${n}</span><span class="rx-stars" aria-label="${r.rating}/5">${'★'.repeat(r.rating)}</span></div>
              <blockquote class="rx-quote"><p>${loc(r, 'quote')}</p></blockquote>
              <footer class="rx-author"><div class="rx-avatar" aria-hidden="true">${initials(r.author)}</div>
                <div><strong class="rx-name">${r.author}</strong><span class="rx-role">${loc(r, 'role')}</span></div></footer>
              <button type="button" class="rx-more">${t('common.details')}</button>
            </div></article>`)}</div>
        <div class="reviews-controls">
          <button type="button" class="rx-nav rx-prev" aria-label="${t('common.back')}">${icon('arrowL')}</button>
          <div class="rx-dots" role="tablist">${reviews.map((_, i) => html`<button type="button" class="rx-dot ${i === 0 ? 'is-active' : ''}" role="tab" data-index="${i}" aria-label="${i + 1}"></button>`)}</div>
          <button type="button" class="rx-nav rx-next" aria-label="${t('common.next')}">${icon('arrowR')}</button>
        </div>
      </div>
    </div></section>`;
}

function openReview(r, i, total) {
  modal({ title: r.author, size: 'sm', body: html`<p class="af-muted" style="margin-bottom:10px">${loc(r, 'role')} · ${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</p>
    <blockquote class="af-md"><p>${loc(r, 'quote')}</p></blockquote>`, actions: [{ label: t('services.discuss'), primary: true, onClick: () => navigate('/builder') }] });
}

export function writeToStudio(projectId = null, subject = '') {
  const body = document.createElement('div');
  body.innerHTML = String(html`
    <label class="af-field"><span>${t('messages.subject')}</span><input name="subject" maxlength="160" value="${subject}" required /></label>
    <label class="af-field"><span>${t('messages.firstMsg')}</span><textarea name="body" rows="5" maxlength="5000" required></textarea></label>`);
  return modal({
    title: t('messages.newThread'), body,
    actions: [{ label: t('common.cancel'), value: null }, {
      label: t('common.send'), primary: true,
      onClick: async (b, close, btn) => {
        const s = $('[name=subject]', b).value.trim(); const m = $('[name=body]', b).value.trim();
        if (!s || !m) { toast(t('v.required'), 'err'); return false; }
        setBusy(btn, true);
        try { const th = await createThread(s, m, projectId); close(th); navigate('/messages/' + th.id); }
        catch (e) { setBusy(btn, false); toast(t(String(e.message).includes('rate_limited') ? 'errors.rate_limited' : 'errors.generic'), 'err'); }
        return false;
      },
    }],
  });
}
