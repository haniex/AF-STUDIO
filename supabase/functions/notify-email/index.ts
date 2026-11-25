// Email delivery for in-app notifications.
// Wire it as a Supabase Database Webhook: table public.notifications, event INSERT,
// HTTP header  x-webhook-secret: <WEBHOOK_SECRET>.
// Uses Resend (https://resend.com). If RESEND_API_KEY is not set the function is a safe no-op.
import { adminClient } from '../_shared/util.ts';

const T: Record<string, { ru: string; en: string }> = {
  project_created: { ru: 'Новая заявка', en: 'New project request' },
  project_status: { ru: 'Статус проекта обновлён', en: 'Project status updated' },
  project_done: { ru: 'Проект завершён', en: 'Project completed' },
  message: { ru: 'Новое сообщение', en: 'New message' },
  comment: { ru: 'Новый комментарий к рендеру', en: 'New review comment' },
  review_request: { ru: 'Запрос согласования', en: 'Approval requested' },
  review_decision: { ru: 'Решение по рендеру', en: 'Review decision' },
};
const STATUS: Record<string, { ru: string; en: string }> = {
  new: { ru: 'Новая заявка', en: 'New request' }, awaiting: { ru: 'Ожидает ответа', en: 'Awaiting reply' },
  brief_approved: { ru: 'Бриф согласован', en: 'Brief approved' }, concept: { ru: 'Концепция', en: 'Concept' },
  production: { ru: 'Производство', en: 'Production' }, review: { ru: 'Проверка', en: 'Review' },
  revisions: { ru: 'Правки', en: 'Revisions' }, done: { ru: 'Завершён', en: 'Completed' },
};
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 });
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return new Response('forbidden', { status: 403 });

  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('MAIL_FROM');
  if (!apiKey || !from) return new Response(JSON.stringify({ skipped: 'email_not_configured' }), { status: 200 });

  const evt = await req.json().catch(() => null);
  const n = evt?.record;
  if (!n?.user_id || !n?.type) return new Response('bad_request', { status: 400 });

  const db = adminClient();
  const { data: profile } = await db.from('profiles').select('email,full_name,lang,notify_email').eq('id', n.user_id).maybeSingle();
  if (!profile?.email || !profile.notify_email) return new Response(JSON.stringify({ skipped: 'opted_out' }), { status: 200 });

  const lang: 'ru' | 'en' = profile.lang === 'en' ? 'en' : 'ru';
  const p = n.payload ?? {};
  const title = T[n.type]?.[lang] ?? (lang === 'en' ? 'AF Studio notification' : 'Уведомление AF Studio');
  const site = (Deno.env.get('SITE_URL') ?? 'https://haniex.github.io/AF-STUDIO').replace(/\/$/, '');
  const rel = String(n.link ?? '');
  const link = rel.startsWith('admin.html') ? `${site}/${rel}` : `${site}/index.html${rel}`;
  const lines: string[] = [];
  if (p.title) lines.push(`<p><b>${esc(p.number ? `AF-${String(p.number).padStart(5, '0')} · ` : '')}${esc(p.title)}</b></p>`);
  if (p.to) lines.push(`<p>${lang === 'en' ? 'New status' : 'Новый статус'}: <b>${esc(STATUS[p.to]?.[lang] ?? p.to)}</b></p>`);
  if (p.preview) lines.push(`<blockquote style="border-left:3px solid #d4a574;margin:0;padding:8px 14px;color:#555">${esc(p.preview)}</blockquote>`);
  if (p.decision) lines.push(`<p>${esc(p.decision === 'approved' ? (lang === 'en' ? 'Approved' : 'Утверждено') : (lang === 'en' ? 'Changes requested' : 'Запрошены правки'))}</p>`);

  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:32px;background:#0c0b0a;color:#f5f2ed;border-radius:16px">
    <div style="font:700 28px 'Space Grotesk',Arial;letter-spacing:-.02em">AF</div>
    <h2 style="font-weight:600;margin:24px 0 12px">${esc(title)}</h2>${lines.join('')}
    <p style="margin-top:28px"><a href="${esc(link)}" style="background:#f5f2ed;color:#0c0b0a;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">${lang === 'en' ? 'Open AF Studio' : 'Открыть AF Studio'}</a></p>
    <p style="color:#8a837c;font-size:12px;margin-top:28px">${lang === 'en' ? 'You can turn off email notifications in Settings.' : 'Отключить email-уведомления можно в Настройках.'}</p></div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [profile.email], subject: `AF Studio · ${title}`, html }),
  });
  if (!res.ok) console.error('resend_error', res.status, (await res.text()).slice(0, 300));
  return new Response(JSON.stringify({ sent: res.ok }), { status: 200 });
});
