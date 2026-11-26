import { html, toast, fmtDate, fmtDateTime, errorState, emptyState, $, setBusy } from '../core/ui.js';
import { supabase } from '../lib/supabase.js';
import { a } from './i18n.js';

export async function render(el) {
  const { data: s, error } = await supabase.from('ai_settings').select('*').eq('id', 1).maybeSingle();
  if (error || !s) { el.innerHTML = String(errorState(error?.message)); return; }
  const { data: usage } = await supabase.from('ai_usage').select('day,count').order('day', { ascending: false }).limit(500);
  const byDay = {}; (usage || []).forEach((u) => { byDay[u.day] = (byDay[u.day] || 0) + u.count; });
  el.innerHTML = String(html`<div class="af-grid af-grid--2">
    <form class="af-card" data-f>
      <label class="af-switch"><span>${a('aiEnabled')}</span><input type="checkbox" name="enabled" ${s.enabled ? 'checked' : ''} /></label>
      ${'web_search' in s ? html`<label class="af-switch"><span>${a('aiWeb')}</span><input type="checkbox" name="web_search" ${s.web_search !== false ? 'checked' : ''} /></label>
        <p class="af-muted" style="font-size:12px;margin:4px 0 0">${a('aiWebHint')}</p>` : html`<p class="af-muted" style="font-size:12px;margin:8px 0 0">${a('aiWebMigration')}</p>`}
      <label class="af-field" style="margin-top:14px"><span>${a('aiModel')}</span><input name="model" value="${s.model}" pattern="[a-z0-9.\\-]+" /></label>
      <label class="af-field"><span>${a('aiDaily')}</span><input type="number" min="0" max="1000" name="daily_limit" value="${s.daily_limit}" /></label>
      <label class="af-field"><span>${a('aiMinute')}</span><input type="number" min="1" max="60" name="per_minute_limit" value="${s.per_minute_limit}" /></label>
      <label class="af-field"><span>${a('aiMaxChars')}</span><input type="number" min="200" max="20000" name="max_input_chars" value="${s.max_input_chars}" /></label>
      <label class="af-field"><span>${a('aiExtra')}</span><textarea name="extra_instructions" rows="5" maxlength="4000">${s.extra_instructions}</textarea></label>
      <p class="af-muted" style="font-size:12px;margin-bottom:12px">updated ${fmtDateTime(s.updated_at)}</p>
      <button type="submit" class="af-btn af-btn--primary">${a('save')}</button>
    </form>
    <div class="af-card"><h3 class="af-h3">${a('aiUsage')}</h3>
      ${Object.keys(byDay).length ? html`<table class="af-table"><tbody>${Object.entries(byDay).slice(0, 30).map(([d, c]) => html`<tr><td>${fmtDate(d)}</td><td><b>${c}</b></td></tr>`)}</tbody></table>` : emptyState(a('empty'))}</div></div>`);
  $('[data-f]', el).addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; const b = $('button[type=submit]', f); setBusy(b, true);
    const patch = { ...(f.web_search ? { web_search: f.web_search.checked } : {}), enabled: f.enabled.checked, model: f.model.value.trim(), daily_limit: +f.daily_limit.value, per_minute_limit: +f.per_minute_limit.value, max_input_chars: +f.max_input_chars.value, extra_instructions: f.extra_instructions.value };
    const { error: err } = await supabase.from('ai_settings').update(patch).eq('id', 1);
    setBusy(b, false);
    toast(err ? err.message : a('saved'), err ? 'err' : 'ok');
  });
}
