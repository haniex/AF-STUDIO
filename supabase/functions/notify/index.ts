// AF STUDIO — «notify» v4: delivers every new row of public.notifications
//   • to the studio owner's Telegram (only notifications addressed to administrators)
//   • by email via Resend (to any user who has email notifications enabled)
// Triggered by a Supabase Database Webhook (table notifications, INSERT)
// with the header  x-webhook-secret: <WEBHOOK_SECRET>.
// Secrets: WEBHOOK_SECRET (optional, legacy), TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (Telegram),
//          RESEND_API_KEY + MAIL_FROM (email), SITE_URL (links). Missing ones are skipped.
import { adminClient } from '../_shared/util.ts';

const TITLE: Record<string, { ru: string; en: string; icon: string }> = {
  project_created: { ru: 'Новая заявка', en: 'New project request', icon: '🆕' },
  project_status: { ru: 'Статус проекта обновлён', en: 'Project status updated', icon: '🔄' },
  project_done: { ru: 'Проект завершён', en: 'Project completed', icon: '✅' },
  message: { ru: 'Новое сообщение', en: 'New message', icon: '💬' },
  comment: { ru: 'Комментарий к рендеру', en: 'Review comment', icon: '📍' },
  review_request: { ru: 'Запрос согласования', en: 'Approval requested', icon: '🖼' },
  review_decision: { ru: 'Решение клиента по рендеру', en: 'Client review decision', icon: '🧾' },
  new_user: { ru: 'Новый пользователь', en: 'New user', icon: '👤' },
};
const STATUS: Record<string, string> = {
  new: 'Новая заявка', awaiting: 'Ожидает ответа', brief_approved: 'Бриф согласован', concept: 'Концепция',
  production: 'Производство', review: 'Проверка', revisions: 'Правки', done: 'Завершён',
};
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const no = (n: unknown) => (n ? `AF-${String(n).padStart(5, '0')}` : '');
const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Notification type → user preference category (Settings → Notifications)
const CATEGORY: Record<string, string> = {
  project_created: 'project_updates', project_status: 'project_updates', project_done: 'project_updates',
  message: 'messages', comment: 'approvals', review_request: 'approvals', review_decision: 'approvals',
};
const CRITICAL = ['project_status', 'project_done', 'review_request'];
const HHMM = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
/** Minutes since local midnight in an IANA zone (falls back to UTC). */
function localMinutes(tz: string, now = new Date()): number {
  try {
    if (tz) {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
      const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 'NaN'); const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 'NaN');
      if (Number.isFinite(h) && Number.isFinite(m)) return (h % 24) * 60 + m;
    }
  } catch (_) { /* invalid zone → UTC */ }
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}
export function inQuietHours(from: string, to: string, minutes: number): boolean {
  if (!HHMM.test(from) || !HHMM.test(to)) return false;
  const a = toMin(from); const b = toMin(to);
  if (a === b) return false;
  return a < b ? minutes >= a && minutes < b : minutes >= a || minutes < b; // window may wrap midnight
}
/** '' = email allowed; otherwise the reason it is skipped. */
function emailBlockedByPrefs(type: string, np: Record<string, unknown>): string {
  const cat = CATEGORY[type];
  const ch = cat ? (np[cat] as Record<string, unknown> | undefined) : undefined;
  if (ch && ch.email === false) return `email disabled by the user for category "${cat}"`;
  if (np.quiet_enabled === true && !CRITICAL.includes(type)
      && inQuietHours(String(np.quiet_from ?? ''), String(np.quiet_to ?? ''), localMinutes(String(np.quiet_tz ?? '')))) {
    return 'quiet hours (non-critical email skipped; the notification stays in the app)';
  }
  return '';
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return ok({ error: 'method_not_allowed' }, 405);
    // Auth: header must match the secret stored in the database (public.af_internal, readable only
    // with the service key) or, optionally, the WEBHOOK_SECRET env secret.
    const db = adminClient();
    const header = (req.headers.get('x-webhook-secret') ?? '').trim();
    const envSecret = (Deno.env.get('WEBHOOK' + '_SECRET') ?? '').trim();
    let authorised = !!header && !!envSecret && header === envSecret;
    if (!authorised && header) {
      const { data: cfg, error: cErr } = await db.from('af_internal').select('webhook_secret').eq('id', 1).maybeSingle();
      if (cErr) return ok({ error: 'forbidden', reason: 'cannot read af_internal: ' + cErr.message }, 403);
      authorised = !!cfg?.webhook_secret && cfg.webhook_secret === header;
    }
    if (!authorised) return ok({ error: 'forbidden', reason: header ? 'x-webhook-secret does not match' : 'missing x-webhook-secret header' }, 403);
    const evt = await req.json().catch(() => null);
    const n = evt?.record;
    if (!n?.user_id || !n?.type) return ok({ error: 'bad_request' }, 400);

    const site = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '');
    const rel = String(n.link ?? '');
    const link = site ? (rel.startsWith('admin.html') ? `${site}/${rel}` : `${site}/index.html${rel}`) : '';
    const p = n.payload ?? {};
    const [{ data: profile }, { data: role }] = await Promise.all([
      db.from('profiles').select('email,full_name,lang,notify_email').eq('id', n.user_id).maybeSingle(),
      db.from('user_roles').select('role').eq('user_id', n.user_id).maybeSingle(),
    ]);
    const out: Record<string, unknown> = {};

    // ------------------------------------------------------------ Telegram (owner only)
    const tgToken = (Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '').trim(); const tgChat = (Deno.env.get('TELEGRAM_CHAT_ID') ?? '').trim();
    if (!tgToken || !tgChat) out.telegram = { skipped: 'secrets TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set' };
    else if (!role) out.telegram = { skipped: 'recipient is not an admin (Telegram goes only to admins)' };
    if (role && tgToken && tgChat) {
      const lines: string[] = [];
      const ttl = TITLE[n.type] ?? { ru: 'Уведомление', icon: '🔔' };
      lines.push(`${ttl.icon} <b>AF STUDIO · ${esc(ttl.ru)}</b>`);
      if (p.title) lines.push(`<b>${esc(no(p.number))}</b> ${esc(p.title)}`);
      if (n.type === 'project_created' && p.project_id) {
        const { data: pr } = await db.from('projects').select('service_id,budget,deadline,contact').eq('id', p.project_id).maybeSingle();
        if (pr) {
          const c = pr.contact ?? {};
          lines.push(`Услуга: ${esc(pr.service_id ?? '—')} · Бюджет: ${esc(pr.budget ?? '—')}${pr.deadline ? ` · Срок: ${esc(pr.deadline)}` : ''}`);
          lines.push(`Клиент: ${esc(c.name ?? '')} · ${esc(c.email ?? '')}${c.tg ? ` · TG ${esc(c.tg)}` : ''}${c.phone ? ` · ${esc(c.phone)}` : ''}`);
        }
      }
      if ((n.type === 'message' || n.type === 'comment') && p.client_id) {
        const { data: cl } = await db.from('profiles').select('full_name,email').eq('id', p.client_id).maybeSingle();
        if (cl) lines.push(`От: ${esc(cl.full_name || '')} · ${esc(cl.email || '')}`);
      }
      if (p.subject && n.type === 'message') lines.push(`Тема: ${esc(p.subject)}`);
      if (p.to) lines.push(`Статус: <b>${esc(STATUS[p.to] ?? p.to)}</b>`);
      if (p.decision) lines.push(p.decision === 'approved' ? '✅ Утверждено клиентом' : '✏️ Клиент запросил правки');
      if (n.type === 'new_user') lines.push(`${esc(p.name || '')} · ${esc(p.email || '')}`);
      if (p.preview) lines.push(`<blockquote>${esc(String(p.preview).slice(0, 600))}</blockquote>`);
      const body: Record<string, unknown> = { chat_id: tgChat, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true };
      if (link.startsWith('https://')) body.reply_markup = { inline_keyboard: [[{ text: 'Открыть в AF Admin →', url: link }]] };
      let r = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      let j = await r.json().catch(() => ({}));
      if (!r.ok && body.reply_markup && /button|url/i.test(String(j.description ?? ''))) { // retry without the link button
        delete body.reply_markup;
        r = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        j = await r.json().catch(() => ({}));
      }
      if (!r.ok && /parse|entit|tag/i.test(String(j.description ?? ''))) { // retry as plain text
        const plain = { chat_id: tgChat, text: String(body.text).replace(/<[^>]+>/g, ''), disable_web_page_preview: true };
        r = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plain) });
        j = await r.json().catch(() => ({}));
      }
      out.telegram = r.ok ? { ok: true } : { ok: false, status: r.status, description: String(j.description ?? '').slice(0, 200) };
      if (!r.ok) console.error('telegram_error', r.status, j.description);
    }

    // ------------------------------------------------------------ Email (Resend)
    // 3.0: the global switch (profiles.notify_email) still rules; on top of it the user's
    // per-category email choice and quiet hours from public.user_preferences are respected.
    const apiKey = Deno.env.get('RESEND_API_KEY'); const from = Deno.env.get('MAIL_FROM');
    if (!apiKey || !from) out.email = { skipped: 'RESEND_API_KEY / MAIL_FROM not set (optional)' };
    let prefBlock = '';
    if (apiKey && from && profile?.email && profile.notify_email) {
      const { data: up } = await db.from('user_preferences').select('notifications').eq('user_id', n.user_id).maybeSingle();
      prefBlock = emailBlockedByPrefs(n.type, (up?.notifications ?? {}) as Record<string, unknown>);
      if (prefBlock) out.email = { skipped: prefBlock };
    }
    if (apiKey && from && profile?.email && profile.notify_email && !prefBlock) {
      const lang: 'ru' | 'en' = profile.lang === 'en' ? 'en' : 'ru';
      const title = (TITLE[n.type] ?? { ru: 'Уведомление AF Studio', en: 'AF Studio notification' })[lang];
      const rows: string[] = [];
      if (p.title) rows.push(`<p style="margin:0 0 8px"><b>${esc(no(p.number))} · ${esc(p.title)}</b></p>`);
      if (p.to) rows.push(`<p style="margin:0 0 8px">${lang === 'en' ? 'New status' : 'Новый статус'}: <b>${esc(STATUS[p.to] ?? p.to)}</b></p>`);
      if (p.preview) rows.push(`<blockquote style="border-left:3px solid #d4a574;margin:12px 0;padding:8px 14px;color:#cfc7bd">${esc(p.preview)}</blockquote>`);
      const html = `<div style="background:#0b0a09;padding:32px 12px"><div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:32px;background:#16130f;color:#f6f2ec;border-radius:20px;border:1px solid #2b251f">
        <div style="font:700 28px Arial;letter-spacing:-.02em;color:#e8c4a0">AF <span style="font:600 11px Arial;letter-spacing:.3em;color:#8a837c">STUDIO</span></div>
        <h2 style="font-weight:600;margin:24px 0 14px">${esc(title)}</h2>${rows.join('')}
        ${link ? `<p style="margin-top:26px"><a href="${esc(link)}" style="background:linear-gradient(120deg,#f3d9b8,#d4a574);color:#1c1917;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700">${lang === 'en' ? 'Open AF Studio' : 'Открыть AF Studio'}</a></p>` : ''}
        <p style="color:#8a837c;font-size:12px;margin-top:28px">${lang === 'en' ? 'You can turn off email notifications in Settings.' : 'Отключить email-уведомления можно в Настройках.'}</p></div></div>`;
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [profile.email], subject: `AF Studio · ${title}`, html }),
      });
      out.email = r.ok ? { ok: true } : { ok: false, status: r.status, description: (await r.text()).slice(0, 200) };
    }
    return ok(out);
  } catch (e) {
    console.error('notify_crash', String((e as Error)?.stack || e));
    return ok({ error: 'server_error', detail: String((e as Error)?.message || e).slice(0, 200) }, 500);
  }
});
