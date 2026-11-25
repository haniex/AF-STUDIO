import { t } from '../core/i18n.js';
import { html, fmtRelative, projectNo, emptyState, errorState, $, reveal } from '../core/ui.js';
import { supabase } from '../lib/supabase.js';
import { a } from './i18n.js';

export async function render(el) {
  el.innerHTML = String(html`<div class="adm-kpis" data-kpis>${Array.from({ length: 6 }, () => html`<div class="af-skel" style="height:96px"></div>`)}</div>
    <div class="af-card" data-reveal style="margin-bottom:18px"><h3 class="af-h3">${a('activity')}</h3><div data-chart class="adm-chart"></div>
      <div class="adm-legend"><span style="--c:#d4a574">${a('lProjects')}</span><span style="--c:#8fb4ff">${a('lMessages')}</span><span style="--c:#7fbf8e">${a('lUsers')}</span><span style="--c:#c9a0ff">${a('lAi')}</span></div></div>
    <div class="af-grid af-grid--2">
      <div class="af-card" data-reveal><div class="af-card__head"><h3>${a('recent')}</h3><a class="af-link" href="#/projects">→</a></div><div class="ov-list" data-recent></div></div>
      <div class="af-card" data-reveal><div class="af-card__head"><h3>${a('unansweredList')}</h3><a class="af-link" href="#/messages">→</a></div><div class="ov-list" data-unanswered></div></div>
    </div>`);
  reveal(el);
  const [stats, act, recent, threads] = await Promise.all([
    supabase.rpc('admin_stats'), supabase.rpc('admin_activity', { p_days: 30 }),
    supabase.from('projects').select('id,number,title,status,created_at').order('created_at', { ascending: false }).limit(8),
    supabase.from('threads').select('id,subject,last_message_at,client_id').eq('status', 'open').eq('last_from_admin', false).order('last_message_at', { ascending: false }).limit(8),
  ]);
  if (stats.error) { el.innerHTML = String(errorState(stats.error.message)); return; }
  const s = stats.data;
  $('[data-kpis]', el).innerHTML = String(html`${['new_requests', 'active_projects', 'done_projects', 'unanswered', 'new_users_7d', 'users_total', 'ai_requests_today'].map((k) => html`
    <div class="adm-kpi ${['new_requests', 'unanswered'].includes(k) && s[k] > 0 ? 'adm-kpi--hot' : ''}"><b>${s[k] ?? 0}</b><span>${a('kpi.' + k)}</span></div>`)}`);

  const rows = act.data || [];
  const max = Math.max(1, ...rows.map((r) => Number(r.projects) + Number(r.messages) + Number(r.users) + Number(r.ai)));
  $('[data-chart]', el).innerHTML = String(html`${rows.map((r) => html`<div title="${r.day}: ${r.projects} / ${r.messages} / ${r.users} / ${r.ai}">
    ${[['projects', '#d4a574'], ['messages', '#8fb4ff'], ['users', '#7fbf8e'], ['ai', '#c9a0ff']].map(([k, c]) => html`<i style="height:${(Number(r[k]) / max) * 100}%;background:${c}"></i>`)}</div>`)}`);

  $('[data-recent]', el).innerHTML = (recent.data || []).length ? String(html`${recent.data.map((p) => html`<a href="#/projects/${p.id}"><span class="ov-list__main"><b>${p.title}</b><small>${projectNo(p.number)} · ${fmtRelative(p.created_at)}</small></span><span class="af-pill af-pill--${p.status}">${t('status.' + p.status)}</span></a>`)}`) : String(emptyState(a('empty')));
  $('[data-unanswered]', el).innerHTML = (threads.data || []).length ? String(html`${threads.data.map((th) => html`<a href="#/messages/${th.id}"><span class="ov-list__main"><b>${th.subject}</b><small>${fmtRelative(th.last_message_at)}</small></span></a>`)}`) : String(emptyState(a('empty')));
}
