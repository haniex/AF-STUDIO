import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG, isConfigured } from '../config.js';

const REMEMBER_KEY = 'af.remember';
const remember = () => localStorage.getItem(REMEMBER_KEY) !== '0';

// "Remember me": persistent session in localStorage, otherwise tab-scoped sessionStorage.
// The stored token is only a cache — every boot re-validates it with Supabase Auth (getUser).
const storage = {
  getItem: (k) => (remember() ? localStorage : sessionStorage).getItem(k),
  setItem: (k, v) => (remember() ? localStorage : sessionStorage).setItem(k, v),
  removeItem: (k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); },
};

export const supabase = isConfigured()
  ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage,
        storageKey: 'af-studio-auth',
      },
    })
  : null;

export function setRemember(on) {
  const prev = remember();
  localStorage.setItem(REMEMBER_KEY, on ? '1' : '0');
  if (prev !== on) {
    // move an existing token to the new storage so the session isn't lost
    const from = prev ? localStorage : sessionStorage;
    const to = on ? localStorage : sessionStorage;
    for (let i = 0; i < from.length; i++) {
      const k = from.key(i);
      if (k && k.startsWith('af-studio-auth')) { to.setItem(k, from.getItem(k)); }
    }
  }
}

// ---------------------------------------------------------------------
// Storage helpers: private buckets → short-lived signed URLs (cached)
// ---------------------------------------------------------------------
const urlCache = new Map();
const TTL = 3300 * 1000;

export function isExternal(p) {
  return !p || /^(https?:|data:|blob:)/.test(p) || p.startsWith('images/');
}

export async function signedUrl(bucket, path, opts = {}) {
  if (isExternal(path)) return path || '';
  const key = bucket + ':' + path + (opts.download ? ':dl' : '');
  const hit = urlCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600, opts.download ? { download: opts.download } : undefined);
  if (error) return '';
  urlCache.set(key, { url: data.signedUrl, exp: Date.now() + TTL });
  return data.signedUrl;
}

export async function signedUrls(bucket, paths) {
  const out = {};
  const need = [];
  for (const p of paths) {
    if (!p) continue;
    if (isExternal(p)) { out[p] = p; continue; }
    const hit = urlCache.get(bucket + ':' + p);
    if (hit && hit.exp > Date.now()) out[p] = hit.url; else need.push(p);
  }
  if (need.length) {
    const { data } = await supabase.storage.from(bucket).createSignedUrls([...new Set(need)], 3600);
    (data || []).forEach((d) => {
      if (d.signedUrl) { out[d.path] = d.signedUrl; urlCache.set(bucket + ':' + d.path, { url: d.signedUrl, exp: Date.now() + TTL }); }
    });
  }
  return out;
}

/** Media used by portfolio/before-after/lab: repo images, https, or portfolio-media storage paths. */
export const mediaUrl = (p) => signedUrl('portfolio-media', p);
export const mediaUrls = (ps) => signedUrls('portfolio-media', ps);

/** Calls an Edge Function with the current user's JWT. Throws {code} on failure. */
export async function callFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let code = 'server_error'; let detail = ''; let status = error.context?.status || 0;
    try {
      const ctx = error.context;
      if (ctx && typeof ctx.text === 'function') {
        const txt = await ctx.text();
        try { const j = JSON.parse(txt); code = j.error || (status === 401 ? 'unauthorized' : code); detail = j.detail || j.message || j.msg || ''; Object.assign(error, j); }
        catch { detail = txt.slice(0, 160); }
      }
    } catch (_) { /* ignore */ }
    if (String(error.message || '').includes('Failed to send')) code = 'network';
    const e = new Error(code); e.code = code; e.status = status; e.detail = String(detail || ''); e.details = error; throw e;
  }
  return data;
}
