// Pure price estimation logic (no DOM, no network) — shared by the calculator and unit tests.
/**
 * Pure estimate function (unit-tested in docs/TESTING.md).
 * All numbers come from pricing_categories / pricing_factors (editable in AF Admin).
 */
export function estimate(cat, factors, inp) {
  const f = (id) => factors.find((x) => x.id === id) || { multiplier: 1, multiplier_max: null, addon: 0, time_mult: 1 };
  const cx = f(inp.complexity); const dt = f(inp.detail); const ur = f(inp.urgency);
  const extras = (inp.extras || []).map(f);
  const extraAngles = Math.max(0, inp.angles - cat.included_angles);
  const extraObjects = Math.max(0, inp.objects - 1);
  const variable = extraAngles * cat.per_angle + extraObjects * cat.per_object + inp.animation * cat.anim_per_sec;
  const mult = Number(cx.multiplier) * Number(dt.multiplier);
  const addons = extras.reduce((s, e) => s + Number(e.addon || 0), 0);
  const urMin = Number(ur.multiplier); const urMax = Number(ur.multiplier_max || ur.multiplier);
  const min = ((Number(cat.base_min) + variable) * mult + addons) * urMin;
  const max = ((Number(cat.base_max) + variable) * mult + addons) * urMax;
  const tMult = Number(cx.time_mult) * Number(dt.time_mult) * Number(ur.time_mult) * extras.reduce((s, e) => s * Number(e.time_mult || 1), 1);
  const scope = 1 + extraAngles * 0.08 + extraObjects * 0.12 + inp.animation / 120;
  const daysMin = Math.max(1, Math.round(cat.days_min * tMult * Math.min(scope, 3)));
  const daysMax = Math.max(daysMin, Math.round(cat.days_max * tMult * Math.min(scope, 3)));
  return { min: Math.round(min), max: Math.round(max), daysMin, daysMax, currency: cat.currency };
}
