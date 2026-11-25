import { t } from '../core/i18n.js';
import { html, fmtRelative, reveal, emptyState, errorState, $, $$ } from '../core/ui.js';
import { listNotifications, markNotificationsRead } from '../core/api.js';
import { notifText, openNotifLink, refreshNotifications } from '../app/shell.js';
import { supabase } from '../lib/supabase.js';

export async function render(el) {
  el.innerHTML = String(html`
    <header class="af-page-head" data-reveal><div><h2>${t('notif.title')}</h2></div>
      <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-all>${t('notif.markAll')}</button></header>
    <div class="af-card" data-list><div class="af-skel af-skel-row"></div></div>`);
  reveal(el);
  let items;
  try { items = await listNotifications(100); } catch { $('[data-list]', el).innerHTML = String(errorState()); return; }
  const paint = () => {
    $('[data-list]', el).innerHTML = items.length ? String(html`${items.map((n) => html`
      <div class="af-notif ${n.read_at ? '' : 'is-unread'}" style="align-items:center">
        <span class="af-notif__dot"></span>
        <button type="button" class="af-notif__body" data-open="${n.id}" style="flex:1;text-align:left"><b>${notifText(n)}</b>${n.payload?.preview ? html`<small>${n.payload.preview}</small>` : ''}<time>${fmtRelative(n.created_at)}</time></button>
        <button type="button" class="af-icon-btn" data-del="${n.id}" aria-label="${t('common.delete')}">×</button>
      </div>`)}`) : String(emptyState(t('notif.empty')));
    $$('[data-open]', el).forEach((b) => b.addEventListener('click', async () => {
      const n = items.find((x) => x.id === b.dataset.open);
      if (!n.read_at) { await markNotificationsRead([n.id]); refreshNotifications(); }
      openNotifLink(n);
    }));
    $$('[data-del]', el).forEach((b) => b.addEventListener('click', async () => {
      await supabase.from('notifications').delete().eq('id', b.dataset.del);
      items = items.filter((x) => x.id !== b.dataset.del); paint(); refreshNotifications();
    }));
  };
  $('[data-all]', el).addEventListener('click', async () => { await markNotificationsRead(); items.forEach((n) => (n.read_at = n.read_at || new Date().toISOString())); paint(); refreshNotifications(); });
  const onNew = (e) => { items.unshift(e.detail); paint(); };
  window.addEventListener('af:notification', onNew);
  paint();
  return () => window.removeEventListener('af:notification', onNew);
}
