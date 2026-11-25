// Hero showcase: cycles through detailed AF models with smooth transitions,
// drag-to-rotate, mouse parallax and soft studio lighting.
import { loadThree, reducedMotion, isMobile } from '../core/ui.js';
import { prefs } from '../core/prefs.js';
import { buildModel, fitObject, disposeObject, studioEnvironment } from './models.js';

export async function mountShowcase(canvas, { ids, interval = 6500, onChange } = {}) {
  const THREE = await loadThree().catch(() => null);
  if (!THREE || !canvas?.isConnected) return { dispose() {}, go() {} };
  const q = prefs.q3d; const mobile = isMobile();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: q !== 'low' }); } catch { return { dispose() {}, go() {} }; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, q === 'high' ? 2 : 1.25));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = q !== 'low'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(THREE, renderer);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(3.4, 1.7, 5.6);
  const key = new THREE.DirectionalLight(0xfff4e6, 2.0); key.position.set(3, 6, 4); key.castShadow = q !== 'low';
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005;
  const rim = new THREE.DirectionalLight(0xc8d8ff, 1.2); rim.position.set(-4, 3, -3);
  scene.add(key, rim, new THREE.HemisphereLight(0xffffff, 0x1a1612, 0.3));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.ShadowMaterial({ opacity: 0.3 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1; ground.receiveShadow = true; scene.add(ground);
  const holder = new THREE.Group(); scene.add(holder);

  const list = ids?.length ? ids : ['perfume', 'watch', 'car', 'headphones', 'sculpture', 'robot'];
  let index = -1; let current = null; let next = null; let tStart = 0; let timer = 0;
  const cache = new Map(); // id → fitted model (built once, reused → no rebuild lag on switching)
  const getModel = (id) => {
    if (!cache.has(id)) { const o = fitObject(THREE, buildModel(THREE, id, q), 2.5, -1); o.userData.baseScale = o.scale.x; cache.set(id, o); }
    return cache.get(id);
  };
  let dragging = false; let lx = 0; let rotY = 0; let velY = 0; let mx = 0; let my = 0; let tx = 0; let ty = 0;

  function go(i) {
    const target = (i + list.length) % list.length;
    if (target === index && !next) return;
    // a switch during a running transition: finish it instantly instead of leaving a model behind
    if (next) { if (current && current !== next) holder.remove(current); current = next; current.scale.setScalar(current.userData.baseScale); next = null; }
    index = target;
    let obj;
    try { obj = getModel(list[index]); } catch (e) { console.warn('model', list[index], e); return; }
    if (obj === current) { onChange?.(index, list[index]); return; }
    next = obj; next.userData.targetScale = obj.userData.baseScale; next.scale.setScalar(obj.userData.baseScale * 0.001);
    holder.add(next); tStart = performance.now();
    onChange?.(index, list[index]);
    clearTimeout(timer); if (!reducedMotion()) timer = setTimeout(() => go(index + 1), interval);
  }

  const down = (e) => { dragging = true; lx = e.clientX; canvas.setPointerCapture?.(e.pointerId); };
  const move = (e) => {
    const r = canvas.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (dragging) { velY = (e.clientX - lx) * 0.01; rotY += velY; lx = e.clientX; }
  };
  const up = () => { dragging = false; };
  canvas.addEventListener('pointerdown', down); window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('pointerup', up);

  const resize = () => { const r = canvas.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  let raf = 0; let alive = true; const clock = new THREE.Clock();
  (function loop() {
    if (!alive) return; raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    const t = clock.getElapsedTime(); const speed = reducedMotion() ? 0.1 : 1;
    if (next) {
      const k = Math.min(1, (performance.now() - tStart) / (reducedMotion() ? 1 : 900)); const e = 1 - Math.pow(1 - k, 3);
      next.scale.setScalar(next.userData.targetScale * (0.001 + e * 0.999));
      if (current) current.scale.multiplyScalar(0.86);
      if (k >= 1) { if (current) { holder.remove(current); current.scale.setScalar(current.userData.baseScale); } current = next; next = null; }
    }
    if (!dragging) { velY *= 0.94; rotY += velY + 0.004 * speed; }
    holder.rotation.y = rotY;
    [current, next].forEach((o) => o?.userData.update?.(t));
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    camera.position.x = 3.4 + mx * 0.6; camera.position.y = 1.7 - my * 0.4; camera.lookAt(0, 0.15, 0);
    renderer.render(scene, camera);
  })();
  go(0);

  return {
    go,
    dispose() {
      alive = false; cancelAnimationFrame(raf); clearTimeout(timer); ro.disconnect();
      canvas.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      cache.forEach((o) => disposeObject(o)); cache.clear();
      scene.environment?.dispose?.(); renderer.dispose(); renderer.forceContextLoss?.();
    },
  };
}
