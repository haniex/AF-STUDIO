import { t, getLang, setLang } from '../core/i18n.js';
import { html, icon, initials, reveal, toast, modal, setBusy, $, $$ } from '../core/ui.js';
import { supabase, signedUrl, callFunction } from '../lib/supabase.js';
import { auth, updateProfile, changePassword, changeEmail, signOut, authErrorKey, isOAuthOnly } from '../core/auth.js';
import { applyTheme, getTheme } from '../core/theme.js';
import { validateFile } from '../core/api.js';
import { CONFIG } from '../config.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function render(el) {
  const p = auth.profile || {};
  const oauth = isOAuthOnly();
  el.innerHTML = String(html`
    <header class="af-page-head" data-reveal><div><h2>${t('settings.title')}</h2></div></header>
    <div class="st">
      <section class="af-card" data-reveal>
        <h3 class="af-h3">${t('settings.profile')}</h3>
        <div class="st-avatar">
          <span class="af-avatar af-avatar--xl" data-av>${initials(p.full_name || auth.user.email)}</span>
          <label class="af-btn af-btn--ghost af-btn--sm">${icon('upload')}<span>${t('settings.changeAvatar')}</span><input type="file" accept="image/jpeg,image/png,image/webp" hidden data-avatar /></label>
        </div>
        <form data-profile class="adm-form-grid">
          <label class="af-field"><span>${t('settings.name')}</span><input name="full_name" maxlength="60" value="${p.full_name || ''}" autocomplete="name" required /></label>
          <label class="af-field"><span>${t('settings.email')}</span><input value="${auth.user.email}" readonly /></label>
          <div class="af-row is-wide"><button type="submit" class="af-btn af-btn--primary af-btn--sm">${t('common.save')}</button>
            ${oauth ? '' : html`<button type="button" class="af-btn af-btn--ghost af-btn--sm" data-email>${t('settings.changeEmail')}</button>`}</div>
        </form>
      </section>

      <section class="af-card" data-reveal>
        <h3 class="af-h3">${t('settings.security')}</h3>
        ${oauth ? html`<p class="af-muted">${t('settings.oauthUser')}</p>` : html`
        <form data-pwd class="adm-form-grid">
          <label class="af-field"><span>${t('settings.currentPwd')}</span><input type="password" name="current" autocomplete="current-password" required maxlength="128" /></label>
          <label class="af-field"><span>${t('settings.newPwd')}</span><input type="password" name="next" autocomplete="new-password" minlength="8" required maxlength="128" /></label>
          <label class="af-field"><span>${t('access.password2')}</span><input type="password" name="next2" autocomplete="new-password" minlength="8" required maxlength="128" /></label>
          <div class="is-wide"><button type="submit" class="af-btn af-btn--primary af-btn--sm">${t('settings.changePwd')}</button></div>
        </form>`}
      </section>

      <section class="af-card" data-reveal>
        <h3 class="af-h3">${t('settings.prefs')}</h3>
        <div class="af-switch"><span>${t('settings.language')}</span><div class="af-seg"><button type="button" data-lang="ru" class="${getLang() === 'ru' ? 'is-on' : ''}">RU</button><button type="button" data-lang="en" class="${getLang() === 'en' ? 'is-on' : ''}">EN</button></div></div>
        <div class="af-switch"><span>${t('settings.theme')}</span><div class="af-seg"><button type="button" data-theme="dark" class="${getTheme() === 'dark' ? 'is-on' : ''}">${t('settings.dark')}</button><button type="button" data-theme="light" class="${getTheme() === 'light' ? 'is-on' : ''}">${t('settings.light')}</button></div></div>
        <h4 class="af-h3" style="font-size:14px;margin:18px 0 0">${t('settings.notifications')}</h4>
        <label class="af-switch"><span>${t('settings.notifyInapp')}</span><input type="checkbox" data-pref="notify_inapp" ${p.notify_inapp !== false ? 'checked' : ''} /></label>
        <label class="af-switch"><span>${t('settings.notifyEmail')}</span><input type="checkbox" data-pref="notify_email" ${p.notify_email !== false ? 'checked' : ''} /></label>
      </section>

      <section class="af-card" data-reveal>
        <h3 class="af-h3">${t('settings.session')}</h3>
        <div class="af-row"><button type="button" class="af-btn af-btn--ghost" data-logout>${icon('logout')}<span>${t('settings.logout')}</span></button>
          <button type="button" class="af-btn af-btn--ghost" data-logout-all>${t('settings.logoutAll')}</button></div>
      </section>

      <section class="af-card af-card--danger" data-reveal>
        <h3 class="af-h3">${t('settings.danger')}</h3><p class="af-muted" style="margin-bottom:14px">${t('settings.deleteText')}</p>
        <button type="button" class="af-btn af-btn--danger" data-delete>${icon('trash')}<span>${t('settings.deleteAccount')}</span></button>
      </section>
    </div>`);
  reveal(el);

  // avatar preview
  if (p.avatar_path) signedUrl('avatars', p.avatar_path).then((u) => { if (u) $('[data-av]', el).innerHTML = `<img src="${u}" alt="" />`; });

  $('[data-avatar]', el).addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    const v = validateFile(f, { imagesOnly: true, maxMB: CONFIG.LIMITS.avatarMB });
    if (v.error) return toast(t(v.error, { mb: v.mb }), 'err');
    const ext = f.type.split('/')[1].replace('jpeg', 'jpg');
    const path = `${auth.user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, f, { contentType: f.type, upsert: false });
    if (error) return toast(t('errors.generic'), 'err');
    const old = auth.profile.avatar_path;
    await updateProfile({ avatar_path: path });
    if (old) supabase.storage.from('avatars').remove([old]);
    const u = await signedUrl('avatars', path); $('[data-av]', el).innerHTML = `<img src="${u}" alt="" />`;
    toast(t('common.saved'), 'ok', 1500);
  });

  $('[data-profile]', el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = e.target.full_name.value.trim();
    if (name.length < 2 || name.length > 60) return toast(t('v.name'), 'err');
    const b = $('button[type=submit]', e.target); setBusy(b, true);
    try { await updateProfile({ full_name: name }); toast(t('common.saved'), 'ok', 1500); } catch { toast(t('errors.generic'), 'err'); }
    setBusy(b, false);
  });

  $('[data-email]', el)?.addEventListener('click', () => {
    const body = document.createElement('div');
    body.innerHTML = String(html`<label class="af-field"><span>${t('settings.newEmail')}</span><input type="email" name="email" maxlength="254" autocomplete="email" /></label>`);
    modal({ title: t('settings.changeEmail'), size: 'sm', body, actions: [{ label: t('common.cancel'), value: null }, {
      label: t('common.save'), primary: true,
      onClick: async (b, close, btn) => {
        const v = $('[name=email]', b).value.trim();
        if (!EMAIL_RE.test(v)) { toast(t('v.email'), 'err'); return false; }
        setBusy(btn, true);
        try { await changeEmail(v); close(true); toast(t('settings.emailSent'), 'ok', 7000); } catch (err) { setBusy(btn, false); toast(t(authErrorKey(err)), 'err'); }
        return false;
      } }] });
  });

  $('[data-pwd]', el)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.next.value.length < 8) return toast(t('v.pwdMin'), 'err');
    if (f.next.value !== f.next2.value) return toast(t('v.pwdMatch'), 'err');
    const b = $('button[type=submit]', f); setBusy(b, true);
    try { await changePassword(f.current.value, f.next.value); f.reset(); toast(t('settings.pwdChanged'), 'ok'); }
    catch (err) { toast(t(authErrorKey(err)), 'err'); }
    setBusy(b, false);
  });

  $$('[data-lang]', el).forEach((b) => b.addEventListener('click', async () => { setLang(b.dataset.lang); updateProfile({ lang: b.dataset.lang }).catch(() => {}); }));
  $$('[data-theme]', el).forEach((b) => b.addEventListener('click', async () => {
    applyTheme(b.dataset.theme); $$('[data-theme]', el).forEach((x) => x.classList.toggle('is-on', x === b));
    updateProfile({ theme: b.dataset.theme }).catch(() => {});
  }));
  $$('[data-pref]', el).forEach((i) => i.addEventListener('change', async () => {
    try { await updateProfile({ [i.dataset.pref]: i.checked }); toast(t('common.saved'), 'ok', 1200); } catch { i.checked = !i.checked; toast(t('errors.generic'), 'err'); }
  }));
  $('[data-logout]', el).addEventListener('click', () => signOut());
  $('[data-logout-all]', el).addEventListener('click', () => signOut(true));

  $('[data-delete]', el).addEventListener('click', () => {
    const word = getLang() === 'en' ? 'DELETE' : 'УДАЛИТЬ';
    const body = document.createElement('div');
    body.innerHTML = String(html`<p class="af-muted" style="margin-bottom:14px">${t('settings.deleteText')}</p>
      ${oauth ? '' : html`<label class="af-field"><span>${t('settings.currentPwd')}</span><input type="password" name="pwd" autocomplete="current-password" /></label>`}
      <label class="af-field"><span>${t('settings.deleteConfirmWord')}</span><input name="word" autocomplete="off" placeholder="${word}" /></label>`);
    modal({ title: t('settings.deleteAccount'), size: 'sm', body, actions: [{ label: t('common.cancel'), value: null }, {
      label: t('settings.deleteAccount'), danger: true,
      onClick: async (b, close, btn) => {
        const w = $('[name=word]', b).value.trim();
        if (w !== word) { toast(t('errors.confirmation_required'), 'err'); return false; }
        setBusy(btn, true);
        try {
          await callFunction('delete-account', { password: $('[name=pwd]', b)?.value || '', confirm: w });
          close(true); toast(t('settings.deleted'), 'ok'); await signOut();
        } catch (err) { setBusy(btn, false); toast(t('errors.' + (err.code || 'generic')), 'err'); }
        return false;
      } }] });
  });
}
