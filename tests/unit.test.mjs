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
