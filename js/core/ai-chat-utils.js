// AF AI 3.1 — pure helpers of the chat view (no DOM, no network; unit-tested).
export const OUTPUT_TYPES = ['text', 'social_post', 'video_script', 'email', 'document', 'plan', 'table', 'code', 'html_component', 'image_prompt', 'other'];
export const SCOPES = ['general', 'af_studio'];
export const AF_ONLY = ['brief', 'estimate'];

/** Group conversations by recency: today / yesterday / week / month / older (local time). */
export function groupByDate(list, now = new Date()) {
  const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = day(now); const DAY = 86400000;
  const buckets = { today: [], yesterday: [], week: [], month: [], older: [] };
  for (const c of list) {
    const ts = day(new Date(c.updated_at || c.created_at || 0));
    const k = ts >= today ? 'today' : ts >= today - DAY ? 'yesterday' : ts >= today - 7 * DAY ? 'week' : ts >= today - 30 * DAY ? 'month' : 'older';
    buckets[k].push(c);
  }
  return Object.entries(buckets).filter(([, v]) => v.length).map(([key, items]) => ({ key, items }));
}
export const filterConversations = (list, q) => {
  const s = String(q || '').trim().toLowerCase().replace(/ё/g, 'е');
  return s ? list.filter((c) => String(c.title || '').toLowerCase().replace(/ё/g, 'е').includes(s)) : list;
};
/** Effective context of a request: ТЗ and estimate always use AF STUDIO data. */
export const effectiveScope = (mode, scope) => (AF_ONLY.includes(mode) ? 'af_studio' : SCOPES.includes(scope) ? scope : 'general');

/** Only real https links from the server are rendered as sources. */
export const safeSourceUrl = (u) => (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(u) && u.length <= 2000 ? u : '');
