// AF STUDIO 3.0 — AF AI usage meter (shared by AI chat, account menu and Settings Center).
// Renders only server-provided numbers (js/core/ai-usage.js). Cleans up its timers.
import { t, getLang } from '../core/i18n.js';
import { html, icon, fmtDateTime } from '../core/ui.js';
import { fetchUsage, getUsage, usageError, onUsage, usageLevel, fmtDuration } from '../core/ai-usage.js';

const bar = (pct, level) => html`<span class="um-bar um-bar--${level}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="--p:${pct}%"></i></span>`;

export function usageMarkup(u, err, { variant = 'full', extended = true } = {}) {
  const lang = getLang();
  if (!u) {
    if (err) return html`<div class="um um--${variant} um--error" role="status"><span>${icon('refresh')}</span><p>${t('usage.loadError')}</p><button type="button" class="af-link" data-um-retry>${t('common.retry')}</button></div>`;
    return html`<div class="um um--${variant} um--loading" aria-busy="true"><span class="af-skel um-skel"></span><span class="af-skel um-skel um-skel--sm"></span></div>`;
  }
  const d = u.daily; const m = u.minute;
  const dl = usageLevel(d.percent, d.remaining);
  const mPct = m && m.limit ? Math.min(100, Math.round((m.used / m.limit) * 100)) : (m ? 100 : 0);
  const ml = m ? usageLevel(mPct, m.remaining) : 'ok';
  const resetTxt = d.reset_in != null ? t('usage.resetIn', { time: fmtDuration(d.reset_in, lang) }) : '';
  const exact = d.reset_at ? t('usage.resetAt', { time: fmtDateTime(d.reset_at) }) : '';
  const stale = err ? html`<p class="um-stale">${t('usage.stale')} <button type="button" class="af-link" data-um-retry>${t('common.retry')}</button></p>` : '';
  const off = !u.enabled ? html`<p class="um-note um-note--off">${icon('lock')}<span>${t('usage.disabled')}</span></p>` : '';

  if (variant === 'compact') {
    return html`<div class="um um--compact um--${dl}" title="${exact}">
      <span class="um-c__main"><b>${d.used}</b>/${d.limit}<small>${t('usage.today')}</small></span>${bar(d.percent, dl)}
      <span class="um-c__left">${d.remaining ? t('usage.left', { n: d.remaining }) : t('usage.exhausted')}</span>
      ${extended && m ? html`<span class="um-c__min um--${ml}" title="${t('usage.minuteTitle')}">${icon('refresh')}${m.used}/${m.limit}${m.retry_after ? html` · ${fmtDuration(m.retry_after, lang)}` : ''}</span>` : ''}
      ${err ? html`<button type="button" class="af-icon-btn um-c__retry" data-um-retry aria-label="${t('usage.stale')}">${icon('refresh')}</button>` : ''}
    </div>`;
  }
  if (variant === 'menu') {
    return html`<div class="um um--menu um--${dl}">
      <div class="um-row"><span>${t('usage.menuTitle')}</span><b>${d.used} / ${d.limit}</b></div>
      ${bar(d.percent, dl)}
      <div class="um-row um-row--sub"><span>${d.remaining ? t('usage.left', { n: d.remaining }) : t('usage.exhausted')}</span><span>${resetTxt}</span></div>
      ${m ? html`<div class="um-row um-row--sub"><span>${t('usage.minuteShort')}: ${m.used}/${m.limit}</span><span>${m.retry_after ? t('usage.freeIn', { time: fmtDuration(m.retry_after, lang) }) : t('usage.minuteFree', { n: m.remaining })}</span></div>` : ''}
      ${off}${stale}
    </div>`;
  }
  // full (Settings Center)
  return html`<div class="um um--full">
    <article class="um-card um--${dl}" data-sid="ai.usage_daily">
      <header><span class="um-ico">${icon('ai')}</span><div><small>${t('usage.dailyKicker')}</small><b>${t('usage.dailyTitle')}</b></div></header>
      <p class="um-big"><b>${d.used}</b><span>/ ${d.limit}</span></p>
      ${bar(d.percent, dl)}
      <div class="um-row"><span class="um-left">${d.remaining ? t('usage.leftLong', { n: d.remaining }) : t('usage.exhausted')}</span><span>${d.percent}%</span></div>
      <p class="um-foot">${resetTxt}${exact ? html`<br /><small>${exact} · ${t('usage.utcNote')}</small>` : ''}</p>
    </article>
    <article class="um-card um--${ml}" data-sid="ai.usage_minute">
      <header><span class="um-ico">${icon('refresh')}</span><div><small>${t('usage.minuteKicker')}</small><b>${t('usage.minuteTitle')}</b></div></header>
      ${m ? html`<p class="um-big"><b>${m.used}</b><span>/ ${m.limit}</span></p>${bar(mPct, ml)}
        <div class="um-row"><span class="um-left">${m.remaining ? t('usage.minuteFree', { n: m.remaining }) : t('usage.minuteBusy')}</span><span>${t('usage.window', { s: m.window_seconds })}</span></div>
        <p class="um-foot">${m.retry_after ? t('usage.freeIn', { time: fmtDuration(m.retry_after, lang) }) : m.reset_in ? t('usage.windowIn', { time: fmtDuration(m.reset_in, lang) }) : t('usage.windowEmpty')}</p>`
        : html`<p class="af-muted">${t('usage.minuteUnknown')}</p>`}
    </article>
    ${off}${stale}
  </div>`;
}

/**
 * Mount a live meter. Fetches on mount (unless fresh), re-renders on every snapshot,
 * ticks countdowns locally once per second, refreshes when a countdown ends,
 * when the tab becomes visible and (optionally) every `pollMs`.
 */
export function mountUsage(el, { variant = 'full', extended = () => true, pollMs = 0, maxAge = 15000, onState } = {}) {
  let alive = true; let lastMinuteRetry = 0; let lastResetIn = null; let last = '';
  const paint = () => {
    if (!alive || !el.isConnected) return;
    const u = getUsage(); const err = usageError();
    const out = String(usageMarkup(u, err, { variant, extended: extended() }));
    if (out !== last) { el.innerHTML = out; last = out; } // repaint only on real change (keeps animations calm)
    onState?.(u, err);
  };
  const off = onUsage(paint);
  el.addEventListener('click', (e) => { if (e.target.closest('[data-um-retry]')) fetchUsage(); });
  const tick = setInterval(() => {
    if (!alive) return;
    const u = getUsage(); if (!u) return;
    const r = u.minute?.retry_after || 0;
    if (lastMinuteRetry > 0 && r === 0) fetchUsage();            // a minute slot just freed → confirm with the server
    if (lastResetIn != null && lastResetIn > 0 && u.daily.reset_in === 0) fetchUsage(); // UTC midnight passed
    lastMinuteRetry = r; lastResetIn = u.daily.reset_in;
    if (document.visibilityState === 'visible') paint();
  }, 1000);
  const poll = pollMs ? setInterval(() => { if (document.visibilityState === 'visible') fetchUsage(); }, pollMs) : 0;
  const onVis = () => { if (document.visibilityState === 'visible') fetchUsage({ maxAge: 5000 }); };
  document.addEventListener('visibilitychange', onVis);
  paint();
  fetchUsage({ maxAge });
  return () => { alive = false; off(); clearInterval(tick); if (poll) clearInterval(poll); document.removeEventListener('visibilitychange', onVis); };
}
