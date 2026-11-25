import { html, fmtDateTime, errorState, emptyState } from '../core/ui.js';
import { supabase } from '../lib/supabase.js';
import { a } from './i18n.js';

export async function render(el) {
  const { data, error } = await supabase.from('admin_audit').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) { el.innerHTML = String(errorState(error.message)); return; }
  const ids = [...new Set(data.map((r) => r.admin_id).filter(Boolean))];
  const { data: people } = ids.length ? await supabase.from('profiles').select('id,email').in('id', ids) : { data: [] };
  const who = Object.fromEntries((people || []).map((p) => [p.id, p.email]));
  el.innerHTML = data.length ? String(html`<div class="af-table-wrap"><table class="af-table"><thead><tr><th>${a('when')}</th><th>${a('who')}</th><th>${a('action')}</th><th>${a('entity')}</th><th>data</th></tr></thead>
    <tbody>${data.map((r) => html`<tr><td>${fmtDateTime(r.created_at)}</td><td>${who[r.admin_id] || '—'}</td><td>${r.action}</td><td>${r.entity} · ${String(r.entity_id || '').slice(0, 8)}</td><td><code>${JSON.stringify(r.data)}</code></td></tr>`)}</tbody></table></div>`)
    : String(emptyState(a('empty')));
}
