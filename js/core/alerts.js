// AF STUDIO 3.0 — client alerts for new notifications:
// pop-up toast (per-category), sound, system browser notification, quiet hours,
// and optional soft UI sounds. Every switch here is driven by user_preferences.
import { getPreferences, inQuietHours, notificationCategory } from './preferences.js';

let ctx = null;
function audio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch (_) { ctx = null; }
  return ctx;
}
/** Generated chime (no audio files, no network). kind: 'notify' | 'tick' */
export function playTone(kind = 'notify') {
  const a = audio(); if (!a) return false;
  if (a.state === 'suspended') a.resume().catch(() => {});
  const now = a.currentTime;
  const notes = kind === 'tick' ? [[1320, 0, 0.05, 0.035]] : [[880, 0, 0.18, 0.08], [1318.5, 0.11, 0.32, 0.07]];
  notes.forEach(([f, start, dur, vol]) => {
    const o = a.createOscillator(); const g = a.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now + start);
    g.gain.exponentialRampToValueAtTime(vol, now + start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    o.connect(g).connect(a.destination); o.start(now + start); o.stop(now + start + dur + 0.02);
  });
  return true;
}

export const browserSupport = () => typeof window !== 'undefined' && 'Notification' in window;
export const browserPermission = () => (browserSupport() ? Notification.permission : 'unsupported');
/** Must be called from a user gesture (button click) — never on page load. */
export async function requestBrowserPermission() {
  if (!browserSupport()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try { return await Notification.requestPermission(); } catch (_) { return Notification.permission; }
}

/**
 * Decide how a freshly arrived notification is presented. Pure: easy to test.
 * The notification record itself is always kept in the Notifications center.
 */
export function alertPlan(n, prefs = getPreferences(), { now = new Date(), hidden = false, permission = 'default' } = {}) {
  const np = prefs.notifications;
  const cat = notificationCategory(n?.type);
  const quiet = inQuietHours(np, now);
  const popupAllowed = cat ? np[cat]?.in_app !== false : true;
  const popup = popupAllowed && !quiet;
  return {
    category: cat, quiet,
    toast: popup,
    sound: popup && np.sound === true,
    browser: popup && np.browser === true && permission === 'granted' && hidden,
  };
}

export function showBrowserNotification(title, body, link) {
  try {
    const n = new Notification(title, { body: body || '', tag: 'af-' + Date.now(), icon: undefined, silent: true });
    n.onclick = () => { window.focus(); if (link && link.startsWith('#/')) location.hash = link; n.close(); };
    return true;
  } catch (_) { return false; }
}

// ------------------------------------------------------------ UI sounds (experimental)
let uiBound = false;
export function bindUiSounds() {
  if (uiBound) return; uiBound = true;
  document.addEventListener('pointerdown', (e) => {
    if (!getPreferences().experimental.ui_sounds) return;
    if (e.target.closest?.('.af-btn, .af-seg button, .af-nav__item, .sc-nav button, .af-chip, .sc-switch, .af-tabs button')) playTone('tick');
  }, { passive: true });
}
