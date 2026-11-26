// AF STUDIO 3.0 — account menu (sidebar user button + top-bar avatar).
// Every item is functional: AF AI usage (server numbers), account management,
// switch / add account, settings, help, shortcuts, admin, sign out.
import { t } from '../core/i18n.js';
import { html, raw, icon, initials, confirmDialog, $, $$ } from '../core/ui.js';
import { auth, signOut } from '../core/auth.js';
import { signedUrl } from '../lib/supabase.js';
import { mountUsage } from './usage-meter.js';
import { openSettingsCenter } from './settings-center.js';
import { openHelp, openShortcuts } from './help.js';

const ACC_KEY = 'af.accounts'; // emails/names of accounts used on THIS device (no tokens, no passwords)
const SWITCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>';
const HELP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.3-2.5 3.8"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/></svg>';
const KBD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>';

export function deviceAccounts() {
  try { const a = JSON.parse(localStorage.getItem(ACC_KEY) || '[]'); return Array.isArray(a) ? a.filter((x) => x && typeof x.email === 'string').slice(0, 5) : []; } catch (_) { return []; }
}
export function rememberAccount() {
  const email = auth.user?.email; if (!email) return;
  const name = String(auth.profile?.full_name || '').slice(0, 60);
  const list = deviceAccounts().filter((x) => x.email !== email);
  list.unshift({ email, name, at: Date.now() });
  try { localStorage.setItem(ACC_KEY, JSON.stringify(list.slice(0, 5))); } catch (_) { /* noop */ }
}
function forgetAccount(email) {
  try { localStorage.setItem(ACC_KEY, JSON.stringify(deviceAccounts().filter((x) => x.email !== email))); } catch (_) { /* noop */ }
}

/** Fill a pop panel with the menu. Returns a cleanup function. */
export function mountAccountMenu(panel, { close } = {}) {
  const p = auth.profile || {}; const u = auth.user || {};
  const name = p.full_name || (u.email || '').split('@')[0];
  const others = deviceAccounts().filter((x) => x.email !== u.email);
  panel.innerHTML = String(html`
    <div class="am" role="menu" aria-label="${t('nav.profile')}">
      <div class="am-me">
        <span class="af-avatar af-avatar--lg" data-am-av>${initials(name)}</span>
        <div class="am-me__who"><b>${name}</b><small>${u.email || ''}</small>
          <span class="am-chips"><span class="am-chip">${auth.isAdmin ? t('sc.roleAdmin') : t('sc.roleClient')}</span>
          ${u.email_confirmed_at ? '' : html`<span class="am-chip am-chip--warn">${icon('lock')}${t('settings.notConfirmed')}</span>`}</span></div>
      </div>
      <div class="am-usage" role="button" tabindex="0" data-am-usage-open aria-label="${t('usage.menuTitle')}"><span data-am-usage></span></div>
      <div class="am-sep"></div>
      <button type="button" role="menuitem" data-am="account">${icon('user')}<span>${t('acct.manage')}</span>${icon('arrowR')}</button>
      <button type="button" role="menuitem" data-am="switch" aria-expanded="false">${raw(SWITCH_ICON)}<span>${t('acct.switch')}</span><em class="am-caret">${icon('arrowR')}</em></button>
      <div class="am-sub" data-am-sub hidden>
        <div class="am-acc is-current">${icon('check')}<span><b>${name}</b><small>${u.email || ''}</small></span></div>
        ${others.map((x) => html`<div class="am-acc"><button type="button" class="am-acc__go" data-am-to="${x.email}"><span class="af-avatar">${initials(x.name || x.email)}</span><span><b>${x.name || x.email.split('@')[0]}</b><small>${x.email}</small></span></button>
          <button type="button" class="af-icon-btn am-acc__rm" data-am-forget="${x.email}" aria-label="${t('acct.forget')}">${icon('x')}</button></div>`)}
        <button type="button" class="am-add" data-am="add">${icon('plus')}<span>${t('acct.add')}</span></button>
        <p class="am-hint">${t('acct.switchNote')}</p>
      </div>
      <div class="am-sep"></div>
      <button type="button" role="menuitem" data-am="settings">${icon('settings')}<span>${t('nav.settings')}</span><kbd class="am-kbd">Ctrl ,</kbd></button>
      <button type="button" role="menuitem" data-am="help">${raw(HELP_ICON)}<span>${t('help.title')}</span></button>
      <button type="button" role="menuitem" data-am="shortcuts">${raw(KBD_ICON)}<span>${t('kbd.title')}</span><kbd class="am-kbd">?</kbd></button>
      ${auth.isAdmin ? html`<a role="menuitem" href="admin.html">${icon('admin')}<span>${t('nav.admin')}</span>${icon('arrowR')}</a>` : ''}
      <div class="am-sep"></div>
      <button type="button" role="menuitem" class="am-danger" data-am="logout">${icon('logout')}<span>${t('nav.logout')}</span></button>
    </div>`);

  if (p.avatar_path) signedUrl('avatars', p.avatar_path).then((url) => { const a = $('[data-am-av]', panel); if (url && a) a.innerHTML = `<img src="${url}" alt="" />`; });
  const offUsage = mountUsage($('[data-am-usage]', panel), { variant: 'menu', maxAge: 20000 });
  const done = () => close?.();

  const usageBox = $('[data-am-usage-open]', panel);
  const openUsage = () => { done(); openSettingsCenter({ category: 'ai', focus: 'ai.usage_daily' }); };
  usageBox.addEventListener('click', (e) => { if (e.target.closest('[data-um-retry]')) { e.stopPropagation(); return; } openUsage(); });
  usageBox.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openUsage(); } });
  $$('[data-am]', panel).forEach((b) => b.addEventListener('click', async (e) => {
    const a = b.dataset.am;
    if (a === 'switch') {
      e.stopPropagation();
      const sub = $('[data-am-sub]', panel); sub.hidden = !sub.hidden; b.setAttribute('aria-expanded', String(!sub.hidden)); b.classList.toggle('is-open', !sub.hidden);
      return;
    }
    if (a === 'account') { done(); openSettingsCenter({ category: 'account' }); }
    if (a === 'settings') { done(); openSettingsCenter(); }
    if (a === 'help') { done(); openHelp(); }
    if (a === 'shortcuts') { done(); openShortcuts(); }
    if (a === 'logout') { done(); signOut(); }
    if (a === 'add') {
      done();
      if (!(await confirmDialog(t('acct.add'), t('acct.addConfirm')))) return;
      sessionStorage.setItem('af.switch', 'add'); sessionStorage.removeItem('af.loginEmail');
      signOut(); // local session only; the other account signs in on the AF Access screen
    }
  }));
  $$('[data-am-to]', panel).forEach((b) => b.addEventListener('click', async () => {
    done();
    if (!(await confirmDialog(t('acct.switch'), t('acct.switchConfirm', { email: b.dataset.amTo })))) return;
    sessionStorage.setItem('af.switch', 'to'); sessionStorage.setItem('af.loginEmail', b.dataset.amTo);
    signOut();
  }));
  $$('[data-am-forget]', panel).forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation(); forgetAccount(b.dataset.amForget); b.closest('.am-acc')?.remove();
  }));
  return () => offUsage();
}
