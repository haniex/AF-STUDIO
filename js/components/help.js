// AF STUDIO 3.0 — Help center and keyboard shortcuts (used by the account menu and Settings Center).
import { t } from '../core/i18n.js';
import { html, icon, modal, $$ } from '../core/ui.js';
import { CONFIG } from '../config.js';

export const SHORTCUTS = [
  ['Ctrl / ⌘ + ,', 'kbd.settings'],
  ['[', 'kbd.sidebar'],
  ['/', 'kbd.search'],
  ['?', 'kbd.list'],
  ['G → O', 'kbd.goOverview'],
  ['G → P', 'kbd.goProjects'],
  ['G → A', 'kbd.goAi'],
  ['G → F', 'kbd.goFiles'],
  ['G → M', 'kbd.goMessages'],
  ['Esc', 'kbd.close'],
];

export function openShortcuts() {
  return modal({
    title: t('kbd.title'), size: 'sm',
    body: html`<div class="hp-kbd">${SHORTCUTS.map(([k, l]) => html`<div class="hp-kbd__row"><span>${t(l)}</span><kbd>${k}</kbd></div>`)}</div>
      <p class="af-muted" style="font-size:12.5px;margin-top:12px">${t('kbd.note')}</p>`,
    actions: [{ label: t('common.close'), value: null }],
  });
}

export function openHelp() {
  const c = CONFIG.CONTACTS || {};
  const tg = String(c.telegram || '').replace(/^@/, '');
  const faq = [1, 2, 3, 4, 5];
  const body = document.createElement('div');
  body.innerHTML = String(html`<div class="hp">
    <section class="hp-start">
      <h4>${t('help.startTitle')}</h4>
      <div class="hp-grid">
        <a href="#/builder" data-hp-go>${icon('builder')}<b>${t('help.qBuilder')}</b><small>${t('help.qBuilderSub')}</small></a>
        <a href="#/calculator" data-hp-go>${icon('calc')}<b>${t('help.qCalc')}</b><small>${t('help.qCalcSub')}</small></a>
        <a href="#/ai" data-hp-go>${icon('ai')}<b>${t('help.qAi')}</b><small>${t('help.qAiSub')}</small></a>
        <a href="#/projects" data-hp-go>${icon('projects')}<b>${t('help.qProjects')}</b><small>${t('help.qProjectsSub')}</small></a>
      </div>
    </section>
    <section>
      <h4>${t('help.faqTitle')}</h4>
      <div class="hp-faq">${faq.map((i) => html`<details><summary>${t('help.q' + i)}</summary><p>${t('help.a' + i)}</p></details>`)}</div>
    </section>
    <section>
      <h4>${t('help.contactTitle')}</h4>
      <div class="hp-contacts">
        <a href="#/messages" data-hp-go>${icon('messages')}<span><b>${t('help.writeStudio')}</b><small>${t('help.writeStudioSub')}</small></span></a>
        ${tg ? html`<a href="https://t.me/${tg}" target="_blank" rel="noopener noreferrer">${icon('send')}<span><b>Telegram</b><small>@${tg}</small></span></a>` : ''}
        ${c.email ? html`<a href="mailto:${c.email}">${icon('note')}<span><b>Email</b><small>${c.email}</small></span></a>` : ''}
        ${c.phone ? html`<a href="tel:${String(c.phone).replace(/[^\d+]/g, '')}">${icon('user')}<span><b>${t('help.phone')}</b><small>${c.phone}</small></span></a>` : ''}
      </div>
    </section>
    <div class="hp-actions">
      <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-hp-kbd>${t('kbd.title')}</button>
      <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-hp-tour>${t('help.tour')}</button>
      <span class="af-muted hp-ver">AF STUDIO 3.0</span>
    </div>
  </div>`);
  return modal({
    title: t('help.title'), size: 'lg', body,
    actions: [{ label: t('common.close'), value: null }],
    onMount: (b, close) => {
      $$('[data-hp-go]', b).forEach((a) => a.addEventListener('click', () => close(null)));
      b.querySelector('[data-hp-kbd]').addEventListener('click', () => { close(null); setTimeout(openShortcuts, 240); });
      b.querySelector('[data-hp-tour]').addEventListener('click', () => { close(null); window.dispatchEvent(new CustomEvent('af:onboarding')); });
    },
  });
}
