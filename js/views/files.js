import { t } from '../core/i18n.js';
import { html, icon, reveal, toast, emptyState, errorState, skeleton, projectNo, $, $$ } from '../core/ui.js';
import { signedUrls } from '../lib/supabase.js';
import { listFiles, listProjects, uploadFile } from '../core/api.js';
import { fileRow, bindFileRows } from './project-detail.js';
import { getPreferences, sortFiles, rememberedFilter, rememberFilter } from '../core/preferences.js';

const KINDS = ['reference', 'image', 'brief', 'material', 'moodboard', 'render', 'final'];
let kind = 'all';

export async function render(el) {
  const ws = getPreferences().workspace; // 3.0: view, sorting, list size, remembered filter
  kind = rememberedFilter('files', 'all');
  let shown = ws.page_size;
  el.innerHTML = String(html`
    <header class="af-page-head" data-reveal><div><span class="af-kicker">AF CLIENT SPACE</span><h2>${t('files.title')}</h2><p>${t('files.sub')}</p></div>
      <label class="af-btn af-btn--gold">${icon('upload')}<span>${t('common.upload')}</span><input type="file" multiple hidden data-up /></label></header>
    <div class="af-chips" data-kinds style="margin-bottom:18px"></div>
    <div class="af-card ${ws.files_view === 'grid' ? 'ws-files-grid' : ''}" data-list>${skeleton(4, 'af-skel-row')}</div>
    <div class="ws-more" data-more hidden></div>`);
  reveal(el);

  async function load() {
    let files, projects;
    try { [files, projects] = await Promise.all([listFiles(), listProjects()]); } catch { $('[data-list]', el).innerHTML = String(errorState()); return; }
    if (!el.isConnected) return;
    files = sortFiles(files, ws.files_sort);
    const pmap = Object.fromEntries(projects.map((p) => [p.id, projectNo(p.number) + ' · ' + p.title]));
    const thumbs = await signedUrls('project-files', files.filter((f) => f.mime.startsWith('image/')).map((f) => f.path));
    const present = KINDS.filter((k) => files.some((f) => f.kind === k));
    if (kind !== 'all' && !present.includes(kind)) kind = 'all';
    $('[data-kinds]', el).innerHTML = String(html`<button type="button" class="af-chip ${kind === 'all' ? 'is-on' : ''}" data-k="all">${t('files.all')} · ${files.length}</button>
      ${present.map((k) => html`<button type="button" class="af-chip ${kind === k ? 'is-on' : ''}" data-k="${k}">${t('files.kinds.' + k)}</button>`)}`);
    $$('[data-k]', el).forEach((b) => b.addEventListener('click', () => { kind = b.dataset.k; rememberFilter('files', kind); shown = ws.page_size; load(); }));
    const all = files.filter((f) => kind === 'all' || f.kind === kind);
    const list = all.slice(0, shown);
    const more = $('[data-more]', el);
    more.hidden = all.length <= shown;
    more.innerHTML = all.length > shown ? String(html`<button type="button" class="af-btn af-btn--ghost">${t('ws.showMore', { n: Math.min(ws.page_size, all.length - shown), total: all.length })}</button>`) : '';
    $('button', more)?.addEventListener('click', () => { shown += ws.page_size; load(); });
    $('[data-list]', el).innerHTML = list.length
      ? String(html`<div class="pr-files">${list.map((f) => fileRow(f, thumbs[f.path], { showProject: f.project_id ? pmap[f.project_id] : t('files.noProject') }))}</div>`)
      : String(emptyState(t('projects.noFiles')));
    bindFileRows(el, list, load);
  }

  const input = $('[data-up]', el); const lbl = input.closest('label');
  input.addEventListener('change', async () => {
    const list = Array.from(input.files || []); input.value = '';
    if (!list.length) return;
    lbl.classList.add('is-busy'); lbl.setAttribute('aria-busy', 'true');
    for (const f of list) {
      try { await uploadFile(f, { folder: 'general', kind: f.type.startsWith('image/') ? 'image' : (f.type === 'application/pdf' ? 'brief' : 'material') }); }
      catch (err) { toast(t(err.i18n || 'errors.generic', { mb: err.mb }), 'err'); }
    }
    lbl.classList.remove('is-busy'); lbl.removeAttribute('aria-busy');
    toast(t('common.saved'), 'ok', 1500);
    load();
  });
  await load();
}
