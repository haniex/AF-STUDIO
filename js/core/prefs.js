// Device-level preferences (animations, 3D quality, cursor glow). Stored locally per device.
const KEYS = { fx: 'af.fx', q3d: 'af.q3d', glow: 'af.glow' };
const sysReduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const defaultQ = () => (typeof window !== 'undefined' && (window.matchMedia?.('(max-width: 860px)').matches || (navigator.hardwareConcurrency || 8) <= 4) ? 'medium' : 'high');

export const prefs = {
  get fx() { return localStorage.getItem(KEYS.fx) || (sysReduced() ? 'reduced' : 'full'); },
  get q3d() { return localStorage.getItem(KEYS.q3d) || defaultQ(); },
  get glow() { return localStorage.getItem(KEYS.glow) !== '0'; },
  set(key, value) { localStorage.setItem(KEYS[key], String(value)); applyPrefs(); window.dispatchEvent(new CustomEvent('af:prefs', { detail: { key, value } })); },
};

export function applyPrefs() {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.classList.toggle('fx-reduced', prefs.fx === 'reduced');
  document.body.classList.toggle('fx-noglow', !prefs.glow);
}
