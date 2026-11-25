import { t } from '../core/i18n.js';
import { html, reveal, emptyState, errorState, skeleton, $ } from '../core/ui.js';
import { getPortfolio, getFavorites, withMedia } from '../core/api.js';
import { cardHtml, bindFavs } from './portfolio.js';
import { tilt } from '../legacy/widgets.js';

export async function render(el) {
  el.innerHTML = String(html`
    <header class="af-page-head" data-reveal><div><span class="af-kicker">AF CLIENT SPACE</span><h2>${t('favorites.title')}</h2><p>${t('favorites.sub')}</p></div></header>
    <div class="pf-grid" data-grid>${skeleton(3)}</div>`);
  reveal(el);
  let items, favs;
  try { [items, favs] = await Promise.all([getPortfolio(), getFavorites()]); } catch { $('[data-grid]', el).innerHTML = String(errorState()); return; }
  const list = await withMedia(items.filter((p) => favs.has(p.id)));
  const grid = $('[data-grid]', el);
  const paint = (rows) => {
    if (!rows.length) { grid.outerHTML = String(emptyState(t('favorites.empty'), t('favorites.emptySub'), html`<a class="af-btn af-btn--ghost" href="#/portfolio">${t('overview.qPortfolio')}</a>`)); return; }
    grid.innerHTML = String(html`${rows.map((p) => cardHtml(p, favs))}`);
    bindFavs(grid, favs, (id, on) => { if (!on) { const card = grid.querySelector(`[data-id="${id}"]`); card?.remove(); if (!grid.children.length) paint([]); } });
  };
  paint(list);
  return tilt(el);
}
