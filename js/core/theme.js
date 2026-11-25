// Theme (light / dark). Own storage key: independent from the old site on the same domain.
const KEY = 'af.theme';
export const getTheme = () => (document.body.classList.contains('light') ? 'light' : 'dark');
export function applyTheme(theme) {
  const v = theme === 'light' ? 'light' : 'dark';
  document.body.classList.remove('light', 'dark');
  document.body.classList.add(v);
  localStorage.setItem(KEY, v);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = v === 'dark' ? '#0a0908' : '#faf8f5';
  window.dispatchEvent(new CustomEvent('af:theme', { detail: v }));
}
export function initTheme() { applyTheme(localStorage.getItem(KEY) || 'dark'); }
