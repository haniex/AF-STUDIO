import { t } from '../core/i18n.js';
import { html, icon, fmtRelative, reveal, emptyState, errorState, $, $$ } from '../core/ui.js';
import { supabase } from '../lib/supabase.js';
import { auth } from '../core/auth.js';
import { navigate } from '../core/router.js';
import { mountChat } from '../components/chat.js';
import { writeToStudio } from './services.js';
import { CONFIG } from '../config.js';

export async function render(el, { params }) {
  const current = params.id || null;
  el.innerHTML = String(html`
    <header class="af-page-head" data-reveal><div><span class="af-kicker">AF SUPPORT</span><h2>${t('messages.title')}</h2><p>${t('messages.sub')}</p></div>
      <div class="af-row">
        <a class="af-btn af-btn--ghost af-btn--sm" href="https://t.me/${CONFIG.CONTACTS.telegram}" target="_blank" rel="noopener">Telegram @${CONFIG.CONTACTS.telegram}</a>
        <button type="button" class="af-btn af-btn--gold" data-new>${icon('plus')}<span>${t('messages.newThread')}</span></button></div></header>
    <div class="msg ${current ? 'has-thread' : ''}">
      <nav class="msg-list" data-list aria-label="${t('messages.title')}"><div class="af-skel af-skel-row"></div></nav>
      <section class="msg-pane" data-pane></section>
    </div>`);
  reveal(el);
  $('[data-new]', el).addEventListener('click', () => writeToStudio());
  let cleanup = null;

  const { data: threads, error } = await supabase.from('threads').select('*').eq('client_id', auth.user.id).order('last_message_at', { ascending: false });
  if (error) { $('[data-list]', el).innerHTML = String(errorState()); return; }
  const { data: unread } = await supabase.from('messages').select('thread_id, threads!inner(client_id)').eq('threads.client_id', auth.user.id).eq('from_admin', true).is('read_at', null);
  const unreadSet = new Set((unread || []).map((m) => m.thread_id));
  if (!el.isConnected) return;

  $('[data-list]', el).innerHTML = threads.length ? String(html`${threads.map((th) => html`
    <a href="#/messages/${th.id}" class="${th.id === current ? 'is-on' : ''} ${unreadSet.has(th.id) ? 'is-unread' : ''}">
      <b>${th.subject}</b><small>${th.project_id ? t('nav.projects') + ' · ' : ''}${th.last_from_admin ? t('messages.studio') : t('messages.you')}${th.status === 'closed' ? ' · ' + t('messages.closed') : ''}</small>
      <time>${fmtRelative(th.last_message_at)}</time></a>`)}`) : String(emptyState(t('messages.empty'), t('messages.emptySub')));

  const pane = $('[data-pane]', el);
  if (!current) {
    pane.innerHTML = String(emptyState(t('messages.select')));
    if (threads.length && window.matchMedia('(min-width: 861px)').matches) navigate('/messages/' + threads[0].id, { replace: true });
    return;
  }
  const th = threads.find((x) => x.id === current);
  if (!th) { pane.innerHTML = String(emptyState(t('errors.not_found'))); return; }
  pane.innerHTML = String(html`<header class="msg-pane__head"><a class="af-icon-btn msg-back" href="#/messages" aria-label="${t('common.back')}">${icon('arrowL')}</a>
    <h3>${th.subject}</h3>${th.project_id ? html`<a class="af-btn af-btn--ghost af-btn--sm" href="#/projects/${th.project_id}">${t('nav.projects')}</a>` : ''}</header><div data-chat style="display:contents"></div>`);
  if (unreadSet.has(th.id)) { const { bumpUnreadMessages } = await import('../app/shell.js'); bumpUnreadMessages(-1); }
  const host = document.createElement('div'); host.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0';
  pane.appendChild(host); $('[data-chat]', pane).remove();
  cleanup = mountChat(host, th.id);
  $$('.msg-list a', el).forEach((a) => a.classList.toggle('is-on', a.getAttribute('href') === '#/messages/' + th.id));
  $('.msg-list a.is-on', el)?.classList.remove('is-unread');
  return () => cleanup?.();
}
