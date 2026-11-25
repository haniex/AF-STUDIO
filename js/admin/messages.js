import { html, icon, fmtRelative, emptyState, errorState, toast, $, $$ } from '../core/ui.js';
import { supabase } from '../lib/supabase.js';
import { mountChat } from '../components/chat.js';
import { a } from './i18n.js';

let filter = 'open';
let prev = null;

export async function render(el, { params }) {
  if (typeof prev === 'function') { prev(); prev = null; }
  const current = params.id || null;
  el.innerHTML = String(html`<div class="af-chips" style="margin-bottom:14px">${['open', 'closed', 'all'].map((f) => html`<button type="button" class="af-chip ${filter === f ? 'is-on' : ''}" data-f="${f}">${a(f)}</button>`)}</div>
    <div class="msg ${current ? 'has-thread' : ''}"><nav class="msg-list" data-list></nav><section class="msg-pane" data-pane></section></div>`);
  $$('[data-f]', el).forEach((b) => b.addEventListener('click', () => { filter = b.dataset.f; render(el, { params }); }));
  let q = supabase.from('threads').select('*').order('last_message_at', { ascending: false }).limit(200);
  if (filter !== 'all') q = q.eq('status', filter);
  const { data: threads, error } = await q;
  if (error) { $('[data-list]', el).innerHTML = String(errorState(error.message)); return; }
  const ids = [...new Set(threads.map((th) => th.client_id))];
  const { data: people } = ids.length ? await supabase.from('profiles').select('id,full_name,email').in('id', ids) : { data: [] };
  const who = Object.fromEntries((people || []).map((p) => [p.id, p.full_name || p.email]));
  $('[data-list]', el).innerHTML = threads.length ? String(html`${threads.map((th) => html`<a href="#/messages/${th.id}" class="${th.id === current ? 'is-on' : ''} ${!th.last_from_admin && th.status === 'open' ? 'is-unread' : ''}">
    <b>${th.subject}</b><small>${who[th.client_id] || '—'}${th.project_id ? ' · project' : ''}</small><time>${fmtRelative(th.last_message_at)}</time></a>`)}`) : String(emptyState(a('empty')));
  const pane = $('[data-pane]', el);
  if (!current) { pane.innerHTML = String(emptyState('—')); return; }
  let th = threads.find((x) => x.id === current);
  if (!th) { const r = await supabase.from('threads').select('*').eq('id', current).maybeSingle(); th = r.data; }
  if (!th) { pane.innerHTML = String(emptyState('404')); return; }
  pane.innerHTML = String(html`<header class="msg-pane__head"><a class="af-icon-btn msg-back" href="#/messages">${icon('arrowL')}</a><h3>${th.subject} · ${who[th.client_id] || ''}</h3>
    ${th.project_id ? html`<a class="af-btn af-btn--ghost af-btn--sm" href="#/projects/${th.project_id}">project</a>` : ''}
    <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-toggle>${th.status === 'open' ? a('close') : a('reopen')}</button></header>`);
  const host = document.createElement('div'); host.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0'; pane.appendChild(host);
  const cleanup = mountChat(host, th.id, { isAdmin: true });
  prev = cleanup;
  $('[data-toggle]', pane).addEventListener('click', async () => {
    const { error: e } = await supabase.from('threads').update({ status: th.status === 'open' ? 'closed' : 'open' }).eq('id', th.id);
    if (e) return toast(e.message, 'err');
    render(el, { params });
  });
  return cleanup;
}
