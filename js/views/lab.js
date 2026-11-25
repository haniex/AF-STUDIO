import { t, loc } from '../core/i18n.js';
import { html, icon, toast, isMobile, reducedMotion, loadThree, loadScript, $, $$, reveal } from '../core/ui.js';
import { getLabModels } from '../core/api.js';
import { mediaUrl } from '../lib/supabase.js';

const EX = 'https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/';
const SWATCHES = ['#d4a574', '#f5f2ed', '#1c1917', '#8a9aa8', '#b23a2e', '#2f5d50', '#3b4a8a', '#e8c4a0'];
const MATS = {
  gloss: { metalness: 0.05, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 },
  metal: { metalness: 1, roughness: 0.28 },
  glass: { metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.6, ior: 1.45, transparent: true, opacity: 1 },
  matte: { metalness: 0, roughness: 0.9 },
  gold: { metalness: 1, roughness: 0.18, colorOverride: '#d4a574' },
};
const LIGHTS = {
  studio: { key: [0xffffff, 2.2], fill: [0xfff3e6, 0.8], rim: [0xbcd2ff, 1.2], env: 1.0, exposure: 1.0 },
  sunset: { key: [0xffa35c, 2.6], fill: [0x6a4cff, 0.4], rim: [0xff6a3d, 1.6], env: 0.6, exposure: 1.05 },
  dramatic: { key: [0xffffff, 3.2], fill: [0x222222, 0.1], rim: [0xd4a574, 2.4], env: 0.25, exposure: 0.95 },
  neon: { key: [0xff2fd1, 2.0], fill: [0x00e5ff, 1.6], rim: [0x7c4dff, 2.2], env: 0.35, exposure: 1.1 },
};
const CAMS = { front: [0, 0.4, 4.2], side: [4.2, 0.4, 0], top: [0.01, 4.4, 0.01], hero: [2.8, 1.6, 3.0] };

export async function render(el) {
  el.innerHTML = String(html`
    <header class="af-page-head" data-reveal><div><span class="af-kicker">AF 3D LAB</span><h2>${t('lab.title')}</h2><p>${t('lab.sub')}</p></div></header>
    <div class="lab">
      <section class="lab-stage" data-stage>
        <span class="lab-badge af-pill af-pill--plain" data-badge></span>
        <div class="lab-loading" data-loading>${t('lab.loading')}</div>
        <div class="lab-hud">
          <span class="lab-hud__hint">${t('lab.hint')}</span>
          <div class="lab-hud__btns">
            <button type="button" data-zoom="in" aria-label="${t('lab.zoomIn')}">${icon('plus')}</button>
            <button type="button" data-zoom="out" aria-label="${t('lab.zoomOut')}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
            <button type="button" data-reset aria-label="${t('lab.reset')}">${icon('refresh')}</button>
            <button type="button" data-fs aria-label="${t('lab.fullscreen')}">${icon('fullscreen')}</button>
          </div>
        </div>
      </section>
      <aside class="lab-panel">
        <div class="af-card"><h3 class="af-h3">${t('lab.models')}</h3><div class="af-chips" data-models></div>
          <label class="af-btn af-btn--ghost af-btn--sm" style="margin-top:12px">${icon('upload')}<span>${t('lab.loadLocal')}</span><input type="file" accept=".glb,.gltf,model/gltf-binary" hidden data-local /></label>
          <p class="af-muted" style="font-size:12px;margin-top:8px">${t('lab.localNote')}</p></div>
        <div class="af-card"><h3 class="af-h3">${t('lab.color')}</h3><div class="lab-swatches" data-swatches>
          ${SWATCHES.map((c) => html`<button type="button" style="background:${c}" data-color="${c}" aria-label="${c}"></button>`)}<input type="color" value="#d4a574" data-picker aria-label="${t('lab.color')}" /></div></div>
        <div class="af-card"><h3 class="af-h3">${t('lab.material')}</h3><div class="af-chips" data-mats>${['original', 'gloss', 'metal', 'glass', 'matte', 'gold'].map((m) => html`<button type="button" class="af-chip" data-mat="${m}">${t('lab.mats.' + m)}</button>`)}</div></div>
        <div class="af-card"><h3 class="af-h3">${t('lab.light')}</h3><div class="af-chips" data-lights>${Object.keys(LIGHTS).map((m) => html`<button type="button" class="af-chip" data-light="${m}">${t('lab.lights.' + m)}</button>`)}</div></div>
        <div class="af-card"><h3 class="af-h3">${t('lab.camera')}</h3><div class="af-chips">${Object.keys(CAMS).map((m) => html`<button type="button" class="af-chip" data-cam="${m}">${t('lab.cams.' + m)}</button>`)}</div>
          <label class="af-switch" style="border:0"><span>${t('lab.autorotate')}</span><input type="checkbox" data-auto ${reducedMotion() ? '' : 'checked'} /></label></div>
      </aside>
    </div>`);
  reveal(el);
  const stage = $('[data-stage]', el);
  const loading = $('[data-loading]', el);

  let THREE;
  try {
    THREE = await loadThree();
    await loadScript(EX + 'controls/OrbitControls.js');
    await loadScript(EX + 'loaders/GLTFLoader.js');
    await loadScript(EX + 'environments/RoomEnvironment.js').catch(() => null);
  } catch { loading.textContent = t('errors.network'); return; }
  if (!stage.isConnected) return;

  const mobile = isMobile();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false }); }
  catch { loading.textContent = t('lab.webglOff'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.physicallyCorrectLights = false;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);
  camera.position.set(...CAMS.hero);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 1.6; controls.maxDistance = 12;
  controls.autoRotate = !reducedMotion(); controls.autoRotateSpeed = 1.2; controls.target.set(0, 0.2, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  if (THREE.RoomEnvironment) scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 5, 4); key.castShadow = !mobile;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 0.5; key.shadow.camera.far = 20; key.shadow.bias = -0.0005;
  const fill = new THREE.DirectionalLight(0xfff3e6, 0.8); fill.position.set(-4, 2, 2);
  const rim = new THREE.DirectionalLight(0xbcd2ff, 1.2); rim.position.set(-2, 3, -4);
  const amb = new THREE.HemisphereLight(0xffffff, 0x222018, 0.35);
  scene.add(key, fill, rim, amb);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.28 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1; ground.receiveShadow = true; scene.add(ground);

  const holder = new THREE.Group(); scene.add(holder);
  let current = null; let matName = 'original'; let color = null; let lightName = 'studio';

  // ---------------------------------------------------- demo objects (clearly labelled as demo)
  function std(c, p = {}) { return new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.2, roughness: 0.35, ...p }); }
  const DEMOS = {
    bottle: () => {
      const g = new THREE.Group();
      const pts = [[0, -1], [0.62, -1], [0.7, -0.92], [0.72, 0.2], [0.6, 0.45], [0.26, 0.62], [0.22, 0.8], [0, 0.8]].map(([x, y]) => new THREE.Vector2(x, y));
      const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 96), std(0xe8f0f4, { metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.8, ior: 1.5, transparent: true }));
      glass.userData.paint = true;
      const lq = pts.slice(0, 4).map((p) => new THREE.Vector2(p.x * 0.92, p.y * 0.9 - 0.05)).concat([new THREE.Vector2(0, 0.1)]);
      const liquid = new THREE.Mesh(new THREE.LatheGeometry(lq, 64), std(0xd4a574, { metalness: 0, roughness: 0.1, transmission: 0.6, transparent: true, opacity: 0.9 }));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 64), std(0x1c1917, { metalness: 1, roughness: 0.25 }));
      cap.position.y = 1.05; cap.userData.paint = true;
      g.add(glass, liquid, cap); return g;
    },
    headset: () => {
      const g = new THREE.Group();
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 24, 120, Math.PI), std(0x1c1917, { metalness: 0.6, roughness: 0.3 }));
      band.position.y = 0.15; band.userData.paint = true;
      const cupGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.32, 64);
      const padGeo = new THREE.TorusGeometry(0.34, 0.1, 24, 64);
      [-1, 1].forEach((s) => {
        const cup = new THREE.Mesh(cupGeo, std(0xd4a574, { metalness: 0.9, roughness: 0.22 })); cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.95, -0.35, 0); cup.userData.paint = true;
        const pad = new THREE.Mesh(padGeo, std(0x2a2520, { roughness: 0.85 })); pad.rotation.y = Math.PI / 2; pad.position.set(s * 0.78, -0.35, 0);
        g.add(cup, pad);
      });
      g.add(band); return g;
    },
    knot: () => { const m = new THREE.Mesh(new THREE.TorusKnotGeometry(0.75, 0.24, 260, 36, 2, 3), std(0xd4a574, { metalness: 1, roughness: 0.2 })); m.userData.paint = true; return m; },
  };

  function prepare(obj, all = false) {
    obj.traverse((m) => {
      if (!m.isMesh) return;
      m.castShadow = !mobile; m.receiveShadow = true;
      if (all) m.userData.paint = true;
      if (m.userData.paint) m.userData.orig = m.material;
    });
    // fit into a 2.4-unit box resting on the ground
    const box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3());
    const s = 2.4 / Math.max(size.x, size.y, size.z || 1);
    obj.scale.multiplyScalar(s); obj.position.sub(center.multiplyScalar(s)); obj.position.y += (size.y * s) / 2 - 1;
    return obj;
  }

  function setObject(obj, label) {
    if (current) { holder.remove(current); current.traverse((m) => { if (m.isMesh) { m.geometry?.dispose(); [].concat(m.material).forEach((x) => x?.dispose?.()); } }); }
    current = obj; holder.add(obj); applyMaterial(); $('[data-badge]', el).textContent = label;
    loading.hidden = true;
  }

  function applyMaterial() {
    if (!current) return;
    current.traverse((m) => {
      if (!m.isMesh || !m.userData.paint) return;
      if (matName === 'original') {
        const base = m.userData.orig; const mat = Array.isArray(base) ? base.map((b) => b.clone()) : base.clone();
        if (color) [].concat(mat).forEach((x) => x.color && x.color.set(color));
        m.material = mat;
      } else {
        const p = { ...MATS[matName] }; const c = p.colorOverride && !color ? p.colorOverride : (color || '#d4a574'); delete p.colorOverride;
        m.material = new THREE.MeshPhysicalMaterial({ color: c, ...p, envMapIntensity: LIGHTS[lightName].env * 1.4 });
      }
    });
    $$('[data-mat]', el).forEach((b) => b.classList.toggle('is-on', b.dataset.mat === matName));
  }

  function applyLight(name) {
    lightName = name; const L = LIGHTS[name];
    key.color.setHex(L.key[0]); key.intensity = L.key[1]; fill.color.setHex(L.fill[0]); fill.intensity = L.fill[1];
    rim.color.setHex(L.rim[0]); rim.intensity = L.rim[1]; renderer.toneMappingExposure = L.exposure;
    scene.traverse((o) => { if (o.isMesh && o.material && 'envMapIntensity' in o.material) o.material.envMapIntensity = L.env * 1.4; });
    $$('[data-light]', el).forEach((b) => b.classList.toggle('is-on', b.dataset.light === name));
  }

  // ---------------------------------------------------- camera animation
  let camAnim = null;
  function flyTo(pos) {
    const from = camera.position.clone(); const to = new THREE.Vector3(...pos); const t0 = performance.now(); const dur = reducedMotion() ? 1 : 700;
    camAnim = (now) => { const k = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - k, 3); camera.position.lerpVectors(from, to, e); if (k >= 1) camAnim = null; };
  }
  function zoom(dir) {
    const v = camera.position.clone().sub(controls.target); const len = v.length() * (dir === 'in' ? 0.8 : 1.25);
    flyTo(controls.target.clone().add(v.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, len)))).toArray());
  }

  // ---------------------------------------------------- loading GLB
  const loader = new THREE.GLTFLoader();
  function loadUrl(url, label) {
    loading.hidden = false; loading.textContent = t('lab.loading');
    loader.load(url, (gltf) => setObject(prepare(gltf.scene, true), label), undefined, () => { loading.textContent = t('lab.loadError'); toast(t('lab.loadError'), 'err'); });
  }

  // ---------------------------------------------------- UI
  let dbModels = [];
  try { dbModels = await getLabModels(); } catch { /* demo only */ }
  const demoList = [['bottle', t('lab.bottle')], ['headset', t('lab.headset')], ['knot', t('lab.knot')]];
  $('[data-models]', el).innerHTML = String(html`
    ${dbModels.map((m) => html`<button type="button" class="af-chip" data-model="${m.id}">${loc(m, 'title')}</button>`)}
    ${demoList.map(([k, l]) => html`<button type="button" class="af-chip" data-demo="${k}" title="${t('lab.demoNote')}">${l} · ${t('common.demo')}</button>`)}`);
  const markModel = (b) => $$('[data-model], [data-demo]', el).forEach((x) => x.classList.toggle('is-on', x === b));
  $$('[data-demo]', el).forEach((b) => b.addEventListener('click', () => { markModel(b); setObject(prepare(DEMOS[b.dataset.demo]()), `${t('lab.demo')} · ${b.textContent.split(' · ')[0]}`); }));
  $$('[data-model]', el).forEach((b) => b.addEventListener('click', async () => {
    markModel(b); const m = dbModels.find((x) => x.id === b.dataset.model);
    const url = await mediaUrl(m.model_path); if (url) loadUrl(url, loc(m, 'title')); else toast(t('lab.loadError'), 'err');
  }));
  $('[data-local]', el).addEventListener('change', (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 100 * 1048576) return toast(t('errors.file_too_big', { mb: 100 }), 'err');
    const rd = new FileReader();
    rd.onload = () => { loading.hidden = false; loader.parse(rd.result, '', (g) => { markModel(null); setObject(prepare(g.scene, true), f.name); }, () => toast(t('lab.loadError'), 'err')); };
    rd.readAsArrayBuffer(f); e.target.value = '';
  });
  $$('[data-color]', el).forEach((b) => b.addEventListener('click', () => { color = b.dataset.color; $$('[data-color]', el).forEach((x) => x.classList.toggle('is-on', x === b)); applyMaterial(); }));
  $('[data-picker]', el).addEventListener('input', (e) => { color = e.target.value; $$('[data-color]', el).forEach((x) => x.classList.remove('is-on')); applyMaterial(); });
  $$('[data-mat]', el).forEach((b) => b.addEventListener('click', () => { matName = b.dataset.mat; applyMaterial(); }));
  $$('[data-light]', el).forEach((b) => b.addEventListener('click', () => applyLight(b.dataset.light)));
  $$('[data-cam]', el).forEach((b) => b.addEventListener('click', () => flyTo(CAMS[b.dataset.cam])));
  $$('[data-zoom]', el).forEach((b) => b.addEventListener('click', () => zoom(b.dataset.zoom)));
  $('[data-reset]', el).addEventListener('click', () => { controls.target.set(0, 0.2, 0); flyTo(CAMS.hero); });
  $('[data-auto]', el).addEventListener('change', (e) => { controls.autoRotate = e.target.checked; });
  $('[data-fs]', el).addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen?.().catch(() => {}); });

  // ---------------------------------------------------- loop
  const resize = () => { const r = stage.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(stage); resize();
  let raf = 0; let alive = true;
  (function loop(now) {
    if (!alive) return; raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    if (camAnim) camAnim(now || performance.now());
    controls.update(); renderer.render(scene, camera);
  })();

  applyLight('studio');
  const firstBtn = dbModels.length ? $('[data-model]', el) : $('[data-demo]', el);
  firstBtn?.click();

  return () => {
    alive = false; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
    scene.traverse((o) => { if (o.isMesh) { o.geometry?.dispose(); [].concat(o.material).forEach((x) => x?.dispose?.()); } });
    pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
    if (document.fullscreenElement === stage) document.exitFullscreen();
  };
}
