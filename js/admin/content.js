// Generic, schema-driven CRUD for admin-managed content tables.
// Writes are authorised by RLS policies (`*_admin`, using is_admin()) on the server.
import { t } from '../core/i18n.js';
import { html, icon, toast, modal, confirmDialog, emptyState, errorState, uid, $, $$, setBusy } from '../core/ui.js';
import { supabase, mediaUrls } from '../lib/supabase.js';
import { validateFile, invalidate } from '../core/api.js';
import { a } from './i18n.js';

const CAT = [['product', 'Product'], ['arch', 'Architecture'], ['character', 'Character'], ['motion', 'Motion']];
const T = {
  portfolio_items: { pk: 'id', slug: true, order: 'sort', cols: ['id', 'title_ru', 'category', 'year', 'published'], cache: 'portfolio', fields: [
    ['id', 'slug'], ['category', 'select', CAT], ['year', 'text'], ['tags', 'text'], ['title_ru', 'text'], ['title_en', 'text'],
    ['card_ru', 'textarea'], ['card_en', 'textarea'], ['lead_ru', 'textarea'], ['lead_en', 'textarea'], ['desc_ru', 'textarea'], ['desc_en', 'textarea'],
    ['brief_ru', 'textarea'], ['brief_en', 'textarea'], ['solution_ru', 'textarea'], ['solution_en', 'textarea'], ['tools', 'tags'],
    ['time_ru', 'text'], ['time_en', 'text'], ['result_ru', 'text'], ['result_en', 'text'], ['cover', 'media'], ['gallery', 'mediaList'], ['sort', 'number'], ['published', 'bool']] },
  before_after: { pk: 'id', order: 'sort', cols: ['title_ru', 'portfolio_id', 'published'], cache: 'ba', fields: [
    ['title_ru', 'text'], ['title_en', 'text'], ['portfolio_id', 'text'], ['source_path', 'media'], ['draft_path', 'media'], ['final_path', 'media'], ['sort', 'number'], ['published', 'bool']] },
  lab_models: { pk: 'id', order: 'sort', cols: ['title_ru', 'model_path', 'published'], cache: 'lab', fields: [
    ['title_ru', 'text'], ['title_en', 'text'], ['model_path', 'model'], ['poster_path', 'media'], ['scale', 'number'], ['sort', 'number'], ['published', 'bool']] },
  services: { pk: 'id', slug: true, order: 'sort', cols: ['id', 'title_ru', 'active'], cache: 'services', fields: [
    ['id', 'slug'], ['title_ru', 'text'], ['title_en', 'text'], ['desc_ru', 'textarea'], ['desc_en', 'textarea'], ['features', 'json'], ['sort', 'number'], ['active', 'bool']] },
  pricing_categories: { pk: 'id', slug: true, order: 'sort', cols: ['id', 'title_ru', 'base_min', 'base_max', 'confirmed'], cache: 'pricing', fields: [
    ['id', 'slug'], ['title_ru', 'text'], ['title_en', 'text'], ['currency', 'text'], ['base_min', 'number'], ['base_max', 'number'], ['included_angles', 'number'],
    ['per_angle', 'number'], ['per_object', 'number'], ['anim_per_sec', 'number'], ['days_min', 'number'], ['days_max', 'number'], ['works', 'json'],
    ['extras_note_ru', 'textarea'], ['extras_note_en', 'textarea'], ['confirmed', 'bool'], ['active', 'bool'], ['sort', 'number']] },
  pricing_factors: { pk: 'id', slug: true, order: 'sort', cols: ['id', 'grp', 'label_ru', 'multiplier', 'addon'], cache: 'pricing', fields: [
    ['id', 'slug'], ['grp', 'select', [['complexity', 'complexity'], ['detail', 'detail'], ['extras', 'extras'], ['urgency', 'urgency']]], ['label_ru', 'text'], ['label_en', 'text'],
    ['multiplier', 'number'], ['multiplier_max', 'number'], ['addon', 'number'], ['time_mult', 'number'], ['sort', 'number'], ['active', 'bool']] },
  reviews: { pk: 'id', order: 'sort', cols: ['author', 'role_ru', 'rating', 'published'], cache: 'reviews', fields: [
    ['author', 'text'], ['role_ru', 'text'], ['role_en', 'text'], ['quote_ru', 'textarea'], ['quote_en', 'textarea'], ['rating', 'number'], ['sort', 'number'], ['published', 'bool']] },
  kb_articles: { pk: 'id', order: 'sort', cols: ['topic', 'title_ru', 'published'], fields: [
    ['topic', 'select', ['services', 'process', 'pricing', 'terms', 'faq', 'contacts', 'about'].map((x) => [x, x])], ['title_ru', 'text'], ['title_en', 'text'],
    ['body_ru', 'textarea'], ['body_en', 'textarea'], ['sort', 'number'], ['published', 'bool']] },
};

export async function render(el, { params }) {
  const cfg = T[params.table];
  if (!cfg) { el.innerHTML = String(emptyState('404')); return; }
  el.innerHTML = String(html`<div class="af-row af-row--between" style="margin-bottom:14px"><span class="af-muted">${params.table}</span>
    <button type="button" class="af-btn af-btn--gold af-btn--sm" data-new>${icon('plus')}<span>${a('newItem')}</span></button></div>
    <div class="af-table-wrap"><table class="af-table"><thead><tr>${cfg.cols.map((c) => html`<th>${c}</th>`)}<th></th></tr></thead><tbody data-rows></tbody></table></div>`);
  let rows = [];
  async function load() {
    const { data, error } = await supabase.from(params.table).select('*').order(cfg.order, { ascending: true });
    if (error) { $('[data-rows]', el).innerHTML = `<tr><td colspan="9">${String(errorState(error.message))}</td></tr>`; return; }
    rows = data;
    $('[data-rows]', el).innerHTML = rows.length ? String(html`${rows.map((r) => html`<tr>${cfg.cols.map((c) => html`<td>${typeof r[c] === 'boolean' ? (r[c] ? '✓' : '—') : String(r[c] ?? '—').slice(0, 80)}</td>`)}
      <td style="white-space:nowrap"><button type="button" class="af-icon-btn" data-edit="${r[cfg.pk]}" aria-label="edit">${icon('builder')}</button>
      <button type="button" class="af-icon-btn" data-del="${r[cfg.pk]}" aria-label="delete">${icon('trash')}</button></td></tr>`)}`) : `<tr><td colspan="9">${String(emptyState(a('empty')))}</td></tr>`;
    $$('[data-edit]', el).forEach((b) => b.addEventListener('click', () => edit(rows.find((r) => String(r[cfg.pk]) === b.dataset.edit))));
    $$('[data-del]', el).forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmDialog(t('common.delete'), a('deleteConfirm'), { danger: true, okLabel: t('common.delete') }))) return;
      const { error: e } = await supabase.from(params.table).delete().eq(cfg.pk, b.dataset.del);
      if (e) return toast(e.message, 'err');
      if (cfg.cache) invalidate(cfg.cache); toast(a('saved'), 'ok'); load();
    }));
  }

  async function edit(row) {
    const isNew = !row; const r = row || {};
    const mediaPaths = cfg.fields.filter(([, ty]) => ty === 'media' || ty === 'mediaList').flatMap(([k]) => [].concat(r[k] || []));
    const urls = await mediaUrls(mediaPaths);
    const body = document.createElement('div');
    body.innerHTML = String(html`<form class="adm-form-grid" data-f>${cfg.fields.map(([k, ty, opts]) => field(k, ty, opts, r, isNew, urls))}</form>`);
    bindMedia(body, urls);
    modal({ title: isNew ? a('newItem') : a('edit'), size: 'lg', body, actions: [{ label: t('common.cancel') }, { label: a('save'), primary: true, onClick: async (b, close, btn) => {
      let patch;
      try { patch = collect(b); } catch (e) { toast(e.message, 'err'); return false; }
      setBusy(btn, true);
      const q = isNew ? supabase.from(params.table).insert(patch) : supabase.from(params.table).update(patch).eq(cfg.pk, r[cfg.pk]);
      const { error } = await q;
      if (error) { setBusy(btn, false); toast(error.message, 'err'); return false; }
      if (cfg.cache) invalidate(cfg.cache);
      close(true); toast(a('saved'), 'ok'); load(); return false;
    } }] });
  }

  function field(k, ty, opts, r, isNew, urls) {
    const v = r[k];
    const wide = ['textarea', 'json', 'mediaList', 'media', 'model'].includes(ty) ? 'is-wide' : '';
    if (ty === 'slug') return html`<label class="af-field"><span>${a('id')}</span><input name="${k}" value="${v || ''}" pattern="[a-z0-9_\\-]+" ${isNew ? '' : 'readonly'} required /></label>`;
    if (ty === 'text') return html`<label class="af-field"><span>${k}</span><input name="${k}" value="${v ?? ''}" /></label>`;
    if (ty === 'number') return html`<label class="af-field"><span>${k}</span><input name="${k}" type="number" step="any" value="${v ?? ''}" /></label>`;
    if (ty === 'bool') return html`<label class="af-switch"><span>${k === 'confirmed' ? a('confirmed') : k}</span><input type="checkbox" name="${k}" ${v === undefined ? (k === 'confirmed' ? '' : 'checked') : v ? 'checked' : ''} /></label>`;
    if (ty === 'select') return html`<label class="af-field"><span>${k}</span><select name="${k}">${opts.map(([val, lbl]) => html`<option value="${val}" ${v === val ? 'selected' : ''}>${lbl}</option>`)}</select></label>`;
    if (ty === 'textarea') return html`<label class="af-field ${wide}"><span>${k}</span><textarea name="${k}" rows="4">${v ?? ''}</textarea></label>`;
    if (ty === 'tags') return html`<label class="af-field ${wide}"><span>${k} <small>(comma separated)</small></span><input name="${k}" value="${(v || []).join(', ')}" data-tags /></label>`;
    if (ty === 'json') return html`<label class="af-field ${wide}"><span>${k} <small>JSON</small></span><textarea name="${k}" rows="5" data-json>${JSON.stringify(v ?? [], null, 1)}</textarea></label>`;
    if (ty === 'media' || ty === 'model') return html`<div class="af-field ${wide}"><span>${k}</span><div class="af-row"><input name="${k}" value="${v || ''}" style="flex:1" />
      <label class="af-btn af-btn--ghost af-btn--sm">${icon('upload')}<span>${a('uploadReplace')}</span><input type="file" hidden data-upload="${k}" data-kind="${ty}" accept="${ty === 'model' ? '.glb,.gltf' : 'image/*'}" /></label></div>
      ${ty === 'media' && v ? html`<img class="adm-img-prev" src="${urls[v] || v}" alt="" />` : ''}</div>`;
    if (ty === 'mediaList') return html`<div class="af-field ${wide}"><span>${k} <small>(one per line)</small></span><textarea name="${k}" rows="3" data-list>${(v || []).join('\n')}</textarea>
      <label class="af-btn af-btn--ghost af-btn--sm" style="justify-self:start">${icon('upload')}<span>${a('uploadReplace')}</span><input type="file" hidden multiple accept="image/*" data-upload="${k}" data-kind="list" /></label></div>`;
    return '';
  }

  function bindMedia(body) {
    $$('[data-upload]', body).forEach((inp) => inp.addEventListener('change', async () => {
      const files = Array.from(inp.files || []); inp.value = '';
      for (const f of files) {
        const v = validateFile(f, { imagesOnly: inp.dataset.kind !== 'model', maxMB: inp.dataset.kind === 'model' ? 100 : 25 });
        if (v.error) { toast(t(v.error, { mb: v.mb }), 'err'); continue; }
        const path = `${params.table}/${uid()}-${f.name.replace(/[^\w.\-]+/g, '_').slice(-80)}`;
        const { error } = await supabase.storage.from('portfolio-media').upload(path, f, { contentType: v.mime, upsert: false });
        if (error) { toast(error.message, 'err'); continue; }
        const target = $(`[name="${inp.dataset.upload}"]`, body);
        if (inp.dataset.kind === 'list') target.value = [target.value.trim(), path].filter(Boolean).join('\n'); else target.value = path;
        toast(a('saved'), 'ok', 1200);
      }
    }));
  }

  function collect(body) {
    const out = {};
    cfg.fields.forEach(([k, ty]) => {
      const n = $(`[name="${k}"]`, body); if (!n) return;
      if (ty === 'bool') out[k] = n.checked;
      else if (ty === 'number') out[k] = n.value === '' ? (k === 'multiplier_max' ? null : 0) : Number(n.value);
      else if (ty === 'tags') out[k] = n.value.split(',').map((s) => s.trim()).filter(Boolean);
      else if (ty === 'mediaList') out[k] = n.value.split('\n').map((s) => s.trim()).filter(Boolean);
      else if (ty === 'json') { try { out[k] = JSON.parse(n.value || '[]'); } catch { throw new Error(`${k}: invalid JSON`); } }
      else if (ty === 'slug') { if (!/^[a-z0-9_-]+$/.test(n.value)) throw new Error(`${k}: a-z, 0-9, _ , -`); out[k] = n.value; }
      else out[k] = n.value.trim() === '' && ['portfolio_id', 'source_path', 'draft_path', 'poster_path'].includes(k) ? null : n.value.trim();
    });
    return out;
  }

  $('[data-new]', el).addEventListener('click', () => edit(null));
  load();
}
