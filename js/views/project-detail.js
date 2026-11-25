import { t, loc } from '../core/i18n.js';
import { html, icon, md, fmtDate, fmtDateTime, fmtMoney, fmtSize, projectNo, reveal, toast, confirmDialog, emptyState, errorState, skeleton, $, $$, setBusy } from '../core/ui.js';
import { supabase, signedUrl, signedUrls } from '../lib/supabase.js';
import { auth } from '../core/auth.js';
import { getProject, getServices, projectHistory, listFiles, uploadFile, deleteFile } from '../core/api.js';
import { mountChat } from '../components/chat.js';
import { mountReview } from '../components/review.js';
import { STATUSES } from './projects.js';

const TABS = ['overview', 'files', 'review', 'messages', 'history'];

export async function render(el, { params, query }) {
  el.innerHTML = String(skeleton(1, 'af-skel-card'));
  let p, services;
  try { [p, services] = await Promise.all([getProject(params.id), getServices()]); } catch { el.innerHTML = String(errorState()); return; }
  if (!p) { el.innerHTML = String(emptyState(t('errors.not_found'), '', html`<a class="af-btn af-btn--ghost" href="#/projects">${t('projects.title')}</a>`)); return; }
  const svc = services.find((s) => s.id === p.service_id);
  let tab = TABS.includes(query.tab) ? query.tab : 'overview';
  let cleanup = null;
  const idx = STATUSES.indexOf(p.status);

  el.innerHTML = String(html`
    <a class="af-link" href="#/projects">← ${t('projects.title')}</a>
    <header class="pr-head" style="margin-top:16px" data-reveal>
      <div><span class="pr-no">${projectNo(p.number)} · ${loc(svc, 'title') || '—'}</span><h2>${p.title}</h2>
        <p class="af-muted" style="font-size:13px;margin-top:4px">${t('projects.created')} ${fmtDate(p.created_at)} · ${t('projects.updated')} ${fmtDate(p.updated_at)}</p></div>
      <span class="af-pill af-pill--${p.status}" style="font-size:13px;padding:7px 14px">${t('status.' + p.status)}</span>
    </header>
    <div class="pr-steps" aria-label="${t('projects.history')}">${STATUSES.map((s, i) => html`<div class="${i < idx ? 'is-done' : ''} ${i === idx ? 'is-on' : ''}"><i></i><span>${t('status.' + s)}</span></div>`)}</div>
    <nav class="af-tabs" role="tablist">${TABS.map((k) => html`<button type="button" role="tab" data-tab="${k}" aria-selected="${k === tab}" class="${k === tab ? 'is-on' : ''}">${t('projects.tab' + k[0].toUpperCase() + k.slice(1))}</button>`)}</nav>
    <section data-pane></section>`);
  reveal(el);
  const pane = $('[data-pane]', el);

  async function open(k) {
    tab = k;
    if (typeof cleanup === 'function') cleanup(); cleanup = null;
    $$('[data-tab]', el).forEach((b) => { b.classList.toggle('is-on', b.dataset.tab === k); b.setAttribute('aria-selected', b.dataset.tab === k); });
    history.replaceState(null, '', `#/projects/${p.id}${k === 'overview' ? '' : '?tab=' + k}`);
    pane.innerHTML = String(skeleton(1, 'af-skel-card'));
    if (k === 'overview') return paintOverview();
    if (k === 'files') return paintFiles();
    if (k === 'review') { pane.innerHTML = ''; const box = document.createElement('div'); pane.appendChild(box); cleanup = await mountReview(box, { projectId: p.id }); return; }
    if (k === 'messages') return paintMessages();
    if (k === 'history') return paintHistory();
  }
  $$('[data-tab]', el).forEach((b) => b.addEventListener('click', () => open(b.dataset.tab)));

  // ---------------------------------------------------------- overview
  async function paintOverview() {
    const { data: boards } = await supabase.from('moodboards').select('id,title,updated_at').eq('project_id', p.id);
    const e = p.estimate;
    pane.innerHTML = String(html`<div class="pd-body">
      <div class="af-card"><h3 class="af-h3">${t('projects.spec')}</h3><div class="af-md">${md(p.spec_md || '—')}</div></div>
      <aside class="pd-side" style="position:static">
        <div class="af-card"><h4>${t('projects.budget')}</h4><p>${p.budget || '—'}</p>
          <h4 style="margin-top:14px">${t('projects.deadline')}</h4><p>${p.deadline ? fmtDate(p.deadline) : '—'}</p>
          ${e ? html`<h4 style="margin-top:14px">${t('projects.estimate')}</h4><p>${fmtMoney(e.min, e.currency)} – ${fmtMoney(e.max, e.currency)}</p><small class="af-muted">${t('calc.days', { a: e.daysMin, b: e.daysMax })}</small>` : ''}</div>
        <div class="af-card"><h4>${t('projects.moodboards')}</h4>
          ${(boards || []).length ? html`<div class="ov-list">${boards.map((b) => html`<a href="#/moodboard/${b.id}"><span class="ov-list__main"><b>${b.title}</b><small>${fmtDate(b.updated_at)}</small></span>${icon('arrowR')}</a>`)}</div>`
            : html`<p class="af-muted" style="font-size:13px">—</p><a class="af-link" href="#/moodboard">${t('mood.newBoard')}</a>`}</div>
      </aside></div>`);
  }

  // ---------------------------------------------------------- files
  async function paintFiles() {
    const files = await listFiles({ projectId: p.id });
    const imgs = files.filter((f) => f.mime.startsWith('image/'));
    const thumbs = await signedUrls('project-files', imgs.map((f) => f.path));
    pane.innerHTML = String(html`<div class="af-card">
      <div class="af-card__head"><h3>${t('projects.tabFiles')}</h3>
        <label class="af-btn af-btn--ghost af-btn--sm">${icon('upload')}<span>${t('projects.uploadRef')}</span><input type="file" multiple hidden data-up /></label></div>
      ${files.length ? html`<div class="pr-files">${files.map((f) => fileRow(f, thumbs[f.path]))}</div>` : emptyState(t('projects.noFiles'))}</div>`);
    $('[data-up]', pane).addEventListener('change', async (e) => {
      const list = Array.from(e.target.files || []); if (!list.length) return;
      const lbl = e.target.closest('label'); setBusy(lbl, true);
      for (const f of list) {
        try { await uploadFile(f, { folder: p.id, projectId: p.id, kind: f.type.startsWith('image/') ? 'reference' : 'material' }); }
        catch (err) { toast(t(err.i18n || 'errors.generic', { mb: err.mb }), 'err'); }
      }
      paintFiles();
    });
    bindFileRows(pane, files, paintFiles);
  }

  // ---------------------------------------------------------- messages
  async function paintMessages() {
    let { data: th } = await supabase.from('threads').select('id').eq('project_id', p.id).order('created_at').limit(1).maybeSingle();
    if (!th) {
      const r = await supabase.from('threads').insert({ client_id: auth.user.id, project_id: p.id, subject: p.title.slice(0, 160) }).select('id').single();
      th = r.data;
    }
    if (!th) { pane.innerHTML = String(errorState()); return; }
    pane.innerHTML = '<div class="msg" style="grid-template-columns:1fr"><div class="msg-pane" data-chat></div></div>';
    pane.querySelector('.msg').classList.add('has-thread');
    cleanup = mountChat($('[data-chat]', pane), th.id);
  }

  // ---------------------------------------------------------- history
  async function paintHistory() {
    const rows = await projectHistory(p.id);
    pane.innerHTML = String(html`<div class="af-card"><h3 class="af-h3">${t('projects.history')}</h3><ol class="pr-timeline">${rows.map((r) => html`
      <li><b>${t('status.' + r.to_status)}</b>${r.note ? html`<p style="font-size:13.5px;margin-top:2px">${r.note}</p>` : ''}<small>${fmtDateTime(r.created_at)}</small></li>`)}</ol></div>`);
  }

  await open(tab);
  return () => { if (typeof cleanup === 'function') cleanup(); };
}

export function fileRow(f, thumb, { showProject = '' } = {}) {
  const locked = f.kind === 'final' || f.kind === 'render' || f.uploaded_by !== auth.user.id;
  return html`<div class="pr-file" data-file="${f.id}">
    <span class="pr-file__ico">${thumb ? html`<img src="${thumb}" alt="" loading="lazy" />` : icon('files')}</span>
    <span class="pr-file__main"><b>${f.name}</b><small>${t('files.kinds.' + f.kind)} · ${fmtSize(f.size)} · ${fmtDate(f.created_at)}${showProject ? ' · ' + showProject : ''}</small></span>
    ${f.kind === 'final' ? html`<span class="af-pill af-pill--done" title="${t('files.protected')}">${icon('lock')} ${t('projects.finalBadge')}</span>` : ''}
    <button type="button" class="af-icon-btn" data-dl="${f.id}" aria-label="${t('common.download')}">${icon('download')}</button>
    ${locked ? '' : html`<button type="button" class="af-icon-btn" data-rm="${f.id}" aria-label="${t('common.delete')}">${icon('trash')}</button>`}
  </div>`;
}

export function bindFileRows(root, files, refresh) {
  $$('[data-dl]', root).forEach((b) => b.addEventListener('click', async () => {
    const f = files.find((x) => x.id === b.dataset.dl);
    const url = await signedUrl('project-files', f.path, { download: f.name });
    if (url) window.open(url, '_blank', 'noopener'); else toast(t('errors.generic'), 'err');
  }));
  $$('[data-rm]', root).forEach((b) => b.addEventListener('click', async () => {
    const f = files.find((x) => x.id === b.dataset.rm);
    if (!(await confirmDialog(t('common.delete'), t('files.deleteConfirm', { name: f.name }), { danger: true, okLabel: t('common.delete') }))) return;
    try { await deleteFile(f); toast(t('common.saved'), 'ok', 1500); refresh(); } catch { toast(t('errors.forbidden'), 'err'); }
  }));
}
