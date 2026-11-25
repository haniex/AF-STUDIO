import { t, loc } from '../core/i18n.js';
import { html, icon, md, fmtDate, fmtDateTime, fmtMoney, projectNo, toast, modal, emptyState, errorState, skeleton, debounce, uid, $, $$, setBusy } from '../core/ui.js';
import { supabase, signedUrls } from '../lib/supabase.js';
import { auth } from '../core/auth.js';
import { getServices, validateFile } from '../core/api.js';
import { STATUSES } from '../views/projects.js';
import { fileRow, bindFileRows } from '../views/project-detail.js';
import { mountChat } from '../components/chat.js';
import { mountReview } from '../components/review.js';
import { a } from './i18n.js';

export async function render(el, { params, query }) {
  return params.id ? detail(el, params.id) : list(el, query);
}

// ---------------------------------------------------------------------
async function list(el, query) {
  let status = query.status || 'all'; let q = '';
  el.innerHTML = String(html`<div class="af-row" style="margin-bottom:14px"><input class="af-input" data-q placeholder="${t('common.search')}" style="max-width:340px" />
    <div class="af-chips" data-st>${['all', ...STATUSES].map((s) => html`<button type="button" class="af-chip" data-s="${s}">${s === 'all' ? a('all') : t('status.' + s)}</button>`)}</div></div>
    <div class="af-table-wrap"><table class="af-table"><thead><tr><th>№</th><th>${t('builder.objectName')}</th><th>${a('client2')}</th><th>${t('projects.service')}</th><th>${t('projects.created')}</th><th>${t('projects.deadline')}</th><th>Status</th></tr></thead><tbody data-rows></tbody></table></div>`);
  const services = await getServices().catch(() => []);
  const svc = Object.fromEntries(services.map((s) => [s.id, s]));
  async function load() {
    $$('[data-s]', el).forEach((b) => b.classList.toggle('is-on', b.dataset.s === status));
    let req = supabase.from('projects').select('id,number,title,status,service_id,created_at,deadline,client_id,contact').order('created_at', { ascending: false }).limit(200);
    if (status !== 'all') req = req.eq('status', status);
    if (query.client) req = req.eq('client_id', query.client);
    if (q) req = /^\d+$/.test(q.replace(/^AF-0*/i, '')) ? req.eq('number', +q.replace(/^AF-0*/i, '')) : req.ilike('title', `%${q}%`);
    const { data, error } = await req;
    if (error) { $('[data-rows]', el).innerHTML = `<tr><td colspan="7">${String(errorState(error.message))}</td></tr>`; return; }
    $('[data-rows]', el).innerHTML = data.length ? String(html`${data.map((p) => html`<tr data-href="#/projects/${p.id}" style="cursor:pointer">
      <td><b>${projectNo(p.number)}</b></td><td>${p.title}</td><td>${p.contact?.name || '—'}<br /><small class="af-muted">${p.contact?.email || ''}</small></td>
      <td>${loc(svc[p.service_id], 'title') || '—'}</td><td>${fmtDate(p.created_at)}</td><td>${p.deadline ? fmtDate(p.deadline) : '—'}</td>
      <td><span class="af-pill af-pill--${p.status}">${t('status.' + p.status)}</span></td></tr>`)}`) : `<tr><td colspan="7">${String(emptyState(a('empty')))}</td></tr>`;
    $$('[data-href]', el).forEach((r) => r.addEventListener('click', () => { location.hash = r.dataset.href; }));
  }
  $$('[data-s]', el).forEach((b) => b.addEventListener('click', () => { status = b.dataset.s; load(); }));
  $('[data-q]', el).addEventListener('input', debounce((e) => { q = e.target.value.trim(); load(); }, 350));
  load();
}

// ---------------------------------------------------------------------
async function detail(el, id) {
  el.innerHTML = String(skeleton(1, 'af-skel-card'));
  const [{ data: p, error }, services] = await Promise.all([supabase.from('projects').select('*').eq('id', id).maybeSingle(), getServices().catch(() => [])]);
  if (error || !p) { el.innerHTML = String(emptyState(t('errors.not_found'))); return; }
  const { data: client } = await supabase.from('profiles').select('id,email,full_name,created_at').eq('id', p.client_id).maybeSingle();
  const svc = services.find((s) => s.id === p.service_id);
  let cleanup = null; let tab = 'overview';

  el.innerHTML = String(html`<a class="af-link" href="#/projects">← ${a('nav.projects')}</a>
    <header class="pr-head" style="margin-top:14px"><div><span class="pr-no">${projectNo(p.number)} · ${loc(svc, 'title') || '—'}</span><h2>${p.title}</h2>
      <p class="af-muted" style="font-size:13px">${client?.full_name || ''} · ${client?.email || ''} · ${fmtDateTime(p.created_at)}</p></div>
      <div class="af-row"><span class="af-pill af-pill--${p.status}" data-pill>${t('status.' + p.status)}</span>
        <button type="button" class="af-btn af-btn--gold af-btn--sm" data-status>${a('changeStatus')}</button>
        <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-edit>${a('edit')}</button></div></header>
    <nav class="af-tabs">${['overview', 'files', 'review', 'messages', 'history'].map((k) => html`<button type="button" data-tab="${k}" class="${k === tab ? 'is-on' : ''}">${t('projects.tab' + k[0].toUpperCase() + k.slice(1))}</button>`)}</nav>
    <section data-pane></section>`);
  const pane = $('[data-pane]', el);

  $('[data-status]', el).addEventListener('click', () => {
    const body = document.createElement('div');
    body.innerHTML = String(html`<label class="af-field"><span>Status</span><select name="s">${STATUSES.map((s) => html`<option value="${s}" ${s === p.status ? 'selected' : ''}>${t('status.' + s)}</option>`)}</select></label>
      <label class="af-field"><span>${a('statusNote')}</span><textarea name="n" rows="3" maxlength="1000"></textarea></label>`);
    modal({ title: a('changeStatus'), size: 'sm', body, actions: [{ label: t('common.cancel') }, { label: a('save'), primary: true, onClick: async (b) => {
      const s = $('[name=s]', b).value; const n = $('[name=n]', b).value.trim();
      const { error: e } = await supabase.rpc('admin_set_project_status', { p_project: p.id, p_status: s, p_note: n || null });
      if (e) { toast(e.message, 'err'); return false; }
      p.status = s; $('[data-pill]', el).className = 'af-pill af-pill--' + s; $('[data-pill]', el).textContent = t('status.' + s);
      toast(a('saved'), 'ok'); if (tab === 'history') open('history');
    } }] });
  });

  $('[data-edit]', el).addEventListener('click', () => {
    const body = document.createElement('div');
    body.innerHTML = String(html`<label class="af-field"><span>${t('builder.objectName')}</span><input name="title" maxlength="160" value="${p.title}" /></label>
      <label class="af-field"><span>${t('projects.budget')}</span><input name="budget" maxlength="80" value="${p.budget || ''}" /></label>
      <label class="af-field"><span>${t('projects.deadline')}</span><input type="date" name="deadline" value="${p.deadline || ''}" /></label>
      <label class="af-field"><span>${t('projects.spec')}</span><textarea name="spec" rows="10">${p.spec_md || ''}</textarea></label>`);
    modal({ title: a('edit'), size: 'lg', body, actions: [{ label: t('common.cancel') }, { label: a('save'), primary: true, onClick: async (b) => {
      const patch = { title: $('[name=title]', b).value.trim().slice(0, 160), budget: $('[name=budget]', b).value.trim() || null, deadline: $('[name=deadline]', b).value || null, spec_md: $('[name=spec]', b).value.slice(0, 20000) };
      if (patch.title.length < 2) { toast(t('builder.fillTitle'), 'err'); return false; }
      const { error: e } = await supabase.from('projects').update(patch).eq('id', p.id);
      if (e) { toast(e.message, 'err'); return false; }
      Object.assign(p, patch); toast(a('saved'), 'ok'); open(tab);
    } }] });
  });

  async function uploadAdminFile(kindDefault = 'render') {
    const body = document.createElement('div');
    body.innerHTML = String(html`<label class="af-field"><span>${a('fileKind')}</span><select name="k">${['render', 'final', 'material', 'brief', 'image'].map((k) => html`<option value="${k}" ${k === kindDefault ? 'selected' : ''}>${t('files.kinds.' + k)}</option>`)}</select></label>
      <label class="af-field"><span>${a('uploadFile')}</span><input type="file" name="f" multiple /></label>`);
    return modal({ title: a('uploadFile'), size: 'sm', body, actions: [{ label: t('common.cancel') }, { label: a('uploadReplace'), primary: true, onClick: async (b, close, btn) => {
      const files = Array.from($('[name=f]', b).files || []); const kind = $('[name=k]', b).value;
      if (!files.length) return false;
      setBusy(btn, true);
      for (const f of files) {
        const v = validateFile(f, { maxMB: 50 }); if (v.error) { toast(t(v.error, { mb: v.mb }), 'err'); continue; }
        const path = `${p.client_id}/${p.id}/${uid()}-${f.name.replace(/[^\w.\-]+/g, '_').slice(-80)}`;
        const up = await supabase.storage.from('project-files').upload(path, f, { contentType: v.mime, upsert: false });
        if (up.error) { toast(up.error.message, 'err'); continue; }
        const ins = await supabase.from('files').insert({ owner_id: p.client_id, uploaded_by: auth.user.id, project_id: p.id, kind, bucket: 'project-files', path, name: f.name.slice(0, 200), mime: v.mime, size: f.size });
        if (ins.error) toast(ins.error.message, 'err');
      }
      close(true); toast(a('saved'), 'ok'); open('files'); return false;
    } }] });
  }

  async function newRound() {
    const body = document.createElement('div');
    body.innerHTML = String(html`<label class="af-field"><span>${a('roundTitle')}</span><input name="title" maxlength="120" value="${p.title}" /></label>
      <label class="af-field"><span>${a('uploadFile')}</span><input type="file" name="f" accept="image/jpeg,image/png,image/webp" /></label>`);
    modal({ title: a('newRound'), size: 'sm', body, actions: [{ label: t('common.cancel') }, { label: a('uploadReplace'), primary: true, onClick: async (b, close, btn) => {
      const f = $('[name=f]', b).files?.[0]; if (!f) return false;
      const v = validateFile(f, { imagesOnly: true, maxMB: 25 }); if (v.error) { toast(t(v.error, { mb: v.mb }), 'err'); return false; }
      setBusy(btn, true);
      const path = `${p.client_id}/${p.id}/review-${uid()}.${f.type.split('/')[1]}`;
      const up = await supabase.storage.from('project-files').upload(path, f, { contentType: v.mime, upsert: false });
      if (up.error) { setBusy(btn, false); toast(up.error.message, 'err'); return false; }
      const { data: last } = await supabase.from('review_rounds').select('version').eq('project_id', p.id).order('version', { ascending: false }).limit(1).maybeSingle();
      await supabase.from('files').insert({ owner_id: p.client_id, uploaded_by: auth.user.id, project_id: p.id, kind: 'render', bucket: 'project-files', path, name: f.name.slice(0, 200), mime: v.mime, size: f.size });
      const { error: e } = await supabase.from('review_rounds').insert({ project_id: p.id, version: (last?.version || 0) + 1, title: $('[name=title]', b).value.trim() || p.title, image_path: path, created_by: auth.user.id });
      if (e) { setBusy(btn, false); toast(e.message, 'err'); return false; }
      close(true); toast(a('saved'), 'ok'); open('review'); return false;
    } }] });
  }

  async function open(k) {
    tab = k; if (typeof cleanup === 'function') cleanup(); cleanup = null;
    $$('[data-tab]', el).forEach((b) => b.classList.toggle('is-on', b.dataset.tab === k));
    pane.innerHTML = String(skeleton(1, 'af-skel-card'));
    if (k === 'overview') {
      const { data: boards } = await supabase.from('moodboards').select('id,title').eq('project_id', p.id);
      const c = p.contact || {}; const e = p.estimate;
      pane.innerHTML = String(html`<div class="pd-body"><div class="af-card"><h3 class="af-h3">${t('projects.spec')}</h3><div class="af-md">${md(p.spec_md || '—')}</div></div>
        <aside class="pd-side" style="position:static"><div class="af-card"><h4>${a('contact')}</h4>
          <p>${c.name || '—'}<br />${c.email || ''}${c.tg ? html`<br />Telegram: ${c.tg}` : ''}${c.phone ? html`<br />${c.phone}` : ''}<br /><small class="af-muted">${t('builder.preferred')}: ${c.preferred || '—'}</small></p>
          <h4 style="margin-top:14px">${t('projects.budget')}</h4><p>${p.budget || '—'}</p>
          <h4 style="margin-top:14px">${t('projects.deadline')}</h4><p>${p.deadline ? fmtDate(p.deadline) : '—'}</p>
          ${e ? html`<h4 style="margin-top:14px">${t('projects.estimate')}</h4><p>${fmtMoney(e.min)} – ${fmtMoney(e.max)}</p>` : ''}
          <h4 style="margin-top:14px">${t('projects.moodboards')}</h4><p>${(boards || []).map((b) => b.title).join(', ') || '—'}</p></div></aside></div>`);
    } else if (k === 'files') {
      const { data: files } = await supabase.from('files').select('*').eq('project_id', p.id).order('created_at', { ascending: false });
      const thumbs = await signedUrls('project-files', (files || []).filter((f) => f.mime.startsWith('image/')).map((f) => f.path));
      pane.innerHTML = String(html`<div class="af-card"><div class="af-card__head"><h3>${t('projects.tabFiles')}</h3><button type="button" class="af-btn af-btn--gold af-btn--sm" data-up>${icon('upload')}<span>${a('uploadFile')}</span></button></div>
        ${(files || []).length ? html`<div class="pr-files">${files.map((f) => fileRow({ ...f, uploaded_by: auth.user.id, kind: f.kind }, thumbs[f.path]))}</div>` : emptyState(t('projects.noFiles'))}</div>`);
      $('[data-up]', pane).addEventListener('click', () => uploadAdminFile());
      bindFileRows(pane, files || [], () => open('files'));
    } else if (k === 'review') {
      pane.innerHTML = ''; const box = document.createElement('div'); pane.appendChild(box);
      cleanup = await mountReview(box, { projectId: p.id, isAdmin: true, onNewRound: newRound });
    } else if (k === 'messages') {
      let { data: th } = await supabase.from('threads').select('id').eq('project_id', p.id).order('created_at').limit(1).maybeSingle();
      if (!th) th = (await supabase.from('threads').insert({ client_id: p.client_id, project_id: p.id, subject: p.title.slice(0, 160) }).select('id').single()).data;
      pane.innerHTML = '<div class="msg has-thread" style="grid-template-columns:1fr"><div class="msg-pane" data-chat></div></div>';
      cleanup = mountChat($('[data-chat]', pane), th.id, { isAdmin: true });
    } else if (k === 'history') {
      const { data: rows } = await supabase.from('project_status_history').select('*').eq('project_id', p.id).order('created_at');
      pane.innerHTML = String(html`<div class="af-card"><ol class="pr-timeline">${(rows || []).map((r) => html`<li><b>${t('status.' + r.to_status)}</b>${r.note ? html`<p style="font-size:13.5px">${r.note}</p>` : ''}<small>${fmtDateTime(r.created_at)}</small></li>`)}</ol></div>`);
    }
  }
  $$('[data-tab]', el).forEach((b) => b.addEventListener('click', () => open(b.dataset.tab)));
  await open('overview');
  return () => { if (typeof cleanup === 'function') cleanup(); };
}
