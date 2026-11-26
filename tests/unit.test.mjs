// AF STUDIO — unit tests for pure logic. Run: `node --test tests/` (Node 18+). No dependencies.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal browser stubs (i18n reads localStorage/document at import time)
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
globalThis.document = { documentElement: { lang: 'ru' }, querySelector: () => null, querySelectorAll: () => [] };
globalThis.window = { matchMedia: () => ({ matches: false }) };

const { html, raw, md, projectNo, initials } = await import('../js/core/ui.js');
const { t, setLang, DICT } = await import('../js/core/i18n.js');
const { estimate } = await import('../js/core/pricing.js');
const { authErrorKey } = await import('../js/core/errors.js');
const P = await import('../js/core/preferences.js');
const U = await import('../js/core/ai-usage.js');
const S = await import('../js/components/settings-index.js');
const A = await import('../js/core/alerts.js');
const { readFileSync, readdirSync, statSync } = await import('node:fs');
const { join, dirname } = await import('node:path');
const { fileURLToPath } = await import('node:url');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('html`` escapes interpolated values (XSS)', () => {
  const evil = '<img src=x onerror=alert(1)>"\'`';
  const out = String(html`<p title="${evil}">${evil}</p>`);
  assert.ok(!out.includes('<img'));
  assert.ok(out.includes('&lt;img'));
  assert.equal(String(html`${raw('<b>x</b>')}`), '<b>x</b>');
});

test('md() renders a safe Markdown subset', () => {
  const out = String(md('**b** *i*\n- a\n- b\n[l](https://ex.com) `c`'));
  assert.ok(out.includes('<strong>b</strong>') && out.includes('<ul><li>a</li><li>b</li></ul>') && out.includes('<code>c</code>'));
  const bad = String(md('<script>x</script> [x](javascript:alert(1))'));
  assert.ok(!bad.includes('<script') && !bad.includes('href="javascript'));
});

test('RU and EN dictionaries have identical structure', () => {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? flat(v, p + k + '.') : [p + k]));
  assert.deepEqual(flat(DICT.ru).sort(), flat(DICT.en).sort());
  setLang('en'); assert.equal(t('nav.overview'), 'Overview'); setLang('ru'); assert.equal(t('nav.overview'), 'Обзор');
});

test('auth errors are mapped to friendly keys, never raw text', () => {
  assert.equal(authErrorKey({ code: 'invalid_credentials' }), 'errors.invalid_credentials');
  assert.equal(authErrorKey({ message: 'User already registered' }), 'errors.user_already_exists');
  assert.equal(authErrorKey({ status: 429 }), 'errors.rate_limited');
  assert.equal(authErrorKey({ code: 'otp_expired' }), 'errors.link_expired');
  assert.equal(authErrorKey({ message: 'Failed to fetch' }), 'errors.network');
  assert.equal(authErrorKey({ message: 'internal db error' }), 'errors.generic');
});

test('estimate() reproduces the FAQ anchors', () => {
  const cat = { base_min: 15000, base_max: 25000, included_angles: 3, per_angle: 3000, per_object: 5000, anim_per_sec: 2000, days_min: 3, days_max: 10, currency: 'RUB' };
  const F = [
    { id: 'cx', multiplier: 1, time_mult: 1, addon: 0 }, { id: 'dt', multiplier: 1, time_mult: 1, addon: 0 },
    { id: 'ur', multiplier: 1, time_mult: 1, addon: 0 }, { id: 'rush', multiplier: 1.3, multiplier_max: 1.5, time_mult: 0.6, addon: 0 },
  ];
  const base = estimate(cat, F, { complexity: 'cx', detail: 'dt', urgency: 'ur', objects: 1, angles: 3, animation: 0, extras: [] });
  assert.deepEqual([base.min, base.max, base.daysMin, base.daysMax], [15000, 25000, 3, 10]);
  const rush = estimate(cat, F, { complexity: 'cx', detail: 'dt', urgency: 'rush', objects: 1, angles: 3, animation: 0, extras: [] });
  assert.deepEqual([rush.min, rush.max], [19500, 37500]); // +30% … +50%
});

test('formatters', () => {
  assert.equal(projectNo(42), 'AF-00042');
  assert.equal(initials('Александр Фролов'), 'АФ');
});


// =====================================================================
// AF STUDIO 3.0 — preferences, quota, settings search, alerts, i18n
// =====================================================================
const flatKeys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? flatKeys(v, p + k + '.') : [p + k]));

test('preferences: defaults satisfy their own allowlist (client mirror of af_pref_spec)', () => {
  for (const cat of P.CATEGORIES) {
    assert.deepEqual(Object.keys(P.DEFAULT_PREFERENCES[cat]).sort(), Object.keys(P.SPEC[cat]).sort(), cat);
    for (const [k, v] of Object.entries(P.DEFAULT_PREFERENCES[cat])) assert.ok(P.validValue(P.SPEC[cat][k], v), `${cat}.${k}`);
  }
  assert.equal(P.DEFAULT_PREFERENCES.notifications.ai.in_app, false);
  assert.equal(P.DEFAULT_PREFERENCES.notifications.platform_news.email, false);
  assert.equal(P.DEFAULT_PREFERENCES.notifications.messages.email, true);
  assert.equal(P.DEFAULT_PREFERENCES.ai.use_project_context, false);
});

test('preferences: SQL spec/defaults in the migration match the JS module', () => {
  const sql = readFileSync(join(ROOT, 'supabase/migrations/20261126000001_user_preferences.sql'), 'utf8');
  const grab = (fn) => JSON.parse(sql.split(`function public.${fn}()`)[1].split("$$")[1].trim().replace(/^select\s+'/, '').replace(/'::jsonb$/, ''));
  const spec = grab('af_pref_spec'); const defs = grab('af_pref_defaults');
  for (const cat of P.CATEGORIES) {
    assert.deepEqual(Object.keys(spec[cat]).sort(), Object.keys(P.SPEC[cat]).sort(), 'spec ' + cat);
    for (const k of Object.keys(spec[cat])) assert.deepEqual(spec[cat][k], P.SPEC[cat][k], `spec ${cat}.${k}`);
    assert.deepEqual(defs[cat], JSON.parse(JSON.stringify(P.DEFAULT_PREFERENCES[cat])), 'defaults ' + cat);
  }
});

test('preferences: validatePatch rejects unknown categories, keys and values', () => {
  assert.equal(P.validatePatch('security', { role: 'admin' }).error, 'unknown_category');
  assert.equal(P.validatePatch('appearance', { role: 'admin' }).error, 'unknown_key');
  assert.equal(P.validatePatch('appearance', { is_admin: true }).error, 'unknown_key');
  assert.equal(P.validatePatch('appearance', { text_scale: 150 }).error, 'invalid_value');
  assert.equal(P.validatePatch('appearance', { text_scale: '110' }).error, 'invalid_value');
  assert.equal(P.validatePatch('appearance', { density: 'tiny' }).error, 'invalid_value');
  assert.equal(P.validatePatch('ai', { save_history: 'yes' }).error, 'invalid_value');
  assert.equal(P.validatePatch('notifications', { messages: { push: true } }).error, 'invalid_value');
  assert.equal(P.validatePatch('notifications', { quiet_from: '25:00' }).error, 'invalid_value');
  assert.equal(P.validatePatch('notifications', { quiet_tz: 'Europe/Moscow; drop table' }).error, 'invalid_value');
  assert.equal(P.validatePatch('ai', {}).error, 'empty_patch');
  assert.ok(P.validatePatch('appearance', { text_scale: 120, accent: 'bronze' }).ok);
  assert.ok(P.validatePatch('notifications', { messages: { email: false }, quiet_tz: 'America/Argentina/Buenos_Aires' }).ok);
});

test('preferences: normalize drops garbage and merges channels one level deep', () => {
  const n = P.normalizePreferences({ appearance: { text_scale: 999, density: 'compact', evil: 1 }, notifications: { messages: { email: false } }, unknown: {} });
  assert.equal(n.appearance.text_scale, 100);
  assert.equal(n.appearance.density, 'compact');
  assert.ok(!('evil' in n.appearance) && !('unknown' in n));
  assert.deepEqual(n.notifications.messages, { in_app: true, email: false });
  const m = P.mergePatch(n, 'notifications', { messages: { in_app: false } });
  assert.deepEqual(m.notifications.messages, { in_app: false, email: false });
  assert.deepEqual(n.notifications.messages, { in_app: true, email: false }, 'mergePatch does not mutate');
});

function fakeServer() {
  const db = {}; let clock = 1;
  const row = (uid) => (db[uid] ||= { data: {}, updated_at: `2026-11-26T00:00:00.00000${clock}Z` });
  const view = (uid) => ({ ...P.normalizePreferences(row(uid).data), updated_at: row(uid).updated_at });
  return {
    db, uid: 'u1', fail: null, calls: [],
    async rpc(name, args) {
      this.calls.push([name, args]);
      if (this.fail) { const e = this.fail; this.fail = null; return { data: null, error: e }; }
      const r = row(this.uid);
      if (name === 'get_my_preferences') return { data: view(this.uid), error: null };
      if (name === 'save_my_preferences') {
        if (args.p_expected && args.p_expected < r.updated_at) return { data: null, error: { message: 'pref_conflict' } };
        const v = P.validatePatch(args.p_category, args.p_patch); if (!v.ok) return { data: null, error: { message: v.error } };
        const merged = P.mergePatch(P.normalizePreferences(r.data), args.p_category, args.p_patch);
        r.data[args.p_category] = merged[args.p_category]; clock++; r.updated_at = `2026-11-26T00:00:00.00000${clock}Z`;
        return { data: view(this.uid), error: null };
      }
      if (name === 'reset_my_preferences') { r.data[args.p_category] = {}; clock++; r.updated_at = `2026-11-26T00:00:00.00000${clock}Z`; return { data: view(this.uid), error: null }; }
      return { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } };
    },
  };
}

test('preferences: load → partial save → reset one category → reload', async () => {
  const srv = fakeServer(); P.__setRpc((n, a) => srv.rpc(n, a));
  P.clearPreferences();
  await P.loadPreferences('u1');
  assert.equal(P.preferencesState().loaded, true);
  await P.savePreferences('appearance', { density: 'compact' });
  await P.savePreferences('workspace', { page_size: 48 });
  assert.equal(P.getPreferences().appearance.density, 'compact');
  assert.equal(P.getPreferences().appearance.text_scale, 100, 'other keys untouched');
  await P.resetPreferences('appearance');
  assert.equal(P.getPreferences().appearance.density, 'comfortable');
  assert.equal(P.getPreferences().workspace.page_size, 48, 'reset of one category keeps the others');
  P.clearPreferences(); await P.loadPreferences('u1'); // "after reload"
  assert.equal(P.getPreferences().workspace.page_size, 48);
});

test('preferences: network error rolls back and reports a code (no false "saved")', async () => {
  const srv = fakeServer(); P.__setRpc((n, a) => srv.rpc(n, a));
  P.clearPreferences(); await P.loadPreferences('u1');
  srv.fail = { message: 'Failed to fetch' };
  await assert.rejects(P.savePreferences('appearance', { contrast: 'high' }), (e) => e.code === 'network');
  assert.equal(P.getPreferences().appearance.contrast, 'standard');
  await assert.rejects(P.savePreferences('appearance', { contrast: 'ultra' }), (e) => e.code === 'invalid');
});

test('preferences: conflict from another device — re-applies only untouched keys', async () => {
  const srv = fakeServer(); P.__setRpc((n, a) => srv.rpc(n, a));
  P.clearPreferences(); await P.loadPreferences('u1');
  // other device changes density
  srv.db.u1.data.appearance = { ...P.DEFAULT_PREFERENCES.appearance, density: 'compact' }; srv.db.u1.updated_at = '2026-11-26T00:00:09Z';
  await P.savePreferences('appearance', { accent: 'bronze' }); // different key → retried after reload
  assert.equal(P.getPreferences().appearance.accent, 'bronze');
  assert.equal(P.getPreferences().appearance.density, 'compact', 'fresher value from the other device kept');
  srv.db.u1.data.appearance = { ...srv.db.u1.data.appearance, accent: 'platinum' }; srv.db.u1.updated_at = '2026-11-26T00:00:59Z';
  await assert.rejects(P.savePreferences('appearance', { accent: 'gold' }), (e) => e.code === 'conflict');
  assert.equal(P.getPreferences().appearance.accent, 'platinum', 'newer data is never overwritten silently');
});

test('preferences: account switch and logout never leak the previous user', async () => {
  const srv = fakeServer(); P.__setRpc((n, a) => srv.rpc(n, a));
  P.clearPreferences(); await P.loadPreferences('u1');
  await P.savePreferences('workspace', { start_page: 'projects' });
  srv.uid = 'u2'; await P.loadPreferences('u2');
  assert.equal(P.getPreferences().workspace.start_page, 'overview');
  assert.equal(P.preferencesState().uid, 'u2');
  P.clearPreferences();
  assert.equal(P.preferencesState().uid, null);
  assert.equal(globalThis.localStorage.getItem('af.prefs.snap'), null);
});

test('preferences: missing migration → defaults + not_installed (site stays usable)', async () => {
  P.__setRpc(async () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.get_my_preferences' } }));
  P.clearPreferences(); await P.loadPreferences('u9');
  assert.equal(P.preferencesState().error, 'not_installed');
  assert.equal(P.getPreferences().appearance.text_scale, 100);
});

test('preferences: applyAccountPreferences writes scoped data attributes', () => {
  const attrs = {}; const style = {};
  const root = { setAttribute: (k, v) => (attrs[k] = v), style: { setProperty: (k, v) => (style[k] = v), removeProperty: (k) => delete style[k] } };
  const p = P.mergePatch(P.normalizePreferences({}), 'appearance', { text_scale: 120, sidebar: 'compact', accent: 'bronze' });
  P.applyAccountPreferences(p, root);
  assert.equal(attrs['data-af-scale'], '120'); assert.equal(attrs['data-af-sidebar'], 'compact');
  assert.equal(attrs['data-af-ov-stats'], 'on'); assert.equal(attrs['data-af-reveal'], 'on');
  assert.equal(style['--af-text-scale'], '1.2');
});

test('preferences: quiet hours, sorting, notification categories', () => {
  const np = { quiet_enabled: true, quiet_from: '22:00', quiet_to: '08:00' };
  assert.equal(P.inQuietHours(np, new Date(2026, 10, 26, 23, 30)), true);
  assert.equal(P.inQuietHours(np, new Date(2026, 10, 26, 7, 59)), true);
  assert.equal(P.inQuietHours(np, new Date(2026, 10, 26, 12, 0)), false);
  assert.equal(P.inQuietHours({ ...np, quiet_enabled: false }, new Date(2026, 10, 26, 23, 30)), false);
  assert.equal(P.inQuietHours({ quiet_enabled: true, quiet_from: '13:00', quiet_to: '14:00' }, new Date(2026, 10, 26, 13, 30)), true);
  const pr = [{ title: 'b', status: 'done', updated_at: '2026-01-02', created_at: '2026-01-01' }, { title: 'A', status: 'new', updated_at: '2026-01-03', created_at: '2025-12-01' }];
  assert.deepEqual(P.sortProjects(pr, 'name_asc').map((x) => x.title), ['A', 'b']);
  assert.deepEqual(P.sortProjects(pr, 'status').map((x) => x.status), ['new', 'done']);
  assert.deepEqual(P.sortProjects(pr, 'created_desc').map((x) => x.title), ['b', 'A']);
  const fl = [{ name: 'f10', size: 5, created_at: '1' }, { name: 'f2', size: 50, created_at: '2' }];
  assert.deepEqual(P.sortFiles(fl, 'name_asc').map((x) => x.name), ['f2', 'f10']);
  assert.deepEqual(P.sortFiles(fl, 'size_desc').map((x) => x.size), [50, 5]);
  assert.equal(P.notificationCategory('review_request'), 'approvals');
  assert.equal(P.notificationCategory('new_user'), null);
});

test('alerts: pop-up / sound / browser plan respects categories and quiet hours', () => {
  const prefs = P.mergePatch(P.normalizePreferences({}), 'notifications', { sound: true, browser: true, messages: { in_app: false } });
  const noon = new Date(2026, 10, 26, 12, 0);
  assert.deepEqual(A.alertPlan({ type: 'message' }, prefs, { now: noon }), { category: 'messages', quiet: false, toast: false, sound: false, browser: false });
  const pl = A.alertPlan({ type: 'project_status' }, prefs, { now: noon, hidden: true, permission: 'granted' });
  assert.equal(pl.toast && pl.sound && pl.browser, true);
  assert.equal(A.alertPlan({ type: 'project_status' }, prefs, { now: noon, hidden: false, permission: 'granted' }).browser, false, 'no OS popup when the tab is visible');
  const quiet = P.mergePatch(prefs, 'notifications', { quiet_enabled: true, quiet_from: '11:00', quiet_to: '13:00' });
  const q = A.alertPlan({ type: 'project_status' }, quiet, { now: noon, hidden: true, permission: 'granted' });
  assert.equal(q.quiet && !q.toast && !q.sound && !q.browser, true);
});

test('ai usage: normalize, levels, live countdowns, formatting', () => {
  const raw = { enabled: true, daily: { used: 12, limit: 40, remaining: 28, percent: 30, reset_at: '2026-11-27T00:00:00.000Z' }, minute: { used: 6, limit: 6, remaining: 0, retry_after: 18, reset_in: 18, window_seconds: 60 } };
  const n = U.normalizeUsage(raw);
  assert.equal(n.daily.remaining, 28); assert.equal(n.minute.retry_after, 18);
  assert.equal(U.normalizeUsage({ nope: 1 }), null);
  assert.equal(U.normalizeUsage({ daily: { used: 0, limit: 0 } }).daily.percent, 100, 'daily_limit 0 = nothing available, never unlimited');
  assert.equal(U.usageLevel(30, 28), 'ok'); assert.equal(U.usageLevel(70, 12), 'warn'); assert.equal(U.usageLevel(92, 3), 'high'); assert.equal(U.usageLevel(100, 0), 'full');
  const at = Date.parse('2026-11-26T19:41:42Z');
  const live = U.liveUsage(n, at, at + 10_000);
  assert.equal(live.minute.retry_after, 8);
  assert.equal(live.daily.reset_in, Math.round((Date.parse('2026-11-27T00:00:00Z') - at - 10_000) / 1000));
  const later = U.liveUsage(n, at, at + 61_000);
  assert.equal(later.minute.used, 0); assert.equal(later.minute.remaining, 6);
  assert.equal(U.fmtDuration(4 * 3600 + 18 * 60, 'ru'), '4 ч 18 мин');
  assert.equal(U.fmtDuration(18, 'ru'), '18 сек');
  assert.equal(U.fmtDuration(65, 'en'), '1 min 5 s');
});

test('ai usage: a failed refresh never turns into "0 left"', async () => {
  U.__setCaller(async () => ({ enabled: true, daily: { used: 3, limit: 10, remaining: 7, percent: 30, reset_at: '2026-11-27T00:00:00Z' }, minute: null }));
  await U.fetchUsage();
  U.__setCaller(async () => { const e = new Error('network'); e.code = 'network'; throw e; });
  await U.fetchUsage();
  assert.equal(U.usageError(), 'network');
  assert.equal(U.getUsage().daily.remaining, 7);
  U.clearUsage(); assert.equal(U.getUsage(), null);
});

test('settings search: synonyms, RU/EN, layout typos, grouping', () => {
  const top = (q) => S.searchSettings(q).slice(0, 4).map((r) => r.item.id);
  assert.ok(top('цвет').includes('app.accent') && top('цвет').includes('app.theme'));
  assert.equal(top('пароль')[0], 'security.password');
  assert.ok(top('лимит').includes('ai.usage_daily') && top('лимит').includes('ai.usage_minute'));
  assert.ok(top('3д').includes('app.q3d'));
  assert.ok(S.searchSettings('анимация').some((r) => r.item.id === 'app.fx'));
  assert.equal(top('gfhjkm')[0], 'security.password', 'wrong keyboard layout');
  assert.equal(top('password')[0], 'security.password');
  assert.deepEqual(S.searchSettings('zzzqqq'), []);
  const groups = S.groupResults(S.searchSettings('уведомления'));
  assert.equal(groups[0].category, 'notifications');
});

test('settings index: every entry is bilingual, unique and in a known category', () => {
  const cats = new Set(S.SC_CATEGORIES.map((c) => c.id));
  const ids = new Set();
  for (const it of S.SETTINGS_INDEX) {
    assert.ok(!ids.has(it.id), 'duplicate ' + it.id); ids.add(it.id);
    assert.ok(cats.has(it.category), it.id);
    for (const k of ['label_ru', 'label_en', 'description_ru', 'description_en']) assert.ok(String(it[k]).trim(), `${it.id}.${k}`);
    assert.ok(['active', 'device', 'info', 'soon'].includes(it.status));
    assert.ok(!/@|password=|token/i.test(JSON.stringify(it)), 'no personal values indexed');
  }
});

test('i18n: every t() key used by the 3.0 modules exists in RU and EN', () => {
  const files = ['js/components/settings-center.js', 'js/components/account-menu.js', 'js/components/help.js', 'js/components/usage-meter.js', 'js/app/shell.js', 'js/views/ai.js', 'js/views/projects.js', 'js/views/files.js', 'js/auth/access.js'];
  const ru = new Set(flatKeys(DICT.ru)); const en = new Set(flatKeys(DICT.en));
  const has = (set, key) => set.has(key) || [...set].some((k) => k.startsWith(key + '.')); // arrays/objects
  for (const f of files) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    for (const [, key] of src.matchAll(/\bt\('([\w.]+)'\s*[,)]/g)) { // static keys only (dynamic ones are checked below)
      if (key.endsWith('.')) continue;
      assert.ok(has(ru, key), `RU missing ${key} (${f})`); assert.ok(has(en, key), `EN missing ${key} (${f})`);
    }
  }
  for (const p of ['sc.style.', 'sc.alang.', 'sc.density.', 'sc.contrast.', 'sc.cards.', 'sc.sidebar.', 'sc.accent.', 'sc.view.', 'sc.psort.', 'sc.fsort.', 'sc.perm.']) {
    assert.ok([...ru].some((k) => k.startsWith(p)), p);
  }
  for (const v of P.SPEC.appearance.accent) assert.ok(ru.has('sc.accent.' + v) && en.has('sc.accent.' + v));
  for (const v of P.SPEC.workspace.projects_sort) assert.ok(ru.has('sc.psort.' + v) && en.has('sc.psort.' + v));
  for (const v of P.SPEC.workspace.files_sort) assert.ok(ru.has('sc.fsort.' + v) && en.has('sc.fsort.' + v));
});

test('security: the browser bundle never references server-only quota RPCs or secrets', () => {
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
  for (const f of walk(join(ROOT, 'js'))) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/ai_rate_consume|ai_refund|ai_consume|service_role|sb_secret_|GEMINI_API_KEY\s*=/.test(src.replace(/\/\/.*$/gm, '')), 'server-only reference in ' + f);
    assert.ok(!/from\('ai_settings'\)/.test(src) || f.includes(join('js', 'admin')), 'ai_settings read outside admin: ' + f);
  }
});
