// Tiny safe DOM / UI toolkit for AF Studio (no framework, XSS-safe by default)
import { t } from './i18n.js';

// ---------------------------------------------------------------------
// Safe HTML templating: html`<p>${userText}</p>` escapes every value
// unless it is wrapped with raw() or is itself the result of html``.
// ---------------------------------------------------------------------
class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"'`]/g, (c) => ESC[c]);
export const raw = (s) => new Safe(String(s ?? ''));
const val = (v) => {
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(val).join('');
  if (v === false || v === null || v === undefined) return '';
  return esc(v);
};
export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => { out += s + (i < values.length ? val(values[i]) : ''); });
  return new Safe(out);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export function mount(el, content) { el.innerHTML = String(content); return el; }
export function el(tag, attrs = {}, content = '') {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v);
  });
  if (content) n.innerHTML = String(content);
  return n;
}

export const debounce = (fn, ms = 400) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
export const reducedMotion = () => (typeof document !== 'undefined' && document.body?.classList.contains('fx-reduced')) || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = () => window.matchMedia('(pointer: coarse)').matches;
export const isMobile = () => window.matchMedia('(max-width: 860px)').matches;

// ---------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------
const locale = () => (document.documentElement.lang === 'en' ? 'en-GB' : 'ru-RU');
export const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString(locale(), opts) : '—';
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export function fmtRelative(d) {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  if (diff < 60) return rtf.format(-Math.round(diff), 'second');
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  if (diff < 86400 * 7) return rtf.format(-Math.round(diff / 86400), 'day');
  return fmtDate(d);
}
export const fmtMoney = (n, cur = 'RUB') =>
  new Intl.NumberFormat(locale(), { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(Math.round(n / 500) * 500);
export const fmtSize = (b) => (b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
export const projectNo = (n) => 'AF-' + String(n ?? 0).padStart(5, '0');
export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || 'AF';

// ---------------------------------------------------------------------
// Safe Markdown (escape first, then a small whitelist of syntax)
// ---------------------------------------------------------------------
export function md(src = '') {
  const lines = esc(src).replace(/\r/g, '').split('\n');
  const out = [];
  let list = null;
  const inline = (s) => s
    .replace(/&#96;(.+?)&#96;/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const line of lines) {
    const ul = line.match(/^\s*[-*•]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    const hd = line.match(/^(#{1,4})\s+(.*)/);
    if (ul || ol) {
      const type = ul ? 'ul' : 'ol';
      if (list !== type) { close(); out.push(`<${type}>`); list = type; }
      out.push(`<li>${inline((ul || ol)[1])}</li>`);
    } else if (hd) {
      close(); const lvl = Math.min(hd[1].length + 2, 6); out.push(`<h${lvl}>${inline(hd[2])}</h${lvl}>`);
    } else if (!line.trim()) {
      close();
    } else {
      close(); out.push(`<p>${inline(line)}</p>`);
    }
  }
  close();
  return raw(out.join(''));
}

// ---------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------
let toastRoot;
export function toast(message, type = 'info', ms = 3800) {
  if (!toastRoot) {
    toastRoot = el('div', { class: 'af-toasts', 'aria-live': 'polite', role: 'status' });
    document.body.appendChild(toastRoot);
  }
  const n = el('div', { class: `af-toast af-toast--${type}` }, html`<span class="af-toast__dot"></span><span>${message}</span>`);
  toastRoot.appendChild(n);
  requestAnimationFrame(() => n.classList.add('is-in'));
  setTimeout(() => { n.classList.remove('is-in'); setTimeout(() => n.remove(), 400); }, ms);
}

// ---------------------------------------------------------------------
// Modal / confirm / prompt (accessible, focus-trapped, ESC to close)
// ---------------------------------------------------------------------
export function modal({ title = '', body = '', actions = [], size = 'md', onMount } = {}) {
  return new Promise((resolve) => {
    const last = document.activeElement;
    const wrap = el('div', { class: `af-modal af-modal--${size}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    wrap.innerHTML = String(html`
      <div class="af-modal__backdrop" data-close></div>
      <div class="af-modal__panel">
        <header class="af-modal__head">
          <h3>${title}</h3>
          <button type="button" class="af-icon-btn" data-close aria-label="${t('common.close')}">${raw(ICONS.x)}</button>
        </header>
        <div class="af-modal__body"></div>
        ${actions.length ? html`<footer class="af-modal__foot">${actions.map((a, i) => html`<button type="button" class="af-btn ${a.primary ? 'af-btn--primary' : a.danger ? 'af-btn--danger' : 'af-btn--ghost'}" data-act="${i}">${a.label}</button>`)}</footer>` : ''}
      </div>`);
    const bodyEl = $('.af-modal__body', wrap);
    if (body instanceof Node) bodyEl.appendChild(body); else bodyEl.innerHTML = String(body);
    document.body.appendChild(wrap);
    document.body.classList.add('af-no-scroll');
    requestAnimationFrame(() => wrap.classList.add('is-open'));
    const close = (v) => {
      wrap.classList.remove('is-open');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { wrap.remove(); if (!$('.af-modal')) document.body.classList.remove('af-no-scroll'); last?.focus?.(); }, 220);
      resolve(v);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(null);
      if (e.key === 'Tab') {
        const f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', wrap).filter((x) => !x.disabled && x.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    $$('[data-close]', wrap).forEach((b) => b.addEventListener('click', () => close(null)));
    $$('[data-act]', wrap).forEach((b) => b.addEventListener('click', async () => {
      const a = actions[+b.dataset.act];
      if (a.onClick) {
        b.disabled = true;
        try { const r = await a.onClick(bodyEl, close, b); if (r === false) { b.disabled = false; return; } }
        catch (e) { b.disabled = false; return; }
      }
      close(a.value ?? true);
    }));
    onMount?.(bodyEl, close);
    setTimeout(() => ($('input, textarea, select', bodyEl) || $('[data-act]', wrap) || $('.af-icon-btn', wrap))?.focus(), 60);
  });
}

export const confirmDialog = (title, text, { danger = false, okLabel } = {}) =>
  modal({
    title, size: 'sm', body: html`<p class="af-muted">${text}</p>`,
    actions: [{ label: t('common.cancel'), value: false }, { label: okLabel || t('common.confirm'), value: true, primary: !danger, danger }],
  }).then((v) => v === true);

export function promptDialog(title, { label = '', value = '', placeholder = '', multiline = false, maxLength = 160 } = {}) {
  const id = 'p' + uid().slice(0, 6);
  return modal({
    title, size: 'sm',
    body: html`<label class="af-field"><span>${label}</span>
      ${multiline ? html`<textarea id="${id}" rows="4" maxlength="${maxLength}" placeholder="${placeholder}">${value}</textarea>`
                  : html`<input id="${id}" type="text" maxlength="${maxLength}" value="${value}" placeholder="${placeholder}" />`}</label>`,
    actions: [{ label: t('common.cancel'), value: null }, {
      label: t('common.save'), primary: true,
      onClick: (b, close) => { const v = $('#' + id, b).value.trim(); if (!v) return false; close(v); return false; },
    }],
  });
}

// ---------------------------------------------------------------------
// Small UI fragments
// ---------------------------------------------------------------------
export const spinner = () => raw('<span class="af-spinner" aria-hidden="true"></span>');
export const skeleton = (n = 3, cls = 'af-skel-card') => raw(Array.from({ length: n }, () => `<div class="af-skel ${cls}"></div>`).join(''));
export const emptyState = (title, text = '', action = '') =>
  html`<div class="af-empty"><div class="af-empty__orb" aria-hidden="true"></div><h3>${title}</h3>${text ? html`<p>${text}</p>` : ''}${action}</div>`;
export const errorState = (text) =>
  html`<div class="af-empty af-empty--error"><h3>${t('common.errorTitle')}</h3><p>${text || t('errors.generic')}</p>
    <button class="af-btn af-btn--ghost" type="button" data-reload>${t('common.retry')}</button></div>`;

export function setBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) {
    btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.classList.add('is-busy');
    btn.innerHTML = String(html`${spinner()}<span>${label || t('common.wait')}</span>`);
  } else {
    btn.disabled = false; btn.classList.remove('is-busy');
    if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
  }
}

/** Animate children of a freshly-rendered view in (GSAP if present, CSS otherwise). */
export function reveal(root, sel = '[data-reveal]') {
  const items = $$(sel, root);
  if (!items.length) return;
  if (reducedMotion() || typeof window.gsap === 'undefined') { items.forEach((i) => (i.style.opacity = 1)); return; }
  window.gsap.fromTo(items, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'transform' });
}

/** Magnetic hover for pointer devices (kept from the original AF site). */
export function magnetic(root = document) {
  if (isTouch() || reducedMotion()) return;
  $$('.magnetic', root).forEach((m) => {
    if (m.dataset.mag) return; m.dataset.mag = '1';
    m.addEventListener('mousemove', (e) => {
      const r = m.getBoundingClientRect();
      m.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.16}px, ${(e.clientY - r.top - r.height / 2) * 0.16}px)`;
    });
    m.addEventListener('mouseleave', () => { m.style.transform = ''; });
  });
}

export function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)?.dataset.loaded) return res();
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { existing.addEventListener('load', () => res()); existing.addEventListener('error', rej); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = () => { s.dataset.loaded = '1'; res(); };
    s.onerror = () => rej(new Error('script_load_failed: ' + src));
    document.head.appendChild(s);
  });
}

export const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
export const loadThree = async () => { if (!window.THREE) await loadScript(THREE_URL); return window.THREE; };

// ---------------------------------------------------------------------
// Icons (inline SVG, stroke = currentColor)
// ---------------------------------------------------------------------
const I = (d, extra = '') => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICONS = {
  overview: I('<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>'),
  portfolio: I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 15l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/>'),
  services: I('<path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.8 6.5 19.5l1-6.3L3 8.9 9 8z"/>'),
  ai: I('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/>'),
  builder: I('<path d="M4 20h16M6 16l9.5-9.5a2.1 2.1 0 013 3L9 19H6z"/>'),
  calc: I('<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M8 6.5h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h3.5"/>'),
  lab: I('<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12M21 7l-9 5-9-5"/>'),
  projects: I('<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>'),
  messages: I('<path d="M21 12a8 8 0 01-11.6 7.1L4 20.5l1.4-5A8 8 0 1121 12z"/>'),
  heart: I('<path d="M12 20s-7-4.4-9.2-9A5 5 0 0112 6a5 5 0 019.2 5C19 15.6 12 20 12 20z"/>'),
  heartFill: I('<path d="M12 20s-7-4.4-9.2-9A5 5 0 0112 6a5 5 0 019.2 5C19 15.6 12 20 12 20z" fill="currentColor"/>'),
  settings: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>'),
  files: I('<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
  mood: I('<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/>'),
  bell: I('<path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16zM10 21h4"/>'),
  logout: I('<path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H3"/>'),
  x: I('<path d="M18 6L6 18M6 6l12 12"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  send: I('<path d="M4 12l16-8-6 16-2.5-6.5z"/>'),
  upload: I('<path d="M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3"/>'),
  download: I('<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>'),
  trash: I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  eye: I('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: I('<path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4M6.6 6.6A16.5 16.5 0 002 12s3.6 7 10 7a9.7 9.7 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2"/>'),
  arrowR: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  arrowL: I('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h10"/>'),
  more: I('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'),
  sun: I('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: I('<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>'),
  fullscreen: I('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  spark: I('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>'),
  pin: I('<path d="M12 21s-6-5.4-6-11a6 6 0 1112 0c0 5.6-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'),
  google: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.6 2.3 12S6.6 21.8 12 21.8c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.8z"/></svg>',
  shield: I('<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
  copy: I('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>'),
  refresh: I('<path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6"/>'),
  image: I('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>'),
  palette: I('<path d="M12 3a9 9 0 100 18c1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.9.7-1.6 1.6-1.6H16a5 5 0 005-5C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/>'),
  note: I('<path d="M5 3h10l4 4v14H5z"/><path d="M8 11h8M8 15h6"/>'),
  layers: I('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
  user: I('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'),
  lock: I('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/>'),
  admin: I('<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/>'),
};
export const icon = (name) => raw(ICONS[name] || '');
