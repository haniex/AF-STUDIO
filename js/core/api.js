// Data access layer (all queries go through Supabase with RLS enforced server-side)
import { supabase, signedUrls, mediaUrls } from '../lib/supabase.js';
import { auth } from './auth.js';
import { CONFIG } from '../config.js';
import { uid } from './ui.js';

const cache = new Map();
async function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.v;
  const v = await fn();
  cache.set(key, { v, exp: Date.now() + ttl });
  return v;
}
export const invalidate = (prefix) => { for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k); };

const must = ({ data, error }) => { if (error) throw error; return data; };

// ---------------------------------------------------------------- content
export const getServices = () => cached('services', 300e3, async () =>
  must(await supabase.from('services').select('*').eq('active', true).order('sort')));

export const getPortfolio = () => cached('portfolio', 300e3, async () =>
  must(await supabase.from('portfolio_items').select('*').eq('published', true).order('sort')));

export const getReviews = () => cached('reviews', 300e3, async () =>
  must(await supabase.from('reviews').select('*').eq('published', true).order('sort')));

export const getBeforeAfter = () => cached('ba', 300e3, async () =>
  must(await supabase.from('before_after').select('*').eq('published', true).order('sort')));

export const getLabModels = () => cached('lab', 300e3, async () =>
  must(await supabase.from('lab_models').select('*').eq('published', true).order('sort')));

export const getPricing = () => cached('pricing', 120e3, async () => {
  const [cats, facs] = await Promise.all([
    supabase.from('pricing_categories').select('*').eq('active', true).order('sort'),
    supabase.from('pricing_factors').select('*').eq('active', true).order('sort'),
  ]);
  return { categories: must(cats), factors: must(facs) };
});

/** Resolve media paths of portfolio items into usable URLs (repo images stay as-is). */
export async function withMedia(items, fields = ['cover']) {
  const paths = [];
  items.forEach((it) => fields.forEach((f) => { const v = it[f]; if (Array.isArray(v)) paths.push(...v); else if (v) paths.push(v); }));
  const map = await mediaUrls(paths);
  return items.map((it) => {
    const o = { ...it };
    fields.forEach((f) => { const v = it[f]; o[f + '_url'] = Array.isArray(v) ? v.map((p) => map[p] || p) : (map[v] || v || ''); });
    return o;
  });
}

// ---------------------------------------------------------------- favorites
export const getFavorites = () => cached('fav:' + auth.user.id, 60e3, async () =>
  new Set(must(await supabase.from('favorites').select('portfolio_id')).map((r) => r.portfolio_id)));

export async function toggleFavorite(id) {
  const favs = await getFavorites();
  if (favs.has(id)) {
    must(await supabase.from('favorites').delete().eq('user_id', auth.user.id).eq('portfolio_id', id));
    favs.delete(id); return false;
  }
  must(await supabase.from('favorites').insert({ user_id: auth.user.id, portfolio_id: id }));
  favs.add(id); return true;
}

// ---------------------------------------------------------------- projects
export const listProjects = async () =>
  must(await supabase.from('projects').select('*').eq('client_id', auth.user.id).order('created_at', { ascending: false }));

export const getProject = async (id) =>
  must(await supabase.from('projects').select('*').eq('id', id).maybeSingle());

export const projectHistory = async (id) =>
  must(await supabase.from('project_status_history').select('*').eq('project_id', id).order('created_at'));

export async function projectCovers(projects) {
  const paths = projects.map((p) => p.cover_path).filter(Boolean);
  const map = await signedUrls('project-files', paths);
  return Object.fromEntries(projects.map((p) => [p.id, map[p.cover_path] || '']));
}

// ---------------------------------------------------------------- files
const IMG = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const DOCS = ['application/pdf', 'application/zip', 'application/x-zip-compressed', 'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'model/gltf-binary', 'model/gltf+json', 'video/mp4', 'video/quicktime'];
const EXT_MIME = { glb: 'model/gltf-binary', gltf: 'model/gltf+json', zip: 'application/zip', mov: 'video/quicktime' };

export function validateFile(file, { imagesOnly = false, maxMB = CONFIG.LIMITS.uploadMB } = {}) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const mime = file.type || EXT_MIME[ext] || 'application/octet-stream';
  const ok = imagesOnly ? IMG.includes(mime) : [...IMG, ...DOCS].includes(mime);
  if (!ok) return { error: 'errors.file_type' };
  if (file.size > maxMB * 1048576) return { error: 'errors.file_too_big', mb: maxMB };
  if (!file.size) return { error: 'errors.file_type' };
  return { mime };
}

const safeName = (n) => n.normalize('NFKD').replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').slice(-80) || 'file';

/** Upload to the private bucket and register metadata. folder: 'general'|'drafts'|'moodboards'|<projectId> */
export async function uploadFile(file, { folder = 'general', projectId = null, kind = 'reference', imagesOnly = false } = {}) {
  const v = validateFile(file, { imagesOnly, maxMB: imagesOnly ? CONFIG.LIMITS.imageMB : CONFIG.LIMITS.uploadMB });
  if (v.error) { const e = new Error(v.error); e.i18n = v.error; e.mb = v.mb; throw e; }
  const path = `${auth.user.id}/${folder}/${uid()}-${safeName(file.name)}`;
  must(await supabase.storage.from('project-files').upload(path, file, { contentType: v.mime, upsert: false, cacheControl: '3600' }));
  const row = await supabase.from('files').insert({
    owner_id: auth.user.id, uploaded_by: auth.user.id, project_id: projectId, kind, bucket: 'project-files',
    path, name: file.name.slice(0, 200), mime: v.mime, size: file.size,
  }).select().single();
  if (row.error) { await supabase.storage.from('project-files').remove([path]); throw row.error; }
  return row.data;
}

export async function deleteFile(f) {
  must(await supabase.storage.from('project-files').remove([f.path]));
  must(await supabase.from('files').delete().eq('id', f.id));
}

export const listFiles = async ({ projectId } = {}) => {
  let q = supabase.from('files').select('*').eq('owner_id', auth.user.id).order('created_at', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  return must(await q);
};

// ---------------------------------------------------------------- threads & messages
export const listThreads = async () =>
  must(await supabase.from('threads').select('*').eq('client_id', auth.user.id).order('last_message_at', { ascending: false }));

export const listMessages = async (threadId) =>
  must(await supabase.from('messages').select('*').eq('thread_id', threadId).order('created_at'));

export async function sendMessage(threadId, body) {
  return must(await supabase.from('messages').insert({ thread_id: threadId, sender_id: auth.user.id, body: body.slice(0, 5000) }).select().single());
}

export async function createThread(subject, body, projectId = null) {
  const th = must(await supabase.from('threads').insert({ client_id: auth.user.id, subject: subject.slice(0, 160), project_id: projectId }).select().single());
  if (body) await sendMessage(th.id, body);
  return th;
}

export const markThreadRead = (id) => supabase.rpc('mark_thread_read', { p_thread: id });

// ---------------------------------------------------------------- notifications
export const listNotifications = async (limit = 30) =>
  must(await supabase.from('notifications').select('*').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(limit));
export const markNotificationsRead = (ids = null) => supabase.rpc('mark_notifications_read', { p_ids: ids });

// ---------------------------------------------------------------- drafts
export const getDraft = async () => (must(await supabase.from('project_drafts').select('data').eq('user_id', auth.user.id).maybeSingle()) || {}).data || null;
export const saveDraft = async (data) => must(await supabase.from('project_drafts').upsert({ user_id: auth.user.id, data, updated_at: new Date().toISOString() }));
export const clearDraft = async () => must(await supabase.from('project_drafts').delete().eq('user_id', auth.user.id));
