// =====================================================================
// AF AI 3.1 — universal creative assistant (#/ai, #/ai/:id)
// One chat, one history, one quota system. General context by default,
// AF STUDIO context on demand. Answers are rendered safely (js/core/ai-render.js);
// generated code is shown and downloadable, never executed.
// =====================================================================
import { t, getLang } from '../core/i18n.js';
import { html, raw, icon, toast, confirmDialog, promptDialog, $, $$, isMobile, reducedMotion } from '../core/ui.js';
import { supabase, callFunction } from '../lib/supabase.js';
import { auth } from '../core/auth.js';
import { navigate } from '../core/router.js';
import { getDraft, saveDraft } from '../core/api.js';
import { getPreferences } from '../core/preferences.js';
import { setUsage, fetchUsage, fmtDuration } from '../core/ai-usage.js';
import { mountUsage } from '../components/usage-meter.js';
import { openSettingsCenter } from '../components/settings-center.js';
import { renderAnswer, toPlainText, downloadText, safeFileName, extFor } from '../core/ai-render.js';
import { OUTPUT_TYPES, SCOPES, AF_ONLY, groupByDate, filterConversations, effectiveScope, safeSourceUrl } from '../core/ai-chat-utils.js';

export { OUTPUT_TYPES, groupByDate, filterConversations, effectiveScope };

// pure helpers live in js/core/ai-chat-utils.js (unit-tested)
// ---------------------------------------------------------------- icons (inline, no decoration)
const I = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>'),
  dots: I('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
  history: I('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'),
  retry: I('<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/>'),
  wand: I('<path d="m15 4 1.5 1.5M18 7l1.5 1.5M4 20 14.5 9.5M13 4v2M20 11h-2"/>'),
  next: I('<path d="M5 12h12M13 6l6 6-6 6"/>'),
  dl: I('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  gear: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.4 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.9 14H3.8a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 5.4 7.4a1.6 1.6 0 0 0-.3-1.8L5 5.5a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9.8a1.6 1.6 0 0 0 1-1.5V1.5"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  x: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  globe: I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.9 5.8 3.9 9s-1.3 6.2-3.9 9c-2.6-2.8-3.9-5.8-3.9-9S9.4 5.8 12 3Z"/>'),
};
const WEB_KEY = 'af.ai.web'; // per-device UI choice; the server still decides (admin switch, scope)
const webPref = () => { try { return localStorage.getItem(WEB_KEY) !== '0'; } catch (_) { return true; } };


let mode = 'chat';
let outputType = null;

export async function render(el, { params }) {
  const prefs = getPreferences().ai;
  const ephemeral = prefs.save_history === false;
  let conversationId = params.id || null;
  let scope = 'general';
  let conversations = []; let messages = []; let busy = false; let blocked = null; let search = '';
  let scopeColumn = true; // false until migration 20261126000003 is applied
  let web = webPref(); let webAdmin = true; // webAdmin: server-side switch (ai_settings.web_search)
  if (!conversationId) { mode = ['chat', 'brief', 'estimate'].includes(prefs.default_mode) ? prefs.default_mode : 'chat'; outputType = null; }

  el.innerHTML = String(html`
  <div class="ax">
    <aside class="ax-side" aria-label="${t('ax.history')}">
      <button type="button" class="ax-new" data-new>${raw(IC.plus)}<span>${t('ax.newChat')}</span></button>
      <label class="ax-search">${raw(IC.search)}<input type="search" data-search placeholder="${t('ax.searchPh')}" aria-label="${t('ax.searchPh')}" autocomplete="off" /></label>
      <nav class="ax-list" data-list><div class="af-skel af-skel-row"></div><div class="af-skel af-skel-row"></div></nav>
    </aside>
    <section class="ax-main">
      <header class="ax-head">
        <div class="ax-lights" role="group" aria-label="${t('ax.window')}">
          <button type="button" class="ax-light ax-light--r" data-light="close" aria-label="${t('ax.lightClose')}" title="${t('ax.lightClose')}"><i aria-hidden="true">×</i></button>
          <button type="button" class="ax-light ax-light--y" data-light="side" aria-label="${t('ax.lightSide')}" title="${t('ax.lightSide')}"><i aria-hidden="true">−</i></button>
          <button type="button" class="ax-light ax-light--g" data-light="full" aria-label="${t('ax.lightFull')}" title="${t('ax.lightFull')}"><i aria-hidden="true">+</i></button>
        </div>
        <button type="button" class="ax-ib ax-head__hist" data-toggle-list aria-label="${t('ax.history')}">${raw(IC.history)}</button>
        <b class="ax-title">AF AI</b>
        <div class="ax-scope" role="radiogroup" aria-label="${t('ax.scopeLabel')}" data-scope></div>
        <span class="ax-grow"></span>
        <div class="ax-quota" data-usage role="button" tabindex="0" title="${t('ax.usageOpen')}"></div>
        <button type="button" class="ax-ib" data-chat-menu aria-label="${t('ax.more')}" aria-haspopup="menu">${raw(IC.dots)}</button>
      </header>
      <div class="ax-body" data-body aria-live="polite"></div>
      <form class="ax-compose" data-form>
        <div class="ax-gate" data-gate hidden role="status" aria-live="polite"></div>
        <div class="ax-box">
          <textarea name="q" rows="1" maxlength="4000" placeholder="${t('ax.placeholder')}" aria-label="${t('ax.placeholder')}"></textarea>
          <div class="ax-box__bar">
            <button type="button" class="ax-ib ax-plus" data-plus aria-label="${t('ax.createMenu')}" aria-haspopup="menu" title="${t('ax.createMenu')}">${raw(IC.plus)}</button>
            <span data-mode-chip></span>
            <button type="button" class="ax-ctx" data-ctx></button>
            <button type="button" class="ax-web" data-web aria-pressed="false">${raw(IC.globe)}<span>${t('ax.web')}</span></button>
            <span class="ax-grow"></span>
            <button type="submit" class="ax-send" aria-label="${t('common.send')}">${icon('send')}</button>
          </div>
        </div>
        <p class="ax-foot"><span data-disclaimer>${t('ax.disclaimer')}</span>${ephemeral ? html`<span>${t('usage.ephemeral')} <button type="button" class="af-link" data-ai-prefs>${t('nav.settings')}</button></span>` : ''}</p>
      </form>
    </section>
    <div class="ax-menu" data-menu hidden role="menu"></div>
  </div>`);

  const root = $('.ax', el); const body = $('[data-body]', el); const form = $('[data-form]', el); const ta = $('textarea', form);
  const sendBtn = $('.ax-send', form); const gate = $('[data-gate]', el); const menu = $('[data-menu]', el);
  const cleanups = [];

  // ---------------------------------------------------------------- popover menu
  let menuAnchor = null;
  function closeMenu() { menu.hidden = true; menu.innerHTML = ''; menuAnchor?.setAttribute('aria-expanded', 'false'); menuAnchor = null; }
  function openMenu(anchor, sections) {
    if (menuAnchor === anchor) { closeMenu(); return; }
    closeMenu(); menuAnchor = anchor; anchor.setAttribute('aria-expanded', 'true');
    menu.innerHTML = String(html`${sections.map((s) => html`<div class="ax-menu__sec">${s.title ? html`<p>${s.title}</p>` : ''}${s.items.map((it, i) => html`
      <button type="button" role="menuitem" data-mi="${s.id}:${i}" class="${it.active ? 'is-on' : ''} ${it.danger ? 'is-danger' : ''}"><b>${it.label}</b>${it.hint ? html`<small>${it.hint}</small>` : ''}</button>`)}</div>`)}`);
    $$('[data-mi]', menu).forEach((b) => b.addEventListener('click', () => {
      const [sid, i] = b.dataset.mi.split(':'); const it = sections.find((s) => s.id === sid).items[+i];
      closeMenu(); it.onClick();
    }));
    menu.hidden = false;
    const r = anchor.getBoundingClientRect(); const rr = root.getBoundingClientRect();
    const w = Math.min(300, rr.width - 16);
    menu.style.width = w + 'px';
    let left = r.left - rr.left; if (left + w > rr.width - 8) left = Math.max(8, r.right - rr.left - w);
    const below = r.bottom - rr.top + 6; const mh = menu.offsetHeight;
    menu.style.left = left + 'px';
    menu.style.top = (below + mh > rr.height - 8 ? Math.max(8, r.top - rr.top - mh - 6) : below) + 'px';
    $('button', menu)?.focus({ preventScroll: true });
  }
  const onDoc = (e) => { if (!menu.hidden && !e.target.closest('[data-menu]') && e.target.closest('[aria-haspopup]') !== menuAnchor) closeMenu(); };
  const onKey = (e) => { if (e.key === 'Escape' && !menu.hidden) { e.stopPropagation(); const a = menuAnchor; closeMenu(); a?.focus(); } };
  document.addEventListener('click', onDoc, true); document.addEventListener('keydown', onKey, true);
  cleanups.push(() => { document.removeEventListener('click', onDoc, true); document.removeEventListener('keydown', onKey, true); });

  // ---------------------------------------------------------------- scope (General / AF STUDIO)
  function paintScope() {
    const eff = effectiveScope(mode, scope); const locked = AF_ONLY.includes(mode);
    $('[data-scope]', el).innerHTML = String(html`${SCOPES.map((s) => html`<button type="button" role="radio" data-sc="${s}" aria-checked="${eff === s}" class="${eff === s ? 'is-on' : ''}" ${locked && s !== 'af_studio' ? 'disabled' : ''}>${t('ax.scope.' + s)}</button>`)}`);
    $$('[data-sc]', el).forEach((b) => b.addEventListener('click', () => setScope(b.dataset.sc)));
    const ctx = $('[data-ctx]', el);
    ctx.textContent = t('ax.scope.' + eff); ctx.classList.toggle('is-af', eff === 'af_studio');
    ctx.title = locked ? t('ax.scopeLocked') : t('ax.scopeSwitch');
    ctx.disabled = locked;
    paintWeb();
  }
  function paintWeb() {
    const b = $('[data-web]', el); if (!b) return;
    const allowed = webAdmin && effectiveScope(mode, scope) === 'general';
    const on = allowed && web;
    b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); b.disabled = !allowed;
    b.title = !webAdmin ? t('ax.webOffAdmin') : !allowed ? t('ax.webAfOnly') : on ? t('ax.webOnHint') : t('ax.webOffHint');
    const d = $('[data-disclaimer]', el); if (d) d.textContent = t(on ? 'ax.disclaimerWeb' : 'ax.disclaimer');
  }
  async function setScope(next) {
    if (!SCOPES.includes(next) || next === scope || AF_ONLY.includes(mode)) return;
    const prev = scope; scope = next; paintScope(); paintEmpty();
    if (!conversationId || ephemeral) return; // new chat: applied to the first message
    if (!scopeColumn) { scope = prev; paintScope(); return toast(t('ax.scopeNeedsMigration'), 'err', 7000); }
    const { error } = await supabase.from('ai_conversations').update({ scope: next }).eq('id', conversationId);
    if (error) { scope = prev; paintScope(); return toast(t(/scope/.test(error.message || '') ? 'ax.scopeNeedsMigration' : 'errors.generic'), 'err', 7000); }
    const c = conversations.find((x) => x.id === conversationId); if (c) c.scope = next;
    toast(t('ax.scopeSaved', { scope: t('ax.scope.' + next) }), 'ok', 2200);
  }
  $('[data-ctx]', el).addEventListener('click', () => setScope(scope === 'general' ? 'af_studio' : 'general'));
  $('[data-web]', el).addEventListener('click', () => {
    web = !web; try { localStorage.setItem(WEB_KEY, web ? '1' : '0'); } catch (_) { /* noop */ }
    paintWeb(); toast(t(web ? 'ax.webOn' : 'ax.webOff'), 'info', 1800);
  });

  // ---------------------------------------------------------------- window "traffic lights"
  const onFullKey = (e) => { if (e.key === 'Escape' && document.body.classList.contains('ax-full') && menu.hidden && !document.querySelector('.af-modal')) setFull(false); };
  function setFull(on) {
    document.body.classList.toggle('ax-full', on);
    const g = $('[data-light="full"]', el);
    if (g) { g.setAttribute('aria-pressed', String(on)); g.title = t(on ? 'ax.lightExit' : 'ax.lightFull'); g.setAttribute('aria-label', g.title); }
    if (on) document.addEventListener('keydown', onFullKey); else document.removeEventListener('keydown', onFullKey);
  }
  cleanups.push(() => setFull(false));
  $$('[data-light]', el).forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.light;
    if (a === 'close') {
      setFull(false);
      const prev = sessionStorage.getItem('af.prevRoute');
      if (prev && /^#\/[\w\-/?=&%.]*$/.test(prev)) location.hash = prev; else navigate('/overview');
    }
    if (a === 'side') { if (isMobile()) root.classList.toggle('is-list'); else root.classList.toggle('is-side-hidden'); }
    if (a === 'full') setFull(!document.body.classList.contains('ax-full'));
  }));

  // ---------------------------------------------------------------- mode chip & "+" menu
  function paintMode() {
    const chip = $('[data-mode-chip]', el);
    if (mode === 'chat') chip.innerHTML = '';
    else {
      const label = mode === 'create' ? `${t('ax.create')} · ${t('ax.out.' + (outputType || 'other'))}` : t(mode === 'brief' ? 'ai.modeBrief' : 'ai.modeEstimate');
      chip.innerHTML = String(html`<span class="ax-chip">${label}<button type="button" data-chip-x aria-label="${t('ax.resetMode')}">${raw(IC.x)}</button></span>`);
      $('[data-chip-x]', chip).addEventListener('click', () => setMode('chat'));
    }
    ta.placeholder = mode === 'create' ? t('ax.ph.' + (outputType || 'other')) : mode === 'brief' ? t('ax.phBrief') : mode === 'estimate' ? t('ax.phEstimate') : t('ax.placeholder');
    paintScope();
  }
  function setMode(m, type = null) { mode = m; outputType = m === 'create' ? (OUTPUT_TYPES.includes(type) ? type : 'other') : null; paintMode(); paintEmpty(); ta.focus(); }
  $('[data-plus]', el).addEventListener('click', (e) => {
    e.stopPropagation();
    openMenu(e.currentTarget, [
      { id: 'c', title: t('ax.create'), items: OUTPUT_TYPES.map((o) => ({ label: t('ax.out.' + o), hint: t('ax.outHint.' + o), active: mode === 'create' && outputType === o, onClick: () => setMode('create', o) })) },
      { id: 'm', title: t('ax.modes'), items: [
        { label: t('ai.modeChat'), hint: t('ax.modeChatHint'), active: mode === 'chat', onClick: () => setMode('chat') },
        { label: t('ai.modeBrief'), hint: t('ax.modeAfHint'), active: mode === 'brief', onClick: () => setMode('brief') },
        { label: t('ai.modeEstimate'), hint: t('ax.modeAfHint'), active: mode === 'estimate', onClick: () => setMode('estimate') },
      ] },
    ]);
  });

  // ---------------------------------------------------------------- chat menu (⋯)
  $('[data-chat-menu]', el).addEventListener('click', (e) => {
    e.stopPropagation();
    const items = [{ label: t('ax.aiSettings'), onClick: () => openSettingsCenter({ category: 'ai' }) }];
    if (conversationId && !ephemeral) {
      items.unshift({ label: t('ai.handoff'), hint: t('ax.handoffHint'), onClick: handoff });
      items.push({ label: t('ai.deleteChat'), danger: true, onClick: () => removeConversation(conversationId) });
    }
    openMenu(e.currentTarget, [{ id: 'x', items }]);
  });

  // ---------------------------------------------------------------- history list
  async function loadList() {
    let r = await supabase.from('ai_conversations').select('id,title,updated_at,scope').eq('user_id', auth.user.id).order('updated_at', { ascending: false }).limit(100);
    if (r.error && /scope/.test(r.error.message || '')) { scopeColumn = false; r = await supabase.from('ai_conversations').select('id,title,updated_at').eq('user_id', auth.user.id).order('updated_at', { ascending: false }).limit(100); }
    conversations = (r.data || []).map((c) => ({ ...c, scope: SCOPES.includes(c.scope) ? c.scope : 'af_studio' }));
    if (conversationId) { const c = conversations.find((x) => x.id === conversationId); if (c) { scope = c.scope; paintScope(); } }
    paintList();
  }
  function paintList() {
    const list = $('[data-list]', el); if (!list) return;
    const shown = filterConversations(conversations, search);
    if (!conversations.length) { list.innerHTML = String(html`<p class="ax-list__empty">${t('ax.noChats')}</p>`); return; }
    if (!shown.length) { list.innerHTML = String(html`<p class="ax-list__empty">${t('ax.noFound')}</p>`); return; }
    list.innerHTML = String(html`${groupByDate(shown).map((g) => html`<div class="ax-group"><p>${t('ax.when.' + g.key)}</p>${g.items.map((c) => html`
      <div class="ax-item ${c.id === conversationId ? 'is-on' : ''}">
        <a href="#/ai/${c.id}" data-cid="${c.id}"><span>${c.title}</span>${c.scope === 'af_studio' ? html`<em>AF</em>` : ''}</a>
        <button type="button" class="ax-ib" data-cmenu="${c.id}" aria-label="${t('ax.chatActions')}" aria-haspopup="menu">${raw(IC.dots)}</button>
      </div>`)}</div>`)}`);
    $$('[data-cid]', list).forEach((a) => a.addEventListener('click', () => root.classList.remove('is-list')));
    $$('[data-cmenu]', list).forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation(); const c = conversations.find((x) => x.id === b.dataset.cmenu); if (!c) return;
      const other = c.scope === 'af_studio' ? 'general' : 'af_studio';
      openMenu(b, [{ id: 'k', items: [
        { label: t('ai.rename'), onClick: () => renameConversation(c) },
        { label: t('ax.moveTo', { scope: t('ax.scope.' + other) }), onClick: async () => {
          if (c.id === conversationId) return setScope(other);
          if (!scopeColumn) return toast(t('ax.scopeNeedsMigration'), 'err', 7000);
          const { error } = await supabase.from('ai_conversations').update({ scope: other }).eq('id', c.id);
          if (error) return toast(t('errors.generic'), 'err');
          c.scope = other; paintList(); toast(t('ax.scopeSaved', { scope: t('ax.scope.' + other) }), 'ok', 2200);
        } },
        { label: t('common.delete'), danger: true, onClick: () => removeConversation(c.id) },
      ] }]);
    }));
  }
  $('[data-search]', el).addEventListener('input', (e) => { search = e.target.value; paintList(); });
  async function renameConversation(c) {
    const v = await promptDialog(t('ai.rename'), { value: c.title, maxLength: 120 });
    if (!v || v === c.title) return;
    const { error } = await supabase.from('ai_conversations').update({ title: v.slice(0, 120) }).eq('id', c.id);
    if (error) return toast(t('errors.generic'), 'err');
    c.title = v.slice(0, 120); paintList();
  }
  async function removeConversation(id) {
    if (!(await confirmDialog(t('ai.deleteChat'), t('ai.deleteConfirm'), { danger: true, okLabel: t('common.delete') }))) return;
    const { error } = await supabase.from('ai_conversations').delete().eq('id', id);
    if (error) return toast(t('errors.generic'), 'err');
    conversations = conversations.filter((x) => x.id !== id);
    if (id === conversationId) navigate('/ai'); else paintList();
  }

  // ---------------------------------------------------------------- messages
  const examples = () => (effectiveScope(mode, scope) === 'af_studio' ? ['ex.af1', 'ex.af2', 'ex.af3'] : mode === 'create' ? ['ex.c1', 'ex.c2', 'ex.c3'] : ['ex.g1', 'ex.g2', 'ex.g3']);
  function paintEmpty() {
    if (messages.length) return;
    body.innerHTML = String(html`<div class="ax-empty">
      <h2>${t('ax.emptyTitle')}</h2><p>${t('ax.emptySub')}</p>
      <div class="ax-examples">${examples().map((k) => html`<button type="button" data-ex="${k}">${t('ax.' + k)}</button>`)}</div></div>`);
    $$('[data-ex]', body).forEach((b) => b.addEventListener('click', () => { ta.value = b.textContent; autosize(); ta.focus(); }));
  }
  const lastAssistant = () => { for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'assistant') return i; return -1; };
  function msgHtml(m, i) {
    if (m.role === 'user') return html`<div class="ax-msg ax-msg--user"><div class="ax-bubble">${m.content}</div></div>`;
    const r = renderAnswer(m.content, { t }); m._blocks = r.blocks;
    const isLast = i === lastAssistant();
    const af = effectiveScope(mode, scope) === 'af_studio';
    return html`<article class="ax-msg ax-msg--ai" data-i="${i}">
      <div class="ax-answer af-md">${r.html}</div>
      ${m.truncated ? html`<p class="ax-note">${t('ax.truncated')}</p>` : ''}
      ${sourcesHtml(m.sources)}
      <div class="ax-tools">
        <button type="button" data-act="copy">${icon('copy')}<span>${t('common.copy')}</span></button>
        ${m.id ? html`<button type="button" data-act="save" class="${m.saved ? 'is-on' : ''}">${icon('check')}<span>${t(m.saved ? 'ai.savedResult' : 'ai.saveResult')}</span></button>` : ''}
        <button type="button" data-act="download" aria-haspopup="menu">${raw(IC.dl)}<span>${t('common.download')}</span></button>
        ${isLast ? html`<button type="button" data-act="retry">${raw(IC.retry)}<span>${t('ax.regenerate')}</span></button>` : ''}
        <button type="button" data-act="improve">${raw(IC.wand)}<span>${t('ax.improve')}</span></button>
        ${isLast ? html`<button type="button" data-act="continue">${raw(IC.next)}<span>${t('ax.continue')}</span></button>` : ''}
        ${af ? html`<button type="button" data-act="builder">${icon('builder')}<span>${t('ai.toBuilder')}</span></button>` : ''}
      </div></article>`;
  }
  function sourcesHtml(src) {
    const items = (src?.items || []).map((x) => ({ title: String(x?.title || '').slice(0, 120), url: safeSourceUrl(x?.url) })).filter((x) => x.url);
    const queries = (src?.queries || []).map((q) => String(q).slice(0, 160)).filter(Boolean).slice(0, 5);
    if (!items.length && !queries.length) return '';
    return html`<div class="ax-sources">
      ${items.length ? html`<p>${raw(IC.globe)}<span>${t('ax.sources')}</span></p><div class="ax-src">${items.map((x, i) => html`<a href="${x.url}" target="_blank" rel="noopener noreferrer nofollow" title="${x.title}"><b>${i + 1}</b><span>${x.title}</span></a>`)}</div>` : ''}
      ${queries.length ? html`<div class="ax-queries"><small>${t('ax.searchedFor')}</small>${queries.map((q) => html`<a href="https://www.google.com/search?q=${encodeURIComponent(q)}" target="_blank" rel="noopener noreferrer nofollow">${q}</a>`)}</div>` : ''}
    </div>`;
  }
  function paint() {
    if (!messages.length) return paintEmpty();
    body.innerHTML = String(html`${messages.map((m, i) => msgHtml(m, i))}`);
    bindTools(body);
    body.scrollTop = body.scrollHeight;
  }
  function titleOf(m) { const firstUser = messages.find((x) => x.role === 'user'); return (firstUser?.content || m.content).split('\n')[0].slice(0, 40); }
  function bindTools(scopeEl) {
    $$('.ax-msg--ai', scopeEl).forEach((art) => {
      const i = +art.dataset.i; const m = messages[i];
      $$('[data-act]', art).forEach((b) => b.addEventListener('click', async (e) => {
        const a = b.dataset.act;
        if (a === 'copy') { try { await navigator.clipboard.writeText(m.content); toast(t('common.copied'), 'ok', 1500); } catch { toast(t('errors.generic'), 'err'); } }
        if (a === 'save') {
          const v = !m.saved;
          const { error } = await supabase.from('ai_messages').update({ saved: v }).eq('id', m.id);
          if (error) return toast(t('errors.generic'), 'err');
          m.saved = v; b.classList.toggle('is-on', v); b.querySelector('span').textContent = t(v ? 'ai.savedResult' : 'ai.saveResult');
        }
        if (a === 'download') {
          e.stopPropagation();
          openMenu(b, [{ id: 'd', title: t('ax.downloadAs'), items: [
            { label: t('ax.dlMd'), hint: '.md', onClick: () => downloadText(m.content.trim() + '\n', safeFileName(titleOf(m), 'md')) },
            { label: t('ax.dlTxt'), hint: '.txt', onClick: () => downloadText(toPlainText(m.content), safeFileName(titleOf(m), 'txt')) },
          ] }]);
        }
        if (a === 'retry') regenerate();
        if (a === 'improve') { ta.value = t('ax.improvePrefix'); autosize(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
        if (a === 'continue') { ta.value = t('ax.continuePrompt'); send(); }
        if (a === 'builder') {
          const d = (await getDraft().catch(() => null)) || {};
          d.styleNote = [d.styleNote, m.content].filter(Boolean).join('\n\n').slice(0, 6000); d.aiSpec = m.content.slice(0, 8000);
          await saveDraft(d).catch(() => {}); navigate('/builder');
        }
      }));
      $$('[data-code-copy]', art).forEach((b) => b.addEventListener('click', async () => {
        const blk = m._blocks?.[+b.dataset.codeCopy]; if (!blk) return;
        try { await navigator.clipboard.writeText(blk.code); b.textContent = t('common.copied'); setTimeout(() => { b.textContent = t('ax.copyCode'); }, 1400); } catch { toast(t('errors.generic'), 'err'); }
      }));
      $$('[data-code-dl]', art).forEach((b) => b.addEventListener('click', () => {
        const blk = m._blocks?.[+b.dataset.codeDl]; if (!blk) return;
        const ext = extFor(blk.lang);
        downloadText(blk.code.replace(/\s+$/, '') + '\n', safeFileName(ext === 'html' ? 'component' : titleOf(m), ext));
      }));
    });
  }

  async function loadConversation() {
    if (!conversationId) { messages = []; paint(); return; }
    body.innerHTML = '<div class="ax-loading"><div class="af-skel af-skel-row"></div><div class="af-skel af-skel-row"></div></div>';
    let { data, error } = await supabase.from('ai_messages').select('id,role,content,saved,created_at,sources').eq('conversation_id', conversationId).order('id');
    if (error && /sources/.test(error.message || '')) ({ data, error } = await supabase.from('ai_messages').select('id,role,content,saved,created_at').eq('conversation_id', conversationId).order('id'));
    if (error || !data) { body.innerHTML = String(html`<div class="ax-empty"><h2>${t('errors.not_found')}</h2><p><a class="af-link" href="#/ai">${t('ax.newChat')}</a></p></div>`); return; }
    messages = data; paint();
  }

  // ---------------------------------------------------------------- quota gate (server numbers only)
  function applyGate(u) {
    blocked = null; let msg = ''; let kind = 'info';
    if (u) {
      if (u.enabled === false) { blocked = 'disabled'; msg = t('errors.ai_disabled'); kind = 'err'; }
      else if (u.daily.remaining === 0) { blocked = 'daily'; kind = 'err'; msg = t('usage.gateDaily', { time: u.daily.reset_in != null ? fmtDuration(u.daily.reset_in, getLang()) : '—' }); }
      else if (u.minute && u.minute.remaining === 0 && u.minute.retry_after > 0) { blocked = 'minute'; kind = 'warn'; msg = t('usage.gateMinute', { time: fmtDuration(u.minute.retry_after, getLang()) }); }
      else if (u.daily.remaining <= 3) { kind = 'warn'; msg = t('usage.gateLow', { n: u.daily.remaining }); }
    }
    gate.hidden = !msg; gate.className = `ax-gate ax-gate--${kind}`; gate.textContent = msg;
    sendBtn.disabled = busy || !!blocked; sendBtn.title = blocked ? msg : '';
  }
  const usageEl = $('[data-usage]', el);
  cleanups.push(mountUsage(usageEl, { variant: 'compact', extended: () => getPreferences().ai.extended_stats !== false, pollMs: 45000, maxAge: 0, onState: (u) => { applyGate(u); const w = u?.web_search !== false; if (u && w !== webAdmin) { webAdmin = w; paintWeb(); } } }));
  const openUsage = () => openSettingsCenter({ category: 'ai', focus: 'ai.usage_daily' });
  usageEl.addEventListener('click', (e) => { if (!e.target.closest('[data-um-retry]')) openUsage(); });
  usageEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openUsage(); } });
  $('[data-ai-prefs]', el)?.addEventListener('click', () => openSettingsCenter({ category: 'ai', focus: 'ai.save_history' }));

  // ---------------------------------------------------------------- send / regenerate
  const typing = () => {
    const searching = web && webAdmin && effectiveScope(mode, scope) === 'general';
    body.insertAdjacentHTML('beforeend', `<div class="ax-msg ax-msg--ai" data-typing><div class="ax-typing" aria-label="${t('ai.thinking')}"><i></i><i></i><i></i>${searching ? `<span>${t('ax.thinkingWeb')}</span>` : ''}</div></div>`);
  };
  async function send({ regen = false } = {}) {
    const q = ta.value.trim();
    if (!q || busy || blocked) return;
    busy = true; sendBtn.disabled = true;
    const snapshot = messages.slice();
    if (!messages.length) body.innerHTML = '';
    messages.push({ role: 'user', content: q });
    if (regen) paint(); else body.insertAdjacentHTML('beforeend', String(msgHtml(messages[messages.length - 1], messages.length - 1)));
    typing(); body.scrollTop = body.scrollHeight;
    ta.value = ''; autosize();
    const usedMode = mode; const usedType = outputType;
    try {
      const payload = { message: q, mode: usedMode, lang: getLang(), scope }; // ТЗ / смета are switched to AF STUDIO on the server automatically
      if (usedMode === 'create') payload.output_type = usedType || 'other';
      payload.web = web && webAdmin;
      if (!ephemeral && conversationId) payload.conversation_id = conversationId;
      if (regen && !ephemeral && conversationId) payload.regenerate = true;
      if (ephemeral) payload.history = messages.slice(0, -1).slice(-12).map((m) => ({ role: m.role, content: String(m.content).slice(0, 8000) }));
      const res = await callFunction('ai-chat', payload);
      if (res.quota) setUsage(res.quota); else fetchUsage();
      const srcMeta = res.web && (res.web.sources?.length || res.web.queries?.length) ? { items: res.web.sources || [], queries: res.web.queries || [] } : null;
      if (res.ephemeral || !res.conversation_id) {
        messages = [...messages, { role: 'assistant', content: res.reply, truncated: res.truncated, sources: srcMeta }];
        paint();
      } else {
        const isNew = !conversationId;
        conversationId = res.conversation_id;
        if (isNew) history.replaceState(null, '', '#/ai/' + conversationId);
        const { data } = await supabase.from('ai_messages').select('id,role,content,saved').eq('conversation_id', conversationId).order('id');
        messages = data && data.length ? data : [...messages, { role: 'assistant', content: res.reply }];
        if (messages.length) { const last = messages[messages.length - 1]; if (res.truncated) last.truncated = true; if (srcMeta) last.sources = srcMeta; }
        paint(); loadList();
      }
    } catch (e) {
      const code = e.code || 'generic';
      messages = snapshot; $('[data-typing]', body)?.remove();
      const known = ['ai_disabled', 'ai_not_configured', 'daily_limit', 'rate_limited', 'provider_busy', 'provider_error', 'provider_timeout', 'too_long', 'network', 'server_config', 'bad_output_type', 'bad_scope', 'bad_mode'];
      const key = known.includes(code) ? (code.startsWith('bad_') ? 'ax.err.' + code : 'errors.' + code) : 'errors.generic';
      const tech = key === 'errors.generic' || key === 'errors.server_config' ? ` [${e.status || ''} ${code}${e.detail ? ': ' + e.detail : ''}]` : '';
      if (e.details?.quota) setUsage(e.details.quota); else if (['daily_limit', 'rate_limited', 'ai_disabled'].includes(code)) fetchUsage();
      toast(t(key, { limit: e.details?.limit || '' }) + tech + (e.details?.refunded ? ' ' + t('usage.refunded') : ''), 'err', code === 'rate_limited' ? 5000 : 12000);
      ta.value = q; autosize(); paint(); // the question is never lost
    } finally { busy = false; sendBtn.disabled = !!blocked; ta.focus(); }
  }
  function regenerate() {
    const ai = lastAssistant(); if (ai < 1 || busy) return;
    const q = messages[ai - 1]?.role === 'user' ? messages[ai - 1].content : null; if (!q) return;
    messages = messages.slice(0, ai - 1);
    ta.value = q; send({ regen: true });
  }
  async function handoff() {
    if (!conversationId || !(await confirmDialog(t('ai.handoff'), t('ai.handoffConfirm')))) return;
    try { const r = await callFunction('ai-chat', { action: 'handoff', conversation_id: conversationId, lang: getLang() }); toast(t('ai.handoffDone'), 'ok', 5000); navigate('/messages/' + r.thread_id); }
    catch (err) { toast(t('errors.' + (err.code || 'generic')), 'err'); }
  }

  const autosize = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 220) + 'px'; };
  ta.addEventListener('input', autosize);
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
  form.addEventListener('submit', (e) => { e.preventDefault(); send(); });
  $('[data-new]', el).addEventListener('click', () => { root.classList.remove('is-list'); navigate('/ai'); });
  $('[data-toggle-list]', el).addEventListener('click', () => root.classList.toggle('is-list'));
  const onCleared = () => { conversations = []; paintList(); };
  window.addEventListener('af:ai-history-cleared', onCleared);
  cleanups.push(() => window.removeEventListener('af:ai-history-cleared', onCleared));

  paintMode();
  await Promise.all([loadList(), loadConversation()]);
  if (!isMobile()) ta.focus({ preventScroll: true });
  if (!reducedMotion()) root.classList.add('is-ready');
  return () => cleanups.forEach((fn) => { try { fn(); } catch (_) { /* noop */ } });
}
