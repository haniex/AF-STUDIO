// AF ACCESS — the only screen an unauthenticated visitor can ever see.
import { t, getLang, setLang, onLang } from '../core/i18n.js';
import { html, raw, $, $$, icon, modal, setBusy, reducedMotion , sleep } from '../core/ui.js';
import { CONFIG, isConfigured } from '../config.js';
import { mountAurum } from '../three/aurum.js';
import {
  signIn, signUp, resendConfirmation, requestPasswordReset, completePasswordReset, signInWithGoogle, authErrorKey,
} from '../core/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
let root = null; let scene3d = null; let offLang = null; let mode = 'login'; let pendingEmail = '';
let resendTimer = null; let onEnterCb = () => {}; let flash = null;
let googleOn = CONFIG.FEATURES.googleOAuth === true;
let ui = null;
let spaceToken = 0;
let googleChecked = false;

/** Ask Supabase Auth which providers are enabled (public endpoint, anon key). */
async function detectGoogle() {
  if (googleChecked || CONFIG.FEATURES.googleOAuth !== 'auto' || !isConfigured()) return;
  googleChecked = true;
  try {
    const r = await fetch(CONFIG.SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/settings', { headers: { apikey: CONFIG.SUPABASE_ANON_KEY } });
    const j = await r.json();
    if (j?.external?.google) {
      googleOn = true;
      const typed = root && Array.from(root.querySelectorAll('.acc-form input:not([type=checkbox]):not([type=hidden])')).some((i) => i.value);
      if (!typed && (mode === 'login' || mode === 'register')) renderCard();
    }
  } catch (_) { /* provider list is optional */ }
}

export function mountAccess(el, { initialMode = 'login', message = null, onEnter } = {}) {
  root = el; onEnterCb = onEnter || onEnterCb;
  mode = !isConfigured() ? 'setup' : initialMode;
  flash = message;
  document.body.classList.add('af-access-on');
  // Persistent full-screen space layer (survives language switches) + UI layer
  root.innerHTML = `<div class="acc-space" aria-hidden="true"><canvas class="acc-canvas"></canvas><span class="acc-shade"></span><span class="acc-grain"></span><span class="acc-flash"></span></div><div class="acc-ui"></div>`;
  ui = root.querySelector('.acc-ui');
  const my = ++spaceToken;
  mountAurum(root.querySelector('.acc-canvas')).then((sc) => {
    if (my !== spaceToken) { sc?.dispose(); return; }
    scene3d = sc; if (sc) root.querySelector('.acc-space').classList.add('is-live');
  });
  renderShell();
  offLang = onLang(() => { renderShell(); });
  detectGoogle();
}

export function unmountAccess() {
  spaceToken++;
  scene3d?.dispose(); scene3d = null;
  offLang?.(); offLang = null;
  clearInterval(resendTimer);
  if (root) root.innerHTML = '';
  document.body.classList.remove('af-access-on');
}

function renderShell() {
  ui.innerHTML = String(html`
  <div class="acc" data-mode="${mode}">
    <header class="acc-top">
      <a class="acc-logo" href="#" aria-label="AF STUDIO"><span class="acc-logo__mark">AF</span><span class="acc-logo__name">STUDIO</span></a>
      <div class="acc-lang" role="group" aria-label="Language">
        <button type="button" data-lang="ru" class="${getLang() === 'ru' ? 'is-on' : ''}" aria-pressed="${getLang() === 'ru'}">RU</button>
        <button type="button" data-lang="en" class="${getLang() === 'en' ? 'is-on' : ''}" aria-pressed="${getLang() === 'en'}">EN</button>
      </div>
    </header>

    <section class="acc-hero">
      <div class="acc-hero__content">
        <p class="acc-kicker"><span class="acc-dot"></span>${t('access.kicker')}</p>
        <h1 class="acc-title">
          <span class="acc-line">${t('access.title1')}</span>
          <span class="acc-line">${t('access.title2')}</span>
          <span class="acc-line acc-line--gold">${t('access.title3')}</span>
        </h1>
        <p class="acc-lead">${t('access.lead')}</p>
        <ul class="acc-feats">
          <li>${icon('projects')}<span>${t('access.f1')}</span></li>
          <li>${icon('ai')}<span>${t('access.f2')}</span></li>
          <li>${icon('pin')}<span>${t('access.f3')}</span></li>
        </ul>
      </div>
    </section>

    <section class="acc-panel">
      <div class="acc-card" role="region" aria-live="polite">
        <div class="acc-card__glow" aria-hidden="true"></div>
        <div class="acc-card__body"></div>
        <p class="acc-secure">${icon('shield')}<span>${t('access.secureNote')}</span></p>
      </div>
      <p class="acc-legal">
        <button type="button" class="acc-link" data-legal="terms">${t('legal.terms')}</button> ·
        <button type="button" class="acc-link" data-legal="privacy">${t('legal.privacy')}</button>
      </p>
    </section>
  </div>`);

  $$('[data-lang]', root).forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  $$('[data-legal]', root).forEach((b) => b.addEventListener('click', () => openLegal(b.dataset.legal)));
  $('.acc-logo', root).addEventListener('click', (e) => e.preventDefault());
  renderCard();
  introAnimation();
}

// ---------------------------------------------------------------------
// Card views
// ---------------------------------------------------------------------
function renderCard() {
  const body = $('.acc-card__body', root);
  $('.acc', root).dataset.mode = mode;
  clearInterval(resendTimer);
  const tabs = (mode === 'login' || mode === 'register') ? html`
    <div class="acc-tabs" role="tablist">
      <button type="button" role="tab" data-tab="login" aria-selected="${mode === 'login'}" class="${mode === 'login' ? 'is-on' : ''}">${t('access.login')}</button>
      <button type="button" role="tab" data-tab="register" aria-selected="${mode === 'register'}" class="${mode === 'register' ? 'is-on' : ''}">${t('access.register')}</button>
      <span class="acc-tabs__ink" style="transform:translateX(${mode === 'register' ? '100%' : '0'})"></span>
    </div>` : '';
  const views = { login: viewLogin, register: viewRegister, forgot: viewForgot, reset: viewReset, confirm: viewConfirm, setup: viewSetup, entering: viewEntering };
  body.innerHTML = String(html`${tabs}${flash ? html`<div class="acc-flash acc-flash--${flash.type || 'info'}" role="status">${flash.text}</div>` : ''}<div class="acc-view">${views[mode]()}</div>`);
  flash = null;
  $$('[data-tab]', body).forEach((b) => b.addEventListener('click', () => { if (b.dataset.tab !== mode) { mode = b.dataset.tab; renderCard(); } }));
  $$('[data-go]', body).forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); mode = b.dataset.go; renderCard(); }));
  $$('[data-legal]', body).forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); openLegal(b.dataset.legal); }));
  $$('.acc-eye', body).forEach(bindEye);
  bindForms(body);
  if (!reducedMotion() && window.gsap) window.gsap.fromTo($('.acc-view', body), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
  setTimeout(() => $('input:not([type=checkbox])', body)?.focus({ preventScroll: true }), 80);
}

const field = (id, label, type = 'text', attrs = '') => html`
  <div class="acc-field">
    <input id="${id}" name="${id}" type="${type}" placeholder=" " ${raw(attrs)} aria-describedby="${id}-err" />
    <label for="${id}">${label}</label>
    ${type === 'password' ? html`<button type="button" class="acc-eye" aria-label="${t('access.showPwd')}" data-for="${id}">${icon('eye')}</button>` : ''}
    <p class="acc-err" id="${id}-err" role="alert"></p>
  </div>`;

function viewLogin() {
  return html`
    <h2 class="acc-h">${t('access.welcomeBack')}</h2><p class="acc-sub">${t('access.loginSub')}</p>
    <form class="acc-form" data-form="login" novalidate>
      ${field('email', t('access.email'), 'email', 'autocomplete="email" inputmode="email" required maxlength="254"')}
      ${field('password', t('access.password'), 'password', 'autocomplete="current-password" required maxlength="128"')}
      <div class="acc-row">
        <label class="acc-check"><input type="checkbox" name="remember" checked /><span class="acc-check__box">${icon('check')}</span><span>${t('access.remember')}</span></label>
        <button type="button" class="acc-link" data-go="forgot">${t('access.forgot')}</button>
      </div>
      <p class="acc-form-err" role="alert"></p>
      <button class="acc-btn" type="submit"><span>${t('access.loginBtn')}</span>${icon('arrowR')}</button>
      ${googleBtn()}
      <p class="acc-switch">${t('access.noAccount')} <button type="button" class="acc-link" data-go="register">${t('access.toRegister')}</button></p>
    </form>`;
}

function viewRegister() {
  const consent = t('access.consent').split(/(\{terms\}|\{privacy\})/).map((p) =>
    p === '{terms}' ? html`<button type="button" class="acc-link" data-legal="terms">${t('access.terms')}</button>`
      : p === '{privacy}' ? html`<button type="button" class="acc-link" data-legal="privacy">${t('access.privacy')}</button>` : p);
  return html`
    <h2 class="acc-h">${t('access.createTitle')}</h2><p class="acc-sub">${t('access.registerSub')}</p>
    <form class="acc-form" data-form="register" novalidate>
      <input type="text" name="website" class="acc-hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
      ${field('name', t('access.name'), 'text', 'autocomplete="name" required maxlength="60"')}
      ${field('email', t('access.email'), 'email', 'autocomplete="email" inputmode="email" required maxlength="254"')}
      ${field('password', t('access.password'), 'password', 'autocomplete="new-password" required minlength="8" maxlength="128"')}
      <div class="acc-meter" aria-hidden="true"><span></span><span></span><span></span><span></span><em></em></div>
      ${field('password2', t('access.password2'), 'password', 'autocomplete="new-password" required maxlength="128"')}
      <label class="acc-check acc-check--wide"><input type="checkbox" name="consent" /><span class="acc-check__box">${icon('check')}</span><span>${consent}</span></label>
      <p class="acc-err" id="consent-err" role="alert"></p>
      <p class="acc-form-err" role="alert"></p>
      <button class="acc-btn" type="submit"><span>${t('access.registerBtn')}</span>${icon('arrowR')}</button>
      ${googleBtn()}
      <p class="acc-switch">${t('access.haveAccount')} <button type="button" class="acc-link" data-go="login">${t('access.toLogin')}</button></p>
    </form>`;
}

function viewForgot() {
  return html`
    <h2 class="acc-h">${t('access.forgotTitle')}</h2><p class="acc-sub">${t('access.forgotSub')}</p>
    <form class="acc-form" data-form="forgot" novalidate>
      ${field('email', t('access.email'), 'email', `autocomplete="email" inputmode="email" required maxlength="254" value="${pendingEmail.replace(/"/g, '')}"`)}
      <p class="acc-form-err" role="alert"></p>
      <button class="acc-btn" type="submit"><span>${t('access.sendLink')}</span>${icon('send')}</button>
      <p class="acc-switch"><button type="button" class="acc-link" data-go="login">${t('access.backToLogin')}</button></p>
    </form>`;
}

function viewReset() {
  return html`
    <h2 class="acc-h">${t('access.resetTitle')}</h2><p class="acc-sub">${t('access.resetSub')}</p>
    <form class="acc-form" data-form="reset" novalidate>
      ${field('password', t('settings.newPwd'), 'password', 'autocomplete="new-password" required minlength="8" maxlength="128"')}
      <div class="acc-meter" aria-hidden="true"><span></span><span></span><span></span><span></span><em></em></div>
      ${field('password2', t('access.password2'), 'password', 'autocomplete="new-password" required maxlength="128"')}
      <p class="acc-form-err" role="alert"></p>
      <button class="acc-btn" type="submit"><span>${t('access.resetBtn')}</span>${icon('check')}</button>
    </form>`;
}

function viewConfirm() {
  return html`
    <div class="acc-mail" aria-hidden="true"><span></span></div>
    <h2 class="acc-h">${t('access.confirmTitle')}</h2>
    <p class="acc-sub">${t('access.confirmSub', { email: pendingEmail })}</p>
    <p class="acc-form-err" role="alert"></p>
    <button class="acc-btn acc-btn--ghost" type="button" data-resend disabled><span>${t('access.resendIn', { s: 60 })}</span></button>
    <p class="acc-switch"><button type="button" class="acc-link" data-go="login">${t('access.backToLogin')}</button></p>`;
}

function viewSetup() {
  return html`<div class="acc-mail acc-mail--lock" aria-hidden="true"><span></span></div>
    <h2 class="acc-h">AF STUDIO</h2><p class="acc-sub">${t('access.notConfigured')}</p>`;
}

function viewEntering() {
  return html`<div class="acc-enter"><div class="acc-enter__ring"><span>AF</span></div><p>${t('access.entering')}</p></div>`;
}

const googleBtn = () => (googleOn ? html`
  <div class="acc-or"><span>${t('common.or')}</span></div>
  <button type="button" class="acc-btn acc-btn--ghost" data-google>${raw(icon('google'))}<span>${t('access.google')}</span></button>` : '');

// ---------------------------------------------------------------------
// Behaviour
// ---------------------------------------------------------------------
function bindEye(btn) {
  btn.addEventListener('click', () => {
    const input = $('#' + btn.dataset.for, root);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = String(icon(show ? 'eyeOff' : 'eye'));
    btn.setAttribute('aria-label', t(show ? 'access.hidePwd' : 'access.showPwd'));
    input.focus();
  });
}

function setErr(form, name, key, vars) {
  const input = $(`[name="${name}"]`, form);
  const p = $(`#${name}-err`, form);
  if (input) input.setAttribute('aria-invalid', key ? 'true' : 'false');
  if (p) p.textContent = key ? t(key, vars) : '';
  input?.closest('.acc-field')?.classList.toggle('is-invalid', !!key);
}
const formErr = (form, key, vars) => { const p = $('.acc-form-err', form); if (p) p.textContent = key ? t(key, vars) : ''; };

function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++; if (pw.length >= 12) s++;
  if (/[a-zа-я]/.test(pw) && /[A-ZА-Я]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^\w\s]/.test(pw)) s++;
  return Math.min(4, Math.max(pw ? 1 : 0, s));
}
function bindMeter(form) {
  const m = $('.acc-meter', form); const pw = $('[name=password]', form);
  if (!m || !pw) return;
  pw.addEventListener('input', () => {
    const s = strength(pw.value);
    m.dataset.level = s;
    $('em', m).textContent = pw.value ? t('access.strength')[Math.max(0, s - 1)] : '';
  });
}

function bindForms(body) {
  const form = $('form', body);
  $('[data-google]', body)?.addEventListener('click', async (e) => {
    const b = e.currentTarget; setBusy(b, true);
    try { await signInWithGoogle(); } catch (err) { setBusy(b, false); formErr(form, authErrorKey(err)); }
  });
  if (mode === 'confirm') return bindResend(body);
  if (!form) return;
  bindMeter(form);
  $$('input', form).forEach((i) => i.addEventListener('input', () => { setErr(form, i.name, null); formErr(form, null); }));

  let busy = false; // double-submit protection
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const fd = Object.fromEntries(new FormData(form));
    const kind = form.dataset.form;
    if (!validate(form, kind, fd)) return;
    if (kind === 'register' && fd.website) return; // honeypot
    const btn = $('.acc-btn[type=submit]', form);
    busy = true; setBusy(btn, true);
    try {
      if (kind === 'login') {
        await signIn(fd.email, fd.password, !!fd.remember);
        return enter();
      }
      if (kind === 'register') {
        pendingEmail = fd.email.trim();
        const r = await signUp({ name: fd.name, email: fd.email, password: fd.password, lang: getLang() });
        if (r.needsConfirmation) { mode = 'confirm'; renderCard(); return; }
        return enter();
      }
      if (kind === 'forgot') {
        pendingEmail = fd.email.trim();
        await requestPasswordReset(fd.email);
        flash = { type: 'ok', text: t('access.forgotSent') };
        mode = 'login'; renderCard(); return;
      }
      if (kind === 'reset') {
        await completePasswordReset(fd.password);
        flash = { type: 'ok', text: t('access.resetDone') };
        return enter();
      }
    } catch (err) {
      const key = authErrorKey(err);
      if (kind === 'login' && key === 'errors.email_not_confirmed') { pendingEmail = fd.email.trim(); }
      formErr(form, key);
      shake($('.acc-card', root));
    } finally {
      busy = false; if (btn.isConnected) setBusy(btn, false);
    }
  });
}

function validate(form, kind, fd) {
  let ok = true;
  const bad = (name, key, vars) => { setErr(form, name, key, vars); ok = false; };
  if ('email' in fd) { if (!fd.email.trim()) bad('email', 'v.required'); else if (!EMAIL_RE.test(fd.email.trim())) bad('email', 'v.email'); }
  if (kind === 'login' && !fd.password) bad('password', 'v.required');
  if (kind === 'register') {
    const n = (fd.name || '').trim();
    if (n.length < 2 || n.length > 60) bad('name', 'v.name');
    if (!fd.consent) { const p = $('#consent-err', form); p.textContent = t('v.consent'); ok = false; } else $('#consent-err', form).textContent = '';
  }
  if (kind === 'register' || kind === 'reset') {
    if (!fd.password) bad('password', 'v.required'); else if (fd.password.length < 8) bad('password', 'v.pwdMin');
    if (!fd.password2) bad('password2', 'v.required'); else if (fd.password !== fd.password2) bad('password2', 'v.pwdMatch');
  }
  if (!ok) { $('[aria-invalid=true]', form)?.focus(); shake($('.acc-card', root)); }
  return ok;
}

function bindResend(body) {
  const btn = $('[data-resend]', body);
  let left = 60;
  const tick = () => {
    left--;
    if (left <= 0) { clearInterval(resendTimer); btn.disabled = false; btn.innerHTML = String(html`<span>${t('access.resend')}</span>`); }
    else btn.innerHTML = String(html`<span>${t('access.resendIn', { s: left })}</span>`);
  };
  resendTimer = setInterval(tick, 1000);
  btn.addEventListener('click', async () => {
    setBusy(btn, true);
    try {
      await resendConfirmation(pendingEmail);
      flash = { type: 'ok', text: t('access.resent') }; renderCard();
    } catch (err) {
      setBusy(btn, false); $('.acc-form-err', body).textContent = t(authErrorKey(err));
    }
  });
}

async function enter() {
  mode = 'entering'; renderCard();
  root?.querySelector('.acc-space')?.classList.add('is-warp');
  await scene3d?.warp();
  await sleep(reducedMotion() ? 50 : 350);
  onEnterCb();
}

function shake(n) { if (!n || reducedMotion()) return; n.classList.remove('is-shake'); void n.offsetWidth; n.classList.add('is-shake'); }

function openLegal(kind) {
  modal({ title: t(kind === 'terms' ? 'legal.terms' : 'legal.privacy'), size: 'sm',
    body: html`<p class="af-muted">${t(kind === 'terms' ? 'access.termsText' : 'access.privacyText')}</p>`,
    actions: [{ label: t('common.close'), primary: true }] });
}

function introAnimation() {
  if (reducedMotion() || !window.gsap) return;
  const g = window.gsap;
  g.fromTo($$('.acc-line', root), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.12, ease: 'power4.out', delay: 0.1 });
  g.fromTo($$('.acc-kicker, .acc-lead, .acc-feats li', root), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out', delay: 0.45 });
  g.fromTo($('.acc-card', root), { y: 26, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 1, ease: 'power3.out', delay: 0.25 });
}
