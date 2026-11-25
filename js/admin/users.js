import { html, fmtDate, toast, confirmDialog, debounce, emptyState, errorState, $, $$ } from '../core/ui.js';
import { supabase } from '../lib/supabase.js';
import { auth } from '../core/auth.js';
import { a } from './i18n.js';

export async function render(el) {
  el.innerHTML = String(html`<div class="af-row" style="margin-bottom:16px"><input class="af-input" data-q placeholder="${a('search')}" style="max-width:420px" /></div>
    <div class="af-table-wrap"><table class="af-table"><thead><tr><th>Email</th><th>${a('client2')}</th><th>${a('registered')}</th><th>${a('projectsCount')}</th><th>${a('role')}</th><th></th></tr></thead><tbody data-rows></tbody></table></div>`);
  async function load(q = '') {
    const { data, error } = await supabase.rpc('admin_list_users', { p_search: q || null, p_limit: 100, p_offset: 0 });
    if (error) { $('[data-rows]', el).innerHTML = `<tr><td colspan="6">${String(errorState())}</td></tr>`; return; }
    $('[data-rows]', el).innerHTML = data.length ? String(html`${data.map((u) => html`<tr>
      <td>${u.email}</td><td>${u.full_name || '—'}</td><td>${fmtDate(u.created_at)}</td><td><a class="af-link" href="#/projects?client=${u.id}">${u.projects}</a></td>
      <td><span class="af-pill ${u.is_admin ? 'af-pill--concept' : 'af-pill--plain'}">${u.is_admin ? a('admin') : a('client')}</span></td>
      <td>${u.id === auth.user.id ? '' : html`<button type="button" class="af-btn af-btn--ghost af-btn--sm" data-role="${u.id}" data-admin="${u.is_admin ? '0' : '1'}" data-email="${u.email}">${u.is_admin ? a('revokeAdmin') : a('makeAdmin')}</button>`}</td></tr>`)}`)
      : `<tr><td colspan="6">${String(emptyState(a('empty')))}</td></tr>`;
    $$('[data-role]', el).forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmDialog(a('role'), a('roleConfirm', { email: b.dataset.email }), { danger: b.dataset.admin === '0' }))) return;
      const { error: e } = await supabase.rpc('admin_set_role', { p_user: b.dataset.role, p_admin: b.dataset.admin === '1' });
      if (e) return toast(e.message, 'err');
      toast(a('saved'), 'ok'); load($('[data-q]', el).value.trim());
    }));
  }
  $('[data-q]', el).addEventListener('input', debounce((e) => load(e.target.value.trim()), 350));
  load();
}
