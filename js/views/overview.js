import { t, loc } from '../core/i18n.js';
import { html, icon, fmtRelative, projectNo, reveal, magnetic, emptyState, skeleton } from '../core/ui.js';
import { auth } from '../core/auth.js';
import { supabase } from '../lib/supabase.js';
import { listProjects, listThreads, getFavorites, getServices } from '../core/api.js';
import { heroScene, countUp } from '../legacy/widgets.js';
import { ABOUT } from '../data/about.js';
import { locj } from '../core/i18n.js';

export async function render(el) {
  const name = (auth.profile?.full_name || '').split(' ')[0] || auth.user.email.split('@')[0];
  el.innerHTML = String(html`
    <section class="ov-hero" data-reveal>
      <canvas aria-hidden="true"></canvas>
      <span class="ov-hero__badge">${t('overview.heroKicker')}</span>
      <h2>${t('overview.hello', { name })}<br /><em>${t('overview.sub')}</em></h2>
      <p>${t('overview.heroSub')}</p>
      <div class="af-row">
        <a class="af-btn af-btn--gold magnetic" href="#/builder">${icon('builder')}<span>${t('overview.qBuilder')}</span></a>
        <a class="af-btn af-btn--ghost magnetic" href="#/portfolio">${t('overview.qPortfolio')}</a>
      </div>
    </section>
    <section class="ov-stats" data-stats>${skeleton(4, 'af-skel-row')}</section>
    <section class="af-card ov-about" data-reveal style="margin-bottom:22px">
      <div class="about-grid">
        <div class="about-text"><span class="af-kicker">01 · ${t('nav.overview')}</span>
          <p class="about-lead">${locj(ABOUT.lead)}</p><p>${locj(ABOUT.text)}</p>
          <div class="about-stats" data-about-stats>${ABOUT.stats.map((s) => html`<div class="stat"><span class="stat-num" data-count="${s.n}">0</span><span class="stat-label">${locj(s)}</span></div>`)}</div>
        </div>
        <div class="about-skills"><div class="skills-cloud">${ABOUT.tools.map((x) => html`<span class="skill magnetic">${x}</span>`)}</div>
          <div class="about-extra"><ul>${ABOUT.extra.map((x) => html`<li>${locj(x)}</li>`)}</ul></div></div>
      </div>
    </section>
    <section class="af-grid af-grid--2">
      <div class="af-card" data-reveal>
        <div class="af-card__head"><h3>${t('overview.quick')}</h3></div>
        <div class="ov-quick">
          <a href="#/builder">${icon('builder')}<span>${t('overview.qBuilder')}</span></a>
          <a href="#/calculator">${icon('calc')}<span>${t('overview.qCalc')}</span></a>
          <a href="#/ai">${icon('ai')}<span>${t('overview.qAi')}</span></a>
          <a href="#/moodboard">${icon('mood')}<span>${t('overview.qMood')}</span></a>
          <a href="#/lab">${icon('lab')}<span>${t('nav.lab')}</span></a>
          <a href="#/files">${icon('files')}<span>${t('nav.files')}</span></a>
        </div>
      </div>
      <div class="af-card" data-reveal>
        <div class="af-card__head"><h3>${t('overview.recentProjects')}</h3><a class="af-link" href="#/projects">${t('common.viewAll')}</a></div>
        <div class="ov-list" data-projects>${skeleton(3, 'af-skel-row')}</div>
      </div>
      <div class="af-card" data-reveal>
        <div class="af-card__head"><h3>${t('overview.recentMsgs')}</h3><a class="af-link" href="#/messages">${t('common.viewAll')}</a></div>
        <div class="ov-list" data-msgs>${skeleton(3, 'af-skel-row')}</div>
      </div>
      <div class="af-card" data-reveal>
        <div class="af-card__head"><h3>${t('notif.title')}</h3><a class="af-link" href="#/notifications">${t('common.viewAll')}</a></div>
        <div class="ov-list" data-notifs>${skeleton(3, 'af-skel-row')}</div>
      </div>
    </section>`);
  reveal(el); magnetic(el);
  countUp(el.querySelector('[data-about-stats]'));
  const stopHero = await heroScene(el.querySelector('.ov-hero canvas'));

  try {
    const [projects, threads, favs, services, notifs, unread] = await Promise.all([
      listProjects(), listThreads(), getFavorites(), getServices(),
      supabase.from('notifications').select('*').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(5).then((r) => r.data || []),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', auth.user.id).is('read_at', null).then((r) => r.count || 0),
    ]);
    if (!el.isConnected) return stopHero;
    const active = projects.filter((p) => !['new', 'done'].includes(p.status)).length;
    const svc = Object.fromEntries(services.map((s) => [s.id, s]));
    el.querySelector('[data-stats]').innerHTML = String(html`
      ${[[projects.length, 'overview.projects', '/projects'], [active, 'overview.active', '/projects'], [favs.size, 'overview.favorites', '/favorites'], [unread, 'overview.unread', '/notifications']]
        .map(([n, k, href]) => html`<a class="af-card af-card--hover af-stat" href="#${href}"><b data-count="${n}">0</b><span>${t(k)}</span></a>`)}`);
    countUp(el.querySelector('[data-stats]'));

    el.querySelector('[data-projects]').innerHTML = projects.length ? String(html`${projects.slice(0, 4).map((p) => html`
      <a href="#/projects/${p.id}"><span class="ov-list__main"><b>${p.title}</b><small>${projectNo(p.number)} · ${loc(svc[p.service_id], 'title') || '—'}</small></span>
      <span class="af-pill af-pill--${p.status}">${t('status.' + p.status)}</span></a>`)}`)
      : String(emptyState(t('overview.noProjects'), '', html`<a class="af-btn af-btn--ghost af-btn--sm" href="#/builder">${t('overview.qBuilder')}</a>`));

    el.querySelector('[data-msgs]').innerHTML = threads.length ? String(html`${threads.slice(0, 4).map((th) => html`
      <a href="#/messages/${th.id}"><span class="ov-list__main"><b>${th.subject}</b><small>${th.last_from_admin ? t('messages.studio') : t('messages.you')} · ${fmtRelative(th.last_message_at)}</small></span>${icon('arrowR')}</a>`)}`)
      : String(emptyState(t('overview.noMsgs')));

    const { notifText, openNotifLink } = await import('../app/shell.js');
    const nEl = el.querySelector('[data-notifs]');
    nEl.innerHTML = notifs.length ? String(html`${notifs.map((n) => html`
      <a href="${n.link && n.link.startsWith('#') ? n.link : '#/notifications'}" data-n="${n.id}"><span class="ov-list__main"><b>${notifText(n)}</b><small>${fmtRelative(n.created_at)}</small></span>${n.read_at ? '' : html`<span class="af-pill af-pill--new af-pill--plain">${t('common.new')}</span>`}</a>`)}`)
      : String(emptyState(t('notif.empty')));
    nEl.querySelectorAll('[data-n]').forEach((a) => a.addEventListener('click', (e) => {
      const n = notifs.find((x) => x.id === a.dataset.n);
      if (n?.link?.startsWith('admin.html')) { e.preventDefault(); openNotifLink(n); }
    }));
  } catch (e) {
    console.error(e);
  }
  return stopHero;
}
