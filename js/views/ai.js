import { t, getLang } from '../core/i18n.js';
import { html, icon, md, fmtRelative, toast, confirmDialog, promptDialog, emptyState, $, $$, isMobile } from '../core/ui.js';
import { supabase, callFunction } from '../lib/supabase.js';
import { auth } from '../core/auth.js';
import { navigate } from '../core/router.js';
import { getDraft, saveDraft } from '../core/api.js';

let mode = 'chat';

export async function render(el, { params }) {
  const convId = params.id || null;
  el.innerHTML = String(html`
  <div class="ai ${!convId && isMobile() ? '' : ''}">
    <aside class="ai-side">
      <button type="button" class="af-btn af-btn--gold" data-new>${icon('plus')}<span>${t('ai.newChat')}</span></button>
      <p class="af-nav__label" style="padding:10px 4px 0">${t('ai.history')}</p>
      <div class="ai-list" data-list><div class="af-skel af-skel-row"></div></div>
    </aside>
    <section class="ai-main">
      <header class="ai-head">
        <div class="ai-head__id"><span class="ai-orb" aria-hidden="true"></span><div><b>${t('ai.title')}</b><small>Gemini · AF knowledge base</small></div></div>
        <div class="af-row">
          <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-list-toggle>${icon('menu')}<span>${t('ai.history')}</span></button>
          <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-handoff ${convId ? '' : 'disabled'}>${icon('user')}<span>${t('ai.handoff')}</span></button>
          <button type="button" class="af-icon-btn" data-del ${convId ? '' : 'disabled'} aria-label="${t('ai.deleteChat')}">${icon('trash')}</button>
        </div>
      </header>
      <div class="ai-body" data-body aria-live="polite"></div>
      <form class="ai-compose" data-form>
        <div class="ai-compose__modes" role="group">
          ${[['chat', 'ai.modeChat'], ['brief', 'ai.modeBrief'], ['estimate', 'ai.modeEstimate']].map(([m, k]) => html`<button type="button" data-mode="${m}" class="${mode === m ? 'is-on' : ''}" aria-pressed="${mode === m}">${t(k)}</button>`)}
        </div>
        <div class="ai-compose__row">
          <textarea name="q" rows="1" maxlength="4000" placeholder="${t('ai.placeholder')}" aria-label="${t('ai.placeholder')}"></textarea>
          <button type="submit" class="ai-send" aria-label="${t('common.send')}">${icon('send')}</button>
        </div>
        <div class="ai-foot"><span>${t('ai.disclaimer')}</span><span data-usage></span></div>
      </form>
    </section>
  </div>`);

  const root = $('.ai', el); const body = $('[data-body]', el); const form = $('[data-form]', el); const ta = $('textarea', form);
  let conversationId = convId; let busy = false; let messages = [];

  // --------------------------------------------------------------- history list
  async function loadList() {
    const { data } = await supabase.from('ai_conversations').select('id,title,updated_at').eq('user_id', auth.user.id).order('updated_at', { ascending: false }).limit(50);
    const list = $('[data-list]', el); if (!list) return;
    list.innerHTML = (data || []).length ? String(html`${data.map((c) => html`
      <a class="ai-list__item ${c.id === conversationId ? 'is-on' : ''}" href="#/ai/${c.id}" data-cid="${c.id}"><span>${c.title}</span><small>${fmtRelative(c.updated_at)}</small></a>`)}`)
      : String(html`<p class="af-muted" style="font-size:13px;padding:8px">${t('ai.empty')}</p>`);
    $$('[data-cid]', list).forEach((a) => a.addEventListener('dblclick', async (e) => {
      e.preventDefault();
      const v = await promptDialog(t('ai.rename'), { value: a.querySelector('span').textContent, maxLength: 120 });
      if (v) { await supabase.from('ai_conversations').update({ title: v }).eq('id', a.dataset.cid); loadList(); }
    }));
  }

  // --------------------------------------------------------------- messages
  function paint() {
    if (!messages.length) {
      body.innerHTML = String(html`<div class="ai-empty"><span class="ai-orb" aria-hidden="true"></span><h3>${t('ai.empty')}</h3><p>${t('ai.emptySub')}</p>
        <div class="ai-suggest">${['s1', 's2', 's3', 's4'].map((k) => html`<button type="button" data-suggest="${k}">${t('ai.' + k)}</button>`)}</div></div>`);
      $$('[data-suggest]', body).forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.suggest === 's2') setMode('brief'); else if (b.dataset.suggest === 's3') setMode('estimate');
        ta.value = b.textContent; send();
      }));
      return;
    }
    body.innerHTML = String(html`${messages.map((m, i) => msgHtml(m, i))}`);
    bindTools();
    body.scrollTop = body.scrollHeight;
  }
  const msgHtml = (m, i) => m.role === 'user'
    ? html`<div class="ai-msg ai-msg--user"><div class="ai-msg__bubble">${m.content}</div></div>`
    : html`<div class="ai-msg ai-msg--assistant"><div class="ai-msg__bubble af-md">${md(m.content)}</div>
        <div class="ai-msg__tools">
          <button type="button" data-copy="${i}">${icon('copy')}<span>${t('common.copy')}</span></button>
          ${m.id ? html`<button type="button" data-save="${i}" class="${m.saved ? 'is-on' : ''}">${icon('check')}<span>${t(m.saved ? 'ai.savedResult' : 'ai.saveResult')}</span></button>` : ''}
          <button type="button" data-builder="${i}">${icon('builder')}<span>${t('ai.toBuilder')}</span></button>
        </div></div>`;

  function bindTools() {
    $$('[data-copy]', body).forEach((b) => b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(messages[+b.dataset.copy].content); toast(t('common.copied'), 'ok', 1500); } catch { /* noop */ }
    }));
    $$('[data-save]', body).forEach((b) => b.addEventListener('click', async () => {
      const m = messages[+b.dataset.save]; const v = !m.saved;
      const { error } = await supabase.from('ai_messages').update({ saved: v }).eq('id', m.id);
      if (error) return toast(t('errors.generic'), 'err');
      m.saved = v; b.classList.toggle('is-on', v); b.querySelector('span').textContent = t(v ? 'ai.savedResult' : 'ai.saveResult');
      if (v) toast(t('ai.savedResult'), 'ok', 1500);
    }));
    $$('[data-builder]', body).forEach((b) => b.addEventListener('click', async () => {
      const m = messages[+b.dataset.builder];
      const d = (await getDraft().catch(() => null)) || {};
      d.styleNote = [d.styleNote, m.content].filter(Boolean).join('\n\n').slice(0, 6000);
      d.aiSpec = m.content.slice(0, 8000);
      await saveDraft(d).catch(() => {});
      navigate('/builder');
    }));
  }

  async function loadConversation() {
    if (!conversationId) { messages = []; paint(); return; }
    body.innerHTML = '<div class="af-skel af-skel-row"></div><div class="af-skel af-skel-row"></div>';
    const { data, error } = await supabase.from('ai_messages').select('id,role,content,saved,created_at').eq('conversation_id', conversationId).order('id');
    if (error || !data) { body.innerHTML = String(emptyState(t('errors.not_found'))); return; }
    messages = data; paint();
  }

  // --------------------------------------------------------------- send
  function setMode(m) {
    mode = m;
    $$('[data-mode]', form).forEach((b) => { b.classList.toggle('is-on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  }
  $$('[data-mode]', form).forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

  async function send() {
    const q = ta.value.trim();
    if (!q || busy) return;
    busy = true; $('.ai-send', form).disabled = true;
    if (!messages.length) body.innerHTML = '';
    messages.push({ role: 'user', content: q });
    body.insertAdjacentHTML('beforeend', String(msgHtml(messages[messages.length - 1], messages.length - 1)));
    body.insertAdjacentHTML('beforeend', `<div class="ai-msg ai-msg--assistant" data-typing><div class="ai-msg__bubble"><span class="ai-typing" aria-label="${t('ai.thinking')}"><i></i><i></i><i></i></span></div></div>`);
    body.scrollTop = body.scrollHeight;
    ta.value = ''; autosize();
    try {
      const res = await callFunction('ai-chat', { message: q, mode, lang: getLang(), conversation_id: conversationId || undefined });
      const isNew = !conversationId && res.conversation_id;
      conversationId = res.conversation_id || conversationId;
      if (res.usage) $('[data-usage]', el).textContent = t('ai.usage', { used: res.usage.today, limit: res.usage.limit });
      if (isNew) { history.replaceState(null, '', '#/ai/' + conversationId); $('[data-handoff]', el).disabled = false; $('[data-del]', el).disabled = false; }
      // reload to get message ids (for "save")
      const { data } = await supabase.from('ai_messages').select('id,role,content,saved').eq('conversation_id', conversationId).order('id');
      messages = data && data.length ? data : [...messages, { role: 'assistant', content: res.reply }];
      paint(); loadList();
    } catch (e) {
      const code = e.code || 'generic';
      messages.pop();
      $('[data-typing]', body)?.remove();
      const key = ['ai_disabled', 'ai_not_configured', 'daily_limit', 'rate_limited', 'provider_busy', 'provider_error', 'provider_timeout', 'too_long', 'network', 'server_config'].includes(code) ? 'errors.' + code : 'errors.generic';
      const tech = key === 'errors.generic' || key === 'errors.server_config' ? ` [${e.status || ''} ${code}${e.detail ? ': ' + e.detail : ''}]` : '';
      toast(t(key, { limit: e.details?.limit || '' }) + tech, 'err', 12000);
      console.warn('[AF AI]', e.status, code, e.detail);
      ta.value = q; paint();
    } finally { busy = false; $('.ai-send', form).disabled = false; ta.focus(); }
  }

  const autosize = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'; };
  ta.addEventListener('input', autosize);
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
  form.addEventListener('submit', (e) => { e.preventDefault(); send(); });

  $('[data-new]', el).addEventListener('click', () => { navigate('/ai'); });
  $('[data-list-toggle]', el).addEventListener('click', () => root.classList.toggle('is-list'));
  $('[data-del]', el).addEventListener('click', async () => {
    if (!conversationId || !(await confirmDialog(t('ai.deleteChat'), t('ai.deleteConfirm'), { danger: true, okLabel: t('common.delete') }))) return;
    const { error } = await supabase.from('ai_conversations').delete().eq('id', conversationId);
    if (error) return toast(t('errors.generic'), 'err');
    navigate('/ai');
  });
  $('[data-handoff]', el).addEventListener('click', async (e) => {
    if (!conversationId || !(await confirmDialog(t('ai.handoff'), t('ai.handoffConfirm')))) return;
    e.currentTarget.disabled = true;
    try { const r = await callFunction('ai-chat', { action: 'handoff', conversation_id: conversationId, lang: getLang() }); toast(t('ai.handoffDone'), 'ok', 5000); navigate('/messages/' + r.thread_id); }
    catch (err) { e.currentTarget.disabled = false; toast(t('errors.' + (err.code || 'generic')), 'err'); }
  });

  // usage indicator
  supabase.from('ai_usage').select('count').eq('user_id', auth.user.id).eq('day', new Date().toISOString().slice(0, 10)).maybeSingle()
    .then(({ data }) => { if (data && $('[data-usage]', el)) $('[data-usage]', el).textContent = t('ai.usage', { used: data.count, limit: '…' }); });

  await Promise.all([loadList(), loadConversation()]);
  if (!convId) ta.focus();
}
