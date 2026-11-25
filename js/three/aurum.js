// =====================================================================
// AF ACCESS — «AURUM»: cinematic liquid-metal studio scene (Three.js r134)
//  • hero: torus knot of liquid black chrome, slowly flowing like mercury
//    (GPU noise displacement + recomputed normals), gold/blue iridescent rim
//  • custom studio environment: long strip softboxes → luxury reflections
//  • gold orbit rings with running light comets, floating chrome/gold objects
//  • volumetric light rays, silk-smoke filaments, bokeh gold dust that
//    scatters around the cursor
//  • post: bloom (UnrealBloomPass), ACES grading, chromatic fringe,
//    vignette, film grain
//  • click on the background → ripple through the metal; sign-in → «warp»
// =====================================================================
import { loadThree, loadScript, reducedMotion, isMobile } from '../core/ui.js';
import { prefs } from '../core/prefs.js';

const EX = 'https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/';
const POST = ['shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'postprocessing/EffectComposer.js',
  'postprocessing/RenderPass.js', 'postprocessing/ShaderPass.js', 'postprocessing/UnrealBloomPass.js'];

// ------------------------------------------------------------------ GLSL
const SNOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;
const OUT = `
  #include <tonemapping_fragment>
  #include <encodings_fragment>`;

// liquid displacement for the sculpture
const KNOT_PARS = `
uniform float uTime; uniform float uAmp; uniform float uRipple; uniform float uRippleT; uniform vec3 uRippleDir;
${SNOISE}
float afD(vec3 p){
  float t = uTime;
  float n = snoise(p * 0.85 + vec3(0.0, t * 0.21, t * 0.14)) * 0.66
          + snoise(p * 2.05 - vec3(t * 0.29, 0.0, t * 0.18)) * 0.26;
  float r = uRipple * sin(dot(p, uRippleDir) * 4.5 - uRippleT * 9.0) * exp(-uRippleT * 1.3);
  return n * uAmp + r * 0.24;
}`;
const KNOT_NORMAL = `
  vec3 objectNormal = vec3( normal );
  vec3 afT = normalize(cross(objectNormal, abs(objectNormal.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 afB = cross(objectNormal, afT);
  float afE = 0.014;
  vec3 afP0 = position + objectNormal * afD(position);
  vec3 afQ1 = position + afT * afE; vec3 afP1 = afQ1 + objectNormal * afD(afQ1);
  vec3 afQ2 = position + afB * afE; vec3 afP2 = afQ2 + objectNormal * afD(afQ2);
  objectNormal = normalize(cross(afP1 - afP0, afP2 - afP0));
  #ifdef USE_TANGENT
    vec3 objectTangent = vec3( tangent.xyz );
  #endif`;
const KNOT_RIM = `
  {
    vec3 afN = normalize(normal); vec3 afV = normalize(vViewPosition);
    float afF = pow(1.0 - abs(dot(afN, afV)), 3.2);
    vec3 afC = mix(vec3(1.0, 0.64, 0.32), vec3(0.6, 0.72, 1.0), 0.5 + 0.5 * sin(vViewPosition.y * 0.9 + vViewPosition.x * 0.45 + uTime * 0.35));
    gl_FragColor.rgb += afC * afF * 0.6;
  }`;

const BG_VS = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BG_FS = `
uniform float uTime; uniform float uFade; uniform float uSilk;
varying vec3 vDir;
${SNOISE}
void main(){
  vec3 d = normalize(vDir);
  vec3 col = vec3(0.004, 0.0035, 0.004);
  float h = max(dot(d, normalize(vec3(0.0, 0.04, -1.0))), 0.0);
  col += vec3(0.62, 0.36, 0.15) * (pow(h, 26.0) * 0.32 + pow(h, 6.0) * 0.07);           // warm halo behind sculpture
  col += vec3(0.05, 0.085, 0.2) * pow(max(dot(d, normalize(vec3(-0.85, -0.45, -0.55))), 0.0), 5.0) * 0.32; // cool fill, lower-left
  col += vec3(0.3, 0.17, 0.07) * pow(max(dot(d, normalize(vec3(0.9, 0.55, -0.5))), 0.0), 7.0) * 0.12;    // warm fill, upper-right
  // silk smoke: domain-warped ridged noise → thin flowing golden filaments
  vec3 q = d * 2.3 + vec3(0.0, uTime * 0.022, uTime * 0.016);
  float w = snoise(q * 0.7 + vec3(snoise(q * 0.5 + 3.1), snoise(q * 0.5 - 1.7), 0.0) * 0.9);
  float s = snoise(q * 1.55 + w * 1.25 + vec3(0.0, 0.0, uTime * 0.03));
  float silk = pow(1.0 - abs(s), 7.0) * (0.35 + 0.65 * smoothstep(-0.4, 0.7, w));
  float side = smoothstep(-0.6, 0.6, d.x + d.y * 0.4);
  col += mix(vec3(0.16, 0.2, 0.42), vec3(0.95, 0.6, 0.3), side) * silk * 0.11 * uSilk;
  gl_FragColor = vec4(col * uFade, 1.0);
  ${OUT}
}`;

const RAYS_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RAYS_FS = `
uniform float uTime; uniform float uFade; varying vec2 vUv;
float hp(float i, float n){ return fract(sin(mod(i, n) * 127.1 + 1.7) * 43758.5453); }
float np(float x, float n){ float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hp(i, n), hp(i + 1.0, n), f); }
void main(){
  vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x) / 6.2831853 + 0.5;
  float rays = np(a * 14.0 + uTime * 0.03, 14.0) * 0.62 + np(a * 37.0 - uTime * 0.05, 37.0) * 0.38;
  rays = pow(rays, 3.2) * (0.75 + 0.25 * sin(uTime * 0.6 + a * 40.0));
  float fall = smoothstep(1.0, 0.0, r) * smoothstep(0.02, 0.2, r);
  vec3 col = vec3(1.0, 0.66, 0.34) * rays * fall * 0.2 + vec3(1.0, 0.72, 0.42) * exp(-r * r * 22.0) * 0.18;
  gl_FragColor = vec4(col * uFade, 1.0);
  ${OUT}
}`;

const RING_FS = `
uniform float uTime; uniform float uSpeed; uniform float uFade; uniform float uBoost; uniform vec3 uColor; varying vec2 vUv;
void main(){
  float h = fract(vUv.x - uTime * uSpeed);
  float h2 = fract(vUv.x + 0.5 - uTime * uSpeed * 0.8);
  float comet = pow(h, 18.0) * 6.0 + pow(h, 4.0) * 0.32 + pow(h2, 22.0) * 2.4;
  vec3 col = uColor * (0.055 + comet * uBoost);
  gl_FragColor = vec4(col * uFade, 1.0);
  ${OUT}
}`;

const DUST_VS = `
uniform float uTime; uniform float uPixel; uniform vec3 uPointer; uniform float uRepel; uniform float uWarp;
attribute float aSize; attribute float aPhase; attribute float aSpeed;
varying float vAlpha; varying float vNear; varying float vTint;
void main(){
  vec3 p = position;
  p.y = mod(p.y + uTime * aSpeed + 7.0, 14.0) - 7.0;
  p.x += sin(uTime * 0.25 + aPhase * 6.28) * 0.35;
  p.z += cos(uTime * 0.2 + aPhase * 4.0) * 0.25;
  vec2 dd = p.xy - uPointer.xy; float l = length(dd);
  p.xy += (l > 0.001 ? dd / l : vec2(0.0)) * smoothstep(1.8, 0.0, l) * 0.9 * uRepel * step(-3.0, p.z);
  p.z += uWarp * 18.0 * (0.5 + aPhase);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = -mv.z;
  vNear = smoothstep(5.5, 2.2, dist);
  vAlpha = smoothstep(26.0, 6.0, dist) * (0.55 + 0.45 * sin(uTime * (0.6 + aPhase) + aPhase * 30.0));
  vTint = aPhase;
  gl_PointSize = min(aSize * uPixel * (300.0 / dist) * (1.0 + vNear * 3.0), 90.0 * uPixel);
}`;
const DUST_FS = `
varying float vAlpha; varying float vNear; varying float vTint;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float soft = smoothstep(0.5, 0.0, d);
  float disc = smoothstep(0.5, 0.44, d);
  float edge = disc - smoothstep(0.44, 0.34, d);
  float shape = mix(pow(soft, 1.8), disc * 0.22 + edge * 0.55, vNear);
  vec3 col = mix(vec3(1.0, 0.72, 0.42), vec3(1.0, 0.92, 0.8), vTint) * mix(1.6, 0.9, vNear);
  gl_FragColor = vec4(col * shape * vAlpha, 1.0);
  ${OUT}
}`;

const GRADE = {
  uniforms: { tDiffuse: { value: null }, uExposure: { value: 0 }, uTime: { value: 0 }, uRes: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uExposure; uniform float uTime; uniform vec2 uRes; varying vec2 vUv;
    vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; vec2 off = c * 0.0045 * length(c) * 2.0;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      col = aces(col * uExposure);
      col = pow(col, vec3(1.0 / 2.2));
      col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.06);                 // gentle saturation
      col *= mix(0.5, 1.0, smoothstep(0.98, 0.22, length(c * vec2(1.0, 0.92))));         // vignette
      col += (hash(vUv * uRes + fract(uTime) * 91.7) - 0.5) * 0.022;                      // film grain
      gl_FragColor = vec4(col, 1.0);
    }`,
};

// ------------------------------------------------------------------ studio environment (strip softboxes)
function studioEnv(T, renderer) {
  const pm = new T.PMREMGenerator(renderer);
  const s = new T.Scene();
  s.add(new T.Mesh(new T.BoxGeometry(26, 16, 26), new T.MeshBasicMaterial({ color: 0x040404, side: T.BackSide })));
  const panel = (w, h, pos, rot, rgb) => {
    const m = new T.MeshBasicMaterial({ side: T.DoubleSide }); m.color.setRGB(...rgb);
    const p = new T.Mesh(new T.PlaneGeometry(w, h), m); p.position.set(...pos); p.rotation.set(...rot); s.add(p);
  };
  panel(16, 1.1, [0, 7.9, -1], [Math.PI / 2, 0, 0], [7, 6.6, 6.2]);           // long top strip
  panel(16, 0.5, [0, 7.9, 3], [Math.PI / 2, 0, 0], [3, 3, 3]);
  panel(0.9, 12, [-12.9, 0.5, 1.5], [0, Math.PI / 2, 0], [6, 4.6, 3.2]);       // warm vertical strip, left
  panel(0.55, 10, [12.9, 0.8, -2.2], [0, -Math.PI / 2, 0], [2.6, 3.2, 4.6]);   // cool strips, right
  panel(0.55, 10, [12.9, 0.8, 2.2], [0, -Math.PI / 2, 0], [2.6, 3.2, 4.6]);
  panel(10, 3.4, [0, 0.6, -12.9], [0, 0, 0], [4.2, 2.6, 1.2]);                 // gold panel behind
  panel(8, 1.6, [0, -3.5, 12.9], [0, Math.PI, 0], [1.2, 1.2, 1.25]);           // low front fill
  const tex = pm.fromScene(s, 0.03).texture;
  s.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  pm.dispose();
  return tex;
}

// ------------------------------------------------------------------ scene
export async function mountAurum(canvasEl) {
  const T = await loadThree().catch(() => null);
  if (!T || !canvasEl?.isConnected) return null;
  const q = prefs.q3d; const mobile = isMobile(); const hi = q === 'high' && !mobile; const lo = q === 'low';
  const reduced = reducedMotion(); const SPEED = reduced ? 0.15 : 1;

  if (!lo) { try { for (const f of POST) await loadScript(EX + f); } catch { /* fallback to direct render */ } }
  if (!canvasEl.isConnected) return null;
  const usePost = !lo && !!(T.EffectComposer && T.RenderPass && T.ShaderPass && T.UnrealBloomPass);

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: canvasEl, antialias: !lo, powerPreference: 'high-performance' }); } catch { return null; }
  const PR = Math.min(devicePixelRatio, hi ? 2 : lo ? 1 : 1.5);
  renderer.setPixelRatio(PR);
  renderer.setClearColor(0x030303, 1);
  if (usePost) { renderer.outputEncoding = T.LinearEncoding; renderer.toneMapping = T.NoToneMapping; }
  else { renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0; }

  const keep = []; const K = (o) => { keep.push(o); return o; };
  const scene = new T.Scene();
  scene.environment = K(studioEnv(T, renderer));
  const camera = new T.PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.set(0, 0, 9);
  const U = { uTime: { value: 0 }, uFade: { value: 0 } };

  // ---------- background dome
  const bg = new T.Mesh(K(new T.SphereGeometry(80, 48, 32)), K(new T.ShaderMaterial({
    uniforms: { uTime: U.uTime, uFade: U.uFade, uSilk: { value: lo ? 0.6 : 1 } }, vertexShader: BG_VS, fragmentShader: BG_FS, side: T.BackSide, depthWrite: false,
  })));
  bg.renderOrder = -10; scene.add(bg);

  // ---------- light rays
  const rays = new T.Mesh(K(new T.PlaneGeometry(1, 1)), K(new T.ShaderMaterial({
    uniforms: { uTime: U.uTime, uFade: U.uFade }, vertexShader: RAYS_VS, fragmentShader: RAYS_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
  })));
  rays.renderOrder = -5; scene.add(rays);

  // ---------- hero group
  const hero = new T.Group(); scene.add(hero);
  const knotU = { uTime: U.uTime, uAmp: { value: 1.1 }, uRipple: { value: 0 }, uRippleT: { value: 10 }, uRippleDir: { value: new T.Vector3(0, 1, 0) } };
  const knotMat = K(new T.MeshPhysicalMaterial({ color: 0x17130f, metalness: 1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.75 }));
  knotMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, knotU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${KNOT_PARS}`)
      .replace('#include <beginnormal_vertex>', KNOT_NORMAL)
      .replace('#include <begin_vertex>', 'vec3 transformed = afP0;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(/}\s*$/, `${KNOT_RIM}\n}`);
  };
  const knot = new T.Mesh(K(new T.TorusKnotGeometry(1.25, 0.42, hi ? 640 : lo ? 220 : 400, hi ? 112 : lo ? 36 : 64, 2, 3)), knotMat);
  hero.add(knot);

  // orbit rings with light comets
  const ringDefs = [
    { r: 3.05, rot: [1.22, 0.18, 0.0], col: [1.0, 0.68, 0.36], sp: 0.07 },
    { r: 3.9, rot: [1.02, -0.52, 0.42], col: [1.0, 0.86, 0.66], sp: -0.05 },
    { r: 5.0, rot: [1.42, 0.62, -0.3], col: [0.62, 0.74, 1.0], sp: 0.035 },
  ];
  const rings = ringDefs.map((d) => {
    const m = new T.Mesh(K(new T.TorusGeometry(d.r, 0.011, 8, hi ? 480 : 260)), K(new T.ShaderMaterial({
      uniforms: { uTime: U.uTime, uFade: U.uFade, uSpeed: { value: d.sp }, uBoost: { value: 1 }, uColor: { value: new T.Vector3(...d.col) } },
      vertexShader: RAYS_VS, fragmentShader: RING_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    })));
    m.rotation.set(...d.rot); m.userData.base = d.rot.slice(); hero.add(m); return m;
  });

  // floating objects
  const chrome = K(new T.MeshPhysicalMaterial({ color: 0xe2e4e8, metalness: 1, roughness: 0.06, envMapIntensity: 1.6 }));
  const gold = K(new T.MeshPhysicalMaterial({ color: 0xd9a86a, metalness: 1, roughness: 0.16, clearcoat: 0.6, envMapIntensity: 1.6 }));
  const lacquer = K(new T.MeshPhysicalMaterial({ color: 0x0b0b0d, metalness: 0.6, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.5 }));
  const floatDefs = [
    [K(new T.SphereGeometry(0.2, 48, 32)), chrome, 3.4, 0.0, 0.55, 0.9],
    [K(new T.IcosahedronGeometry(0.26, 0)), gold, 3.9, 1.1, -0.7, 0.7],
    [K(new T.TorusGeometry(0.17, 0.055, 24, 64)), gold, 2.9, 2.3, 0.9, 1.1],
    [K(new T.OctahedronGeometry(0.22, 0)), lacquer, 4.4, 3.2, -0.2, 0.6],
    [K(new T.SphereGeometry(0.12, 40, 24)), gold, 2.7, 4.1, -1.0, 1.3],
    [K(new T.BoxGeometry(0.26, 0.26, 0.26)), chrome, 4.8, 5.0, 0.4, 0.5],
    [K(new T.SphereGeometry(0.33, 48, 32)), lacquer, 4.2, 5.8, 1.15, 0.45],
  ];
  const floaters = floatDefs.map(([g, m, r, ph, y, sp]) => { const o = new T.Mesh(g, m); o.userData = { r, ph, y, sp }; hero.add(o); return o; });

  // gold dust with bokeh
  const NDUST = hi ? 1900 : lo ? 420 : 950;
  const dp = new Float32Array(NDUST * 3); const ds = new Float32Array(NDUST); const dph = new Float32Array(NDUST); const dsp = new Float32Array(NDUST);
  for (let i = 0; i < NDUST; i++) {
    dp.set([(Math.random() - 0.5) * 22, (Math.random() - 0.5) * 14, -9 + Math.random() * 14.5], i * 3);
    ds[i] = 0.018 + Math.pow(Math.random(), 4) * 0.06; dph[i] = Math.random(); dsp[i] = 0.04 + Math.random() * 0.14;
  }
  const dg = K(new T.BufferGeometry());
  dg.setAttribute('position', new T.BufferAttribute(dp, 3)); dg.setAttribute('aSize', new T.BufferAttribute(ds, 1));
  dg.setAttribute('aPhase', new T.BufferAttribute(dph, 1)); dg.setAttribute('aSpeed', new T.BufferAttribute(dsp, 1));
  const dustU = { uTime: U.uTime, uPixel: { value: PR }, uPointer: { value: new T.Vector3(99, 99, 0) }, uRepel: { value: 0 }, uWarp: { value: 0 } };
  const dust = new T.Points(dg, K(new T.ShaderMaterial({ uniforms: dustU, vertexShader: DUST_VS, fragmentShader: DUST_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending })));
  dust.frustumCulled = false; scene.add(dust);

  // ---------- post-processing
  let composer = null; let grade = null; let bloom = null;
  if (usePost) {
    const halfOk = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
    const rt = new T.WebGLRenderTarget(2, 2, { type: halfOk ? T.HalfFloatType : T.UnsignedByteType, format: T.RGBAFormat, minFilter: T.LinearFilter, magFilter: T.LinearFilter });
    composer = new T.EffectComposer(renderer, rt);
    composer.setPixelRatio(hi ? PR : 1);
    composer.addPass(new T.RenderPass(scene, camera));
    bloom = new T.UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), hi ? 0.95 : 0.8, 0.62, 0.82);
    composer.addPass(bloom);
    grade = new T.ShaderPass({ ...GRADE, uniforms: T.UniformsUtils.clone(GRADE.uniforms) });
    grade.uniforms.uRes.value = new T.Vector2(innerWidth, innerHeight);
    composer.addPass(grade);
  }
  const setExposure = (v) => { if (grade) grade.uniforms.uExposure.value = v; else renderer.toneMappingExposure = v; };

  // ---------- layout
  let aspect = 1; let baseFov = 35;
  function layout() {
    const w = innerWidth; const h = innerHeight; aspect = w / h;
    renderer.setSize(w, h, false);
    if (composer) { composer.setSize(w, h); grade.uniforms.uRes.value.set(w, h); }
    const portrait = aspect < 0.9;
    baseFov = portrait ? 50 : 35; camera.fov = baseFov; camera.aspect = aspect; camera.updateProjectionMatrix();
    hero.position.set(portrait ? 0 : 0.15, portrait ? 1.7 : 0.05, portrait ? -1.5 : 0);
    hero.scale.setScalar(portrait ? 0.62 : 0.86 * Math.min(1, Math.max(0.72, aspect / 2.1)));
    rays.position.set(hero.position.x, hero.position.y, -4); rays.scale.setScalar(portrait ? 18 : 26);
  }
  addEventListener('resize', layout); layout();

  // ---------- interaction
  let mx = 0; let my = 0; let tx = 0; let ty = 0; let lastMove = 0;
  const ray = new T.Raycaster(); const plane = new T.Plane(new T.Vector3(0, 0, 1), 0); const hit = new T.Vector3(); const ndcV = new T.Vector2();
  const onMove = (e) => {
    tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; lastMove = performance.now();
    ndcV.set(tx, -ty); ray.setFromCamera(ndcV, camera);
    if (ray.ray.intersectPlane(plane, hit)) dustU.uPointer.value.copy(hit);
  };
  const onTilt = (e) => { if (e.gamma == null) return; tx = Math.max(-1, Math.min(1, e.gamma / 30)); ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30)); };
  const onDown = (e) => {
    if (e.target.closest?.('.acc-card, a, button, input, label, .acc-lang')) return;
    knotU.uRipple.value = 1; knotU.uRippleT.value = 0;
    knotU.uRippleDir.value.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    rings.forEach((r) => { r.material.uniforms.uBoost.value = 2.4; });
  };
  addEventListener('pointermove', onMove, { passive: true }); addEventListener('pointerdown', onDown, { passive: true });
  addEventListener('deviceorientation', onTilt, { passive: true });

  // ---------- loop
  const clock = new T.Clock(); let raf = 0; let running = true; let alive = true;
  const t0 = performance.now(); let warpStart = 0; let warpRes = null;
  const onVis = () => { running = !document.hidden; if (running) { clock.getDelta(); loop(); } };
  document.addEventListener('visibilitychange', onVis);
  const ease = (k) => 1 - Math.pow(1 - k, 4);

  function loop() {
    if (!alive || !running) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05); const el = clock.elapsedTime; const t = el * SPEED;
    U.uTime.value = t;
    const intro = Math.min(1, (performance.now() - t0) / (reduced ? 10 : 2600)); const ei = ease(intro);
    U.uFade.value = ei;
    mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;

    // sculpture: flowing metal, intro melt-in, ripples
    knotU.uAmp.value = 0.11 + (1 - ei) * 0.9;
    knotU.uRippleT.value += dt * SPEED; knotU.uRipple.value *= 0.985;
    knot.rotation.x = t * 0.07 + my * 0.25; knot.rotation.y = t * 0.11 + mx * 0.45; knot.rotation.z = Math.sin(t * 0.13) * 0.12;
    knot.scale.setScalar(0.25 + ei * 0.75);

    rings.forEach((r, i) => {
      const b = r.userData.base; r.rotation.set(b[0] + Math.sin(t * 0.09 + i) * 0.08 + my * 0.12, b[1] + mx * 0.18, b[2] + t * 0.03 * (i % 2 ? -1 : 1));
      const u = r.material.uniforms.uBoost; u.value += (1 - u.value) * 0.03;
      const s = 0.6 + ei * 0.4; r.scale.setScalar(s);
    });
    floaters.forEach((o) => {
      const u = o.userData; const a = t * 0.16 * u.sp + u.ph;
      o.position.set(Math.cos(a) * u.r, u.y + Math.sin(t * 0.5 + u.ph) * 0.18, Math.sin(a) * u.r * 0.55);
      o.rotation.x += dt * 0.4 * SPEED; o.rotation.y += dt * 0.55 * SPEED;
      o.scale.setScalar(ei);
    });
    rays.rotation.z = t * 0.02;
    dustU.uRepel.value += ((performance.now() - lastMove < 1600 ? 1 : 0) - dustU.uRepel.value) * 0.05;
    bg.rotation.y = mx * 0.03; bg.rotation.x = -my * 0.02;

    // camera
    camera.position.x = mx * 0.7 + Math.sin(t * 0.07) * 0.25; camera.position.y = -my * 0.45 + Math.cos(t * 0.05) * 0.15;
    let exposure = ei * 1.0;
    if (warpStart) {
      const k = Math.min(1, (performance.now() - warpStart) / 1000); const e = k * k * k;
      camera.position.z = 9 - e * 7.2; camera.fov = baseFov + e * 40; camera.updateProjectionMatrix();
      knotU.uAmp.value += e * 0.5; rings.forEach((r, i) => r.scale.multiplyScalar(1 + e * (1.2 + i * 0.5)));
      dustU.uWarp.value = e; exposure = 1 + e * 3.5;
      if (k >= 1 && warpRes) { const r = warpRes; warpRes = null; r(); }
    }
    camera.lookAt(hero.position.x * 0.6, hero.position.y * 0.6, 0);
    setExposure(exposure);
    if (composer) { grade.uniforms.uTime.value = el; composer.render(dt); } else renderer.render(scene, camera);
  }
  loop();

  return {
    warp() {
      if (reduced || !alive) return Promise.resolve();
      return new Promise((res) => { warpRes = res; warpStart = performance.now(); setTimeout(() => { if (warpRes) { warpRes = null; res(); } }, 1300); });
    },
    dispose() {
      alive = false; cancelAnimationFrame(raf);
      removeEventListener('resize', layout); removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown); removeEventListener('deviceorientation', onTilt);
      document.removeEventListener('visibilitychange', onVis);
      keep.forEach((d) => d?.dispose?.());
      if (composer) { composer.renderTarget1?.dispose(); composer.renderTarget2?.dispose(); bloom?.dispose?.(); }
      renderer.dispose(); renderer.forceContextLoss?.();
    },
  };
}
