import { t, loc, locj } from '../core/i18n.js';
import { html, icon, fmtMoney, reveal, emptyState, errorState, skeleton, $, $$ } from '../core/ui.js';
import { getPricing, getDraft, saveDraft } from '../core/api.js';
import { navigate } from '../core/router.js';
import { estimate } from '../core/pricing.js';

export { estimate };

export async function render(el, { query }) {
  el.innerHTML = String(html`<header class="af-page-head"><div><span class="af-kicker">SMART PRICE CALCULATOR</span><h2>${t('calc.title')}</h2><p>${t('calc.sub')}</p></div></header>${skeleton(2)}`);
  let pricing;
  try { pricing = await getPricing(); } catch { el.innerHTML = String(errorState()); return; }
  const { categories, factors } = pricing;
  if (!categories.length) { el.innerHTML = String(emptyState(t('calc.title'), t('calc.empty'))); return; }
  const grp = (g) => factors.filter((f) => f.grp === g);
  const first = (g) => grp(g)[0]?.id || '';
  const s = {
    category: categories.some((c) => c.id === query.category) ? query.category : categories[0].id,
    complexity: first('complexity'), detail: first('detail'), urgency: first('urgency'),
    objects: 1, angles: 3, animation: 0, extras: [],
  };

  el.innerHTML = String(html`
    <header class="af-page-head" data-reveal><div><span class="af-kicker">SMART PRICE CALCULATOR</span><h2>${t('calc.title')}</h2><p>${t('calc.sub')}</p></div></header>
    <div class="calc">
      <section class="af-card" data-reveal>
        <p class="af-field" style="margin-bottom:8px"><span>${t('calc.category')}</span></p>
        <div class="calc-cats">${categories.map((c) => html`<button type="button" class="calc-cat" data-cat="${c.id}"><b>${loc(c, 'title')}</b><small>${t('calc.days', { a: c.days_min, b: c.days_max })}</small></button>`)}</div>
        ${radioRow('complexity', grp('complexity'))}
        ${stepRow('objects', 1, 30, 1)}
        ${stepRow('angles', 1, 50, 1)}
        ${radioRow('detail', grp('detail'))}
        ${stepRow('animation', 0, 600, 5)}
        <div class="calc-row"><span>${t('calc.extras')}</span><div class="af-chips">${grp('extras').map((f) => html`<button type="button" class="af-chip" data-extra="${f.id}" aria-pressed="false">${loc(f, 'label')}</button>`)}</div></div>
        ${radioRow('urgency', grp('urgency'))}
      </section>
      <aside class="af-card calc-result" data-reveal aria-live="polite" data-result></aside>
    </div>`);
  reveal(el);

  function radioRow(key, list) {
    return html`<div class="calc-row"><span>${t('calc.' + key)}</span><div class="af-chips" data-radio="${key}">${list.map((f) => html`<button type="button" class="af-chip" data-val="${f.id}">${loc(f, 'label')}</button>`)}</div></div>`;
  }
  function stepRow(key, min, max, stepBy) {
    return html`<div class="calc-row"><span>${t('calc.' + key)}</span><div class="af-row"><input class="af-range" type="range" min="${min}" max="${Math.min(max, key === 'animation' ? 120 : 20)}" step="${stepBy}" data-range="${key}" aria-label="${t('calc.' + key)}" style="max-width:260px" />
      <div class="af-stepper" data-stepper="${key}" data-min="${min}" data-max="${max}" data-step="${stepBy}"><button type="button" data-dec aria-label="-">−</button><input type="number" inputmode="numeric" aria-label="${t('calc.' + key)}" /><button type="button" data-inc aria-label="+">+</button></div></div></div>`;
  }

  function paint() {
    const cat = categories.find((c) => c.id === s.category);
    $$('[data-cat]', el).forEach((b) => b.classList.toggle('is-on', b.dataset.cat === s.category));
    $$('[data-radio]', el).forEach((g) => $$('[data-val]', g).forEach((b) => { const on = b.dataset.val === s[g.dataset.radio]; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); }));
    $$('[data-extra]', el).forEach((b) => { const on = s.extras.includes(b.dataset.extra); b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    $$('[data-stepper]', el).forEach((st) => { $('input', st).value = s[st.dataset.stepper]; });
    $$('[data-range]', el).forEach((r) => { r.value = Math.min(+r.max, s[r.dataset.range]); });
    const r = estimate(cat, factors, s);
    const scaleMax = Math.max(...categories.map((c) => Number(c.base_max))) * 4;
    const unconfirmed = categories.some((c) => !c.confirmed);
    $('[data-result]', el).innerHTML = String(html`
      <span class="af-kicker">${t('calc.range')}</span>
      <div class="calc-range">${fmtMoney(r.min, r.currency)} — ${fmtMoney(r.max, r.currency)}<small>${loc(cat, 'title')} · ${t('calc.included', { n: cat.included_angles })}</small></div>
      <div class="calc-bar" aria-hidden="true"><i style="left:${Math.min(96, (r.min / scaleMax) * 100)}%;right:${Math.max(0, 100 - (r.max / scaleMax) * 100)}%"></i></div>
      <hr class="af-divider" />
      <h4 class="af-h3" style="font-size:14px;margin-bottom:6px">${t('calc.timeline')}</h4><p>${t('calc.days', { a: r.daysMin, b: r.daysMax })}</p>
      <h4 class="af-h3" style="font-size:14px;margin:16px 0 6px">${t('calc.works')}</h4>
      <ul class="calc-list">${(cat.works || []).map((w) => html`<li>${locj(w)}</li>`)}${s.extras.map((id) => html`<li>${loc(factors.find((f) => f.id === id), 'label')}</li>`)}</ul>
      <h4 class="af-h3" style="font-size:14px;margin:16px 0 6px">${t('calc.extraCosts')}</h4><p class="af-muted" style="font-size:13.5px">${loc(cat, 'extras_note')}</p>
      <p class="af-note ${unconfirmed ? 'af-note--warn' : ''}" style="margin:18px 0">${icon('shield')}<span>${t('calc.note')}${unconfirmed ? ' ' + t('calc.unconfirmed') : ''}</span></p>
      <div class="af-grid"><button type="button" class="af-btn af-btn--gold af-btn--block" data-create>${icon('builder')}<span>${t('calc.create')}</span></button>
      <a class="af-btn af-btn--ghost af-btn--block" href="#/ai">${icon('ai')}<span>${t('calc.askAi')}</span></a></div>`);
    $('[data-create]', el).addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      const d = (await getDraft().catch(() => null)) || {};
      Object.assign(d, { service: s.category, angles: s.angles, objects: s.objects, animation: s.animation, urgent: (factors.find((f) => f.id === s.urgency)?.multiplier || 1) > 1,
        estimate: { ...r, category: s.category, complexity: s.complexity, detail: s.detail, extras: s.extras, urgency: s.urgency, at: new Date().toISOString() },
        step: Math.max(d.step || 0, 1) });
      try { await saveDraft(d); } catch { /* noop */ }
      navigate('/builder?from=calc');
    });
  }

  $$('[data-cat]', el).forEach((b) => b.addEventListener('click', () => { s.category = b.dataset.cat; paint(); }));
  $$('[data-radio]', el).forEach((g) => $$('[data-val]', g).forEach((b) => b.addEventListener('click', () => { s[g.dataset.radio] = b.dataset.val; paint(); })));
  $$('[data-extra]', el).forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.extra; s.extras = s.extras.includes(id) ? s.extras.filter((x) => x !== id) : [...s.extras, id]; paint();
  }));
  $$('[data-stepper]', el).forEach((st) => {
    const k = st.dataset.stepper; const min = +st.dataset.min; const max = +st.dataset.max; const by = +st.dataset.step;
    const put = (v) => { s[k] = Math.max(min, Math.min(max, Math.round(+v || 0))); paint(); };
    $('[data-dec]', st).addEventListener('click', () => put(s[k] - by));
    $('[data-inc]', st).addEventListener('click', () => put(s[k] + by));
    $('input', st).addEventListener('change', (e) => put(e.target.value));
  });
  $$('[data-range]', el).forEach((r) => r.addEventListener('input', () => { s[r.dataset.range] = +r.value; paint(); }));
  paint();
}
