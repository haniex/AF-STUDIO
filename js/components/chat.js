// Reusable conversation pane (client & admin). Realtime via Supabase channels (RLS applies).
import { t } from '../core/i18n.js';
import { html, icon, fmtDateTime, toast, $ } from '../core/ui.js';
import { supabase } from '../lib/supabase.js';
import { auth } from '../core/auth.js';

export function mountChat(el, threadId, { isAdmin = false, onSent } = {}) {
  el.innerHTML = String(html`
    <div class="msg-pane__body" data-body aria-live="polite"><div class="af-skel af-skel-row"></div></div>
    <form class="msg-compose" data-form>
      <textarea rows="1" maxlength="5000" placeholder="${t('messages.placeholder')}" aria-label="${t('messages.placeholder')}"></textarea>
      <button type="submit" class="ai-send" aria-label="${t('common.send')}">${icon('send')}</button>
    </form>`);
  const body = $('[data-body]', el); const form = $('[data-form]', el); const ta = $('textarea', form);
  let msgs = []; let alive = true; let sending = false;
  const mine = (m) => (isAdmin ? m.from_admin : !m.from_admin);
  const bubble = (m) => html`<div class="msg-b ${mine(m) ? 'msg-b--me' : 'msg-b--them'}" data-mid="${m.id}"><p>${m.body}</p>
    <small>${m.from_admin ? t('messages.studio') : (isAdmin ? (m.meta?.source === 'ai_handoff' ? 'AF AI → ' : '') + t('nav.profile') : t('messages.you'))} · ${fmtDateTime(m.created_at)}</small></div>`;
  const paint = () => { body.innerHTML = msgs.length ? String(html`${msgs.map(bubble)}`) : `<p class="af-muted" style="margin:auto">${t('messages.emptySub')}</p>`; body.scrollTop = body.scrollHeight; };

  (async () => {
    const { data, error } = await supabase.from('messages').select('*').eq('thread_id', threadId).order('created_at');
    if (!alive) return;
    if (error) { body.innerHTML = `<p class="af-muted">${t('errors.not_found')}</p>`; return; }
    msgs = data; paint();
    supabase.rpc('mark_thread_read', { p_thread: threadId });
  })();

  const channel = supabase.channel('thread-' + threadId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` }, (p) => {
      if (msgs.some((m) => m.id === p.new.id)) return;
      msgs.push(p.new); body.insertAdjacentHTML('beforeend', String(bubble(p.new))); body.scrollTop = body.scrollHeight;
      if (!mine(p.new)) supabase.rpc('mark_thread_read', { p_thread: threadId });
    }).subscribe();

  const autosize = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; };
  ta.addEventListener('input', autosize);
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = ta.value.trim();
    if (!text || sending) return;
    sending = true; $('button', form).disabled = true;
    const { data, error } = await supabase.from('messages').insert({ thread_id: threadId, sender_id: auth.user.id, body: text.slice(0, 5000) }).select().single();
    sending = false; $('button', form).disabled = false;
    if (error) { toast(t(String(error.message).includes('rate_limited') ? 'errors.rate_limited' : 'errors.generic'), 'err'); return; }
    ta.value = ''; autosize();
    if (!msgs.some((m) => m.id === data.id)) { msgs.push(data); body.insertAdjacentHTML('beforeend', String(bubble(data))); body.scrollTop = body.scrollHeight; }
    onSent?.(data);
    ta.focus();
  });
  return () => { alive = false; supabase.removeChannel(channel); };
}
