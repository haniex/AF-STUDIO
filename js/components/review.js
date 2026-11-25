// Review & Revision system: render viewer with pinned markers, threaded comments,
// approval / change requests. Used by the client (project page) and the admin panel.
import { t } from '../core/i18n.js';
import { html, icon, fmtDateTime, toast, confirmDialog, promptDialog, emptyState, $, $$, setBusy } from '../core/ui.js';
import { supabase, signedUrl } from '../lib/supabase.js';
import { auth } from '../core/auth.js';

export async function mountReview(el, { projectId, isAdmin = false, onNewRound } = {}) {
  el.innerHTML = '<div class="af-skel af-skel-card"></div>';
  const { data: rounds, error } = await supabase.from('review_rounds').select('*').eq('project_id', projectId).order('version', { ascending: false });
  if (error) { el.innerHTML = String(emptyState(t('errors.not_found'))); return () => {}; }
  if (!rounds.length) {
    el.innerHTML = String(html`${emptyState(t('projects.noRounds'))}${isAdmin && onNewRound ? html`<div class="af-row" style="justify-content:center"><button type="button" class="af-btn af-btn--gold" data-new-round>${icon('upload')}<span>${t('common.upload')}</span></button></div>` : ''}`);
    $('[data-new-round]', el)?.addEventListener('click', onNewRound);
    return () => {};
  }
  let round = rounds[0]; let comments = []; let marking = false; let pending = null; let channel = null; let alive = true;

  el.innerHTML = String(html`
    <div class="rv-rounds" data-rounds></div>
    <div class="rv">
      <div>
        <div class="af-row af-row--between" style="margin-bottom:10px">
          <div class="af-row"><b data-title></b><span data-status></span></div>
          <div class="af-row">
            <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-mark aria-pressed="false">${icon('pin')}<span>${t('projects.markerMode')}</span></button>
            ${isAdmin && onNewRound ? html`<button type="button" class="af-btn af-btn--ghost af-btn--sm" data-new-round>${icon('upload')}<span>${t('common.upload')}</span></button>` : ''}
          </div>
        </div>
        <div class="rv-stage" data-stage><img data-img alt="" /></div>
        <p class="af-muted" style="font-size:12.5px;margin-top:8px" data-hint>${t('projects.addMarker')}</p>
      </div>
      <aside class="af-card">
        <div data-decision></div>
        <div class="rv-comments" data-comments></div>
        <form data-form style="margin-top:12px">
          <div data-pending></div>
          <label class="af-field" style="margin-bottom:8px"><textarea rows="3" maxlength="3000" placeholder="${t('projects.commentPh')}" aria-label="${t('projects.commentPh')}"></textarea></label>
          <button type="submit" class="af-btn af-btn--primary af-btn--sm">${icon('send')}<span>${t('common.send')}</span></button>
        </form>
      </aside>
    </div>`);
  $('[data-new-round]', el)?.addEventListener('click', onNewRound);
  const stage = $('[data-stage]', el); const img = $('[data-img]', el); const form = $('[data-form]', el); const ta = $('textarea', form);

  function paintRounds() {
    $('[data-rounds]', el).innerHTML = String(html`${rounds.map((r) => html`<button type="button" class="af-chip ${r.id === round.id ? 'is-on' : ''}" data-r="${r.id}">${t('projects.version', { v: r.version })}</button>`)}`);
    $$('[data-r]', el).forEach((b) => b.addEventListener('click', () => { round = rounds.find((r) => r.id === b.dataset.r); openRound(); }));
  }
  const statusPill = (s) => html`<span class="af-pill af-pill--${s}">${t(s === 'approved' ? 'projects.approved' : s === 'changes_requested' ? 'projects.changesRequested' : 'projects.pending')}</span>`;

  async function openRound() {
    paintRounds(); pending = null; paintPending();
    $('[data-title]', el).textContent = round.title;
    $('[data-status]', el).innerHTML = String(statusPill(round.status));
    img.src = await signedUrl('project-files', round.image_path);
    img.alt = round.title;
    const { data } = await supabase.from('review_comments').select('*').eq('round_id', round.id).order('created_at');
    comments = data || [];
    paintComments(); paintDecision();
    if (channel) supabase.removeChannel(channel);
    channel = supabase.channel('rc-' + round.id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'review_comments', filter: `round_id=eq.${round.id}` }, (p) => {
      if (!comments.some((c) => c.id === p.new.id)) { comments.push(p.new); paintComments(); }
    }).subscribe();
  }

  function paintDecision() {
    const box = $('[data-decision]', el);
    if (isAdmin || round.status !== 'pending') { box.innerHTML = round.decided_at ? String(html`<p class="af-muted" style="font-size:12.5px;margin-bottom:10px">${statusPill(round.status)} · ${fmtDateTime(round.decided_at)}</p>`) : ''; return; }
    box.innerHTML = String(html`<div class="af-row" style="margin-bottom:14px">
      <button type="button" class="af-btn af-btn--gold af-btn--sm" data-approve>${icon('check')}<span>${t('projects.approve')}</span></button>
      <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-changes>${t('projects.requestChanges')}</button></div>`);
    $('[data-approve]', box).addEventListener('click', async (e) => {
      if (!(await confirmDialog(t('projects.approve'), t('projects.approveConfirm')))) return;
      await decide('approved', null, e.currentTarget);
    });
    $('[data-changes]', box).addEventListener('click', async (e) => {
      const note = await promptDialog(t('projects.requestChanges'), { label: t('projects.changesPh'), multiline: true, maxLength: 3000 });
      if (note) await decide('changes_requested', note, e.currentTarget);
    });
  }
  async function decide(decision, note, btn) {
    setBusy(btn, true);
    const { error } = await supabase.rpc('decide_review_round', { p_round: round.id, p_decision: decision, p_note: note });
    if (error) { setBusy(btn, false); return toast(t(String(error.message).includes('already_decided') ? 'errors.already_decided' : 'errors.generic'), 'err'); }
    round.status = decision; round.decided_at = new Date().toISOString();
    toast(t(decision === 'approved' ? 'projects.approved' : 'projects.changesRequested'), 'ok');
    openRound();
  }

  function markerNumbers() { let n = 0; const map = {}; comments.filter((c) => !c.parent_id && c.x !== null).forEach((c) => { map[c.id] = ++n; }); return map; }
  function paintComments() {
    const nums = markerNumbers();
    $$('.rv-marker', stage).forEach((m) => m.remove());
    comments.filter((c) => nums[c.id]).forEach((c) => {
      const m = document.createElement('button'); m.type = 'button';
      m.className = 'rv-marker' + (c.from_admin ? ' rv-marker--admin' : ''); m.style.left = c.x * 100 + '%'; m.style.top = c.y * 100 + '%';
      m.innerHTML = `<span>${nums[c.id]}</span>`; m.dataset.cid = c.id; m.setAttribute('aria-label', `#${nums[c.id]}`);
      m.addEventListener('click', (e) => { e.stopPropagation(); highlight(c.id, true); });
      stage.appendChild(m);
    });
    const roots = comments.filter((c) => !c.parent_id);
    const box = $('[data-comments]', el);
    box.innerHTML = roots.length ? String(html`${roots.map((c) => html`
      <div class="rv-c ${c.from_admin ? 'rv-c--admin' : ''}" data-c="${c.id}">
        <header><span>${nums[c.id] ? html`<span class="rv-c__n">${nums[c.id]}</span>` : ''}<b>${c.from_admin ? t('projects.studio') : (isAdmin ? t('nav.profile') : t('projects.you'))}</b></span><time>${fmtDateTime(c.created_at)}</time></header>
        <p>${c.body}</p>
        ${comments.filter((r) => r.parent_id === c.id).map((r) => html`<div class="rv-c rv-c--reply ${r.from_admin ? 'rv-c--admin' : ''}"><header><b>${r.from_admin ? t('projects.studio') : (isAdmin ? t('nav.profile') : t('projects.you'))}</b><time>${fmtDateTime(r.created_at)}</time></header><p>${r.body}</p></div>`)}
        <button type="button" class="af-link" data-reply="${c.id}" style="justify-self:start">${t('projects.reply')}</button>
      </div>`)}`) : `<p class="af-muted" style="font-size:13px">${t('projects.addMarker')}</p>`;
    $$('[data-c]', box).forEach((c) => c.addEventListener('mouseenter', () => highlight(c.dataset.c)));
    $$('[data-reply]', box).forEach((b) => b.addEventListener('click', async () => {
      const text = await promptDialog(t('projects.reply'), { multiline: true, maxLength: 3000 });
      if (text) post({ body: text, parent_id: b.dataset.reply });
    }));
  }
  function highlight(id, scroll) {
    $$('.rv-marker', stage).forEach((m) => m.classList.toggle('is-hot', m.dataset.cid === id));
    if (scroll) $(`[data-c="${id}"]`, el)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function paintPending() {
    $$('.rv-marker--new', stage).forEach((m) => m.remove());
    $('[data-pending]', el).innerHTML = pending ? String(html`<p class="af-pill af-pill--plain" style="margin-bottom:8px">${icon('pin')} ${Math.round(pending.x * 100)}% · ${Math.round(pending.y * 100)}%</p>`) : '';
    if (pending) {
      const m = document.createElement('span'); m.className = 'rv-marker rv-marker--new'; m.style.left = pending.x * 100 + '%'; m.style.top = pending.y * 100 + '%'; m.innerHTML = '<span>+</span>';
      stage.appendChild(m);
    }
  }
  stage.addEventListener('click', (e) => {
    if (!marking || e.target.closest('.rv-marker')) return;
    const r = img.getBoundingClientRect();
    pending = { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
    paintPending(); ta.focus();
  });
  $('[data-mark]', el).addEventListener('click', (e) => {
    marking = !marking; stage.classList.toggle('is-marking', marking);
    e.currentTarget.setAttribute('aria-pressed', marking); e.currentTarget.classList.toggle('af-btn--primary', marking);
    if (!marking) { pending = null; paintPending(); }
  });

  async function post({ body, parent_id = null, x = null, y = null }) {
    const { data, error } = await supabase.from('review_comments').insert({ round_id: round.id, author_id: auth.user.id, body: body.slice(0, 3000), parent_id, x, y }).select().single();
    if (error) { toast(t('errors.generic'), 'err'); return false; }
    if (!comments.some((c) => c.id === data.id)) comments.push(data);
    paintComments(); return true;
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = ta.value.trim(); if (!text) return;
    const btn = $('button[type=submit]', form); setBusy(btn, true);
    const ok = await post({ body: text, x: pending?.x ?? null, y: pending?.y ?? null });
    setBusy(btn, false);
    if (ok) { ta.value = ''; pending = null; paintPending(); }
  });

  await openRound();
  return () => { alive = false; if (channel) supabase.removeChannel(channel); };
}
