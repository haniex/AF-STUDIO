import { t, loc, getLang } from '../core/i18n.js';
import { html, icon, toast, isMobile, reducedMotion, loadThree, loadScript, $, $$, reveal } from '../core/ui.js';
import { getLabModels } from '../core/api.js';
import { mediaUrl } from '../lib/supabase.js';
import { prefs } from '../core/prefs.js';
import { MODELS, CATS, buildModel, fitObject, disposeObject, studioEnvironment } from '../three/models.js';

const EX = 'https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/';
const SWATCHES = ['#d4a574', '#f5f2ed', '#1c1917', '#8a9aa8', '#b23a2e', '#2f5d50', '#3b4a8a', '#6a2c8a', '#e8c4a0', '#46c2d6'];
const MATS = {
  gloss: { metalness: 0.05, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 },
  metal: { metalness: 1, roughness: 0.26 },
  glass: { metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.6, ior: 1.5 },
  matte: { metalness: 0, roughness: 0.9 },
  gold: { metalness: 1, roughness: 0.18, colorOverride: '#d4a574' },
  carbon: { metalness: 0.4, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08, colorOverride: '#1d1f24' },
};
const LIGHTS = {
  studio: { key: [0xffffff, 2.2], fill: [0xfff3e6, 0.8], rim: [0xbcd2ff, 1.2], env: 1.0, exposure: 1.0 },
  sunset: { key: [0xffa35c, 2.6], fill: [0x6a4cff, 0.4], rim: [0xff6a3d, 1.6], env: 0.6, exposure: 1.05 },
  dramatic: { key: [0xffffff, 3.2], fill: [0x222222, 0.1], rim: [0xd4a574, 2.4], env: 0.3, exposure: 0.95 },
  neon: { key: [0xff2fd1, 2.0], fill: [0x00e5ff, 1.6], rim: [0x7c4dff, 2.2], env: 0.4, exposure: 1.1 },
};
const CAMS = { hero: [3.0, 1.6, 3.4], front: [0, 0.4, 4.6], side: [4.6, 0.4, 0], top: [0.01, 4.8, 0.01] };
const BGS = ['dark', 'warm', 'light', 'grid'];

export async function render(el) {
  const L = getLang();
  el.innerHTML = String(html`
    <header class="af-page-head" data-reveal><div><span class="af-kicker">AF 3D LAB</span><h2>${t('lab.title')}</h2><p>${t('lab.sub')}</p></div>
      <div class="af-row">
        <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-shot>${icon('image')}<span>${t('lab.screenshot')}</span></button>
        <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-glb>${icon('download')}<span>GLB</span></button>
      </div></header>
    <div class="lab">
      <section class="lab-stage lab-stage--dark" data-stage>
        <div class="lab-badge"><span class="af-pill af-pill--plain" data-badge></span></div>
        <div class="lab-loading" data-loading><span class="af-spinner"></span><span>${t('lab.loading')}</span></div>
        <div class="lab-hud">
          <span class="lab-hud__hint">${t('lab.hint')}</span>
          <div class="lab-hud__btns">
            <button type="button" data-zoom="in" aria-label="${t('lab.zoomIn')}" title="${t('lab.zoomIn')}">${icon('plus')}</button>
            <button type="button" data-zoom="out" aria-label="${t('lab.zoomOut')}" title="${t('lab.zoomOut')}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
            <button type="button" data-reset aria-label="${t('lab.reset')}" title="${t('lab.reset')}">${icon('refresh')}</button>
            <button type="button" data-fs aria-label="${t('lab.fullscreen')}" title="${t('lab.fullscreen')}">${icon('fullscreen')}</button>
          </div>
        </div>
      </section>
      <aside class="lab-panel">
        <div class="af-card"><h3 class="af-h3">${t('lab.models')}</h3>
          <div class="lab-gallery" data-gallery>
            ${MODELS.map((m) => html`<button type="button" class="lab-tile" data-demo="${m.id}"><span class="lab-tile__cat">${CATS[m.cat][L]}</span><b>${m.title[L]}</b></button>`)}
          </div>
          <div class="af-chips" data-models style="margin-top:10px"></div>
          <label class="af-btn af-btn--ghost af-btn--sm" style="margin-top:12px">${icon('upload')}<span>${t('lab.loadLocal')}</span><input type="file" accept=".glb,.gltf,model/gltf-binary" hidden data-local /></label>
          <p class="af-muted" style="font-size:12px;margin-top:8px">${t('lab.localNote')}</p></div>
        <div class="af-card"><h3 class="af-h3">${t('lab.color')}</h3><div class="lab-swatches" data-swatches>
          ${SWATCHES.map((c) => html`<button type="button" style="background:${c}" data-color="${c}" aria-label="${c}"></button>`)}<input type="color" value="#d4a574" data-picker aria-label="${t('lab.color')}" /></div></div>
        <div class="af-card"><h3 class="af-h3">${t('lab.material')}</h3><div class="af-chips">${['original', 'gloss', 'metal', 'glass', 'matte', 'gold', 'carbon'].map((m) => html`<button type="button" class="af-chip" data-mat="${m}">${t('lab.mats.' + m)}</button>`)}</div>
          <label class="af-switch" style="border:0;padding-bottom:0"><span>${t('lab.wireframe')}</span><input type="checkbox" data-wire /></label></div>
        <div class="af-card"><h3 class="af-h3">${t('lab.light')}</h3><div class="af-chips">${Object.keys(LIGHTS).map((m) => html`<button type="button" class="af-chip" data-light="${m}">${t('lab.lights.' + m)}</button>`)}</div>
          <p class="af-field" style="margin:14px 0 8px"><span>${t('lab.background')}</span></p>
          <div class="af-chips">${BGS.map((b) => html`<button type="button" class="af-chip" data-bg="${b}">${t('lab.bgs.' + b)}</button>`)}</div></div>
        <div class="af-card"><h3 class="af-h3">${t('lab.camera')}</h3><div class="af-chips">${Object.keys(CAMS).map((m) => html`<button type="button" class="af-chip" data-cam="${m}">${t('lab.cams.' + m)}</button>`)}</div>
          <label class="af-switch" style="border:0"><span>${t('lab.autorotate')}</span><input type="checkbox" data-auto ${reducedMotion() ? '' : 'checked'} /></label>
          <label class="af-field" style="margin:0"><span>${t('lab.speed')}</span><input class="af-range" type="range" min="0.2" max="6" step="0.1" value="1.4" data-speed /></label></div>
      </aside>
    </div>`);
  reveal(el);
  const stage = $('[data-stage]', el); const loading = $('[data-loading]', el);
  const showLoading = (on, text) => { loading.hidden = !on; if (text) loading.lastElementChild.textContent = text; };

  let THREE;
  try {
    THREE = await loadThree();
    await loadScript(EX + 'controls/OrbitControls.js');
    await loadScript(EX + 'loaders/GLTFLoader.js');
  } catch { showLoading(true, t('errors.network')); return; }
  if (!stage.isConnected) return;

  const q = prefs.q3d; const mobile = isMobile();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: q !== 'low', alpha: true }); } catch { showLoading(true, t('lab.webglOff')); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, q === 'high' ? 2 : q === 'medium' ? 1.5 : 1));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = q !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(THREE, renderer);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 200);
  camera.position.set(...CAMS.hero);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 1.6; controls.maxDistance = 12;
  controls.autoRotate = !reducedMotion(); controls.autoRotateSpeed = 1.4; controls.target.set(0, 0.2, 0);

  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 5, 4); key.castShadow = q !== 'low';
  key.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024); key.shadow.camera.near = 0.5; key.shadow.camera.far = 20; key.shadow.bias = -0.0004;
  ['left', 'bottom'].forEach((k) => { key.shadow.camera[k] = -4; }); ['right', 'top'].forEach((k) => { key.shadow.camera[k] = 4; });
  const fill = new THREE.DirectionalLight(0xfff3e6, 0.8); fill.position.set(-4, 2, 2);
  const rim = new THREE.DirectionalLight(0xbcd2ff, 1.2); rim.position.set(-2, 3, -4);
  scene.add(key, fill, rim, new THREE.HemisphereLight(0xffffff, 0x222018, 0.3));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.ShadowMaterial({ opacity: 0.32 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.GridHelper(12, 24, 0xd4a574, 0x3a332c); grid.position.y = -0.999; grid.material.transparent = true; grid.material.opacity = 0.35; grid.visible = false; scene.add(grid);

  const holder = new THREE.Group(); scene.add(holder);
  let current = null; let currentId = ''; let matName = 'original'; let color = null; let lightName = 'studio'; let wire = false; let spawnT = 0; let baseScale = 1;

  function prepare(obj, all = false) {
    obj.traverse((m) => {
      if (!m.isMesh || m.userData.bounds) return;
      m.castShadow = q !== 'low'; m.receiveShadow = true;
      if (all) m.userData.paint = true;
      if (m.userData.paint) m.userData.orig = m.material;
    });
    return fitObject(THREE, obj, 2.5, -1);
  }

  function setObject(obj, label, id = '') {
    if (current) { holder.remove(current); disposeObject(current); }
    current = obj; currentId = id; holder.add(obj);
    baseScale = obj.scale.x; spawnT = performance.now();
    applyMaterial(); applyWire(); applyLight(lightName);
    $('[data-badge]', el).textContent = label; showLoading(false);
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
    applyWire();
    $$('[data-mat]', el).forEach((b) => b.classList.toggle('is-on', b.dataset.mat === matName));
  }
  function applyWire() { current?.traverse((m) => { if (m.isMesh && !m.userData.bounds) [].concat(m.material).forEach((x) => { if (x && 'wireframe' in x) x.wireframe = wire; }); }); }

  function applyLight(name) {
    lightName = name; const Lt = LIGHTS[name];
    key.color.setHex(Lt.key[0]); key.intensity = Lt.key[1]; fill.color.setHex(Lt.fill[0]); fill.intensity = Lt.fill[1];
    rim.color.setHex(Lt.rim[0]); rim.intensity = Lt.rim[1]; renderer.toneMappingExposure = Lt.exposure;
    scene.traverse((o) => { if (o.isMesh && o.material && 'envMapIntensity' in o.material) o.material.envMapIntensity = Lt.env * 1.4; });
    $$('[data-light]', el).forEach((b) => b.classList.toggle('is-on', b.dataset.light === name));
  }
  function applyBg(b) {
    BGS.forEach((x) => stage.classList.toggle('lab-stage--' + x, x === b));
    grid.visible = b === 'grid';
    $$('[data-bg]', el).forEach((x) => x.classList.toggle('is-on', x.dataset.bg === b));
  }

  let camAnim = null;
  function flyTo(pos) {
    const from = camera.position.clone(); const to = new THREE.Vector3(...pos); const t0 = performance.now(); const dur = reducedMotion() ? 1 : 800;
    camAnim = (now) => { const k = Math.min(1, (now - t0) / dur); const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; camera.position.lerpVectors(from, to, e); if (k >= 1) camAnim = null; };
  }
  function zoom(dir) {
    const v = camera.position.clone().sub(controls.target); const len = v.length() * (dir === 'in' ? 0.8 : 1.25);
    flyTo(controls.target.clone().add(v.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, len)))).toArray());
  }

  const loader = new THREE.GLTFLoader();
  function loadUrl(url, label) {
    showLoading(true, t('lab.loading'));
    loader.load(url, (gltf) => setObject(prepare(gltf.scene, true), label), undefined, () => { showLoading(true, t('lab.loadError')); toast(t('lab.loadError'), 'err'); });
  }
  function openDemo(id) {
    const def = MODELS.find((m) => m.id === id);
    try { setObject(prepare(buildModel(THREE, id, q)), def.title[getLang()], id); }
    catch (e) { console.error(e); toast(t('lab.loadError'), 'err'); }
    $$('[data-demo], [data-model]', el).forEach((x) => x.classList.toggle('is-on', x.dataset.demo === id));
  }

  // ------------------------------------------------ UI
  let dbModels = [];
  try { dbModels = await getLabModels(); } catch { /* demo only */ }
  $('[data-models]', el).innerHTML = String(html`${dbModels.map((m) => html`<button type="button" class="af-chip" data-model="${m.id}">${icon('lab')}${loc(m, 'title')}</button>`)}`);
  $$('[data-demo]', el).forEach((b) => b.addEventListener('click', () => openDemo(b.dataset.demo)));
  $$('[data-model]', el).forEach((b) => b.addEventListener('click', async () => {
    $$('[data-demo], [data-model]', el).forEach((x) => x.classList.toggle('is-on', x === b));
    const m = dbModels.find((x) => x.id === b.dataset.model);
    const url = await mediaUrl(m.model_path); if (url) loadUrl(url, loc(m, 'title')); else toast(t('lab.loadError'), 'err');
  }));
  $('[data-local]', el).addEventListener('change', (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    if (f.size > 100 * 1048576) return toast(t('errors.file_too_big', { mb: 100 }), 'err');
    const rd = new FileReader();
    rd.onload = () => { showLoading(true); loader.parse(rd.result, '', (g) => { $$('[data-demo], [data-model]', el).forEach((x) => x.classList.remove('is-on')); setObject(prepare(g.scene, true), f.name); }, () => { showLoading(false); toast(t('lab.loadError'), 'err'); }); };
    rd.readAsArrayBuffer(f);
  });
  $$('[data-color]', el).forEach((b) => b.addEventListener('click', () => { color = b.dataset.color; $$('[data-color]', el).forEach((x) => x.classList.toggle('is-on', x === b)); applyMaterial(); }));
  $('[data-picker]', el).addEventListener('input', (e) => { color = e.target.value; $$('[data-color]', el).forEach((x) => x.classList.remove('is-on')); applyMaterial(); });
  $$('[data-mat]', el).forEach((b) => b.addEventListener('click', () => { matName = b.dataset.mat; applyMaterial(); }));
  $('[data-wire]', el).addEventListener('change', (e) => { wire = e.target.checked; applyWire(); });
  $$('[data-light]', el).forEach((b) => b.addEventListener('click', () => applyLight(b.dataset.light)));
  $$('[data-bg]', el).forEach((b) => b.addEventListener('click', () => applyBg(b.dataset.bg)));
  $$('[data-cam]', el).forEach((b) => b.addEventListener('click', () => { flyTo(CAMS[b.dataset.cam]); $$('[data-cam]', el).forEach((x) => x.classList.toggle('is-on', x === b)); }));
  $$('[data-zoom]', el).forEach((b) => b.addEventListener('click', () => zoom(b.dataset.zoom)));
  $('[data-reset]', el).addEventListener('click', () => { controls.target.set(0, 0.2, 0); flyTo(CAMS.hero); });
  $('[data-auto]', el).addEventListener('change', (e) => { controls.autoRotate = e.target.checked; });
  $('[data-speed]', el).addEventListener('input', (e) => { controls.autoRotateSpeed = +e.target.value; });
  $('[data-fs]', el).addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else (stage.requestFullscreen || stage.webkitRequestFullscreen)?.call(stage)?.catch?.(() => {}); });
  $('[data-shot]', el).addEventListener('click', () => {
    renderer.render(scene, camera);
    const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/png'); a.download = `AF-3DLab-${currentId || 'model'}.png`; a.click();
  });
  $('[data-glb]', el).addEventListener('click', async (e) => {
    if (!current) return;
    const b = e.currentTarget; b.disabled = true;
    try {
      await loadScript(EX + 'exporters/GLTFExporter.js');
      new THREE.GLTFExporter().parse(current, (res) => {
        const blob = new Blob([res], { type: 'model/gltf-binary' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `AF-${currentId || 'model'}.glb`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000); b.disabled = false;
      }, { binary: true });
    } catch (err) { console.error(err); toast(t('errors.generic'), 'err'); b.disabled = false; }
  });

  // ------------------------------------------------ loop
  const resize = () => { const r = stage.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(stage); resize();
  let raf = 0; let alive = true; const clock = new THREE.Clock();
  (function loop(now) {
    if (!alive) return; raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    const tm = clock.getElapsedTime();
    if (camAnim) camAnim(now || performance.now());
    if (current) {
      const k = Math.min(1, (performance.now() - spawnT) / (reducedMotion() ? 1 : 700));
      const e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); // back-out
      current.scale.setScalar(baseScale * Math.max(0.001, e));
      current.userData.update?.(tm);
    }
    controls.update(); renderer.render(scene, camera);
  })();

  applyLight('studio'); applyBg('dark');
  $('[data-cam="hero"]', el)?.classList.add('is-on');
  if (dbModels.length) $('[data-model]', el).click(); else openDemo('perfume');

  return () => {
    alive = false; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
    if (current) disposeObject(current);
    scene.environment?.dispose?.(); renderer.dispose(); renderer.forceContextLoss?.();
    if (document.fullscreenElement === stage) document.exitFullscreen();
  };
}
