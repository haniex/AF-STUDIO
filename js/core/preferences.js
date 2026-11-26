// =====================================================================
// AF STUDIO 3.0 — account preferences (single API for the whole app)
// Source of truth: public.user_preferences on the server (RPC get/save/reset).
// The localStorage snapshot is ONLY a visual hint to avoid a flash on boot;
// it is tied to the user id and wiped on sign-out / account switch.
// Device-only settings (af.fx / af.q3d / af.glow) stay in js/core/prefs.js.
// =====================================================================

const CH = 'channels'; const B = 'bool'; const TIME = 'time'; const TZ = 'tz';

/** Allowlist — must match public.af_pref_spec() in 20261126000001_user_preferences.sql */
export const SPEC = Object.freeze({
  notifications: {
    project_updates: CH, messages: CH, approvals: CH, files: CH, ai: CH, platform_news: CH,
    sound: B, browser: B, quiet_enabled: B, quiet_from: TIME, quiet_to: TIME, quiet_tz: TZ,
  },
  ai: {
    response_style: ['concise', 'balanced', 'detailed'], response_language: ['auto', 'ru', 'en'],
    default_mode: ['chat', 'brief', 'estimate'], save_history: B, use_project_context: B, moodboard_images: B, extended_stats: B,
  },
  appearance: {
    text_scale: [90, 100, 110, 120], density: ['comfortable', 'compact'], contrast: ['standard', 'high'],
    card_style: ['default', 'minimal'], sidebar: ['expanded', 'compact'], accent: ['gold', 'champagne', 'bronze', 'platinum'],
    tooltips: B, hover_effects: B,
  },
  workspace: {
    start_page: ['overview', 'projects', 'ai', 'portfolio'], projects_view: ['grid', 'list'],
    projects_sort: ['updated_desc', 'created_desc', 'name_asc', 'status'], files_view: ['list', 'grid'],
    files_sort: ['created_desc', 'created_asc', 'name_asc', 'size_desc'],
    project_default_tab: ['overview', 'files', 'review', 'messages', 'history'], page_size: [12, 24, 48],
    remember_filters: B, ov_stats: B, ov_quick: B, ov_activity: B, ov_favorites: B, ov_ai: B, ov_about: B, kbd_hints: B,
  },
  experimental: { reveal: B, ripple: B, scroll_progress: B, ui_sounds: B, hero_hint: B },
});

const ch = (in_app, email) => ({ in_app, email });
/** Defaults — must match public.af_pref_defaults() */
export const DEFAULT_PREFERENCES = Object.freeze({
  notifications: {
    project_updates: ch(true, true), messages: ch(true, true), approvals: ch(true, true), files: ch(true, true),
    ai: ch(false, false), platform_news: ch(false, false),
    sound: false, browser: false, quiet_enabled: false, quiet_from: '22:00', quiet_to: '08:00', quiet_tz: '',
  },
  ai: { response_style: 'balanced', response_language: 'auto', default_mode: 'chat', save_history: true, use_project_context: false, moodboard_images: true, extended_stats: true },
  appearance: { text_scale: 100, density: 'comfortable', contrast: 'standard', card_style: 'default', sidebar: 'expanded', accent: 'gold', tooltips: true, hover_effects: true },
  workspace: {
    start_page: 'overview', projects_view: 'grid', projects_sort: 'updated_desc', files_view: 'list', files_sort: 'created_desc',
    project_default_tab: 'overview', page_size: 24, remember_filters: false,
    ov_stats: true, ov_quick: true, ov_activity: true, ov_favorites: true, ov_ai: true, ov_about: true, kbd_hints: true,
  },
  experimental: { reveal: true, ripple: true, scroll_progress: true, ui_sounds: false, hero_hint: true },
});
export const CATEGORIES = Object.keys(SPEC);

const clone = (o) => JSON.parse(JSON.stringify(o));
const HHMM = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const TZ_RE = /^([A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2})?$/;

/** Validate one value against its rule. Returns true when allowed. */
export function validValue(rule, v) {
  if (Array.isArray(rule)) return (typeof v === 'string' || typeof v === 'number') && rule.includes(v);
  if (rule === B) return typeof v === 'boolean';
  if (rule === TIME) return typeof v === 'string' && HHMM.test(v);
  if (rule === TZ) return typeof v === 'string' && v.length <= 64 && TZ_RE.test(v);
  if (rule === CH) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    const keys = Object.keys(v);
    return keys.length > 0 && keys.every((k) => (k === 'in_app' || k === 'email') && typeof v[k] === 'boolean');
  }
  return false;
}

/** Client mirror of the server allowlist. → { ok } | { ok:false, error, key } */
export function validatePatch(category, patch) {
  const spec = SPEC[category];
  if (!spec) return { ok: false, error: 'unknown_category', key: category };
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { ok: false, error: 'invalid_patch' };
  const keys = Object.keys(patch);
  if (!keys.length) return { ok: false, error: 'empty_patch' };
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(spec, k)) return { ok: false, error: 'unknown_key', key: k };
    if (!validValue(spec[k], patch[k])) return { ok: false, error: 'invalid_value', key: k };
  }
  return { ok: true };
}

/** Merge raw server/snapshot data over defaults, dropping anything not allowed. */
export function normalizePreferences(raw) {
  const out = clone(DEFAULT_PREFERENCES);
  if (!raw || typeof raw !== 'object') return out;
  for (const cat of CATEGORIES) {
    const src = raw[cat];
    if (!src || typeof src !== 'object') continue;
    for (const [k, rule] of Object.entries(SPEC[cat])) {
      if (!(k in src)) continue;
      if (rule === CH && src[k] && typeof src[k] === 'object') {
        const m = { ...out[cat][k] };
        if (typeof src[k].in_app === 'boolean') m.in_app = src[k].in_app;
        if (typeof src[k].email === 'boolean') m.email = src[k].email;
        out[cat][k] = m;
      } else if (validValue(rule, src[k])) out[cat][k] = src[k];
    }
  }
  return out;
}

/** Apply a patch locally (channels merge one level deep) — same semantics as the server. */
export function mergePatch(prefs, category, patch) {
  const next = clone(prefs);
  for (const [k, v] of Object.entries(patch)) {
    next[category][k] = SPEC[category][k] === CH ? { ...next[category][k], ...v } : v;
  }
  return next;
}

/** Map a Supabase/PostgREST error to a stable code used by the UI. */
export function prefErrorCode(err) {
  const msg = String(err?.message || err || '');
  if (err?.code === 'PGRST202' || err?.code === '42883' || /could not find the function/i.test(msg)) return 'not_installed';
  if (/pref_conflict/.test(msg)) return 'conflict';
  if (/unknown_category|unknown_key|invalid_value|invalid_patch|empty_patch|patch_too_large/.test(msg)) return 'invalid';
  if (/not_authenticated|JWT|401/.test(msg) || err?.code === '28000') return 'auth';
  if (err?.name === 'TypeError' || /Failed to fetch|NetworkError|network|Load failed/i.test(msg) || (typeof navigator !== 'undefined' && navigator.onLine === false)) return 'network';
  return 'generic';
}

// ---------------------------------------------------------------------
// State
// ---------------------------------------------------------------------
const SNAP_KEY = 'af.prefs.snap';
const fresh = () => ({ uid: null, data: clone(DEFAULT_PREFERENCES), updatedAt: null, loaded: false, error: null, installed: true });
let state = fresh();
let epoch = 0; // bumps on clear/switch so late responses of a previous user are ignored
const listeners = new Set();
// supabase-js is loaded lazily so the pure helpers of this module stay importable in Node tests
let rpc = async (name, args) => (await import('../lib/supabase.js')).supabase.rpc(name, args);
/** test hook */
export function __setRpc(fn) { rpc = fn; }

function emit(category = null) {
  const detail = { prefs: state.data, category, loaded: state.loaded, error: state.error };
  listeners.forEach((fn) => { try { fn(detail); } catch (e) { console.error(e); } });
  if (typeof window !== 'undefined' && window.dispatchEvent && typeof CustomEvent !== 'undefined') {
    window.dispatchEvent(new CustomEvent('af:preferences', { detail }));
  }
}
function snapshot() {
  try {
    if (!state.uid) return;
    const { appearance, experimental, workspace } = state.data;
    localStorage.setItem(SNAP_KEY, JSON.stringify({ uid: state.uid, appearance, experimental, workspace: { ov_stats: workspace.ov_stats, ov_quick: workspace.ov_quick, ov_activity: workspace.ov_activity, ov_favorites: workspace.ov_favorites, ov_ai: workspace.ov_ai, ov_about: workspace.ov_about } }));
  } catch (_) { /* storage may be unavailable */ }
}
function readSnapshot() { try { return JSON.parse(localStorage.getItem(SNAP_KEY) || 'null'); } catch (_) { return null; } }

export const getPreferences = () => state.data;
export const preferencesState = () => ({ uid: state.uid, loaded: state.loaded, error: state.error, installed: state.installed, updatedAt: state.updatedAt });
export function onPreferencesChange(cb) { listeners.add(cb); return () => listeners.delete(cb); }

/** Visual-only early apply (before the session is verified). Never used as truth. */
export function applySnapshot() {
  const s = readSnapshot();
  if (s && s.uid) applyAccountPreferences(normalizePreferences(s));
}

/** Load for the verified user. Never throws: on failure defaults stay and state.error is set. */
export async function loadPreferences(uid) {
  if (!uid) return state.data;
  if (state.uid !== uid) { // account switch → never reuse the previous user's cache
    state = fresh(); state.uid = uid; epoch++;
    const s = readSnapshot();
    if (s && s.uid === uid) state.data = normalizePreferences(s); else { try { localStorage.removeItem(SNAP_KEY); } catch (_) { /* noop */ } }
  }
  const my = epoch;
  try {
    const { data, error } = await rpc('get_my_preferences');
    if (my !== epoch) return state.data;
    if (error) throw error;
    state.data = normalizePreferences(data); state.updatedAt = data?.updated_at || null;
    state.loaded = true; state.error = null; state.installed = true;
    snapshot();
  } catch (e) {
    if (my !== epoch) return state.data;
    state.error = prefErrorCode(e); state.installed = state.error !== 'not_installed';
    console.warn('[preferences] load failed:', state.error, e?.message || e);
  }
  applyAccountPreferences(); emit();
  return state.data;
}

/** Partial update of one category. Optimistic + rollback. Throws {code} on failure. */
export async function savePreferences(category, patch) {
  const v = validatePatch(category, patch);
  if (!v.ok) { const e = new Error(v.error); e.code = 'invalid'; e.key = v.key; throw e; }
  if (!state.uid) { const e = new Error('auth'); e.code = 'auth'; throw e; }
  const my = epoch;
  const before = clone(state.data); const beforeAt = state.updatedAt;
  state.data = mergePatch(state.data, category, patch);
  applyAccountPreferences(); emit(category);
  const call = () => rpc('save_my_preferences', { p_category: category, p_patch: patch, p_expected: state.updatedAt });
  try {
    let { data, error } = await call();
    if (error && prefErrorCode(error) === 'conflict') {
      // Another device changed preferences. Reload; re-apply ONLY if the keys we touch were not changed there.
      const fresh2 = await rpc('get_my_preferences');
      if (fresh2.error) throw fresh2.error;
      const server = normalizePreferences(fresh2.data);
      const untouched = Object.keys(patch).every((k) => JSON.stringify(server[category][k]) === JSON.stringify(before[category][k]));
      state.updatedAt = fresh2.data?.updated_at || null;
      if (!untouched) {
        state.data = server; applyAccountPreferences(); emit(category); snapshot();
        const e = new Error('conflict'); e.code = 'conflict'; throw e;
      }
      state.data = mergePatch(server, category, patch);
      ({ data, error } = await call());
    }
    if (error) throw error;
    if (my !== epoch) return state.data;
    state.data = normalizePreferences(data); state.updatedAt = data?.updated_at || null;
    state.loaded = true; state.error = null; state.installed = true;
    applyAccountPreferences(); emit(category); snapshot();
    return state.data;
  } catch (e) {
    if (my !== epoch) throw e;
    const code = e.code === 'conflict' ? 'conflict' : prefErrorCode(e);
    if (code !== 'conflict') { state.data = before; state.updatedAt = beforeAt; applyAccountPreferences(); emit(category); }
    if (code === 'not_installed') state.installed = false;
    const err = new Error(code); err.code = code; err.cause = e; throw err;
  }
}

/** Reset ONE category to defaults on the server. */
export async function resetPreferences(category) {
  if (!SPEC[category]) { const e = new Error('invalid'); e.code = 'invalid'; throw e; }
  const my = epoch; const before = clone(state.data);
  state.data = { ...state.data, [category]: clone(DEFAULT_PREFERENCES[category]) };
  applyAccountPreferences(); emit(category);
  try {
    const { data, error } = await rpc('reset_my_preferences', { p_category: category });
    if (error) throw error;
    if (my !== epoch) return state.data;
    state.data = normalizePreferences(data); state.updatedAt = data?.updated_at || null;
    applyAccountPreferences(); emit(category); snapshot();
    return state.data;
  } catch (e) {
    if (my === epoch) { state.data = before; applyAccountPreferences(); emit(category); }
    const err = new Error(prefErrorCode(e)); err.code = prefErrorCode(e); throw err;
  }
}

/** Sign-out / account switch: forget everything of the previous user. */
export function clearPreferences() {
  epoch++; state = fresh();
  try { localStorage.removeItem(SNAP_KEY); } catch (_) { /* noop */ }
  applyAccountPreferences(); emit();
}

// ---------------------------------------------------------------------
// Apply to the document: data attributes + CSS custom properties (scoped CSS in css/settings-center.css)
// ---------------------------------------------------------------------
const ACCENTS = {
  gold: ['#d4a574', '#f3d9b8'], champagne: ['#e6cfa6', '#fbefd9'], bronze: ['#b9784a', '#e2ab7f'], platinum: ['#c9ccd3', '#f1f2f5'],
};
export function applyAccountPreferences(p = state.data, root = (typeof document !== 'undefined' ? document.documentElement : null)) {
  if (!root || !root.setAttribute) return;
  const a = p.appearance; const w = p.workspace; const x = p.experimental;
  const set = (k, v) => root.setAttribute(k, String(v));
  set('data-af-scale', a.text_scale); set('data-af-density', a.density); set('data-af-contrast', a.contrast);
  set('data-af-card-style', a.card_style); set('data-af-sidebar', a.sidebar); set('data-af-accent', a.accent);
  set('data-af-tooltips', a.tooltips ? 'on' : 'off'); set('data-af-hover', a.hover_effects ? 'on' : 'off');
  ['ov_stats', 'ov_quick', 'ov_activity', 'ov_favorites', 'ov_ai', 'ov_about'].forEach((k) => set('data-af-' + k.replace('_', '-'), w[k] ? 'on' : 'off'));
  set('data-af-kbd', w.kbd_hints ? 'on' : 'off');
  set('data-af-reveal', x.reveal ? 'on' : 'off'); set('data-af-ripple', x.ripple ? 'on' : 'off');
  set('data-af-progress', x.scroll_progress ? 'on' : 'off'); set('data-af-hero-hint', x.hero_hint ? 'on' : 'off');
  if (root.style?.setProperty) {
    root.style.setProperty('--af-text-scale', String(a.text_scale / 100));
    if (a.accent !== 'gold') { root.style.setProperty('--af-accent-1', ACCENTS[a.accent][0]); root.style.setProperty('--af-accent-2', ACCENTS[a.accent][1]); }
    else { root.style.removeProperty('--af-accent-1'); root.style.removeProperty('--af-accent-2'); }
  }
}

// ---------------------------------------------------------------------
// Small pure helpers used by several modules (unit-tested)
// ---------------------------------------------------------------------
/** Is `now` (Date) inside the quiet window, using the browser's local time? */
export function inQuietHours(np, now = new Date()) {
  if (!np?.quiet_enabled || !HHMM.test(np.quiet_from || '') || !HHMM.test(np.quiet_to || '')) return false;
  const m = now.getHours() * 60 + now.getMinutes();
  const a = +np.quiet_from.slice(0, 2) * 60 + +np.quiet_from.slice(3);
  const b = +np.quiet_to.slice(0, 2) * 60 + +np.quiet_to.slice(3);
  if (a === b) return false;
  return a < b ? m >= a && m < b : m >= a || m < b;
}
const TYPE_CAT = {
  project_created: 'project_updates', project_status: 'project_updates', project_done: 'project_updates',
  message: 'messages', comment: 'approvals', review_request: 'approvals', review_decision: 'approvals',
};
export const notificationCategory = (type) => TYPE_CAT[type] || null;

/** Sorting used by Projects / Files according to workspace preferences. */
const STATUS_ORDER = ['new', 'awaiting', 'brief_approved', 'concept', 'production', 'review', 'revisions', 'done'];
export function sortProjects(list, sort) {
  const a = [...list];
  const by = {
    updated_desc: (x, y) => String(y.updated_at || '').localeCompare(String(x.updated_at || '')),
    created_desc: (x, y) => String(y.created_at || '').localeCompare(String(x.created_at || '')),
    name_asc: (x, y) => String(x.title || '').localeCompare(String(y.title || ''), undefined, { sensitivity: 'base' }),
    status: (x, y) => STATUS_ORDER.indexOf(x.status) - STATUS_ORDER.indexOf(y.status) || String(y.updated_at || '').localeCompare(String(x.updated_at || '')),
  }[sort];
  return by ? a.sort(by) : a;
}
export function sortFiles(list, sort) {
  const a = [...list];
  const by = {
    created_desc: (x, y) => String(y.created_at || '').localeCompare(String(x.created_at || '')),
    created_asc: (x, y) => String(x.created_at || '').localeCompare(String(y.created_at || '')),
    name_asc: (x, y) => String(x.name || '').localeCompare(String(y.name || ''), undefined, { sensitivity: 'base', numeric: true }),
    size_desc: (x, y) => (Number(y.size) || 0) - (Number(x.size) || 0),
  }[sort];
  return by ? a.sort(by) : a;
}

/** Remembered list filters (per user, per device). Used only when workspace.remember_filters = true. */
const FKEY = (uid, view) => `af.filter.${uid}.${view}`;
export function rememberedFilter(view, fallback = 'all') {
  if (!state.data.workspace.remember_filters || !state.uid) return fallback;
  try { return localStorage.getItem(FKEY(state.uid, view)) || fallback; } catch (_) { return fallback; }
}
export function rememberFilter(view, value) {
  if (!state.data.workspace.remember_filters || !state.uid) return;
  try { localStorage.setItem(FKEY(state.uid, view), String(value).slice(0, 40)); } catch (_) { /* noop */ }
}
