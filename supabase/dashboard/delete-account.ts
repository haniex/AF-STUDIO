// AF STUDIO — Edge Function «delete-account» (single-file version for the Supabase dashboard editor).
// Paste the whole file into Edge Functions → delete-account → Code → index.ts and press Deploy.
import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://haniex.github.io,http://localhost:5500,http://127.0.0.1:5500')
  .split(',').map((s) => s.trim()).filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);
  return null;
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, (Deno.env.get('AF_SERVICE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY'))!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Verifies the caller's JWT against Supabase Auth (not just decoding it). */
export async function requireUser(req: Request): Promise<{ user: User; token: string } | null> {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const client = createClient(Deno.env.get('SUPABASE_URL')!, (Deno.env.get('AF_PUBLIC_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY'))!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return { user: data.user, token };
}

export async function readJson<T>(req: Request, maxBytes = 64_000): Promise<T | null> {
  const len = Number(req.headers.get('content-length') ?? '0');
  if (len > maxBytes) return null;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// Permanently deletes the caller's account and all related data.
// Requires: current password (email users) + typed confirmation word.

async function removeFolder(db: ReturnType<typeof adminClient>, bucket: string, prefix: string, depth = 0): Promise<void> {
  if (depth > 4) return;
  const { data } = await db.storage.from(bucket).list(prefix, { limit: 1000 });
  if (!data?.length) return;
  const files = data.filter((o) => o.id).map((o) => `${prefix}/${o.name}`);
  const dirs = data.filter((o) => !o.id).map((o) => `${prefix}/${o.name}`);
  if (files.length) await db.storage.from(bucket).remove(files);
  for (const d of dirs) await removeFolder(db, bucket, d, depth + 1);
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const auth = await requireUser(req);
  if (!auth) return json(req, { error: 'unauthorized' }, 401);
  const body = await readJson<{ password?: string; confirm?: string }>(req, 4_000);
  if (!body || !['DELETE', 'УДАЛИТЬ'].includes(String(body.confirm ?? '').trim())) {
    return json(req, { error: 'confirmation_required' }, 400);
  }

  const user = auth.user;
  const providers: string[] = (user.app_metadata?.providers as string[]) ?? [user.app_metadata?.provider as string];
  if (providers.includes('email')) {
    const anon = createClient(Deno.env.get('SUPABASE_URL')!, (Deno.env.get('AF_PUBLIC_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY'))!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.auth.signInWithPassword({ email: user.email!, password: String(body.password ?? '') });
    if (error) return json(req, { error: 'invalid_password' }, 403);
  }

  const db = adminClient();
  const { data: isAdmin } = await db.from('user_roles').select('user_id').eq('user_id', user.id).maybeSingle();
  if (isAdmin) {
    const { count } = await db.from('user_roles').select('user_id', { count: 'exact', head: true });
    if ((count ?? 0) <= 1) return json(req, { error: 'last_admin' }, 409);
  }

  await removeFolder(db, 'project-files', user.id);
  await removeFolder(db, 'avatars', user.id);
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return json(req, { error: 'server_error' }, 500);
  return json(req, { ok: true });
});
