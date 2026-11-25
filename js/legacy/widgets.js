// Widgets ported from the original AF site (script.js), scoped to a root element
// and returning cleanup functions so they can live inside SPA views.
import { reducedMotion, isTouch, isMobile, loadThree } from '../core/ui.js';

// ---------------------------------------------------------------------
// Hero 3D — "magnetic paradise objects" (original initThree, adapted)
// ---------------------------------------------------------------------
export async function heroScene(canvas) {
  const THREE = await loadThree().catch(() => null);
  if (!THREE || !canvas?.isConnected) return () => {};
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile() }); } catch { return () => {}; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.z = 6.5;
  const isDark = () => document.body.classList.contains('dark');

  const dustCount = isMobile() ? 260 : 600;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) { dustPos[i * 3] = (Math.random() - 0.5) * 18; dustPos[i * 3 + 1] = (Math.random() - 0.5) * 12; dustPos[i * 3 + 2] = (Math.random() - 0.5) * 10; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ size: 0.028, color: isDark() ? 0xe8d5b8 : 0xc4a484, transparent: true, opacity: 0.45, depthWrite: false });
  const dust = new THREE.Points(dustGeo, dustMat); scene.add(dust);

  const meshes = [];
  [
    { geo: new THREE.IcosahedronGeometry(0.55, 1), x: 1.2, y: 1.0, z: -1, scale: 1 },
    { geo: new THREE.TorusGeometry(0.45, 0.14, 24, 64), x: 3.0, y: -0.6, z: -0.5, scale: 1.1 },
    { geo: new THREE.OctahedronGeometry(0.5, 0), x: 2.2, y: 1.7, z: -2, scale: 0.85 },
    { geo: new THREE.IcosahedronGeometry(0.35, 0), x: 0.6, y: -1.4, z: -1.5, scale: 0.7 },
    { geo: new THREE.TorusKnotGeometry(0.28, 0.09, 80, 12), x: 3.6, y: 1.2, z: -2.2, scale: 0.9 },
  ].forEach((c) => {
    const mat = new THREE.MeshBasicMaterial({ color: isDark() ? 0xd4a574 : 0xb8956c, wireframe: true, transparent: true, opacity: 0.35 });
    const mesh = new THREE.Mesh(c.geo, mat);
    mesh.position.set(c.x, c.y, c.z); mesh.scale.setScalar(c.scale);
    mesh.userData = { baseX: c.x, baseY: c.y, baseZ: c.z, baseScale: c.scale, rotSpeed: 0.15 + Math.random() * 0.25, phase: Math.random() * Math.PI * 2 };
    scene.add(mesh); meshes.push(mesh);
  });
  const ringMat = new THREE.MeshBasicMaterial({ color: isDark() ? 0xd4a574 : 0xc4a484, transparent: true, opacity: 0.2 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.015, 16, 100), ringMat);
  ring.rotation.x = Math.PI / 2.4; ring.position.x = 2; scene.add(ring);

  let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0, raf = 0, alive = true;
  const onMove = (e) => { targetX = (e.clientX / innerWidth - 0.5) * 2; targetY = (e.clientY / innerHeight - 0.5) * 2; };
  window.addEventListener('mousemove', onMove, { passive: true });
  const resize = () => { const r = canvas.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  const onTheme = () => { const d = isDark(); dustMat.color.setHex(d ? 0xe8d5b8 : 0xc4a484); ringMat.color.setHex(d ? 0xd4a574 : 0xc4a484); meshes.forEach((m) => m.material.color.setHex(d ? 0xd4a574 : 0xb8956c)); };
  window.addEventListener('af:theme', onTheme);
  const sp = reducedMotion() ? 0.15 : 1;

  (function animate() {
    if (!alive) return;
    raf = requestAnimationFrame(animate);
    if (document.hidden) return;
    const t = performance.now() * 0.001 * sp;
    mouseX += (targetX - mouseX) * 0.06; mouseY += (targetY - mouseY) * 0.06;
    dust.rotation.y = t * 0.02 + mouseX * 0.15; dust.rotation.x = t * 0.01 + mouseY * 0.08;
    ring.rotation.z = t * 0.12; ring.rotation.y = mouseX * 0.2;
    meshes.forEach((mesh, i) => {
      const u = mesh.userData;
      const floatY = Math.sin(t * 0.6 + u.phase) * 0.25; const floatX = Math.cos(t * 0.4 + u.phase) * 0.12;
      const mx = mouseX * 0.55 * (1.2 - i * 0.08); const my = -mouseY * 0.55 * (1.0 - i * 0.06);
      const dx = (u.baseX + mx) - mouseX * 2.5; const dy = (u.baseY + my) - (-mouseY * 2);
      const proximity = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 4);
      mesh.position.x += (u.baseX + mx + floatX - mesh.position.x) * 0.08;
      mesh.position.y += (u.baseY + my + floatY - mesh.position.y) * 0.08;
      mesh.position.z += (u.baseZ - mesh.position.z) * 0.05;
      const s = u.baseScale * (1 + proximity * 0.45); mesh.scale.lerp(new THREE.Vector3(s, s, s), 0.1);
      mesh.rotation.x = t * u.rotSpeed * 0.5 + mouseY * 0.3; mesh.rotation.y = t * u.rotSpeed + mouseX * 0.4;
      mesh.material.opacity = 0.25 + proximity * 0.4;
    });
    camera.position.x += (mouseX * 0.35 - camera.position.x) * 0.04; camera.position.y += (-mouseY * 0.25 - camera.position.y) * 0.04;
    camera.lookAt(1.2, 0, 0);
    renderer.render(scene, camera);
  })();

  return () => {
    alive = false; cancelAnimationFrame(raf); ro.disconnect();
    window.removeEventListener('mousemove', onMove); window.removeEventListener('af:theme', onTheme);
    scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    renderer.dispose();
  };
}

// ---------------------------------------------------------------------
// Process timeline (original initProcessTimeline, scoped)
// ---------------------------------------------------------------------
export function processTimeline(root) {
  const steps = Array.from(root.querySelectorAll('.pt-step'));
  if (!steps.length) return () => {};
  const reduced = reducedMotion();
  let index = 0; let animating = false;
  const offs = [];
  const on = (el, ev, fn, o) => { el?.addEventListener(ev, fn, o); offs.push(() => el?.removeEventListener(ev, fn, o)); };

  function setActive(i, fromUser) {
    if (i < 0 || i >= steps.length) return;
    if ((i === index || animating) && fromUser) return;
    animating = true; index = i;
    steps.forEach((step, idx) => {
      const isOn = idx === index;
      step.classList.toggle('is-active', isOn); step.classList.toggle('is-open', isOn);
      step.querySelector('.pt-marker')?.setAttribute('aria-expanded', isOn ? 'true' : 'false');
      const c = step.querySelector('.pt-content');
      if (c && isOn && !reduced) {
        c.style.transition = 'opacity .55s ease, transform .55s cubic-bezier(.22,1,.36,1)';
        c.style.opacity = '0'; c.style.transform = 'translateY(12px)';
        requestAnimationFrame(() => requestAnimationFrame(() => { c.style.opacity = '1'; c.style.transform = 'none'; }));
      }
    });
    const prog = root.querySelector('.pt-progress');
    if (prog) prog.style.height = (steps.length <= 1 ? 100 : (index / (steps.length - 1)) * 100) + '%';
    const prev = root.querySelector('.pt-prev'); const next = root.querySelector('.pt-next');
    if (prev) prev.disabled = index === 0; if (next) next.disabled = index === steps.length - 1;
    root.querySelectorAll('.pt-dot').forEach((d, di) => { d.classList.toggle('is-active', di === index); d.setAttribute('aria-current', di === index ? 'true' : 'false'); });
    setTimeout(() => { animating = false; }, reduced ? 0 : 700);
  }
  steps.forEach((s, i) => { on(s.querySelector('.pt-marker'), 'click', () => setActive(i, true)); on(s.querySelector('.pt-title'), 'click', () => setActive(i, true)); });
  on(root.querySelector('.pt-prev'), 'click', () => setActive(index - 1, true));
  on(root.querySelector('.pt-next'), 'click', () => setActive(index + 1, true));
  root.querySelectorAll('.pt-dot').forEach((d) => on(d, 'click', () => setActive(+d.dataset.index, true)));
  const tl = root.querySelector('.process-timeline');
  on(tl, 'keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); setActive(index + 1, true); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); setActive(index - 1, true); }
  });
  const orbit = root.querySelector('.process-orbit');
  let raf = 0;
  if (orbit && !reduced && !isTouch()) {
    let mx = 0, my = 0, tx = 0, ty = 0;
    on(window, 'pointermove', (e) => { tx = (e.clientX / innerWidth - 0.5) * 14; ty = (e.clientY / innerHeight - 0.5) * 10; }, { passive: true });
    (function tick() { mx += (tx - mx) * 0.06; my += (ty - my) * 0.06; orbit.style.transform = `rotateX(${-my}deg) rotateY(${mx}deg)`; raf = requestAnimationFrame(tick); })();
  }
  setActive(0, false);
  return () => { cancelAnimationFrame(raf); offs.forEach((f) => f()); };
}

// ---------------------------------------------------------------------
// Reviews gallery (original initReviewsGallery, scoped & simplified)
// ---------------------------------------------------------------------
export function reviewsGallery(root, { onMore } = {}) {
  const stage = root.querySelector('.reviews-stage');
  if (!stage) return () => {};
  const cards = Array.from(stage.querySelectorAll('.rx-card'));
  const dots = Array.from(root.querySelectorAll('.rx-dot'));
  const total = cards.length; let index = 0;
  const offs = []; const on = (el, ev, fn) => { el?.addEventListener(ev, fn); offs.push(() => el?.removeEventListener(ev, fn)); };
  function layout() {
    cards.forEach((c, i) => {
      c.classList.remove('is-active', 'is-prev', 'is-next', 'is-far');
      if (i === index) c.classList.add('is-active');
      else if (i === (index - 1 + total) % total) c.classList.add('is-prev');
      else if (i === (index + 1) % total) c.classList.add('is-next');
      else c.classList.add('is-far');
    });
    dots.forEach((d, i) => { d.classList.toggle('is-active', i === index); d.setAttribute('aria-selected', i === index ? 'true' : 'false'); });
  }
  const go = (to) => { index = (to + total) % total; layout(); };
  on(root.querySelector('.rx-prev'), 'click', () => go(index - 1));
  on(root.querySelector('.rx-next'), 'click', () => go(index + 1));
  dots.forEach((d) => on(d, 'click', () => go(+d.dataset.index)));
  on(root.querySelector('.reviews-gallery'), 'keydown', (e) => { if (e.key === 'ArrowLeft') go(index - 1); if (e.key === 'ArrowRight') go(index + 1); });
  let px = 0, py = 0, tracking = false;
  on(stage, 'pointerdown', (e) => { tracking = true; px = e.clientX; py = e.clientY; });
  on(stage, 'pointerup', (e) => { if (!tracking) return; tracking = false; const dx = e.clientX - px; const dy = e.clientY - py; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(index + (dx < 0 ? 1 : -1)); });
  cards.forEach((c, i) => {
    on(c, 'click', (e) => { if (e.target.closest('.rx-more')) return; if (i !== index) go(i); });
    on(c.querySelector('.rx-more'), 'click', (e) => { e.stopPropagation(); onMore?.(i); });
  });
  if (!isTouch() && !reducedMotion()) on(stage, 'pointermove', (e) => {
    const a = stage.querySelector('.rx-card.is-active .rx-card-inner'); if (!a) return;
    const r = a.getBoundingClientRect();
    a.style.setProperty('--rx-mx', ((e.clientX - r.left) / r.width) * 100 + '%'); a.style.setProperty('--rx-my', ((e.clientY - r.top) / r.height) * 100 + '%');
  });
  layout();
  return () => offs.forEach((f) => f());
}

// ---------------------------------------------------------------------
// 3D tilt cards (original initTilt)
// ---------------------------------------------------------------------
export function tilt(root) {
  if (isTouch() || reducedMotion()) return () => {};
  const offs = [];
  root.querySelectorAll('.tilt-card').forEach((card) => {
    const move = (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width; const y = (e.clientY - r.top) / r.height;
      card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 12}deg) rotateY(${(x - 0.5) * 12}deg) scale3d(1.015,1.015,1.015)`;
    };
    const leave = () => { card.style.transform = ''; };
    card.addEventListener('mousemove', move); card.addEventListener('mouseleave', leave);
    offs.push(() => { card.removeEventListener('mousemove', move); card.removeEventListener('mouseleave', leave); });
  });
  return () => offs.forEach((f) => f());
}

/** Count-up numbers (original initCounters) */
export function countUp(root) {
  const els = root.querySelectorAll('[data-count]');
  els.forEach((el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    if (reducedMotion()) { el.textContent = target; return; }
    const start = performance.now(); const dur = 1100;
    (function step(now) {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target);
      if (p < 1) requestAnimationFrame(step);
    })(start);
  });
}
