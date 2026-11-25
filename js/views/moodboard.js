import { t, getLang } from '../core/i18n.js';
import { html, icon, md, toast, modal, confirmDialog, debounce, uid, reveal, emptyState, errorState, fmtDate, $, $$, setBusy, loadScript, projectNo } from '../core/ui.js';
import { supabase, signedUrls, callFunction } from '../lib/supabase.js';
import { auth } from '../core/auth.js';
import { navigate } from '../core/router.js';
import { uploadFile, listProjects } from '../core/api.js';

const W = 1600, H = 1000;
export const MATERIALS = {
  metal: ['#6c7075', '#e6e8ea', '#8d9196'], glass: ['#bcd7e6', '#f4fbff', '#8fb3c7'], wood: ['#6b4423', '#a47148', '#7a5230'],
  concrete: ['#8a8782', '#b4b0aa', '#76736e'], fabric: ['#5a4e6b', '#7d6f91', '#4a405a'], leather: ['#3b2416', '#6e4228', '#2a190f'],
  marble: ['#e9e6e1', '#ffffff', '#cfc9c1'], plastic: ['#d44a3a', '#ff7a66', '#b23a2e'], gold: ['#a8784a', '#f3d9b8', '#d4a574'],
};
const PALETTES = [
  ['#0a0908', '#2a2520', '#d4a574', '#e8c4a0', '#f5f2ed'], ['#1b263b', '#415a77', '#778da9', '#e0e1dd', '#f4a259'],
  ['#2d3a2e', '#5b7553', '#a3b18a', '#dad7cd', '#f2e8cf'], ['#22223b', '#4a4e69', '#9a8c98', '#c9ada7', '#f2e9e4'],
  ['#0b0c10', '#ff2fd1', '#7c4dff', '#00e5ff', '#e6f7ff'], ['#3d2c2e', '#9c6644', '#d9a066', '#f5deb3', '#ffffff'],
];
const HEX = /^#[0-9a-f]{3,8}$/i;
const num = (v, min, max, d) => (Number.isFinite(+v) ? Math.max(min, Math.min(max, +v)) : d);
/** Defensive sanitizer for board items loaded from the database. */
function clean(it) {
  if (!it || !['image', 'color', 'palette', 'material', 'note'].includes(it.type)) return null;
  const o = { id: String(it.id || uid()).slice(0, 16), type: it.type, x: num(it.x, 0, W, 40), y: num(it.y, 0, H, 40), w: num(it.w, 40, W, 240), h: num(it.h, 30, H, 180) };
  if (it.type === 'image') { if (typeof it.path !== 'string' || !it.path.startsWith(auth.user.id + '/')) return null; o.path = it.path; }
  if (it.type === 'color') { if (!HEX.test(it.value)) return null; o.value = it.value; }
  if (it.type === 'palette') o.colors = (it.colors || []).filter((c) => HEX.test(c)).slice(0, 8);
  if (it.type === 'material') { if (!MATERIALS[it.value]) return null; o.value = it.value; }
  if (it.type === 'note') o.text = String(it.text || '').slice(0, 600);
  return o;
}
const matCss = (m) => { const c = MATERIALS[m] || MATERIALS.metal; return `linear-gradient(135deg, ${c[0]} 0%, ${c[1]} 48%, ${c[2]} 100%)`; };

export async function render(el, { params }) {
  if (params.id) return editor(el, params.id);
  el.innerHTML = String(html`
    <header class="af-page-head" data-reveal><div><span class="af-kicker">MOODBOARD BUILDER</span><h2>${t('mood.title')}</h2><p>${t('mood.sub')}</p></div>
      <button type="button" class="af-btn af-btn--gold" data-new>${icon('plus')}<span>${t('mood.newBoard')}</span></button></header>
    <div class="mb-boards" data-list><div class="af-skel af-skel-card"></div></div>`);
  reveal(el);
  $('[data-new]', el).addEventListener('click', async (e) => {
    setBusy(e.currentTarget, true);
    const { data, error } = await supabase.from('moodboards').insert({ user_id: auth.user.id, title: t('mood.untitled'), data: { items: [], bg: '#f3efe8' } }).select('id').single();
    if (error) { setBusy(e.currentTarget, false); return toast(t('errors.generic'), 'err'); }
    navigate('/moodboard/' + data.id);
  });
  const { data: boards, error } = await supabase.from('moodboards').select('id,title,data,updated_at,project_id').eq('user_id', auth.user.id).order('updated_at', { ascending: false });
  if (error) { $('[data-list]', el).innerHTML = String(errorState()); return; }
  $('[data-list]', el).innerHTML = boards.length ? String(html`${boards.map((b) => html`
    <a class="af-card af-card--hover" href="#/moodboard/${b.id}">
      <div class="mb-thumb" style="background:${(b.data?.bg || '#f3efe8').replace(/[^#\w]/g, '')}">${(b.data?.items || []).slice(0, 24).map((it) => html`<i style="left:${(it.x / W) * 100}%;top:${(it.y / H) * 100}%;width:${(it.w / W) * 100}%;height:${(it.h / H) * 100}%;background:${thumbBg(it)}"></i>`)}</div>
      <b>${b.title}</b><p class="af-muted" style="font-size:12.5px">${fmtDate(b.updated_at)}${b.project_id ? ' · ' + t('nav.projects') : ''}</p></a>`)}`)
    : String(emptyState(t('mood.empty'), t('mood.emptySub')));
}
function thumbBg(it) {
  const safe = (c) => String(c || '').replace(/[^#\w]/g, '');
  if (it.type === 'color') return safe(it.value);
  if (it.type === 'palette') return safe((it.colors || [])[0]);
  if (it.type === 'material') return matCss(it.value);
  if (it.type === 'note') return '#fdf6e3';
  return '#c4a484';
}

// =====================================================================
// Editor
// =====================================================================
async function editor(el, id) {
  const { data: board, error } = await supabase.from('moodboards').select('*').eq('id', id).maybeSingle();
  if (error || !board || board.user_id !== auth.user.id) { el.innerHTML = String(emptyState(t('errors.not_found'), '', html`<a class="af-btn af-btn--ghost" href="#/moodboard">${t('mood.title')}</a>`)); return; }
  const state = { title: board.title, items: (Array.isArray(board.data?.items) ? board.data.items : []).map(clean).filter(Boolean), bg: HEX.test(board.data?.bg) ? board.data.bg : '#f3efe8' };
  let sel = null; let urls = {};

  el.innerHTML = String(html`
    <a class="af-link" href="#/moodboard">← ${t('mood.title')}</a>
    <div class="mb-toolbar" style="margin-top:14px">
      <input class="af-input" data-title maxlength="120" value="${state.title}" aria-label="${t('mood.title')}" />
      <label class="af-btn af-btn--ghost af-btn--sm">${icon('image')}<span>${t('mood.addImage')}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-img /></label>
      <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-add="color">${icon('palette')}<span>${t('mood.addColor')}</span></button>
      <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-add="palette">${icon('layers')}<span>${t('mood.addPalette')}</span></button>
      <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-add="material">${icon('lab')}<span>${t('mood.addMaterial')}</span></button>
      <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-add="note">${icon('note')}<span>${t('mood.addNote')}</span></button>
      <span style="flex:1"></span>
      <small class="af-muted" data-status>${t('mood.autosave')}</small>
      <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-ai>${icon('spark')}<span>${t('mood.analyze')}</span></button>
      <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-send>${icon('projects')}<span>${t('mood.sendToProject')}</span></button>
      <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-png>${icon('download')}<span>${t('mood.exportPng')}</span></button>
      <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-pdf>${icon('download')}<span>${t('mood.exportPdf')}</span></button>
      <button type="button" class="af-icon-btn" data-del aria-label="${t('common.delete')}">${icon('trash')}</button>
    </div>
    <div class="mb-viewport" data-vp><div class="mb-board" data-board></div></div>
    <div data-analysis style="margin-top:16px"></div>`);
  const vp = $('[data-vp]', el); const boardEl = $('[data-board]', el);
  let scale = 1;
  const fit = () => { scale = vp.clientWidth / W; boardEl.style.transform = `scale(${scale})`; vp.style.height = H * scale + 'px'; };
  const ro = new ResizeObserver(fit); ro.observe(vp); fit();
  boardEl.style.background = state.bg;

  // ------------------------------------------------------------ persistence
  const save = debounce(async () => {
    $('[data-status]', el).textContent = t('common.wait');
    const { error: e } = await supabase.from('moodboards').update({ title: state.title.slice(0, 120) || t('mood.untitled'), data: { items: state.items, bg: state.bg } }).eq('id', id);
    if ($('[data-status]', el)) $('[data-status]', el).textContent = e ? t('errors.generic') : t('common.saved');
  }, 800);

  // ------------------------------------------------------------ rendering
  async function resolveUrls() {
    const paths = state.items.filter((i) => i.type === 'image' && i.path && !urls[i.path]).map((i) => i.path);
    if (paths.length) Object.assign(urls, await signedUrls('project-files', paths));
  }
  function itemHtml(it) {
    const style = `left:${it.x}px;top:${it.y}px;width:${it.w}px;height:${it.h}px;z-index:${state.items.indexOf(it) + 1}`;
    const body = it.type === 'image' ? html`<img src="${urls[it.path] || ''}" alt="" crossorigin="anonymous" />`
      : it.type === 'color' ? html`<span style="background:rgba(255,255,255,.85);color:#1c1917;padding:4px 8px;border-radius:6px">${it.value}</span>`
      : it.type === 'palette' ? html`${(it.colors || []).map((c) => html`<i style="background:${c}"></i>`)}`
      : it.type === 'material' ? html`<span>${t('mood.materials.' + it.value)}</span>`
      : html`<textarea maxlength="600" placeholder="${t('mood.notePh')}" aria-label="${t('mood.addNote')}">${it.text || ''}</textarea>`;
    const bg = it.type === 'color' ? `background:${it.value};` : it.type === 'material' ? `background:${matCss(it.value)};` : '';
    return html`<div class="mb-item mb-item--${it.type} ${sel === it.id ? 'is-sel' : ''}" data-item="${it.id}" tabindex="0" style="${style};${bg}">${body}
      <button type="button" class="mb-del" data-rm aria-label="${t('common.delete')}">${icon('x')}</button><span class="mb-handle" data-resize aria-hidden="true"></span></div>`;
  }
  async function paint() {
    await resolveUrls();
    boardEl.innerHTML = String(html`${state.items.map(itemHtml)}`);
    bindItems();
  }
  function select(idv) { sel = idv; $$('.mb-item', boardEl).forEach((n) => n.classList.toggle('is-sel', n.dataset.item === idv)); }

  function bindItems() {
    $$('.mb-item', boardEl).forEach((node) => {
      const it = state.items.find((i) => i.id === node.dataset.item);
      node.addEventListener('pointerdown', (e) => {
        if (e.target.closest('[data-rm]')) return;
        const resizing = !!e.target.closest('[data-resize]');
        if (e.target.tagName === 'TEXTAREA' && !resizing) { select(it.id); return; }
        e.preventDefault(); select(it.id); node.setPointerCapture(e.pointerId);
        const sx = e.clientX, sy = e.clientY, ox = it.x, oy = it.y, ow = it.w, oh = it.h;
        const move = (ev) => {
          const dx = (ev.clientX - sx) / scale, dy = (ev.clientY - sy) / scale;
          if (resizing) { it.w = Math.max(60, Math.min(W - it.x, ow + dx)); it.h = Math.max(40, Math.min(H - it.y, oh + dy)); node.style.width = it.w + 'px'; node.style.height = it.h + 'px'; }
          else { it.x = Math.max(0, Math.min(W - it.w, ox + dx)); it.y = Math.max(0, Math.min(H - it.h, oy + dy)); node.style.left = it.x + 'px'; node.style.top = it.y + 'px'; }
        };
        const up = () => { node.removeEventListener('pointermove', move); node.removeEventListener('pointerup', up); node.removeEventListener('pointercancel', up); save(); };
        node.addEventListener('pointermove', move); node.addEventListener('pointerup', up); node.addEventListener('pointercancel', up);
      });
      node.addEventListener('dblclick', () => { // bring to front
        state.items = state.items.filter((i) => i !== it).concat(it); paint(); save();
      });
      $('[data-rm]', node).addEventListener('click', () => remove(it.id));
      $('textarea', node)?.addEventListener('input', (e) => { it.text = e.target.value.slice(0, 600); save(); });
      node.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'TEXTAREA') return;
        const step = e.shiftKey ? 20 : 5;
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(it.id); }
        if (e.key.startsWith('Arrow')) {
          e.preventDefault();
          if (e.key === 'ArrowLeft') it.x = Math.max(0, it.x - step); if (e.key === 'ArrowRight') it.x = Math.min(W - it.w, it.x + step);
          if (e.key === 'ArrowUp') it.y = Math.max(0, it.y - step); if (e.key === 'ArrowDown') it.y = Math.min(H - it.h, it.y + step);
          node.style.left = it.x + 'px'; node.style.top = it.y + 'px'; save();
        }
      });
    });
  }
  boardEl.addEventListener('pointerdown', (e) => { if (e.target === boardEl) select(null); });
  function remove(idv) { state.items = state.items.filter((i) => i.id !== idv); sel = null; paint(); save(); }
  function add(item) {
    const n = state.items.length;
    const it = { id: uid().slice(0, 12), x: 80 + (n % 6) * 60, y: 80 + (n % 5) * 50, w: 280, h: 200, ...item };
    if (state.items.length >= 80) return toast(t('errors.rate_limited'), 'err');
    state.items.push(it); sel = it.id; paint(); save();
  }

  // ------------------------------------------------------------ toolbar
  $('[data-title]', el).addEventListener('input', (e) => { state.title = e.target.value; save(); });
  $('[data-img]', el).addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 10); e.target.value = '';
    for (const f of files) {
      try {
        const row = await uploadFile(f, { folder: 'moodboards', kind: 'moodboard', imagesOnly: true });
        const dims = await new Promise((res) => { const im = new Image(); im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([4, 3]); im.src = URL.createObjectURL(f); });
        const w = 360; add({ type: 'image', path: row.path, w, h: Math.round(w * (dims[1] / dims[0])) });
      } catch (err) { toast(t(err.i18n || 'errors.generic', { mb: err.mb }), 'err'); }
    }
  });
  $$('[data-add]', el).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.add;
    if (k === 'note') return add({ type: 'note', text: '', w: 260, h: 180 });
    if (k === 'color') {
      const body = document.createElement('div');
      body.innerHTML = String(html`<label class="af-field"><span>${t('mood.addColor')}</span><input type="color" name="c" value="#d4a574" style="width:100%;height:60px;border-radius:12px" /></label>`);
      return modal({ title: t('mood.addColor'), size: 'sm', body, actions: [{ label: t('common.cancel') }, { label: t('common.add'), primary: true, onClick: (bd) => { add({ type: 'color', value: $('[name=c]', bd).value, w: 180, h: 180 }); } }] });
    }
    if (k === 'palette') {
      const body = document.createElement('div');
      body.innerHTML = String(html`<div class="mb-pals">${PALETTES.map((p, i) => html`<button type="button" data-p="${i}" aria-label="${p.join(' ')}">${p.map((c) => html`<i style="background:${c}"></i>`)}</button>`)}</div>`);
      return modal({ title: t('mood.palettes'), size: 'sm', body, onMount: (bd, close) => $$('[data-p]', bd).forEach((x) => x.addEventListener('click', () => { add({ type: 'palette', colors: PALETTES[+x.dataset.p], w: 420, h: 110 }); close(true); })) });
    }
    if (k === 'material') {
      const body = document.createElement('div');
      body.innerHTML = String(html`<div class="mb-mats">${Object.keys(MATERIALS).map((m) => html`<button type="button" data-m="${m}" style="background:${matCss(m)}">${t('mood.materials.' + m)}</button>`)}</div>`);
      return modal({ title: t('mood.addMaterial'), size: 'sm', body, onMount: (bd, close) => $$('[data-m]', bd).forEach((x) => x.addEventListener('click', () => { add({ type: 'material', value: x.dataset.m, w: 220, h: 160 }); close(true); })) });
    }
  }));

  $('[data-del]', el).addEventListener('click', async () => {
    if (!(await confirmDialog(t('common.delete'), t('mood.deleteConfirm'), { danger: true, okLabel: t('common.delete') }))) return;
    await supabase.from('moodboards').delete().eq('id', id); navigate('/moodboard');
  });

  $('[data-send]', el).addEventListener('click', async () => {
    const projects = await listProjects().catch(() => []);
    const body = document.createElement('div');
    body.innerHTML = projects.length ? String(html`<label class="af-field"><span>${t('mood.selectProject')}</span><select name="p">${projects.map((p) => html`<option value="${p.id}" ${p.id === board.project_id ? 'selected' : ''}>${projectNo(p.number)} · ${p.title}</option>`)}</select></label>`)
      : String(emptyState(t('projects.empty'), '', html`<a class="af-btn af-btn--ghost af-btn--sm" href="#/builder">${t('builder.newProject')}</a>`));
    modal({ title: t('mood.sendToProject'), size: 'sm', body, actions: projects.length ? [{ label: t('common.cancel') }, { label: t('common.apply'), primary: true, onClick: async (bd) => {
      const pid = $('[name=p]', bd).value;
      const { error: e } = await supabase.from('moodboards').update({ project_id: pid }).eq('id', id);
      if (e) { toast(t('errors.generic'), 'err'); return false; }
      board.project_id = pid; toast(t('mood.sent'), 'ok');
      const th = await supabase.from('threads').select('id').eq('project_id', pid).limit(1).maybeSingle();
      if (th.data) await supabase.from('messages').insert({ thread_id: th.data.id, sender_id: auth.user.id, body: `📌 ${t('mood.sent')}: «${state.title}»`, meta: { moodboard_id: id } });
    } }] : [] });
  });

  $('[data-ai]', el).addEventListener('click', async (e) => {
    const b = e.currentTarget; setBusy(b, true);
    try {
      const r = await callFunction('ai-chat', { mode: 'moodboard', lang: getLang(), message: state.title, context: { moodboard_id: id } });
      $('[data-analysis]', el).innerHTML = String(html`<div class="af-card"><h3 class="af-h3">${icon('spark')} ${t('mood.analysis')}</h3><div class="af-md">${md(r.reply)}</div></div>`);
      $('[data-analysis]', el).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) { toast(t('errors.' + (err.code || 'generic'), { limit: err.details?.limit || '' }), 'err'); }
    setBusy(b, false);
  });

  $('[data-png]', el).addEventListener('click', async (e) => {
    const b = e.currentTarget; setBusy(b, true);
    try { const c = await rasterize(state, urls); download(c.toDataURL('image/png'), safeFile(state.title) + '.png'); }
    catch (err) { console.error(err); toast(t('errors.generic'), 'err'); }
    setBusy(b, false);
  });
  $('[data-pdf]', el).addEventListener('click', async (e) => {
    const b = e.currentTarget; setBusy(b, true);
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const c = await rasterize(state, urls);
      const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H + 80] });
      pdf.setFontSize(28); pdf.text(state.title || 'Moodboard', 40, 50);
      pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 80, W, H);
      pdf.save(safeFile(state.title) + '.pdf');
    } catch (err) { console.error(err); toast(t('errors.generic'), 'err'); }
    setBusy(b, false);
  });

  await paint();
  return () => ro.disconnect();
}

const safeFile = (s) => (s || 'moodboard').replace(/[^\wа-яё\- ]+/gi, '').trim().slice(0, 60) || 'moodboard';
function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function loadImg(src) { return new Promise((res) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }

/** Draws the board to a 1600×1000 canvas for PNG/PDF export. */
export async function rasterize(state, urls) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = state.bg || '#f3efe8'; ctx.fillRect(0, 0, W, H);
  for (const it of state.items) {
    ctx.save(); rr(ctx, it.x, it.y, it.w, it.h, 12);
    ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    if (it.type === 'image') {
      const im = await loadImg(urls[it.path]);
      ctx.fillStyle = '#ddd'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.clip();
      if (im) { const s = Math.max(it.w / im.width, it.h / im.height); const dw = im.width * s, dh = im.height * s; ctx.drawImage(im, it.x + (it.w - dw) / 2, it.y + (it.h - dh) / 2, dw, dh); }
    } else if (it.type === 'color') {
      ctx.fillStyle = it.value; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(it.x + 10, it.y + it.h - 34, 90, 24); ctx.fillStyle = '#1c1917'; ctx.font = '600 13px Inter, sans-serif'; ctx.fillText(it.value, it.x + 18, it.y + it.h - 17);
    } else if (it.type === 'palette') {
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.clip();
      const cols = it.colors || []; cols.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(it.x + (it.w / cols.length) * i, it.y, it.w / cols.length + 1, it.h); });
    } else if (it.type === 'material') {
      const m = MATERIALS[it.value] || MATERIALS.metal; const g = ctx.createLinearGradient(it.x, it.y, it.x + it.w, it.y + it.h);
      g.addColorStop(0, m[0]); g.addColorStop(0.48, m[1]); g.addColorStop(1, m[2]); ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#fff'; ctx.font = '600 14px Inter, sans-serif'; ctx.fillText(t('mood.materials.' + it.value), it.x + 12, it.y + it.h - 14);
    } else if (it.type === 'note') {
      ctx.fillStyle = '#fdf6e3'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.fillStyle = '#3a3226'; ctx.font = '500 16px Inter, sans-serif';
      const words = String(it.text || '').split(/\s+/); let line = ''; let y = it.y + 30;
      for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > it.w - 28) { ctx.fillText(line, it.x + 14, y); line = w; y += 22; if (y > it.y + it.h - 10) break; } else line = test; }
      if (y <= it.y + it.h - 10) ctx.fillText(line, it.x + 14, y);
    }
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(28,25,23,.35)'; ctx.font = '700 22px "Space Grotesk", sans-serif'; ctx.fillText('AF STUDIO', W - 150, H - 24);
  return c;
}
