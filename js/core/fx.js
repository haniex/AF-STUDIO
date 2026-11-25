// AF STUDIO — interaction effects layer (delegated, lightweight, respects user prefs).
// • spotlight glow following the pointer on cards  • ripple on buttons
// • soft cursor aura  • scroll progress line  • reveal-on-scroll for [data-io]
import { prefs } from './prefs.js';

let started = false;
const reduced = () => prefs.fx === 'reduced' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = () => window.matchMedia('(pointer: fine)').matches;
const SPOT = '.af-card, .work-card, .ov-quick a, .bd-svc, .calc-cat, .lab-tile, .pr-card, .adm-kpi, .acc-card, .sv-contacts a, .service-card';

export function initFx() {
  if (started) return; started = true;

  // ---------------------------------------------------------- spotlight
  let raf = 0; let last = null;
  document.addEventListener('pointermove', (e) => {
    if (!fine()) return;
    last = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const el = last.target.closest?.(SPOT);
      if (el) { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', `${last.clientX - r.left}px`); el.style.setProperty('--my', `${last.clientY - r.top}px`); }
      if (aura && prefs.glow && !reduced()) aura.style.transform = `translate3d(${last.clientX}px, ${last.clientY}px, 0)`;
    });
  }, { passive: true });

  // ---------------------------------------------------------- cursor aura
  let aura = null;
  if (fine()) { aura = document.createElement('div'); aura.className = 'af-aura'; aura.setAttribute('aria-hidden', 'true'); document.body.appendChild(aura); }

  // ---------------------------------------------------------- ripple
  document.addEventListener('pointerdown', (e) => {
    if (reduced()) return;
    const b = e.target.closest?.('.af-btn, .acc-btn, .af-chip, .af-icon-btn, .lab-tile, .bd-svc, .calc-cat');
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(); const d = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span'); s.className = 'af-ripple';
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.appendChild(s); setTimeout(() => s.remove(), 650);
  });

  // ---------------------------------------------------------- scroll progress
  const bar = document.createElement('div'); bar.className = 'af-progress'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 40 ? Math.min(1, scrollY / h) : 0})`;
    document.body.classList.toggle('af-scrolled', scrollY > 8);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---------------------------------------------------------- reveal on scroll
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;
  const scan = (root = document) => root.querySelectorAll('[data-io]:not(.is-in)').forEach((n, i) => {
    n.style.setProperty('--io-delay', `${Math.min(i, 8) * 55}ms`);
    if (io && !reduced()) io.observe(n); else n.classList.add('is-in');
  });
  let pending = 0;
  new MutationObserver(() => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; scan(); }); }).observe(document.body, { childList: true, subtree: true });
  scan();
}
