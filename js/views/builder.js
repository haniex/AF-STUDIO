import { t, loc, getLang } from '../core/i18n.js';
import { html, icon, md, toast, confirmDialog, setBusy, debounce, projectNo, reveal, $, $$, esc, fmtMoney } from '../core/ui.js';
import { supabase, signedUrls, callFunction } from '../lib/supabase.js';
import { auth } from '../core/auth.js';
import { CONFIG } from '../config.js';
import { getServices, getDraft, saveDraft, clearDraft, uploadFile, deleteFile, getPortfolio } from '../core/api.js';

const FORMATS = ['PNG / JPEG', 'TIFF', 'MP4', 'ProRes', 'GLB / FBX', 'Source files'];
const STEPS = 7;
const LS = () => 'af.draft.' + auth.user.id;

function blank() {
  const p = auth.profile || {};
  return { step: 0, service: '', title: '', desc: '', hasCad: false, hasPhotos: false, goals: [], goalNote: '', styles: [], styleNote: '',
    refs: [], angles: 3, objects: 1, animation: 0, turntable: false, formats: ['PNG / JPEG'], budget: '', deadline: '', urgent: false,
    contact: { name: p.full_name || '', email: auth.user.email, tg: '', phone: '', preferred: 'email' }, consent: false, aiSpec: '', ref: '', estimate: null };
}

export async function render(el, { query }) {
  el.innerHTML = String(html`<div class="af-skel af-skel-card"></div>`);
  let services = []; let works = [];
  try { [services, works] = await Promise.all([getServices(), getPortfolio()]); } catch { /* handled below */ }
  let d = blank();
  try {
    const remote = await getDraft();
    const local = JSON.parse(localStorage.getItem(LS()) || 'null');
    const src = remote || local;
    if (src) { d = { ...d, ...src, contact: { ...d.contact, ...(src.contact || {}) } }; }
  } catch { /* new draft */ }
  if (query.service && services.some((s) => s.id === query.service)) { d.service = query.service; if (d.step === 0) d.step = 1; }
  if (query.ref) d.ref = query.ref;
  if (!el.isConnected) return;

  let saving = false;
  const persist = debounce(async () => {
    localStorage.setItem(LS(), JSON.stringify(d));
    if (saving) return; saving = true;
    try { await saveDraft(d); $('[data-saved]', el) && ($('[data-saved]', el).textContent = t('builder.draftSaved')); } catch { /* local copy kept */ }
    saving = false;
  }, 700);
  const set = (patch) => { Object.assign(d, patch); persist(); paintSpec(); };

  el.innerHTML = String(html`
    <header class="af-page-head" data-reveal><div><span class="af-kicker">SMART PROJECT BUILDER</span><h2>${t('builder.title')}</h2><p>${t('builder.sub')}</p></div>
      <div class="af-row"><small class="af-muted" data-saved></small><button type="button" class="af-btn af-btn--ghost af-btn--sm" data-clear>${t('builder.clearDraft')}</button></div></header>
    <div class="bd">
      <section class="af-card">
        <nav class="bd-progress" aria-label="progress" data-progress></nav>
        <div class="bd-step" data-step aria-live="polite"></div>
        <div class="bd-hint" data-hint></div>
        <div class="bd-nav">
          <button type="button" class="af-btn af-btn--ghost" data-prev>${icon('arrowL')}<span>${t('common.back')}</span></button>
          <div class="af-row">
            <button type="button" class="af-btn af-btn--ghost" data-ai>${icon('spark')}<span>${t('builder.aiHint')}</span></button>
            <button type="button" class="af-btn af-btn--primary" data-next><span>${t('common.next')}</span>${icon('arrowR')}</button>
          </div>
        </div>
      </section>
      <aside class="bd-aside"><div class="af-card"><div class="af-card__head"><h3>${t('builder.spec')}</h3></div><div class="bd-spec af-md" data-spec></div></div></aside>
    </div>`);
  reveal(el);
  if (d.estimate && query.from === 'calc') toast(t('builder.fromCalc'), 'ok');

  const stepEl = $('[data-step]', el);
  const svcById = Object.fromEntries(services.map((s) => [s.id, s]));

  // ------------------------------------------------------------- spec
  function spec() {
    const s = svcById[d.service]; const L = (ru, en) => (getLang() === 'en' ? en : ru);
    const lines = [
      `### ${d.title || L('Без названия', 'Untitled')}`,
      `**${t('projects.service')}:** ${s ? loc(s, 'title') : '—'}`,
      d.ref ? `**${L('Референс из портфолио', 'Portfolio reference')}:** ${loc(works.find((w) => w.id === d.ref), 'title') || d.ref}` : '',
      '', `#### ${t('builder.s2')}`, d.desc || '—',
      [d.hasCad && t('builder.hasCad'), d.hasPhotos && t('builder.hasPhotos')].filter(Boolean).map((x) => '- ' + x).join('\n'),
      '', `#### ${t('builder.s3')}`, d.goals.length ? d.goals.map((g) => '- ' + g).join('\n') : '—', d.goalNote,
      '', `#### ${t('builder.s4')}`, d.styles.length ? d.styles.map((g) => '- ' + g).join('\n') : '—', d.styleNote ? d.styleNote.slice(0, 1500) : '',
      d.refs.length ? `${t('builder.refs')}: ${d.refs.length}` : '',
      '', `#### ${t('builder.s5')}`,
      `- ${t('builder.angles')}: ${d.angles}`, `- ${t('builder.objects')}: ${d.objects}`, `- ${t('builder.animation')}: ${d.animation}`,
      d.turntable ? `- ${t('builder.turntable')}` : '', `- ${t('builder.formats')}: ${d.formats.join(', ') || '—'}`,
      '', `#### ${t('builder.s6')}`, `- ${t('builder.budget')}: ${d.budget || '—'}`, `- ${t('builder.deadline')}: ${d.deadline || '—'}${d.urgent ? ` (${t('builder.urgent')})` : ''}`,
      d.estimate ? `- ${t('projects.estimate')}: ${fmtMoney(d.estimate.min)} – ${fmtMoney(d.estimate.max)}` : '',
    ];
    return lines.filter((x) => x !== '' && x !== undefined && x !== false).join('\n');
  }
  const paintSpec = () => { $('[data-spec]', el).innerHTML = String(md(spec())); };

  // ------------------------------------------------------------- steps
  const views = [
    () => html`<h3>${t('builder.s1')}</h3><p>${t('builder.sub')}</p>
      <div class="bd-services">${services.map((s) => html`<button type="button" class="bd-svc ${d.service === s.id ? 'is-on' : ''}" data-svc="${s.id}" aria-pressed="${d.service === s.id}"><b>${loc(s, 'title')}</b><small>${loc(s, 'desc')}</small></button>`)}</div>`,
    () => html`<h3>${t('builder.s2')}</h3><p></p>
      <label class="af-field"><span>${t('builder.objectName')}</span><input name="title" maxlength="160" value="${d.title}" /></label>
      <label class="af-field"><span>${t('builder.objectDesc')}</span><textarea name="desc" rows="6" maxlength="4000" placeholder="${t('builder.objectDescPh')}">${d.desc}</textarea></label>
      <div class="af-row"><label class="af-check"><input type="checkbox" name="hasCad" ${d.hasCad ? 'checked' : ''} /><span>${t('builder.hasCad')}</span></label>
        <label class="af-check"><input type="checkbox" name="hasPhotos" ${d.hasPhotos ? 'checked' : ''} /><span>${t('builder.hasPhotos')}</span></label></div>`,
    () => html`<h3>${t('builder.s3')}</h3><p>${t('builder.goalNote')}</p>
      <div class="af-chips" data-multi="goals">${t('builder.goals').map((g) => html`<button type="button" class="af-chip ${d.goals.includes(g) ? 'is-on' : ''}" data-val="${g}" aria-pressed="${d.goals.includes(g)}">${g}</button>`)}</div>
      <label class="af-field" style="margin-top:18px"><span>${t('builder.goalNote')} <small>(${t('common.optional')})</small></span><textarea name="goalNote" rows="3" maxlength="1500">${d.goalNote}</textarea></label>`,
    () => html`<h3>${t('builder.s4')}</h3><p></p>
      <div class="af-chips" data-multi="styles">${t('builder.styles').map((g) => html`<button type="button" class="af-chip ${d.styles.includes(g) ? 'is-on' : ''}" data-val="${g}" aria-pressed="${d.styles.includes(g)}">${g}</button>`)}</div>
      <p class="af-field" style="margin:20px 0 8px"><span>${t('builder.refs')}</span></p>
      <label class="bd-drop" data-drop tabindex="0">${icon('upload')}<b>${t('builder.dropHint')}</b><small>${t('builder.dropSub', { mb: CONFIG.LIMITS.imageMB })}</small>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-file /></label>
      <div class="bd-thumbs" data-thumbs></div>
      <label class="af-field" style="margin-top:18px"><span>${t('builder.styleNote')}</span><textarea name="styleNote" rows="4" maxlength="6000">${d.styleNote}</textarea></label>`,
    () => html`<h3>${t('builder.s5')}</h3><p></p>
      ${[['angles', 1, 50], ['objects', 1, 30], ['animation', 0, 600]].map(([k, min, max]) => html`
        <div class="calc-row"><span>${t('builder.' + k)}</span><div class="af-stepper" data-stepper="${k}" data-min="${min}" data-max="${max}">
          <button type="button" data-dec aria-label="-">−</button><input type="number" inputmode="numeric" min="${min}" max="${max}" value="${d[k]}" aria-label="${t('builder.' + k)}" /><button type="button" data-inc aria-label="+">+</button></div></div>`)}
      <label class="af-switch"><span>${t('builder.turntable')}</span><input type="checkbox" name="turntable" ${d.turntable ? 'checked' : ''} /></label>
      <p class="af-field" style="margin:18px 0 8px"><span>${t('builder.formats')}</span></p>
      <div class="af-chips" data-multi="formats">${FORMATS.map((g) => html`<button type="button" class="af-chip ${d.formats.includes(g) ? 'is-on' : ''}" data-val="${g}" aria-pressed="${d.formats.includes(g)}">${g}</button>`)}</div>`,
    () => html`<h3>${t('builder.s6')}</h3><p></p>
      <p class="af-field" style="margin-bottom:8px"><span>${t('builder.budget')}</span></p>
      <div class="af-chips" data-single="budget">${t('builder.budgets').map((g) => html`<button type="button" class="af-chip ${d.budget === g ? 'is-on' : ''}" data-val="${g}" aria-pressed="${d.budget === g}">${g}</button>`)}</div>
      ${d.estimate ? html`<p class="af-note" style="margin-top:14px">${icon('calc')}<span>${t('projects.estimate')}: <b>${fmtMoney(d.estimate.min)} – ${fmtMoney(d.estimate.max)}</b></span></p>` : ''}
      <label class="af-field" style="margin-top:18px"><span>${t('builder.deadline')}</span><input type="date" name="deadline" value="${d.deadline}" min="${new Date().toISOString().slice(0, 10)}" /></label>
      <label class="af-switch"><span>${t('builder.urgent')}</span><input type="checkbox" name="urgent" ${d.urgent ? 'checked' : ''} /></label>`,
    () => html`<h3>${t('builder.s7')}</h3><p></p>
      <div class="adm-form-grid">
        <label class="af-field"><span>${t('builder.contactName')}</span><input name="c.name" maxlength="80" value="${d.contact.name}" autocomplete="name" /></label>
        <label class="af-field"><span>${t('builder.contactEmail')}</span><input value="${d.contact.email}" readonly /></label>
        <label class="af-field"><span>${t('builder.contactTg')} <small>(${t('common.optional')})</small></span><input name="c.tg" maxlength="64" value="${d.contact.tg}" placeholder="@username" /></label>
        <label class="af-field"><span>${t('builder.contactPhone')} <small>(${t('common.optional')})</small></span><input name="c.phone" maxlength="32" value="${d.contact.phone}" inputmode="tel" autocomplete="tel" /></label>
      </div>
      <p class="af-field" style="margin-bottom:8px"><span>${t('builder.preferred')}</span></p>
      <div class="af-chips" data-single="c.preferred">${[['email', 'Email'], ['telegram', 'Telegram'], ['phone', t('builder.contactPhone')], ['platform', t('nav.messages')]].map(([v, l]) => html`<button type="button" class="af-chip ${d.contact.preferred === v ? 'is-on' : ''}" data-val="${v}">${l}</button>`)}</div>
      <input type="text" name="company_site" class="acc-hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <label class="af-check" style="margin-top:18px"><input type="checkbox" name="consent" ${d.consent ? 'checked' : ''} /><span>${t('builder.consent')}</span></label>`,
  ];

  function paint() {
    $('[data-progress]', el).innerHTML = String(html`${t('builder.steps').map((s, i) => html`
      <button type="button" class="${i === d.step ? 'is-on' : ''} ${i < d.step ? 'is-done' : ''}" data-goto="${i}" ${i > maxReachable() ? 'disabled' : ''} aria-current="${i === d.step ? 'step' : 'false'}"><i></i><span>${i + 1}. ${s}</span></button>`)}`);
    stepEl.innerHTML = String(views[d.step]());
    $('[data-hint]', el).innerHTML = '';
    $('[data-prev]', el).style.visibility = d.step === 0 ? 'hidden' : 'visible';
    const next = $('[data-next]', el);
    next.innerHTML = d.step === STEPS - 1 ? String(html`${icon('send')}<span>${t('builder.submit')}</span>`) : String(html`<span>${t('common.next')}</span>${icon('arrowR')}`);
    next.className = 'af-btn ' + (d.step === STEPS - 1 ? 'af-btn--gold' : 'af-btn--primary');
    bindStep(); paintSpec();
    $$('[data-goto]', el).forEach((b) => b.addEventListener('click', () => { if (validate(true)) { d.step = +b.dataset.goto; persist(); paint(); } else if (+b.dataset.goto < d.step) { d.step = +b.dataset.goto; paint(); } }));
    if (window.gsap) window.gsap.fromTo(stepEl, { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' });
    $('input:not([type=checkbox]):not([readonly]), textarea', stepEl)?.focus({ preventScroll: true });
  }
  const maxReachable = () => { let i = 0; const ok = [() => !!d.service, () => d.title.trim().length >= 2 && d.desc.trim().length >= 20, () => d.goals.length > 0, () => true, () => true, () => true]; while (i < 6 && ok[i]()) i++; return i; };

  function bindStep() {
    $$('[data-svc]', stepEl).forEach((b) => b.addEventListener('click', () => { set({ service: b.dataset.svc }); $$('[data-svc]', stepEl).forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); }); }));
    $$('input[name], textarea[name]', stepEl).forEach((i) => i.addEventListener(i.type === 'checkbox' ? 'change' : 'input', () => {
      const v = i.type === 'checkbox' ? i.checked : i.value;
      if (i.name.startsWith('c.')) { d.contact[i.name.slice(2)] = v; set({}); } else if (i.name !== 'company_site') set({ [i.name]: v });
    }));
    $$('[data-multi]', stepEl).forEach((g) => $$('[data-val]', g).forEach((b) => b.addEventListener('click', () => {
      const k = g.dataset.multi; const arr = new Set(d[k]);
      arr.has(b.dataset.val) ? arr.delete(b.dataset.val) : arr.add(b.dataset.val);
      set({ [k]: [...arr] }); b.classList.toggle('is-on'); b.setAttribute('aria-pressed', b.classList.contains('is-on'));
    })));
    $$('[data-single]', stepEl).forEach((g) => $$('[data-val]', g).forEach((b) => b.addEventListener('click', () => {
      const k = g.dataset.single;
      if (k.startsWith('c.')) { d.contact[k.slice(2)] = b.dataset.val; set({}); } else set({ [k]: b.dataset.val });
      $$('[data-val]', g).forEach((x) => x.classList.toggle('is-on', x === b));
    })));
    $$('[data-stepper]', stepEl).forEach((s) => {
      const k = s.dataset.stepper; const min = +s.dataset.min; const max = +s.dataset.max; const inp = $('input', s);
      const put = (v) => { v = Math.max(min, Math.min(max, Math.round(+v || 0))); inp.value = v; set({ [k]: v }); };
      $('[data-dec]', s).addEventListener('click', () => put(+inp.value - (k === 'animation' ? 5 : 1)));
      $('[data-inc]', s).addEventListener('click', () => put(+inp.value + (k === 'animation' ? 5 : 1)));
      inp.addEventListener('change', () => put(inp.value));
    });
    const drop = $('[data-drop]', stepEl);
    if (drop) bindDrop(drop);
  }

  // ------------------------------------------------------------- references upload
  async function paintThumbs() {
    const box = $('[data-thumbs]', el); if (!box) return;
    const urls = await signedUrls('project-files', d.refs.map((r) => r.path));
    if (!box.isConnected) return;
    box.innerHTML = String(html`${d.refs.map((r, i) => html`<div class="bd-thumb"><img src="${urls[r.path] || ''}" alt="${r.name}" /><button type="button" data-rm="${i}" aria-label="${t('common.remove')}">${icon('x')}</button></div>`)}`);
    $$('[data-rm]', box).forEach((b) => b.addEventListener('click', async () => {
      const r = d.refs[+b.dataset.rm];
      try { await deleteFile({ id: r.id, path: r.path }); } catch { /* already gone */ }
      d.refs.splice(+b.dataset.rm, 1); set({}); paintThumbs();
    }));
  }
  function bindDrop(drop) {
    const input = $('[data-file]', drop);
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
    input.addEventListener('change', () => { handleFiles(input.files); input.value = ''; });
    paintThumbs();
  }
  async function handleFiles(list) {
    const files = Array.from(list || []).slice(0, 12 - d.refs.length);
    if (!files.length) return;
    const box = $('[data-thumbs]', el);
    box?.insertAdjacentHTML('beforeend', files.map(() => '<div class="bd-thumb is-uploading af-skel"></div>').join(''));
    for (const f of files) {
      try { const row = await uploadFile(f, { folder: 'drafts', kind: 'reference', imagesOnly: true }); d.refs.push({ id: row.id, path: row.path, name: row.name }); }
      catch (e) { toast(t(e.i18n || 'errors.generic', { mb: e.mb }), 'err'); }
    }
    set({}); paintThumbs();
  }

  // ------------------------------------------------------------- validation & nav
  function validate(silent = false) {
    const err = (k) => { if (!silent) toast(t(k), 'err'); return false; };
    if (d.step === 0 && !d.service) return err('builder.selectService');
    if (d.step === 1 && d.title.trim().length < 2) return err('builder.fillTitle');
    if (d.step === 1 && d.desc.trim().length < 20) return err('builder.fillDesc');
    if (d.step === 2 && !d.goals.length) return err('builder.pickGoal');
    if (d.step === 6 && !d.consent) return err('v.consent');
    if (d.step === 6 && (d.contact.name || '').trim().length < 2) return err('v.name');
    return true;
  }
  $('[data-prev]', el).addEventListener('click', () => { if (d.step > 0) { d.step--; persist(); paint(); } });
  $('[data-next]', el).addEventListener('click', async (e) => {
    if (!validate()) return;
    if (d.step < STEPS - 1) { d.step++; persist(); paint(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    await submit(e.currentTarget);
  });
  $('[data-clear]', el).addEventListener('click', async () => {
    if (!(await confirmDialog(t('builder.clearDraft'), t('builder.clearConfirm'), { danger: true }))) return;
    for (const r of d.refs) { try { await deleteFile({ id: r.id, path: r.path }); } catch { /* noop */ } }
    d = blank(); localStorage.removeItem(LS()); await clearDraft().catch(() => {}); paint();
  });
  $('[data-ai]', el).addEventListener('click', async (e) => {
    const b = e.currentTarget; setBusy(b, true);
    const box = $('[data-hint]', el);
    try {
      const ctx = { step: t('builder.steps')[d.step], service: d.service, title: d.title, desc: d.desc.slice(0, 1500), goals: d.goals, styles: d.styles, angles: d.angles, animation: d.animation, budget: d.budget };
      const r = await callFunction('ai-chat', { mode: 'builder_hint', lang: getLang(), message: `${t('builder.steps')[d.step]}: ${t('builder.s' + (d.step + 1))}`, context: ctx });
      box.innerHTML = String(html`<div class="af-note">${icon('spark')}<div class="af-md">${md(r.reply)}</div></div>`);
    } catch (err) { toast(t('errors.' + (err.code || 'generic'), { limit: err.details?.limit || '' }), 'err'); }
    setBusy(b, false);
  });

  // ------------------------------------------------------------- submit
  let submitting = false;
  async function submit(btn) {
    if (submitting) return;
    if ($('[name=company_site]', el)?.value) return; // honeypot
    submitting = true; setBusy(btn, true);
    try {
      const specMd = spec() + (d.aiSpec ? `\n\n#### AF AI\n${d.aiSpec}` : '');
      const { contact, consent, step, refs, aiSpec, estimate, ...brief } = d;
      const { data: project, error } = await supabase.from('projects').insert({
        client_id: auth.user.id, title: d.title.trim().slice(0, 160), service_id: d.service || null, brief,
        spec_md: specMd.slice(0, 20000), budget: d.budget || null, deadline: d.deadline || null, estimate: estimate || null,
        contact: { name: contact.name.trim(), email: auth.user.email, tg: contact.tg.trim(), phone: contact.phone.trim(), preferred: contact.preferred },
        cover_path: refs[0]?.path || null,
      }).select('id, number').single();
      if (error) throw error;
      if (refs.length) await supabase.rpc('attach_files_to_project', { p_project: project.id, p_files: refs.map((r) => r.id) });
      localStorage.removeItem(LS()); await clearDraft().catch(() => {});
      showSuccess(project);
    } catch (e) {
      console.error(e);
      toast(t(String(e.message || '').includes('rate_limited') ? 'errors.rate_limited' : 'errors.generic'), 'err');
      setBusy(btn, false);
    } finally { submitting = false; }
  }

  function showSuccess(project) {
    const card = $('.bd > .af-card', el);
    card.innerHTML = String(html`<div class="bd-success"><div class="bd-success__badge">${icon('check')}</div>
      <h3>${t('builder.successTitle', { no: projectNo(project.number) })}</h3><p>${t('builder.successText')}</p>
      <div class="af-row"><a class="af-btn af-btn--gold" href="#/projects/${project.id}">${t('builder.openProject')}</a>
      <a class="af-btn af-btn--ghost" href="#/builder" data-again>${t('builder.newProject')}</a></div></div>`);
    $('[data-again]', card).addEventListener('click', (e) => { e.preventDefault(); render(el, { query: {} }); });
    if (window.gsap) window.gsap.fromTo($('.bd-success__badge', card), { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.8)' });
  }

  paint();
  return () => { localStorage.setItem(LS(), JSON.stringify(d)); };
}
export { esc };
