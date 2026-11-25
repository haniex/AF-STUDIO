// Permanently deletes the caller's account and all related data.
// Requires: current password (email users) + typed confirmation word.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { adminClient, json, preflight, readJson, requireUser } from '../_shared/util.ts';

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
    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
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
