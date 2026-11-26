// =====================================================================
// AF SETTINGS CENTER (3.0) — central modal over the current screen.
// • never clears #af-view and never changes the route
// • search across every setting (offline index in settings-index.js)
// • reuses the existing account handlers (profile, avatar, email, password,
//   export, sign-out, delete) — nothing is duplicated in other modules
// =====================================================================
import { t, getLang, setLang, onLang } from '../core/i18n.js';
import { html, raw, icon, initials, toast, modal, confirmDialog, setBusy, fmtDateTime, reducedMotion, $, $$ } from '../core/ui.js';
import { supabase, signedUrl, callFunction } from '../lib/supabase.js';
import { auth, updateProfile, changePassword, changeEmail, signOut, authErrorKey, isOAuthOnly } from '../core/auth.js';
import { applyTheme, getTheme } from '../core/theme.js';
import { validateFile } from '../core/api.js';
import { CONFIG } from '../config.js';
import { prefs as device } from '../core/prefs.js';
import {
  SPEC, DEFAULT_PREFERENCES, getPreferences, preferencesState, savePreferences, resetPreferences, loadPreferences,
} from '../core/preferences.js';
import { browserPermission, requestBrowserPermission, browserSupport, playTone } from '../core/alerts.js';
import { mountUsage } from './usage-meter.js';
import { openShortcuts } from './help.js';
import { SC_CATEGORIES, SETTINGS_INDEX, searchSettings, groupResults } from './settings-index.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CAT_KEY = 'af.sc.cat';
const PREF_CATS = ['notifications', 'ai', 'appearance', 'workspace', 'experimental'];
const L = (o, k) => (o ? o[`${k}_${getLang()}`] ?? o[`${k}_ru`] ?? '' : '');
const catLabel = (c) => (getLang() === 'en' ? c.en : c.ru);
const item = (id) => SETTINGS_INDEX.find((x) => x.id === id);

let center = null;
const SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>';

export const isSettingsOpen = () => !!center;
export function closeSettingsCenter() { center?.close(); }

/** Open (or focus) the Settings Center. category: one of SC_CATEGORIES ids; focus: index id */
export function openSettingsCenter({ category, focus } = {}) {
  if (!auth.user) return null;
  if (center) { center.go(category || center.cat, focus); return center; }
  center = build(category || sessionStorage.getItem(CAT_KEY) || 'account', focus);
  return center;
}

// ---------------------------------------------------------------------
// building blocks
// ---------------------------------------------------------------------
function badge(st) {
  if (st === 'device') return html`<span class="sc-badge sc-badge--device">${t('sc.device')}</span>`;
  if (st === 'soon') return html`<span class="sc-badge sc-badge--soon">${t('sc.soon')}</span>`;
  return '';
}
function row(id, control = '', { wide = false, extra = '' } = {}) {
  const it = item(id) || {};
  return html`<div class="sc-row ${wide ? 'sc-row--wide' : ''}" data-sid="${id}">
    <div class="sc-row__text"><b>${L(it, 'label')}${badge(it.status)}</b><p>${L(it, 'description')}</p>${extra ? raw(String(extra)) : ''}</div>
    ${control ? html`<div class="sc-row__ctl">${control}</div>` : ''}
  </div>`;
}
const group = (title, body, { hint = '' } = {}) => html`<section class="sc-group">${title ? html`<h4>${title}</h4>` : ''}${hint ? html`<p class="sc-group__hint">${hint}</p>` : ''}<div class="sc-group__body">${body}</div></section>`;
/** segmented control: attr = data-k="cat.key" | data-prof="field" | data-dev="key" */
function seg(attr, value, opts, label) {
  return html`<div class="sc-seg" role="radiogroup" aria-label="${label || ''}" ${raw(attr)}>${opts.map(([v, l]) => html`<button type="button" role="radio" data-v="${v}" aria-checked="${String(v) === String(value)}" class="${String(v) === String(value) ? 'is-on' : ''}">${l}</button>`)}</div>`;
}
function sw(attr, checked, { disabled = false, label = '' } = {}) {
  return html`<label class="sc-switch ${disabled ? 'is-disabled' : ''}"><input type="checkbox" ${raw(attr)} ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} aria-label="${label}" /><span class="sc-switch__track" aria-hidden="true"><i></i></span></label>`;
}
function select(attr, value, opts, label) {
  return html`<select class="sc-select" ${raw(attr)} aria-label="${label || ''}">${opts.map(([v, l]) => html`<option value="${v}" ${String(v) === String(value) ? 'selected' : ''}>${l}</option>`)}</select>`;
}
const k = (cat, key) => `data-k="${cat}.${key}"`;
const opt = (prefix, values) => values.map((v) => [v, t(`${prefix}.${v}`)]);
const lbl = (id) => L(item(id), 'label');

// ---------------------------------------------------------------------
// sections
// ---------------------------------------------------------------------
const SECTIONS = {
  account() {
    const p = auth.profile || {}; const u = auth.user; const oauth = isOAuthOnly();
    const providers = (u.app_metadata?.providers || [u.app_metadata?.provider]).filter(Boolean);
    return html`
      <div class="sc-hero">
        <span class="af-avatar af-avatar--xl" data-sc-av>${initials(p.full_name || u.email)}</span>
        <div class="sc-hero__who"><b>${p.full_name || u.email.split('@')[0]}</b><small>${u.email}</small>
          <span class="sc-chip">${auth.isAdmin ? t('sc.roleAdmin') : t('sc.roleClient')}</span></div>
      </div>
      ${group(t('sc.g.profile'), html`
        ${row('account.avatar', html`<label class="af-btn af-btn--ghost af-btn--sm">${icon('upload')}<span>${t('settings.changeAvatar')}</span><input type="file" accept="image/jpeg,image/png,image/webp" hidden data-avatar /></label>`)}
        <form class="sc-row sc-row--form" data-sid="account.name" data-profile>
          <div class="sc-row__text"><b>${lbl('account.name')}</b><p>${L(item('account.name'), 'description')}</p></div>
          <div class="sc-row__ctl sc-inline"><input class="sc-input" name="full_name" maxlength="60" value="${p.full_name || ''}" autocomplete="name" required aria-label="${lbl('account.name')}" />
            <button type="submit" class="af-btn af-btn--primary af-btn--sm">${t('common.save')}</button></div>
        </form>
        ${row('account.email', oauth ? html`<span class="sc-value">${u.email}</span>` : html`<span class="sc-value">${u.email}</span><button type="button" class="af-btn af-btn--ghost af-btn--sm" data-email>${t('settings.changeEmail')}</button>`,
          { extra: oauth ? html`<p class="sc-note">${t('sc.oauthEmail')}</p>` : '' })}
        ${row('account.provider', html`<span class="sc-value">${providers.length ? providers.map((x) => (x === 'email' ? 'Email' : x === 'google' ? 'Google' : x)).join(' · ') : 'Email'}</span>`)}
        ${row('account.role', html`<span class="sc-value">${auth.isAdmin ? t('sc.roleAdmin') : t('sc.roleClient')}</span>${auth.isAdmin ? html`<a class="af-btn af-btn--ghost af-btn--sm" href="admin.html">${icon('admin')}<span>${t('nav.admin')}</span></a>` : ''}`)}
      `)}`;
  },

  notifications() {
    const p = auth.profile || {}; const n = getPreferences().notifications;
    const inapp = p.notify_inapp !== false; const email = p.notify_email !== false;
    const perm = browserPermission();
    const cat = (id, key) => row(id, html`<div class="sc-ch">
        <span class="sc-ch__item">${sw(`data-ch="notifications.${key}.in_app"`, n[key].in_app, { disabled: !inapp, label: t('sc.chPopup') })}<small>${t('sc.chPopup')}</small></span>
        <span class="sc-ch__item">${sw(`data-ch="notifications.${key}.email"`, n[key].email, { disabled: !email, label: 'Email' })}<small>Email</small></span>
      </div>`);
    return html`
      ${group(t('sc.g.channels'), html`
        ${row('notif.inapp', sw('data-prof="notify_inapp"', inapp, { label: lbl('notif.inapp') }))}
        ${row('notif.email', sw('data-prof="notify_email"', email, { label: lbl('notif.email') }), { extra: html`<p class="sc-note">${t('sc.emailNote')}</p>` })}
      `)}
      ${group(t('sc.g.categories'), html`${cat('notif.project_updates', 'project_updates')}${cat('notif.messages', 'messages')}${cat('notif.approvals', 'approvals')}`,
        { hint: t('sc.categoriesHint') })}
      ${group(t('sc.g.alerts'), html`
        ${row('notif.sound', html`<button type="button" class="af-btn af-btn--ghost af-btn--sm" data-test-sound>${t('sc.testSound')}</button>${sw(k('notifications', 'sound'), n.sound, { label: lbl('notif.sound') })}`)}
        ${row('notif.browser', html`<span class="sc-pill sc-pill--${perm}">${t('sc.perm.' + perm)}</span>${sw('data-browser', n.browser && perm === 'granted', { disabled: perm === 'unsupported' || perm === 'denied', label: lbl('notif.browser') })}`,
          { extra: perm === 'denied' ? html`<p class="sc-note sc-note--warn">${t('sc.permDenied')}</p>` : '' })}
      `)}
      ${group(t('sc.g.quiet'), html`
        ${row('notif.quiet', sw('data-quiet', n.quiet_enabled, { label: lbl('notif.quiet') }), {
          extra: html`<div class="sc-times ${n.quiet_enabled ? '' : 'is-off'}">
            <label>${t('sc.from')}<input type="time" class="sc-input" data-time="quiet_from" value="${n.quiet_from}" step="300" /></label>
            <label>${t('sc.to')}<input type="time" class="sc-input" data-time="quiet_to" value="${n.quiet_to}" step="300" /></label></div>
            <p class="sc-note">${t('sc.quietNote')}</p>` })}
      `)}
      ${group('', row('notif.upcoming', '', { extra: html`<p class="sc-note">${t('sc.upcomingNote')}</p>` }))}
      <p class="sc-foot-note">${icon('shield')}<span>${t('sc.telegramNote')}</span></p>`;
  },

  ai() {
    const a = getPreferences().ai;
    return html`
      <div class="sc-usage" data-usage-full></div>
      <p class="sc-foot-note">${icon('lock')}<span>${t('sc.limitsByAdmin')}</span>${auth.isAdmin ? html` <a class="af-link" href="admin.html">${t('sc.openAdminAi')}</a>` : ''}</p>
      ${group(t('sc.g.aiPersonal'), html`
        ${row('ai.style', seg(k('ai', 'response_style'), a.response_style, opt('sc.style', SPEC.ai.response_style), lbl('ai.style')))}
        ${row('ai.language', seg(k('ai', 'response_language'), a.response_language, opt('sc.alang', SPEC.ai.response_language), lbl('ai.language')))}
        ${row('ai.default_mode', seg(k('ai', 'default_mode'), a.default_mode, [['chat', t('ai.modeChat')], ['brief', t('ai.modeBrief')], ['estimate', t('ai.modeEstimate')]], lbl('ai.default_mode')))}
        ${row('ai.save_history', sw(k('ai', 'save_history'), a.save_history, { label: lbl('ai.save_history') }), { extra: html`<p class="sc-note">${t('sc.historyNote')}</p>` })}
        ${row('ai.project_context', sw(k('ai', 'use_project_context'), a.use_project_context, { label: lbl('ai.project_context') }), { extra: html`<p class="sc-note sc-note--warn">${t('sc.contextNote')}</p>` })}
        ${row('ai.moodboard_images', sw(k('ai', 'moodboard_images'), a.moodboard_images, { label: lbl('ai.moodboard_images') }))}
        ${row('ai.extended_stats', sw(k('ai', 'extended_stats'), a.extended_stats, { label: lbl('ai.extended_stats') }))}
      `)}
      <div class="sc-privacy">${icon('shield')}<div><b>${t('sc.aiPrivacyTitle')}</b><p>${t('sc.aiPrivacyText')}</p></div></div>`;
  },

  appearance() {
    const a = getPreferences().appearance;
    return html`
      <div class="sc-preview" aria-hidden="true">
        <div class="sc-preview__side"><span class="af-mark">AF</span><i></i><i></i><i></i><i></i></div>
        <div class="sc-preview__main">
          <div class="sc-preview__card af-card"><small>AF STUDIO · PREVIEW</small><b>${t('sc.previewTitle')}</b><p>${t('sc.previewText')}</p>
            <span class="sc-preview__btns"><span class="af-btn af-btn--gold af-btn--sm">${t('builder.newProject')}</span><span class="af-btn af-btn--ghost af-btn--sm">${t('nav.lab')}</span></span></div>
          <div class="sc-preview__row"><span class="af-card"></span><span class="af-card"></span><span class="af-card"></span></div>
        </div>
      </div>
      ${group(t('sc.g.themeLang'), html`
        ${row('app.theme', seg('data-prof="theme"', getTheme(), [['dark', t('settings.dark')], ['light', t('settings.light')]], lbl('app.theme')))}
        ${row('app.language', seg('data-prof="lang"', getLang(), [['ru', 'Русский'], ['en', 'English']], lbl('app.language')))}
      `)}
      ${group(t('sc.g.interface'), html`
        ${row('app.text_scale', seg(k('appearance', 'text_scale'), a.text_scale, SPEC.appearance.text_scale.map((v) => [v, v + '%']), lbl('app.text_scale')))}
        ${row('app.density', seg(k('appearance', 'density'), a.density, opt('sc.density', SPEC.appearance.density), lbl('app.density')))}
        ${row('app.contrast', seg(k('appearance', 'contrast'), a.contrast, opt('sc.contrast', SPEC.appearance.contrast), lbl('app.contrast')))}
        ${row('app.card_style', seg(k('appearance', 'card_style'), a.card_style, opt('sc.cards', SPEC.appearance.card_style), lbl('app.card_style')))}
        ${row('app.sidebar', seg(k('appearance', 'sidebar'), a.sidebar, opt('sc.sidebar', SPEC.appearance.sidebar), lbl('app.sidebar')))}
        ${row('app.accent', html`<div class="sc-swatches" role="radiogroup" aria-label="${lbl('app.accent')}" ${raw(k('appearance', 'accent'))}>${SPEC.appearance.accent.map((v) => html`<button type="button" role="radio" data-v="${v}" class="sc-swatch sc-swatch--${v} ${a.accent === v ? 'is-on' : ''}" aria-checked="${a.accent === v}" title="${t('sc.accent.' + v)}"><i></i><span>${t('sc.accent.' + v)}</span></button>`)}</div>`)}
        ${row('app.tooltips', sw(k('appearance', 'tooltips'), a.tooltips, { label: lbl('app.tooltips') }))}
        ${row('app.hover', sw(k('appearance', 'hover_effects'), a.hover_effects, { label: lbl('app.hover') }))}
      `)}
      ${group(t('sc.g.device'), html`
        ${row('app.fx', seg('data-dev="fx"', device.fx, [['full', t('settings.animFull')], ['reduced', t('settings.animReduced')]], lbl('app.fx')))}
        ${row('app.q3d', seg('data-dev="q3d"', device.q3d, ['high', 'medium', 'low'].map((v) => [v, t('settings.q.' + v)]), lbl('app.q3d')))}
        ${row('app.glow', sw('data-dev-glow', device.glow, { label: lbl('app.glow') }))}
      `, { hint: t('settings.visualHint') })}`;
  },

  workspace() {
    const w = getPreferences().workspace;
    const ov = (id, key) => row(id, sw(k('workspace', key), w[key], { label: lbl(id) }));
    return html`
      ${group(t('sc.g.start'), html`
        ${row('ws.start_page', seg(k('workspace', 'start_page'), w.start_page, [['overview', t('nav.overview')], ['projects', t('nav.projects')], ['ai', t('nav.ai')], ['portfolio', t('nav.portfolio')]], lbl('ws.start_page')), { extra: html`<p class="sc-note">${t('sc.startNote')}</p>` })}
      `)}
      ${group(t('sc.g.lists'), html`
        ${row('ws.projects_view', seg(k('workspace', 'projects_view'), w.projects_view, opt('sc.view', SPEC.workspace.projects_view), lbl('ws.projects_view')))}
        ${row('ws.projects_sort', select(k('workspace', 'projects_sort'), w.projects_sort, opt('sc.psort', SPEC.workspace.projects_sort), lbl('ws.projects_sort')))}
        ${row('ws.files_view', seg(k('workspace', 'files_view'), w.files_view, opt('sc.view', SPEC.workspace.files_view), lbl('ws.files_view')))}
        ${row('ws.files_sort', select(k('workspace', 'files_sort'), w.files_sort, opt('sc.fsort', SPEC.workspace.files_sort), lbl('ws.files_sort')))}
        ${row('ws.page_size', seg(k('workspace', 'page_size'), w.page_size, SPEC.workspace.page_size.map((v) => [v, String(v)]), lbl('ws.page_size')))}
        ${row('ws.remember_filters', sw(k('workspace', 'remember_filters'), w.remember_filters, { label: lbl('ws.remember_filters') }))}
        ${row('ws.project_tab', select(k('workspace', 'project_default_tab'), w.project_default_tab, SPEC.workspace.project_default_tab.map((v) => [v, t('projects.tab' + v[0].toUpperCase() + v.slice(1))]), lbl('ws.project_tab')))}
      `)}
      ${group(t('sc.g.overview'), html`${ov('ws.ov_stats', 'ov_stats')}${ov('ws.ov_quick', 'ov_quick')}${ov('ws.ov_activity', 'ov_activity')}${ov('ws.ov_favorites', 'ov_favorites')}${ov('ws.ov_ai', 'ov_ai')}${ov('ws.ov_about', 'ov_about')}`)}
      ${group(t('sc.g.keyboard'), row('ws.kbd_hints', html`<button type="button" class="af-btn af-btn--ghost af-btn--sm" data-kbd>${t('kbd.title')}</button>${sw(k('workspace', 'kbd_hints'), w.kbd_hints, { label: lbl('ws.kbd_hints') })}`))}`;
  },

  security() {
    const u = auth.user; const oauth = isOAuthOnly();
    return html`
      ${group(t('sc.g.password'), oauth ? row('security.password', '', { extra: html`<p class="sc-note">${t('settings.oauthUser')}</p>` }) : html`
        <form class="sc-row sc-row--wide sc-row--form" data-sid="security.password" data-pwd>
          <div class="sc-row__text"><b>${lbl('security.password')}</b><p>${L(item('security.password'), 'description')}</p></div>
          <div class="sc-form-grid">
            <label class="af-field"><span>${t('settings.currentPwd')}</span><input type="password" name="current" autocomplete="current-password" required maxlength="128" /></label>
            <label class="af-field"><span>${t('settings.newPwd')}</span><input type="password" name="next" autocomplete="new-password" minlength="8" required maxlength="128" /></label>
            <label class="af-field"><span>${t('access.password2')}</span><input type="password" name="next2" autocomplete="new-password" minlength="8" required maxlength="128" /></label>
            <div><button type="submit" class="af-btn af-btn--primary af-btn--sm">${t('settings.changePwd')}</button></div>
          </div>
        </form>`)}
      ${group(t('sc.g.identity'), html`
        ${row('security.email_status', html`<span class="sc-pill sc-pill--${u.email_confirmed_at ? 'granted' : 'default'}">${u.email_confirmed_at ? t('settings.confirmed') : t('settings.notConfirmed')}</span>`)}
        ${row('account.provider', html`<span class="sc-value">${(u.app_metadata?.providers || [u.app_metadata?.provider]).filter(Boolean).join(', ') || 'email'}</span>`)}
      `)}
      ${group(t('sc.g.sessions'), html`
        <div class="sc-row sc-row--wide" data-sid="security.sessions">
          <div class="sc-row__text"><b>${lbl('security.sessions')}</b><p>${L(item('security.sessions'), 'description')}</p></div>
          <div class="sc-meta"><div><small>${t('settings.registered')}</small><b>${fmtDateTime(u.created_at)}</b></div><div><small>${t('settings.lastLogin')}</small><b>${fmtDateTime(u.last_sign_in_at)}</b></div></div>
          <div class="sc-inline"><button type="button" class="af-btn af-btn--ghost af-btn--sm" data-logout>${icon('logout')}<span>${t('settings.logout')}</span></button>
            <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-logout-all>${t('settings.logoutAll')}</button></div>
        </div>`)}
      ${group('', row('security.mfa', '', { extra: html`<p class="sc-note">${t('sc.mfaNote')}</p>` }))}`;
  },

  data() {
    return html`
      ${group(t('sc.g.yourData'), html`
        <div class="sc-row sc-row--wide" data-sid="data.stats"><div class="sc-row__text"><b>${lbl('data.stats')}</b><p>${L(item('data.stats'), 'description')}</p></div>
          <div class="sc-stats" data-stats><span class="af-skel"></span><span class="af-skel"></span><span class="af-skel"></span><span class="af-skel"></span></div></div>
        ${row('data.export', html`<button type="button" class="af-btn af-btn--ghost af-btn--sm" data-export>${icon('download')}<span>${t('settings.export')}</span></button>`)}
      `)}
      <div class="sc-privacy" data-sid="data.stored">${icon('shield')}<div><b>${lbl('data.stored')}</b>
        <ul class="sc-list"><li>${t('sc.store1')}</li><li>${t('sc.store2')}</li><li>${t('sc.store3')}</li><li>${t('sc.store4')}</li><li>${t('sc.store5')}</li></ul></div></div>
      ${group(t('sc.g.danger'), html`
        ${row('data.ai_history', html`<button type="button" class="af-btn af-btn--ghost af-btn--sm" data-ai-clear>${icon('trash')}<span>${t('sc.clearAi')}</span></button>`)}
        ${row('data.delete', html`<button type="button" class="af-btn af-btn--danger af-btn--sm" data-delete>${icon('trash')}<span>${t('settings.deleteAccount')}</span></button>`, { extra: html`<p class="sc-note">${t('settings.deleteText')}</p>` })}
      `)}`;
  },

  experimental() {
    const x = getPreferences().experimental;
    const s = (id, key) => row(id, sw(k('experimental', key), x[key], { label: lbl(id) }));
    return html`
      <p class="sc-foot-note">${icon('spark')}<span>${t('sc.expNote')}</span></p>
      ${group(t('sc.g.effects'), html`${s('exp.reveal', 'reveal')}${s('exp.ripple', 'ripple')}${s('exp.scroll_progress', 'scroll_progress')}${s('exp.hero_hint', 'hero_hint')}`)}
      ${group(t('sc.g.sound'), s('exp.ui_sounds', 'ui_sounds'))}
      ${group(t('sc.g.learning'), row('exp.onboarding', html`<button type="button" class="af-btn af-btn--ghost af-btn--sm" data-tour>${t('help.tour')}</button>`))}`;
  },
};

// ---------------------------------------------------------------------
// the modal
// ---------------------------------------------------------------------
function build(startCat, startFocus) {
  const last = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'af-modal sc-modal';
  wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'sc-title');
  let cat = SC_CATEGORIES.some((c) => c.id === startCat) ? startCat : 'account';
  let cleanups = []; let statusTimer = 0;
  const pending = {}; const timers = {}; const busy = {};

  function shell() {
    wrap.innerHTML = String(html`
      <div class="af-modal__backdrop" data-sc-close></div>
      <div class="sc-panel">
        <header class="sc-head">
          <div class="sc-brand"><span class="af-mark">AF</span><div><b id="sc-title">AF SETTINGS</b><small>PERSONAL CONTROL CENTER</small></div></div>
          <div class="sc-search" role="search">
            ${raw(SEARCH_ICON)}
            <input type="search" data-sc-q placeholder="${t('sc.searchPh')}" aria-label="${t('sc.searchPh')}" autocomplete="off" spellcheck="false" aria-controls="sc-results" />
            <kbd class="sc-kbd" aria-hidden="true">/</kbd>
            <button type="button" class="af-icon-btn sc-search__clear" data-sc-clear aria-label="${t('sc.clear')}" hidden>${icon('x')}</button>
          </div>
          <span class="sc-status" data-sc-status role="status" aria-live="polite"></span>
          <button type="button" class="af-icon-btn sc-x" data-sc-close aria-label="${t('common.close')}">${icon('x')}</button>
        </header>
        <div class="sc-body">
          <nav class="sc-nav" aria-label="${t('sc.categories')}" data-sc-nav></nav>
          <div class="sc-main">
            <div class="sc-results" id="sc-results" data-sc-results hidden></div>
            <section class="sc-content" data-sc-content tabindex="-1" aria-live="polite"></section>
          </div>
        </div>
        <footer class="sc-foot">
          <span class="sc-foot__status" data-sc-foot></span>
          <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-sc-reset hidden>${icon('refresh')}<span>${t('sc.resetCat')}</span></button>
          <button type="button" class="af-btn af-btn--primary af-btn--sm" data-sc-close>${t('sc.done')}</button>
        </footer>
      </div>`);
    $$('[data-sc-close]', wrap).forEach((b) => b.addEventListener('click', close));
    const q = $('[data-sc-q]', wrap);
    q.addEventListener('input', () => runSearch(q.value));
    q.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { const f = $('[data-sc-hit]', wrap); if (f) { e.preventDefault(); f.focus(); } }
      if (e.key === 'Enter') { const f = $('[data-sc-hit]', wrap); if (f) { e.preventDefault(); f.click(); } }
    });
    $('[data-sc-clear]', wrap).addEventListener('click', () => { q.value = ''; runSearch(''); q.focus(); });
    $('[data-sc-reset]', wrap).addEventListener('click', resetCurrent);
    paintNav(); paintSection();
  }

  function changed(c) {
    if (!PREF_CATS.includes(c)) return false;
    return JSON.stringify(getPreferences()[c]) !== JSON.stringify(DEFAULT_PREFERENCES[c]);
  }
  function paintNav() {
    $('[data-sc-nav]', wrap).innerHTML = String(html`${SC_CATEGORIES.map((c) => html`
      <button type="button" data-cat="${c.id}" class="${c.id === cat ? 'is-on' : ''}" aria-current="${c.id === cat ? 'page' : 'false'}">
        ${icon(c.icon)}<span><b>${catLabel(c)}</b><small>${getLang() === 'en' ? c.d_en : c.d_ru}</small></span>${changed(c.id) ? html`<i class="sc-dot" title="${t('sc.changed')}"></i>` : ''}</button>`)}`);
    $$('[data-cat]', $('[data-sc-nav]', wrap)).forEach((b) => b.addEventListener('click', () => go(b.dataset.cat)));
  }

  function paintSection() {
    cleanups.forEach((fn) => { try { fn(); } catch (_) { /* noop */ } }); cleanups = [];
    const c = SC_CATEGORIES.find((x) => x.id === cat);
    const st = preferencesState();
    const content = $('[data-sc-content]', wrap);
    const banner = PREF_CATS.includes(cat) && st.error
      ? html`<div class="sc-banner sc-banner--${st.error === 'not_installed' ? 'warn' : 'err'}">${icon('lock')}<span>${t(st.error === 'not_installed' ? 'sc.err.notInstalled' : 'sc.err.load')}</span><button type="button" class="af-link" data-sc-reload>${t('common.retry')}</button></div>` : '';
    content.innerHTML = String(html`<header class="sc-sec-head"><span class="sc-sec-ico">${icon(c.icon)}</span><div><h3>${catLabel(c)}</h3><p>${getLang() === 'en' ? c.d_en : c.d_ru}</p></div></header>${banner}<div class="sc-sec">${SECTIONS[cat]()}</div>`);
    content.classList.remove('is-in'); void content.offsetWidth; content.classList.add('is-in');
    $('[data-sc-reset]', wrap).hidden = !PREF_CATS.includes(cat);
    $('[data-sc-reload]', content)?.addEventListener('click', async () => { setStatus('saving', t('common.loading')); await loadPreferences(auth.user.id); setStatus(preferencesState().error ? 'error' : 'idle', preferencesState().error ? t('sc.err.load') : ''); paintSection(); paintNav(); });
    bindGeneric(content); bindSpecial(content);
    sessionStorage.setItem(CAT_KEY, cat);
  }

  function go(next, focusId) {
    if (next && SC_CATEGORIES.some((c) => c.id === next) && next !== cat) { cat = next; paintNav(); paintSection(); }
    const q = $('[data-sc-q]', wrap);
    if (q.value) { q.value = ''; runSearch(''); }
    if (focusId) highlight(focusId); else $('[data-sc-content]', wrap).scrollTop = 0;
    if (window.matchMedia('(max-width: 760px)').matches) $(`[data-cat="${cat}"]`, $('[data-sc-nav]', wrap))?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
  function highlight(id) {
    requestAnimationFrame(() => {
      const el = $(`[data-sid="${CSS.escape(id)}"]`, wrap);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
      el.classList.remove('is-hit'); void el.offsetWidth; el.classList.add('is-hit');
      setTimeout(() => el.classList.remove('is-hit'), 2200);
      const f = $('input:not([type=hidden]):not([disabled]), select, button:not([disabled]), [role=radio]', el);
      setTimeout(() => f?.focus({ preventScroll: true }), reducedMotion() ? 0 : 380);
    });
  }

  // ------------------------------------------------------------ search
  function runSearch(q) {
    const box = $('[data-sc-results]', wrap); const content = $('[data-sc-content]', wrap);
    $('[data-sc-clear]', wrap).hidden = !q;
    if (!q.trim()) { box.hidden = true; content.hidden = false; box.innerHTML = ''; return; }
    const res = searchSettings(q);
    box.hidden = false; content.hidden = true;
    if (!res.length) {
      box.innerHTML = String(html`<div class="sc-empty"><span class="af-empty__orb"></span><b>${t('sc.noResults')}</b><p>${t('sc.noResultsSub')}</p></div>`);
      return;
    }
    box.innerHTML = String(html`<p class="sc-results__count">${t('sc.found', { n: res.length })}</p>${groupResults(res).map((g) => {
      const c = SC_CATEGORIES.find((x) => x.id === g.category);
      return html`<section><h5>${icon(c.icon)}${catLabel(c)}</h5>${g.items.map(({ item: it }) => html`
        <button type="button" class="sc-hit" data-sc-hit data-cat="${it.category}" data-id="${it.id}"><b>${L(it, 'label')}${badge(it.status)}</b><small>${L(it, 'description')}</small>${icon('arrowR')}</button>`)}</section>`;
    })}`);
    const hits = $$('[data-sc-hit]', box);
    hits.forEach((b, i) => {
      b.addEventListener('click', () => go(b.dataset.cat, b.dataset.id));
      b.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); (hits[i + 1] || hits[0]).focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); if (i === 0) $('[data-sc-q]', wrap).focus(); else hits[i - 1].focus(); }
      });
    });
  }

  // ------------------------------------------------------------ status
  function setStatus(kind, text = '') {
    clearTimeout(statusTimer);
    const s = $('[data-sc-status]', wrap); const f = $('[data-sc-foot]', wrap);
    const label = text || (kind === 'saving' ? t('sc.saving') : kind === 'saved' ? t('sc.saved') : kind === 'error' ? t('sc.err.generic') : '');
    [s, f].forEach((n) => { if (!n) return; n.dataset.state = kind; n.innerHTML = kind === 'idle' ? '' : String(html`<i></i><span>${label}</span>`); });
    if (kind === 'saved') statusTimer = setTimeout(() => setStatus('idle'), 2600);
  }
  const errText = (code) => t({ network: 'sc.err.network', conflict: 'sc.err.conflict', not_installed: 'sc.err.notInstalled', invalid: 'sc.err.invalid', auth: 'sc.err.auth' }[code] || 'sc.err.generic');

  /** Debounced, serialized autosave of account preferences (one request in flight per category). */
  function save(category, patch, { delay = 320 } = {}) {
    pending[category] = { ...(pending[category] || {}), ...patch };
    // optimistic UI is applied by savePreferences; nothing is reported as saved before the server confirms
    clearTimeout(timers[category]);
    setStatus('saving');
    timers[category] = setTimeout(() => flush(category), delay);
  }
  async function flush(category) {
    if (busy[category]) { timers[category] = setTimeout(() => flush(category), 150); return; }
    const patch = pending[category]; delete pending[category];
    if (!patch) return;
    busy[category] = true;
    try {
      await savePreferences(category, patch);
      if (!Object.keys(pending).length) setStatus('saved');
      paintNav();
    } catch (e) {
      setStatus('error', errText(e.code)); toast(errText(e.code), 'err', 6000);
      if (cat === category) paintSection(); // controls show the restored server value
      paintNav();
    } finally { busy[category] = false; }
  }
  async function saveProfile(patch, onFail) {
    setStatus('saving');
    try { await updateProfile(patch); setStatus('saved'); }
    catch (e) { onFail?.(); const code = /fetch|network/i.test(String(e?.message)) ? 'network' : 'generic'; setStatus('error', errText(code)); toast(errText(code), 'err'); }
  }

  async function resetCurrent() {
    if (!PREF_CATS.includes(cat)) return;
    const c = SC_CATEGORIES.find((x) => x.id === cat);
    if (!(await confirmDialog(t('sc.resetCat'), t('sc.resetConfirm', { cat: catLabel(c) }), { okLabel: t('common.reset') }))) return;
    setStatus('saving');
    try { await resetPreferences(cat); setStatus('saved', t('sc.resetDone')); }
    catch (e) { setStatus('error', errText(e.code)); toast(errText(e.code), 'err'); }
    paintSection(); paintNav();
  }

  // ------------------------------------------------------------ generic controls
  const castFor = (category, key, raw0) => {
    const rule = SPEC[category]?.[key];
    if (Array.isArray(rule) && typeof rule[0] === 'number') return Number(raw0);
    return raw0;
  };
  function bindGeneric(root) {
    $$('.sc-seg[data-k], .sc-swatches[data-k]', root).forEach((g) => {
      const [category, key] = g.dataset.k.split('.');
      $$('[data-v]', g).forEach((b) => b.addEventListener('click', () => {
        $$('[data-v]', g).forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-checked', String(x === b)); });
        save(category, { [key]: castFor(category, key, b.dataset.v) }, { delay: 60 });
      }));
      radioKeys(g);
    });
    $$('input[type=checkbox][data-k]', root).forEach((i) => {
      const [category, key] = i.dataset.k.split('.');
      i.addEventListener('change', () => save(category, { [key]: i.checked }, { delay: 60 }));
    });
    $$('select[data-k]', root).forEach((s) => {
      const [category, key] = s.dataset.k.split('.');
      s.addEventListener('change', () => save(category, { [key]: castFor(category, key, s.value) }, { delay: 60 }));
    });
    $$('input[type=checkbox][data-ch]', root).forEach((i) => {
      const [category, key, chan] = i.dataset.ch.split('.');
      i.addEventListener('change', () => save(category, { [key]: { ...(pending[category]?.[key] || {}), [chan]: i.checked } }, { delay: 200 }));
    });
    // profiles-backed (lang, theme, notify_*)
    $$('.sc-seg[data-prof]', root).forEach((g) => {
      $$('[data-v]', g).forEach((b) => b.addEventListener('click', () => {
        const field = g.dataset.prof; const v = b.dataset.v;
        $$('[data-v]', g).forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-checked', String(x === b)); });
        if (field === 'theme') { const prev = getTheme(); applyTheme(v); saveProfile({ theme: v }, () => { applyTheme(prev); paintSection(); }); }
        if (field === 'lang') { setLang(v); saveProfile({ lang: v }); }
      }));
      radioKeys(g);
    });
    $$('input[type=checkbox][data-prof]', root).forEach((i) => i.addEventListener('change', () => {
      saveProfile({ [i.dataset.prof]: i.checked }, () => { i.checked = !i.checked; });
      if (i.dataset.prof === 'notify_inapp' || i.dataset.prof === 'notify_email') setTimeout(paintSection, 0);
    }));
    // device-only
    $$('.sc-seg[data-dev]', root).forEach((g) => {
      $$('[data-v]', g).forEach((b) => b.addEventListener('click', () => {
        device.set(g.dataset.dev, b.dataset.v);
        $$('[data-v]', g).forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-checked', String(x === b)); });
        setStatus('saved', t('sc.savedDevice'));
      }));
      radioKeys(g);
    });
    $('[data-dev-glow]', root)?.addEventListener('change', (e) => { device.set('glow', e.target.checked ? '1' : '0'); setStatus('saved', t('sc.savedDevice')); });
  }
  function radioKeys(g) {
    g.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      const bs = $$('[data-v]', g); const i = bs.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault(); const n = bs[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + bs.length) % bs.length]; n.focus(); n.click();
    });
  }

  // ------------------------------------------------------------ section-specific handlers
  function bindSpecial(root) {
    const p = auth.profile || {}; const oauth = isOAuthOnly();
    if (cat === 'account') {
      if (p.avatar_path) signedUrl('avatars', p.avatar_path).then((u) => { const a = $('[data-sc-av]', root); if (u && a) a.innerHTML = `<img src="${u}" alt="" />`; });
      $('[data-avatar]', root)?.addEventListener('change', async (e) => {
        const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
        const v = validateFile(f, { imagesOnly: true, maxMB: CONFIG.LIMITS.avatarMB });
        if (v.error) return toast(t(v.error, { mb: v.mb }), 'err');
        setStatus('saving');
        const ext = f.type.split('/')[1].replace('jpeg', 'jpg');
        const path = `${auth.user.id}/avatar-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('avatars').upload(path, f, { contentType: f.type, upsert: false });
        if (error) { setStatus('error'); return toast(t('errors.generic'), 'err'); }
        const old = auth.profile.avatar_path;
        try { await updateProfile({ avatar_path: path }); } catch { supabase.storage.from('avatars').remove([path]); setStatus('error'); return toast(t('errors.generic'), 'err'); }
        if (old && old !== path) supabase.storage.from('avatars').remove([old]); // only after the new one is saved
        const u = await signedUrl('avatars', path); const a = $('[data-sc-av]', root); if (a && u) a.innerHTML = `<img src="${u}" alt="" />`;
        setStatus('saved');
      });
      $('[data-profile]', root)?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = e.target.full_name.value.trim();
        if (name.length < 2 || name.length > 60) return toast(t('v.name'), 'err');
        const b = $('button[type=submit]', e.target); setBusy(b, true); setStatus('saving');
        try { await updateProfile({ full_name: name }); setStatus('saved'); $('.sc-hero__who b', root).textContent = name; } catch { setStatus('error'); toast(t('errors.generic'), 'err'); }
        setBusy(b, false);
      });
      $('[data-email]', root)?.addEventListener('click', () => {
        const body = document.createElement('div');
        body.innerHTML = String(html`<label class="af-field"><span>${t('settings.newEmail')}</span><input type="email" name="email" maxlength="254" autocomplete="email" /></label>`);
        modal({ title: t('settings.changeEmail'), size: 'sm', body, actions: [{ label: t('common.cancel'), value: null }, {
          label: t('common.save'), primary: true,
          onClick: async (b, closeM, btn) => {
            const v = $('[name=email]', b).value.trim();
            if (!EMAIL_RE.test(v)) { toast(t('v.email'), 'err'); return false; }
            setBusy(btn, true);
            try { await changeEmail(v); closeM(true); toast(t('settings.emailSent'), 'ok', 7000); } catch (err) { setBusy(btn, false); toast(t(authErrorKey(err)), 'err'); }
            return false;
          } }] });
      });
    }
    if (cat === 'notifications') {
      $('[data-test-sound]', root)?.addEventListener('click', () => { if (!playTone('notify')) toast(t('sc.noAudio'), 'err'); });
      $('[data-browser]', root)?.addEventListener('change', async (e) => {
        const i = e.target;
        if (!i.checked) return save('notifications', { browser: false }, { delay: 0 });
        const perm = await requestBrowserPermission(); // explicit user action only
        if (perm !== 'granted') { i.checked = false; toast(t(perm === 'denied' ? 'sc.permDenied' : 'sc.permNotGranted'), 'err', 7000); paintSection(); return; }
        save('notifications', { browser: true }, { delay: 0 });
        setTimeout(paintSection, 400);
      });
      $('[data-quiet]', root)?.addEventListener('change', (e) => {
        let tz = '';
        try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) { /* noop */ }
        if (!/^([A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2})?$/.test(tz) || tz.length > 64) tz = '';
        $('.sc-times', root)?.classList.toggle('is-off', !e.target.checked);
        save('notifications', { quiet_enabled: e.target.checked, quiet_tz: tz }, { delay: 0 });
      });
      $$('[data-time]', root).forEach((inp) => inp.addEventListener('change', () => {
        const v = inp.value.slice(0, 5);
        if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(v)) { toast(t('sc.err.invalid'), 'err'); return; }
        save('notifications', { [inp.dataset.time]: v }, { delay: 400 });
      }));
    }
    if (cat === 'ai') {
      const box = $('[data-usage-full]', root);
      if (box) cleanups.push(mountUsage(box, { variant: 'full', maxAge: 0 }));
    }
    if (cat === 'workspace') $('[data-kbd]', root)?.addEventListener('click', () => openShortcuts());
    if (cat === 'experimental') {
      $('[data-tour]', root)?.addEventListener('click', () => { close(); setTimeout(() => window.dispatchEvent(new CustomEvent('af:onboarding')), 260); });
    }
    if (cat === 'security') {
      $('[data-pwd]', root)?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        if (f.next.value.length < 8) return toast(t('v.pwdMin'), 'err');
        if (f.next.value !== f.next2.value) return toast(t('v.pwdMatch'), 'err');
        const b = $('button[type=submit]', f); setBusy(b, true);
        try { await changePassword(f.current.value, f.next.value); f.reset(); toast(t('settings.pwdChanged'), 'ok'); setStatus('saved'); }
        catch (err) { toast(t(authErrorKey(err)), 'err'); }
        setBusy(b, false);
      });
      $('[data-logout]', root)?.addEventListener('click', () => { close(); signOut(); });
      $('[data-logout-all]', root)?.addEventListener('click', async () => {
        if (!(await confirmDialog(t('settings.logoutAll'), t('sc.logoutAllConfirm')))) return;
        close(); signOut(true);
      });
    }
    if (cat === 'data') {
      loadStats(root);
      $('[data-export]', root)?.addEventListener('click', (e) => exportData(e.currentTarget));
      $('[data-ai-clear]', root)?.addEventListener('click', async (e) => {
        if (!(await confirmDialog(t('sc.clearAi'), t('sc.clearAiConfirm'), { danger: true, okLabel: t('common.delete') }))) return;
        const b = e.currentTarget; setBusy(b, true);
        const { error } = await supabase.from('ai_conversations').delete().eq('user_id', auth.user.id);
        setBusy(b, false);
        if (error) return toast(t('errors.generic'), 'err');
        toast(t('sc.clearAiDone'), 'ok'); loadStats(root);
        window.dispatchEvent(new CustomEvent('af:ai-history-cleared'));
      });
      $('[data-delete]', root)?.addEventListener('click', () => deleteAccount(oauth));
    }
  }

  // ------------------------------------------------------------ data helpers
  async function loadStats(root) {
    const el = $('[data-stats]', root); if (!el) return;
    const uid = auth.user.id;
    const cnt = (tb, col) => supabase.from(tb).select('*', { count: 'exact', head: true }).eq(col, uid).then((r) => (r.error ? null : r.count ?? 0));
    const rows = [['projects', 'client_id', 'nav.projects'], ['files', 'owner_id', 'nav.files'], ['ai_conversations', 'user_id', 'sc.aiChats'], ['favorites', 'user_id', 'nav.favorites'], ['moodboards', 'user_id', 'nav.moodboard']];
    const vals = await Promise.all(rows.map(([tb, col]) => cnt(tb, col).catch(() => null)));
    if (!el.isConnected) return;
    el.innerHTML = String(html`${rows.map(([, , key], i) => html`<div><b>${vals[i] == null ? '—' : vals[i]}</b><small>${t(key)}</small></div>`)}`);
  }

  async function exportData(b) {
    setBusy(b, true);
    try {
      const uidv = auth.user.id; const q = (tb, col = 'user_id') => supabase.from(tb).select('*').eq(col, uidv).then((r) => r.data || []);
      const threads = await q('threads', 'client_id');
      const messages = threads.length ? (await supabase.from('messages').select('*').in('thread_id', threads.map((x) => x.id))).data || [] : [];
      const convs = await q('ai_conversations');
      const aiMsgs = convs.length ? (await supabase.from('ai_messages').select('*').in('conversation_id', convs.map((x) => x.id))).data || [] : [];
      const prefRow = (await supabase.from('user_preferences').select('*').eq('user_id', uidv).maybeSingle()).data || null;
      const data = {
        exported_at: new Date().toISOString(), profile: auth.profile, projects: await q('projects', 'client_id'), files: await q('files', 'owner_id'),
        favorites: await q('favorites'), moodboards: await q('moodboards'), threads, messages, ai_conversations: convs, ai_messages: aiMsgs, notifications: await q('notifications'),
        user_preferences: prefRow,
        active_settings: {
          account: { lang: getLang(), theme: getTheme(), notify_inapp: auth.profile?.notify_inapp !== false, notify_email: auth.profile?.notify_email !== false },
          preferences_effective: getPreferences(),
          this_device: { animations: device.fx, quality_3d: device.q3d, cursor_glow: device.glow },
        },
      };
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = `af-studio-my-data-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (err) { console.error(err); toast(t('errors.generic'), 'err'); }
    setBusy(b, false);
  }

  function deleteAccount(oauth) {
    const word = getLang() === 'en' ? 'DELETE' : 'УДАЛИТЬ';
    const body = document.createElement('div');
    body.innerHTML = String(html`<p class="af-muted" style="margin-bottom:14px">${t('settings.deleteText')}</p>
      ${oauth ? '' : html`<label class="af-field"><span>${t('settings.currentPwd')}</span><input type="password" name="pwd" autocomplete="current-password" /></label>`}
      <label class="af-field"><span>${t('settings.deleteConfirmWord')}</span><input name="word" autocomplete="off" placeholder="${word}" /></label>`);
    modal({ title: t('settings.deleteAccount'), size: 'sm', body, actions: [{ label: t('common.cancel'), value: null }, {
      label: t('settings.deleteAccount'), danger: true,
      onClick: async (b, closeM, btn) => {
        const w = $('[name=word]', b).value.trim();
        if (w !== word) { toast(t('errors.confirmation_required'), 'err'); return false; }
        setBusy(btn, true);
        try {
          await callFunction('delete-account', { password: $('[name=pwd]', b)?.value || '', confirm: w });
          closeM(true); close(); toast(t('settings.deleted'), 'ok'); await signOut();
        } catch (err) { setBusy(btn, false); toast(t('errors.' + (err.code || 'generic')), 'err'); }
        return false;
      } }] });
  }

  // ------------------------------------------------------------ keyboard, focus trap, lifecycle
  const onKey = (e) => {
    if ($('.af-modal:not(.sc-modal)')) return; // a nested dialog (confirm/email) handles its own keys
    const q = $('[data-sc-q]', wrap);
    if (e.key === 'Escape') {
      e.preventDefault();
      if (q.value) { q.value = ''; runSearch(''); q.focus(); return; }
      close(); return;
    }
    const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
    if (e.key === '/' && !typing) { e.preventDefault(); q.focus(); q.select(); return; }
    if (e.key === 'Tab') {
      const f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', wrap).filter((x) => !x.disabled && x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  const offLang = onLang(() => { const q = $('[data-sc-q]', wrap)?.value || ''; shell(); if (q) { $('[data-sc-q]', wrap).value = q; runSearch(q); } });
  const offProfile = auth.on('profile', () => { if (cat === 'notifications') return; /* account header refresh */ const w = $('.sc-hero__who b', wrap); if (w && auth.profile?.full_name) w.textContent = auth.profile.full_name; });

  function close() {
    if (!center) return;
    center = null;
    Object.keys(timers).forEach((c) => { clearTimeout(timers[c]); if (pending[c]) flush(c); }); // never lose a queued change
    cleanups.forEach((fn) => { try { fn(); } catch (_) { /* noop */ } }); cleanups = [];
    document.removeEventListener('keydown', onKey, true);
    offLang(); offProfile();
    wrap.classList.remove('is-open');
    setTimeout(() => { wrap.remove(); if (!$('.af-modal')) document.body.classList.remove('af-no-scroll'); last?.focus?.(); }, reducedMotion() ? 0 : 240);
    window.dispatchEvent(new CustomEvent('af:settings', { detail: { open: false } }));
  }

  shell();
  document.body.appendChild(wrap);
  document.body.classList.add('af-no-scroll');
  document.addEventListener('keydown', onKey, true);
  requestAnimationFrame(() => wrap.classList.add('is-open'));
  const touch = window.matchMedia('(pointer: coarse)').matches;
  setTimeout(() => { if (startFocus) highlight(startFocus); else if (!touch) $('[data-sc-q]', wrap)?.focus(); else $('[data-sc-content]', wrap)?.focus(); }, 80);
  window.dispatchEvent(new CustomEvent('af:settings', { detail: { open: true } }));

  return { get cat() { return cat; }, go, close, el: wrap };
}
