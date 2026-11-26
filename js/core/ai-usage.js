// =====================================================================
// AF STUDIO 3.0 — AF AI usage (quota) client
// Numbers come ONLY from the server (Edge Function ai-chat, action 'usage',
// or the `quota` block returned with every answer / 429). Nothing here is
// hard-coded and the client never decides how many requests are left.
// =====================================================================

let snap = null;          // last normalized snapshot
let fetchedAt = 0;        // Date.now() when snap was received
let error = null;         // 'network' | 'auth' | 'server' | null
let inflight = null;
const listeners = new Set();
let caller = async (body) => (await import('../lib/supabase.js')).callFunction('ai-chat', body);
/** test hook */
export function __setCaller(fn) { caller = fn; }

const int = (v, d = 0) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : d);

/** Sanitize a server snapshot; returns null for garbage. */
export function normalizeUsage(raw) {
  if (!raw || typeof raw !== 'object' || !raw.daily || typeof raw.daily !== 'object') return null;
  const d = raw.daily; const m = raw.minute && typeof raw.minute === 'object' ? raw.minute : null;
  const dLimit = int(d.limit); const dUsed = int(d.used);
  const daily = {
    used: dUsed, limit: dLimit, remaining: int(d.remaining, Math.max(dLimit - dUsed, 0)),
    percent: Math.min(100, int(d.percent, dLimit ? Math.round((dUsed / dLimit) * 100) : 100)),
    reset_at: typeof d.reset_at === 'string' && !Number.isNaN(Date.parse(d.reset_at)) ? d.reset_at : null,
  };
  const minute = m ? {
    used: int(m.used), limit: int(m.limit), remaining: int(m.remaining), retry_after: int(m.retry_after),
    reset_in: int(m.reset_in), window_seconds: int(m.window_seconds, 60) || 60,
  } : null;
  return { enabled: raw.enabled !== false, web_search: raw.web_search !== false, daily, minute };
}

/** Visual level for a percentage / remaining value. */
export function usageLevel(percent, remaining = null) {
  if (remaining === 0 || percent >= 100) return 'full';
  if (percent >= 90) return 'high';
  if (percent >= 70) return 'warn';
  return 'ok';
}

/** Live view of the snapshot: countdowns are advanced by local elapsed time. */
export function liveUsage(s = snap, at = fetchedAt, now = Date.now()) {
  if (!s) return null;
  const el = Math.max(0, Math.floor((now - at) / 1000));
  const resetMs = s.daily.reset_at ? Date.parse(s.daily.reset_at) - now : null;
  const out = { enabled: s.enabled, web_search: s.web_search, daily: { ...s.daily, reset_in: resetMs == null ? null : Math.max(0, Math.round(resetMs / 1000)) }, minute: null };
  if (out.daily.reset_in === 0 && resetMs != null && resetMs <= 0) out.daily = { ...out.daily, stale: true };
  if (s.minute) {
    const m = { ...s.minute };
    m.retry_after = Math.max(0, m.retry_after - el);
    m.reset_in = Math.max(0, m.reset_in - el);
    // once the window has fully passed since the snapshot, nothing of it is counted anymore
    if (el >= m.window_seconds) { m.used = 0; m.remaining = m.limit; m.retry_after = 0; m.reset_in = 0; }
    else if (s.minute.remaining === 0 && m.retry_after === 0) { m.remaining = Math.min(m.limit, 1); m.used = Math.max(0, m.limit - 1); }
    out.minute = m;
  }
  return out;
}

/** "4 ч 18 мин" / "18 сек" */
export function fmtDuration(sec, lang = 'ru') {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const r = s % 60;
  const U = lang === 'en' ? { h: 'h', m: 'min', s: 's' } : { h: 'ч', m: 'мин', s: 'сек' };
  if (h) return `${h} ${U.h} ${m} ${U.m}`;
  if (m) return r && m < 5 ? `${m} ${U.m} ${r} ${U.s}` : `${m} ${U.m}`;
  return `${r} ${U.s}`;
}

export const getUsage = () => liveUsage();
export const usageError = () => error;
export const hasUsage = () => !!snap;
export function onUsage(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = () => listeners.forEach((fn) => { try { fn(liveUsage(), error); } catch (e) { console.error(e); } });

/** Accept a `quota` block that came with an AI answer / error. */
export function setUsage(raw) {
  const n = normalizeUsage(raw);
  if (!n) return false;
  snap = n; fetchedAt = Date.now(); error = null; emit();
  return true;
}

/** Ask the server. Deduplicated; `maxAge` avoids hammering when several widgets ask at once. */
export async function fetchUsage({ maxAge = 0 } = {}) {
  if (snap && maxAge && Date.now() - fetchedAt < maxAge) return liveUsage();
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const raw = await caller({ action: 'usage' });
      if (!setUsage(raw)) { error = 'server'; emit(); }
    } catch (e) {
      error = e?.code === 'network' ? 'network' : e?.code === 'unauthorized' ? 'auth' : 'server';
      emit(); // keep the previous snapshot: a failed refresh must never show "0 left"
    } finally { inflight = null; }
    return liveUsage();
  })();
  return inflight;
}

export function clearUsage() { snap = null; fetchedAt = 0; error = null; inflight = null; emit(); }
