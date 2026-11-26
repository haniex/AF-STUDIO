// =====================================================================
// AF STUDIO — mobile runtime helpers (no effect on desktop layout).
// • --af-vvh: real visible viewport height (shrinks with the on-screen keyboard on iOS / Android)
// • body.af-kb-open while the keyboard is shown → the bottom tab bar hides, composers stay visible
// • focused fields are scrolled into view above the keyboard
// • swipe left on the side drawer closes it
// =====================================================================
const MOBILE_Q = '(max-width: 860px)';
let started = false;

/** Pure: is the on-screen keyboard most likely open? (unit-tested) */
export function keyboardOpen(innerH, visualH, focusedIsText) {
  if (!focusedIsText || !innerH || !visualH) return false;
  return innerH - visualH > Math.max(120, innerH * 0.18);
}

const isText = (el) => !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable
  || (el.tagName === 'INPUT' && !/^(checkbox|radio|range|button|submit|reset|file|color|image|hidden)$/i.test(el.type || '')));

export function initMobile() {
  if (started || typeof window === 'undefined') return; started = true;
  const root = document.documentElement;
  const vv = window.visualViewport;
  const mq = window.matchMedia(MOBILE_Q);
  let raf = 0;

  const update = () => {
    raf = 0;
    const h = Math.round(vv ? vv.height : window.innerHeight);
    root.style.setProperty('--af-vvh', h + 'px');
    const open = mq.matches && keyboardOpen(window.innerHeight, h, isText(document.activeElement));
    document.body.classList.toggle('af-kb-open', open);
    root.style.setProperty('--af-kb', open ? Math.max(0, window.innerHeight - h) + 'px' : '0px');
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
  (vv || window).addEventListener('resize', schedule);
  vv?.addEventListener('scroll', schedule);
  window.addEventListener('orientationchange', () => setTimeout(update, 250));
  update();

  // keep the focused field visible above the keyboard
  document.addEventListener('focusin', (e) => {
    schedule();
    if (!mq.matches || !isText(e.target)) return;
    setTimeout(() => {
      const r = e.target.getBoundingClientRect(); const vh = vv ? vv.height : window.innerHeight;
      if (r.bottom > vh - 12 || r.top < 60) e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 320);
  });
  document.addEventListener('focusout', () => setTimeout(update, 120));

  // swipe-to-close for the side drawer
  let sx = 0; let sy = 0; let tracking = false;
  document.addEventListener('touchstart', (e) => {
    if (!document.body.classList.contains('af-nav-open') || !e.target.closest?.('.af-side')) return;
    tracking = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!tracking) return; tracking = false;
    const t = e.changedTouches[0]; const dx = t.clientX - sx; const dy = Math.abs(t.clientY - sy);
    if (dx < -60 && dy < 50) document.body.classList.remove('af-nav-open');
  }, { passive: true });
}
