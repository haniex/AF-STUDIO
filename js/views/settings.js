// #/settings — kept for direct links and backwards compatibility.
// The settings themselves live in the AF SETTINGS CENTER (central modal over the current screen).
// A direct visit shows the previous route (or Overview) underneath and opens the Center on top,
// replacing the #/settings history entry so Back/Forward keep working naturally.
import { openSettingsCenter, closeSettingsCenter, isSettingsOpen } from '../components/settings-center.js';
import { refreshRoute } from '../core/router.js';

const SECTIONS = ['account', 'notifications', 'ai', 'appearance', 'workspace', 'security', 'data', 'experimental'];

export { openSettingsCenter, closeSettingsCenter, isSettingsOpen };

export async function render(el, { query } = {}) {
  const prev = sessionStorage.getItem('af.lastRoute');
  const back = prev && /^#\/[\w\-/?=&%.]*$/.test(prev) && !prev.startsWith('#/settings') ? prev : '#/overview';
  const category = SECTIONS.includes(query?.section) ? query.section : undefined;
  history.replaceState(null, '', back);
  // re-resolve the route underneath (the router renders the previous screen into its own container)
  refreshRoute();
  setTimeout(() => openSettingsCenter({ category }), 0);
  return undefined;
}
