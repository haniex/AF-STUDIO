// =====================================================================
// AF 3D LAB — professional glTF viewer (three.js r170, ES modules)
//  • real PBR models (Khronos glTF Sample Assets, CC0 / CC BY 4.0, credited in UI)
//  • KHR_materials_* (transmission, clearcoat, sheen, iridescence, anisotropy…),
//    Draco / KTX2 / Meshopt decoders, material variants, animations
//  • cache + async shader compilation → switching without freezes
//  • studio lighting presets, backgrounds incl. blurred environment,
//    clay / chrome / gold / wireframe looks, exposure, screenshot, GLB export
// =====================================================================
import { t, loc, getLang } from '../core/i18n.js';
import { html, icon, toast, reducedMotion, isMobile, $, $$, reveal } from '../core/ui.js';
import { getLabModels } from '../core/api.js';
import { mediaUrl } from '../lib/supabase.js';
import { prefs } from '../core/prefs.js';

const V = '0.170.0';
const CDN = `https://cdn.jsdelivr.net/npm/three@${V}`;
const ESM = (p) => `${CDN}/examples/jsm/${p}/+esm`;
const KH = (name) => [
  `https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/${name}/glTF-Binary/${name}.glb`,
  `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/${name}/glTF-Binary/${name}.glb`,
];

// Showcase-grade demo models. NOT AF works — clearly labelled with author and licence.
const DEMOS = [
  { id: 'ChronographWatch', cat: 'product', ru: 'Хронограф', en: 'Chronograph watch', by: 'Eric Chadwick · DGG', lic: 'CC BY 4.0' },
  { id: 'CarConcept', cat: 'auto', ru: 'Концепт-кар', en: 'Concept car', by: 'Eric Chadwick · DGG', lic: 'CC BY 4.0' },
  { id: 'SunglassesKhronos', cat: 'product', ru: 'Солнцезащитные очки', en: 'Sunglasses', by: 'Eric Chadwick · DGG', lic: 'CC BY 4.0' },
  { id: 'MaterialsVariantsShoe', cat: 'product', ru: 'Кроссовок', en: 'Sneaker', by: 'Shopify', lic: 'CC BY 4.0' },
  { id: 'ToyCar', cat: 'auto', ru: 'Игрушечная машина', en: 'Toy car', by: 'G. Odendahl · E. Chadwick', lic: 'CC0' },
  { id: 'SheenChair', cat: 'interior', ru: 'Кресло (бархат)', en: 'Velvet chair', by: 'Wayfair · E. Chadwick', lic: 'CC0' },
  { id: 'SheenWoodLeatherSofa', cat: 'interior', ru: 'Диван: дерево и кожа', en: 'Wood & leather sofa', by: 'F. Calvente · E. Chadwick', lic: 'CC BY 4.0' },
  { id: 'IridescenceLamp', cat: 'interior', ru: 'Лампа с переливом', en: 'Iridescence lamp', by: 'Wayfair · E. Chadwick', lic: 'CC BY 4.0' },
  { id: 'GlassHurricaneCandleHolder', cat: 'product', ru: 'Стеклянный подсвечник', en: 'Glass candle holder', by: 'Wayfair · E. Chadwick', lic: 'CC BY 4.0' },
  { id: 'PotOfCoals', cat: 'product', ru: 'Медный котёл', en: 'Copper pot of coals', by: 'Eric Chadwick · DGG', lic: 'CC BY 4.0' },
  { id: 'MosquitoInAmber', cat: 'art', ru: 'Комар в янтаре', en: 'Mosquito in amber', by: 'Loïc Norgeot · Sketchfab', lic: 'CC BY 4.0' },
  { id: 'ABeautifulGame', cat: 'art', ru: 'Шахматы', en: 'Chess set', by: 'ASWF MaterialX · Ed Mackey', lic: 'CC BY 4.0' },
  { id: 'CommercialRefrigerator', cat: 'interior', ru: 'Холодильник с шампанским', en: 'Champagne fridge', by: 'Sean Thomas · E. Chadwick', lic: 'CC BY 4.0' },
];
const CATS = { product: { ru: 'Продукт', en: 'Product' }, auto: { ru: 'Авто', en: 'Auto' }, interior: { ru: 'Интерьер', en: 'Interior' }, art: { ru: 'Арт', en: 'Art' }, own: { ru: 'AF Studio', en: 'AF Studio' } };
const LOOKS = ['original', 'clay', 'gloss', 'chrome', 'gold', 'wire'];
const LIGHTS = {
  studio: { key: [0xffffff, 3.0], rim: [0xcfe0ff, 2.0], env: 1.0, rot: 0 },
  sunset: { key: [0xffa060, 3.6], rim: [0x7a5cff, 1.6], env: 0.65, rot: 1.6 },
  dramatic: { key: [0xffffff, 4.2], rim: [0xd4a574, 3.2], env: 0.28, rot: 3.1 },
  neon: { key: [0xff2fd1, 3.2], rim: [0x00e5ff, 3.4], env: 0.4, rot: 4.4 },
};
const BGS = ['studio', 'warm', 'light', 'env'];
const SWATCHES = ['#e9e4dc', '#d4a574', '#1c1917', '#8a9aa8', '#b23a2e', '#2f5d50', '#3b4a8a', '#6a2c8a'];
const CAMS = { hero: [1, 0.42, 1.25], front: [0, 0.12, 1.6], side: [1.6, 0.12, 0], top: [0.001, 1.65, 0.001] };

let libs = null;
async function loadLibs() {
  if (libs) return libs;
  const [THREE, oc, gl, dr, kt, mo, re, ex] = await Promise.all([
    import(`${CDN}/+esm`), import(ESM('controls/OrbitControls.js')), import(ESM('loaders/GLTFLoader.js')),
    import(ESM('loaders/DRACOLoader.js')), import(ESM('loaders/KTX2Loader.js')), import(ESM('libs/meshopt_decoder.module.js')),
    import(ESM('environments/RoomEnvironment.js')), import(ESM('exporters/GLTFExporter.js')),
  ]);
  libs = { THREE, OrbitControls: oc.OrbitControls, GLTFLoader: gl.GLTFLoader, DRACOLoader: dr.DRACOLoader, KTX2Loader: kt.KTX2Loader,
    MeshoptDecoder: mo.MeshoptDecoder, RoomEnvironment: re.RoomEnvironment, GLTFExporter: ex.GLTFExporter };
  return libs;
}

function bgTexture(THREE, kind) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 512; const g = c.getContext('2d');
  const stops = { studio: ['#2a241f', '#14110f', '#070606'], warm: ['#5a3a22', '#26170d', '#0d0805'], light: ['#ffffff', '#ece6dd', '#cfc6b9'] }[kind];
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, stops[0]); gr.addColorStop(0.55, stops[1]); gr.addColorStop(1, stops[2]);
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function floorGlowTex(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,236,210,.55)'); gr.addColorStop(0.45, 'rgba(255,220,180,.12)'); gr.addColorStop(1, 'rgba(255,220,180,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}

export async function render(el) {
  const L = getLang();
  el.innerHTML = String(html`
    <header class="af-page-head" data-reveal><div><span class="af-kicker">AF 3D LAB</span><h2>${t('lab.title')}</h2><p>${t('lab.sub')}</p></div>
      <div class="af-row">
        <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-shot>${icon('image')}<span>${t('lab.screenshot')}</span></button>
        <button type="button" class="af-btn af-btn--ghost af-btn--sm" data-glb>${icon('download')}<span>GLB</span></button>
      </div></header>
    <div class="lab">
      <section class="lab-stage lab-stage--studio" data-stage>
        <div class="lab-badge"><span class="af-pill af-pill--plain" data-badge>—</span></div>
        <div class="lab-loading" data-loading><div class="lab-loading__ring"><span data-pct>0%</span></div><p data-load-text>${t('lab.loading')}</p></div>
        <div class="lab-hud">
          <span class="lab-hud__hint">${t('lab.hint')}</span>
          <div class="lab-hud__btns">
            <button type="button" data-zoom="in" aria-label="${t('lab.zoomIn')}" title="${t('lab.zoomIn')}">${icon('plus')}</button>
            <button type="button" data-zoom="out" aria-label="${t('lab.zoomOut')}" title="${t('lab.zoomOut')}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
            <button type="button" data-reset aria-label="${t('lab.reset')}" title="${t('lab.reset')}">${icon('refresh')}</button>
            <button type="button" data-fs aria-label="${t('lab.fullscreen')}" title="${t('lab.fullscreen')}">${icon('fullscreen')}</button>
          </div>
        </div>
        <p class="lab-credit" data-credit></p>
      </section>

      <aside class="lab-panel">
        <div class="af-card">
          <div class="af-card__head"><h3>${t('lab.models')}</h3><span class="af-muted" style="font-size:12px">${DEMOS.length}</span></div>
          <div class="af-chips lab-cats" data-cats>
            <button type="button" class="af-chip is-on" data-cat="all">${t('common.all')}</button>
            ${Object.keys(CATS).filter((k) => k !== 'own').map((k) => html`<button type="button" class="af-chip" data-cat="${k}">${CATS[k][L]}</button>`)}
          </div>
          <div class="lab-gallery" data-gallery></div>
          <label class="af-btn af-btn--ghost af-btn--sm" style="margin-top:12px">${icon('upload')}<span>${t('lab.loadLocal')}</span><input type="file" accept=".glb,.gltf,model/gltf-binary" hidden data-local /></label>
          <p class="af-muted" style="font-size:12px;margin-top:8px">${t('lab.demoLicence')}</p>
        </div>
        <div class="af-card" data-variants-card hidden><h3 class="af-h3">${t('lab.variants')}</h3><div class="af-chips" data-variants></div></div>
        <div class="af-card"><h3 class="af-h3">${t('lab.material')}</h3>
          <div class="af-chips">${LOOKS.map((m) => html`<button type="button" class="af-chip ${m === 'original' ? 'is-on' : ''}" data-look="${m}">${t('lab.looks.' + m)}</button>`)}</div>
          <div class="lab-swatches" data-swatches style="margin-top:12px">${SWATCHES.map((c) => html`<button type="button" style="background:${c}" data-color="${c}" aria-label="${c}"></button>`)}<input type="color" value="#e9e4dc" data-picker aria-label="${t('lab.color')}" /></div>
          <p class="af-muted" style="font-size:12px;margin-top:8px">${t('lab.colorHint')}</p>
        </div>
        <div class="af-card"><h3 class="af-h3">${t('lab.light')}</h3>
          <div class="af-chips">${Object.keys(LIGHTS).map((m) => html`<button type="button" class="af-chip ${m === 'studio' ? 'is-on' : ''}" data-light="${m}">${t('lab.lights.' + m)}</button>`)}</div>
          <label class="af-field" style="margin:14px 0 0"><span>${t('lab.exposure')}</span><input class="af-range" type="range" min="0.4" max="2" step="0.05" value="1" data-exposure /></label>
          <label class="af-field" style="margin:6px 0 0"><span>${t('lab.lightAngle')}</span><input class="af-range" type="range" min="0" max="6.28" step="0.05" value="0" data-angle /></label>
          <p class="af-field" style="margin:14px 0 8px"><span>${t('lab.background')}</span></p>
          <div class="af-chips">${BGS.map((b) => html`<button type="button" class="af-chip ${b === 'studio' ? 'is-on' : ''}" data-bg="${b}">${t('lab.bgs.' + b)}</button>`)}</div>
        </div>
        <div class="af-card"><h3 class="af-h3">${t('lab.camera')}</h3>
          <div class="af-chips">${Object.keys(CAMS).map((m) => html`<button type="button" class="af-chip ${m === 'hero' ? 'is-on' : ''}" data-cam="${m}">${t('lab.cams.' + m)}</button>`)}</div>
          <label class="af-switch" style="border:0"><span>${t('lab.autorotate')}</span><input type="checkbox" data-auto ${reducedMotion() ? '' : 'checked'} /></label>
          <label class="af-field" style="margin:0"><span>${t('lab.speed')}</span><input class="af-range" type="range" min="0.2" max="6" step="0.1" value="1.2" data-speed /></label>
        </div>
      </aside>
    </div>`);
  reveal(el);

  const stage = $('[data-stage]', el); const loading = $('[data-loading]', el);
  const setLoading = (on, text, pct) => {
    loading.hidden = !on;
    if (text) $('[data-load-text]', el).textContent = text;
    $('[data-pct]', el).textContent = pct == null ? '' : `${Math.round(pct)}%`;
  };

  let lib;
  try { lib = await loadLibs(); } catch (e) { console.error(e); setLoading(true, t('errors.network')); return; }
  if (!stage.isConnected) return;
  const { THREE } = lib;

  // ------------------------------------------------ renderer & scene
  const q = prefs.q3d; const mobile = isMobile();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: q !== 'low', alpha: false, powerPreference: 'high-performance' }); }
  catch { setLoading(true, t('lab.webglOff')); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, q === 'high' ? 2 : q === 'medium' ? 1.5 : 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = q !== 'low'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.classList.add('lab-canvas');
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new lib.RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  const bgTex = { studio: bgTexture(THREE, 'studio'), warm: bgTexture(THREE, 'warm'), light: bgTexture(THREE, 'light') };
  scene.background = bgTex.studio;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
  const controls = new lib.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.07; controls.autoRotate = !reducedMotion(); controls.autoRotateSpeed = 1.2;
  controls.minDistance = 0.4; controls.maxDistance = 6; controls.maxPolarAngle = Math.PI * 0.53;

  const key = new THREE.DirectionalLight(0xffffff, 3); key.castShadow = q !== 'low';
  key.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  const rim = new THREE.DirectionalLight(0xcfe0ff, 2);
  scene.add(key, key.target, rim);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.ShadowMaterial({ opacity: 0.38 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: floorGlowTex(THREE), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.0005; scene.add(glow);

  // ------------------------------------------------ loaders
  const draco = new lib.DRACOLoader().setDecoderPath(`${CDN}/examples/jsm/libs/draco/gltf/`);
  const ktx2 = new lib.KTX2Loader().setTranscoderPath(`${CDN}/examples/jsm/libs/basis/`).detectSupport(renderer);
  const loader = new lib.GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(lib.MeshoptDecoder);
  const loadUrl = (url, onProgress) => new Promise((res, rej) => loader.load(url, res, (e) => e.total && onProgress?.((e.loaded / e.total) * 100), rej));
  const parseBuf = (buf) => new Promise((res, rej) => loader.parse(buf, '', res, rej));

  // ------------------------------------------------ state
  const cache = new Map(); // id → { root, gltf, label, credit, mixer }
  let cur = null; let curId = ''; let token = 0; let look = 'original'; let color = '#e9e4dc'; let lightName = 'studio'; let lightAngle = 0;
  let radius = 1; let mixer = null; let spawn = 0; const clock = new THREE.Clock();
  const failed = new Set();

  const lookMats = {};
  const makeLook = (name) => {
    lookMats[name]?.dispose();
    const c = new THREE.Color(color);
    const m = {
      clay: () => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0 }),
      gloss: () => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04 }),
      chrome: () => new THREE.MeshStandardMaterial({ color: 0xf2f3f5, roughness: 0.04, metalness: 1 }),
      gold: () => new THREE.MeshStandardMaterial({ color: 0xe2b277, roughness: 0.16, metalness: 1 }),
      wire: () => new THREE.MeshBasicMaterial({ color: 0xd4a574, wireframe: true, transparent: true, opacity: 0.85 }),
    }[name]?.();
    if (m) lookMats[name] = m; return m;
  };
  function applyLook() {
    if (!cur) return;
    const mat = look === 'original' ? null : (lookMats[look] && look !== 'clay' && look !== 'gloss' ? lookMats[look] : makeLook(look));
    cur.root.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.userData.afOrig) o.userData.afOrig = o.material;
      o.material = mat || o.userData.afOrig;
    });
    $$('[data-look]', el).forEach((b) => b.classList.toggle('is-on', b.dataset.look === look));
  }

  function frame(root) {
    const box = new THREE.Box3().setFromObject(root, true);
    const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3());
    root.position.x -= center.x; root.position.z -= center.z; root.position.y -= box.min.y; // stand on the floor
    radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
    controls.target.set(0, size.y * 0.45, 0);
    controls.minDistance = radius * 0.6; controls.maxDistance = radius * 7;
    camera.near = radius / 100; camera.far = radius * 60; camera.updateProjectionMatrix();
    ground.scale.setScalar(radius * 1.4); glow.scale.setScalar(radius * 3.2);
    placeLights(); flyTo('hero', true);
  }
  function placeLights() {
    const a = lightAngle + LIGHTS[lightName].rot * 0.25; const r = radius * 4;
    key.position.set(Math.cos(a) * r, radius * 4.2, Math.sin(a) * r); key.target.position.set(0, 0, 0);
    const sc = key.shadow.camera; const s = radius * 1.8; sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = radius * 0.5; sc.far = radius * 12; sc.updateProjectionMatrix();
    rim.position.set(-Math.cos(a) * r, radius * 2.2, -Math.sin(a) * r);
  }
  function applyLight(name) {
    lightName = name; const Lt = LIGHTS[name];
    key.color.setHex(Lt.key[0]); key.intensity = Lt.key[1]; rim.color.setHex(Lt.rim[0]); rim.intensity = Lt.rim[1];
    scene.environmentIntensity = Lt.env; if (scene.background === envTex) scene.backgroundIntensity = Lt.env * 0.9;
    placeLights();
    $$('[data-light]', el).forEach((b) => b.classList.toggle('is-on', b.dataset.light === name));
  }
  function applyBg(b) {
    if (b === 'env') { scene.background = envTex; scene.backgroundBlurriness = 0.55; scene.backgroundIntensity = LIGHTS[lightName].env * 0.9; }
    else { scene.background = bgTex[b]; scene.backgroundBlurriness = 0; scene.backgroundIntensity = 1; }
    ground.material.opacity = b === 'light' ? 0.22 : 0.38; glow.visible = b !== 'light';
    BGS.forEach((x) => stage.classList.toggle('lab-stage--' + x, x === b));
    $$('[data-bg]', el).forEach((x) => x.classList.toggle('is-on', x.dataset.bg === b));
  }

  let camAnim = null;
  function flyTo(name, instant = false) {
    const dir = new THREE.Vector3(...CAMS[name]).normalize();
    const dist = radius / Math.sin((camera.fov * Math.PI) / 360) * 1.15;
    const to = controls.target.clone().add(dir.multiplyScalar(dist));
    if (instant || reducedMotion()) { camera.position.copy(to); camAnim = null; return; }
    const from = camera.position.clone(); const t0 = performance.now();
    camAnim = (now) => { const k = Math.min(1, (now - t0) / 850); const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; camera.position.lerpVectors(from, to, e); if (k >= 1) camAnim = null; };
    $$('[data-cam]', el).forEach((x) => x.classList.toggle('is-on', x.dataset.cam === name));
  }
  function zoom(dir) {
    const v = camera.position.clone().sub(controls.target); const len = Math.max(controls.minDistance, Math.min(controls.maxDistance, v.length() * (dir === 'in' ? 0.78 : 1.28)));
    const from = camera.position.clone(); const to = controls.target.clone().add(v.setLength(len)); const t0 = performance.now();
    camAnim = (now) => { const k = Math.min(1, (now - t0) / 450); camera.position.lerpVectors(from, to, 1 - Math.pow(1 - k, 3)); if (k >= 1) camAnim = null; };
  }

  // ------------------------------------------------ variants (KHR_materials_variants)
  function paintVariants(entry) {
    const card = $('[data-variants-card]', el); const box = $('[data-variants]', el);
    const ext = entry.gltf?.userData?.gltfExtensions?.KHR_materials_variants;
    if (!ext?.variants?.length) { card.hidden = true; return; }
    card.hidden = false;
    box.innerHTML = String(html`${ext.variants.map((v, i) => html`<button type="button" class="af-chip ${i === (entry.variant ?? 0) ? 'is-on' : ''}" data-variant="${i}">${v.name}</button>`)}`);
    $$('[data-variant]', box).forEach((b) => b.addEventListener('click', async () => {
      const idx = +b.dataset.variant; entry.variant = idx;
      $$('[data-variant]', box).forEach((x) => x.classList.toggle('is-on', x === b));
      const parser = entry.gltf.parser; const jobs = [];
      entry.root.traverse((o) => {
        const ve = o.userData?.gltfExtensions?.KHR_materials_variants; if (!o.isMesh || !ve) return;
        if (!o.userData.afVariantBase) o.userData.afVariantBase = o.userData.afOrig || o.material;
        const map = ve.mappings.find((m) => m.variants.includes(idx));
        jobs.push((async () => {
          if (map) { o.material = await parser.getDependency('material', map.material); parser.assignFinalMaterial(o); }
          else o.material = o.userData.afVariantBase;
          o.userData.afOrig = o.material;
        })());
      });
      await Promise.all(jobs); applyLook();
    }));
  }

  // ------------------------------------------------ show / load
  async function show(id, source) {
    const my = ++token;
    $$('[data-id]', el).forEach((b) => b.classList.toggle('is-on', b.dataset.id === id));
    let entry = cache.get(id);
    if (!entry) {
      setLoading(true, t('lab.loading'), 0);
      try {
        let gltf = null; let lastErr = null;
        if (source.buffer) gltf = await parseBuf(source.buffer);
        else for (const url of source.urls) { try { gltf = await loadUrl(url, (p) => my === token && setLoading(true, t('lab.loading'), p)); break; } catch (e) { lastErr = e; } }
        if (!gltf) throw lastErr || new Error('load');
        const root = gltf.scene || gltf.scenes?.[0];
        root.traverse((o) => { if (o.isMesh) { o.castShadow = q !== 'low'; o.receiveShadow = true; } });
        entry = { root, gltf, label: source.label, credit: source.credit, animations: gltf.animations || [] };
        if (my === token) setLoading(true, t('lab.preparing'), 100);
        await renderer.compileAsync(root, camera, scene).catch(() => {});
        cache.set(id, entry);
        while (cache.size > 4) { const [oldId, old] = cache.entries().next().value; if (old === cur) break; cache.delete(oldId); dispose(old.root); }
      } catch (e) {
        console.error('[3D Lab]', id, e);
        if (my === token) {
          setLoading(false); failed.add(id);
          $(`[data-id="${CSS.escape(id)}"]`, el)?.classList.add('is-failed');
          toast(t('lab.loadError'), 'err');
        }
        return;
      }
    }
    if (my !== token || !stage.isConnected) return;
    if (cur) scene.remove(cur.root);
    if (mixer) { mixer.stopAllAction(); mixer = null; }
    cur = entry; curId = id; scene.add(entry.root);
    entry.root.position.set(0, 0, 0); frame(entry.root);
    if (entry.animations.length && !reducedMotion()) { mixer = new THREE.AnimationMixer(entry.root); entry.animations.forEach((a) => mixer.clipAction(a).play()); }
    applyLook(); paintVariants(entry);
    $('[data-badge]', el).textContent = entry.label;
    $('[data-credit]', el).textContent = entry.credit || '';
    spawn = performance.now();
    setLoading(false);
  }
  function dispose(root) {
    root.traverse((o) => {
      if (!o.isMesh) return; o.geometry?.dispose();
      [o.material, o.userData.afOrig].flat().filter(Boolean).forEach((m) => { Object.values(m).forEach((v) => v?.isTexture && v.dispose()); m.dispose?.(); });
    });
  }

  // ------------------------------------------------ gallery
  let dbModels = [];
  try { dbModels = await getLabModels(); } catch { /* demos only */ }
  const items = [
    ...dbModels.map((m) => ({ id: 'db-' + m.id, cat: 'own', label: loc(m, 'title'), credit: 'AF STUDIO', db: m })),
    ...DEMOS.map((d) => ({ id: d.id, cat: d.cat, label: d[L], credit: `${d.by} · ${d.lic} · Khronos glTF Sample Assets`, urls: KH(d.id) })),
  ];
  let cat = 'all';
  function paintGallery() {
    $('[data-gallery]', el).innerHTML = String(html`${items.filter((i) => cat === 'all' || i.cat === cat || i.cat === 'own').map((i) => html`
      <button type="button" class="lab-tile ${i.id === curId ? 'is-on' : ''} ${failed.has(i.id) ? 'is-failed' : ''}" data-id="${i.id}">
        <span class="lab-tile__cat">${CATS[i.cat][L]}</span><b>${i.label}</b>${i.cat === 'own' ? '' : html`<small>${t('lab.demoTag')}</small>`}</button>`)}`);
    $$('[data-id]', el).forEach((b) => b.addEventListener('click', () => pick(b.dataset.id)));
  }
  async function pick(id) {
    const it = items.find((x) => x.id === id); if (!it) return;
    if (it.db) { const url = await mediaUrl(it.db.model_path); if (!url) return toast(t('lab.loadError'), 'err'); return show(id, { urls: [url], label: it.label, credit: it.credit }); }
    return show(id, { urls: it.urls, label: it.label, credit: it.credit });
  }
  $$('[data-cat]', el).forEach((b) => b.addEventListener('click', () => { cat = b.dataset.cat; $$('[data-cat]', el).forEach((x) => x.classList.toggle('is-on', x === b)); paintGallery(); }));
  paintGallery();

  // ------------------------------------------------ controls
  $('[data-local]', el).addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    if (f.size > 150 * 1048576) return toast(t('errors.file_too_big', { mb: 150 }), 'err');
    const id = 'local-' + f.name + f.size;
    show(id, { buffer: await f.arrayBuffer(), label: f.name, credit: t('lab.localNote') });
  });
  $$('[data-look]', el).forEach((b) => b.addEventListener('click', () => { look = b.dataset.look; applyLook(); }));
  const setColor = (c) => { color = c; if (look === 'clay' || look === 'gloss') applyLook(); else { look = 'clay'; applyLook(); } };
  $$('[data-color]', el).forEach((b) => b.addEventListener('click', () => { $$('[data-color]', el).forEach((x) => x.classList.toggle('is-on', x === b)); setColor(b.dataset.color); }));
  $('[data-picker]', el).addEventListener('input', (e) => { $$('[data-color]', el).forEach((x) => x.classList.remove('is-on')); setColor(e.target.value); });
  $$('[data-light]', el).forEach((b) => b.addEventListener('click', () => applyLight(b.dataset.light)));
  $('[data-exposure]', el).addEventListener('input', (e) => { renderer.toneMappingExposure = +e.target.value; });
  $('[data-angle]', el).addEventListener('input', (e) => { lightAngle = +e.target.value; placeLights(); });
  $$('[data-bg]', el).forEach((b) => b.addEventListener('click', () => applyBg(b.dataset.bg)));
  $$('[data-cam]', el).forEach((b) => b.addEventListener('click', () => flyTo(b.dataset.cam)));
  $$('[data-zoom]', el).forEach((b) => b.addEventListener('click', () => zoom(b.dataset.zoom)));
  $('[data-reset]', el).addEventListener('click', () => { if (cur) frame(cur.root); flyTo('hero'); });
  $('[data-auto]', el).addEventListener('change', (e) => { controls.autoRotate = e.target.checked; });
  $('[data-speed]', el).addEventListener('input', (e) => { controls.autoRotateSpeed = +e.target.value; });
  $('[data-fs]', el).addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else (stage.requestFullscreen || stage.webkitRequestFullscreen)?.call(stage)?.catch?.(() => toast(t('errors.generic'), 'err'));
  });
  $('[data-shot]', el).addEventListener('click', () => {
    renderer.render(scene, camera);
    const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/png'); a.download = `AF-3DLab-${curId || 'model'}.png`; a.click();
  });
  $('[data-glb]', el).addEventListener('click', async (e) => {
    if (!cur) return; const b = e.currentTarget; b.disabled = true;
    try {
      const res = await new lib.GLTFExporter().parseAsync(cur.root, { binary: true, animations: cur.animations });
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([res], { type: 'model/gltf-binary' })); a.download = `AF-${curId || 'model'}.glb`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (err) { console.error(err); toast(t('errors.generic'), 'err'); }
    b.disabled = false;
  });

  // ------------------------------------------------ loop (paused when hidden / off-screen)
  const resize = () => { const r = stage.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(stage); resize();
  let visible = true; let alive = true;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.02 }); io.observe(stage);
  renderer.setAnimationLoop(() => {
    if (!alive || !visible || document.hidden) return;
    const dt = clock.getDelta();
    if (camAnim) camAnim(performance.now());
    if (cur) {
      const k = Math.min(1, (performance.now() - spawn) / (reducedMotion() ? 1 : 650));
      cur.root.scale.setScalar(0.92 + 0.08 * (1 - Math.pow(1 - k, 3)));
    }
    mixer?.update(dt);
    controls.update(); renderer.render(scene, camera);
  });

  applyLight('studio'); applyBg('studio');
  const first = dbModels.length ? 'db-' + dbModels[0].id : 'ChronographWatch';
  pick(first).then(() => { if (!cur && first === 'ChronographWatch') pick('ToyCar'); });

  return () => {
    alive = false; token++; renderer.setAnimationLoop(null); ro.disconnect(); io.disconnect(); controls.dispose();
    cache.forEach((en) => dispose(en.root)); cache.clear();
    Object.values(lookMats).forEach((m) => m?.dispose()); Object.values(bgTex).forEach((x) => x.dispose());
    envTex.dispose(); pmrem.dispose(); draco.dispose(); ktx2.dispose();
    renderer.dispose(); renderer.forceContextLoss?.();
    if (document.fullscreenElement === stage) document.exitFullscreen();
  };
}
