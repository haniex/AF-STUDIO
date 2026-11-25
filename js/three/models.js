// =====================================================================
// AF STUDIO — library of detailed procedural 3D models (Three.js r134).
// Real geometry + PBR materials (glass with transmission, metal, lacquer,
// rubber, leather, emissive), procedural canvas textures. No external assets.
// Each model: { id, cat, title:{ru,en}, build(THREE, q) → THREE.Group }.
// Meshes with userData.paint = true react to the colour picker in 3D Lab.
// Group.userData.update(t) (optional) animates the model.
// =====================================================================

// ------------------------------------------------------------------ environment
/** Studio HDR-like environment: dark room with soft boxes → beautiful reflections. */
export function studioEnvironment(THREE, renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(24, 14, 24), new THREE.MeshBasicMaterial({ color: 0x0f0d0b, side: THREE.BackSide })));
  const panel = (w, h, pos, rot, rgb) => {
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); m.color.setRGB(...rgb);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(...pos); p.rotation.set(...rot); s.add(p);
  };
  panel(10, 4, [0, 6.9, 0], [Math.PI / 2, 0, 0], [5, 5, 5]);            // top soft box
  panel(4, 8, [-11.9, 1, 1], [0, Math.PI / 2, 0], [3.2, 2.9, 2.6]);      // warm left
  panel(3, 7, [11.9, 1.5, -2], [0, -Math.PI / 2, 0], [2.2, 2.5, 3.2]);   // cool right
  panel(14, 1.2, [0, 0.4, -11.9], [0, 0, 0], [2.4, 1.7, 1.0]);           // gold strip back
  panel(7, 2.4, [0, 2.5, 11.9], [0, Math.PI, 0], [2.2, 2.2, 2.2]);       // front fill
  const tex = pm.fromScene(s, 0.02).texture;
  s.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  pm.dispose();
  return tex;
}

// ------------------------------------------------------------------ helpers
function kit(T) {
  const P = (o) => new T.MeshPhysicalMaterial({ envMapIntensity: 1.25, ...o });
  return {
    P,
    glass: (c = 0xffffff, o = {}) => P({ color: c, metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.8, ior: 1.5, ...o }),
    metal: (c = 0xd0d3d8, r = 0.22, o = {}) => P({ color: c, metalness: 1, roughness: r, ...o }),
    gold: (r = 0.18) => P({ color: 0xd8a86c, metalness: 1, roughness: r }),
    lacquer: (c, o = {}) => P({ color: c, metalness: 0.05, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.04, ...o }),
    plastic: (c, r = 0.42) => P({ color: c, metalness: 0, roughness: r, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
    rubber: (c = 0x161618) => P({ color: c, metalness: 0, roughness: 0.92 }),
    leather: (c = 0x2a221c) => P({ color: c, metalness: 0, roughness: 0.6, clearcoat: 0.2, clearcoatRoughness: 0.6 }),
    matte: (c, r = 0.85, o = {}) => P({ color: c, metalness: 0, roughness: r, ...o }),
    glow: (c, i = 2.4) => new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 }),
  };
}

function canvasTex(T, w, h, draw, { srgb = true, repeat = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  if (srgb) t.encoding = T.sRGBEncoding;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

function rrShape(T, w, h, r) {
  const s = new T.Shape(); const x = -w / 2; const y = -h / 2; r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Rounded box via extruded rounded rectangle with bevel (w × h in XY, depth d along Z). */
function roundedBox(T, w, h, d, r, bevel = 0.05, seg = 5) {
  const g = new T.ExtrudeGeometry(rrShape(T, Math.max(0.01, w - bevel * 2), Math.max(0.01, h - bevel * 2), Math.max(0.001, r - bevel)),
    { depth: Math.max(0.001, d - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: seg, curveSegments: 14 });
  g.center();
  return g;
}

function mkFactory(T) {
  return (geo, mat, p = {}) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(p.x || 0, p.y || 0, p.z || 0);
    m.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
    if (p.s !== undefined) { if (typeof p.s === 'number') m.scale.setScalar(p.s); else m.scale.set(p.s[0], p.s[1], p.s[2]); }
    if (p.paint) m.userData.paint = true;
    m.castShadow = p.shadow !== false; m.receiveShadow = true;
    return m;
  };
}

/** Cylinder between two points. */
function rodFactory(T, mk) {
  return (a, b, r, mat, seg = 16) => {
    const A = new T.Vector3(...a); const B = new T.Vector3(...b);
    const len = A.distanceTo(B);
    const m = mk(new T.CylinderGeometry(r, r, len, seg), mat);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return m;
  };
}

// ------------------------------------------------------------------ textures
const marbleTex = (T) => canvasTex(T, 512, 512, (g, w, h) => {
  g.fillStyle = '#f1eee9'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = `rgba(${120 + Math.random() * 40},${115 + Math.random() * 30},${110 + Math.random() * 30},${0.08 + Math.random() * 0.22})`;
    g.lineWidth = 0.6 + Math.random() * 2.6; g.beginPath();
    let x = Math.random() * w; let y = 0; g.moveTo(x, y);
    while (y < h) { x += (Math.random() - 0.5) * 60; y += 20 + Math.random() * 40; g.lineTo(x, y); }
    g.stroke();
  }
});
const woodTex = (T, base = '#8a5a34') => canvasTex(T, 512, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 140; i++) {
    const y = Math.random() * h; g.strokeStyle = `rgba(${Math.random() < 0.5 ? '40,22,10' : '210,160,110'},${0.05 + Math.random() * 0.12})`;
    g.lineWidth = 0.5 + Math.random() * 3; g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x / 70 + i) * 6);
    g.stroke();
  }
});
const brushedRadial = (T, label = '') => canvasTex(T, 512, 512, (g, w, h) => {
  const cx = w / 2; const cy = h / 2;
  g.fillStyle = '#7d8086'; g.fillRect(0, 0, w, h);
  for (let r = 4; r < w / 2; r += 1.5) { g.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.12})`; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
  if (label) { g.fillStyle = 'rgba(20,20,22,.85)'; g.font = '700 74px "Space Grotesk", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, cx, cy); }
});

// ------------------------------------------------------------------ models
function perfume(T, q) {
  const K = kit(T); const mk = mkFactory(T); const g = new T.Group();
  g.add(mk(new T.CylinderGeometry(1.55, 1.62, 0.32, q.seg(96, 40)), K.lacquer(0xffffff, { map: marbleTex(T) }), { y: -0.16 }));
  g.add(mk(new T.TorusGeometry(1.6, 0.025, 12, q.seg(120, 48)), K.gold(), { y: 0, rx: Math.PI / 2 }));
  g.add(mk(roundedBox(T, 1.75, 2.05, 1.1, 0.34, 0.16, q.seg(6, 3)), K.glass(0xf8f3ec, { thickness: 1.4 }), { y: 1.05 }));
  g.add(mk(roundedBox(T, 1.38, 1.4, 0.74, 0.2, 0.08, 4), K.P({ color: 0xd8862f, roughness: 0.1, clearcoat: 1, emissive: 0x5a2a08, emissiveIntensity: 0.35 }), { y: 0.86, paint: true }));
  g.add(mk(new T.CylinderGeometry(0.2, 0.22, 0.3, 48), K.gold(), { y: 2.2 }));
  g.add(mk(new T.CylinderGeometry(0.36, 0.36, 0.14, 64), K.gold(0.12), { y: 2.32 }));
  g.add(mk(new T.TorusGeometry(0.36, 0.03, 12, 64), K.gold(0.08), { y: 2.39, rx: Math.PI / 2 }));
  g.add(mk(roundedBox(T, 0.96, 0.96, 0.96, 0.2, 0.08, 4), K.lacquer(0x111014), { y: 2.88, paint: true }));
  const mono = canvasTex(T, 256, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#e8c48f'; c.font = '700 120px "Space Grotesk", Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('AF', w / 2, h / 2 + 6); });
  g.add(mk(new T.PlaneGeometry(0.6, 0.6), new T.MeshStandardMaterial({ map: mono, transparent: true, metalness: 0.9, roughness: 0.25 }), { y: 2.88, z: 0.485, shadow: false }));
  const label = canvasTex(T, 1024, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.fillStyle = '#e8c48f'; c.textAlign = 'center';
    c.font = '600 150px "Space Grotesk", Arial'; c.fillText('LUMINA', w / 2, 230);
    c.fillRect(w / 2 - 160, 290, 320, 4);
    c.font = '500 54px Inter, Arial'; c.fillText('EAU DE PARFUM', w / 2, 380); c.font = '400 38px Inter, Arial'; c.fillText('100 ML · AF STUDIO', w / 2, 450);
  });
  g.add(mk(new T.PlaneGeometry(1.2, 0.6), new T.MeshStandardMaterial({ map: label, transparent: true, metalness: 0.85, roughness: 0.3 }), { y: 1.2, z: 0.56, shadow: false }));
  return g;
}

function headphones(T, q) {
  const K = kit(T); const mk = mkFactory(T); const g = new T.Group();
  const pts = [[-1.12, -0.05], [-1.06, 0.72], [-0.62, 1.3], [0, 1.5], [0.62, 1.3], [1.06, 0.72], [1.12, -0.05]];
  const curve = new T.CatmullRomCurve3(pts.map(([x, y]) => new T.Vector3(x, y, 0)));
  g.add(mk(new T.TubeGeometry(curve, q.seg(160, 60), 0.09, q.seg(24, 10)), K.leather(0x2b2520), { paint: false }));
  const inner = new T.CatmullRomCurve3(pts.map(([x, y]) => new T.Vector3(x * 0.96, y * 0.96 + 0.02, 0)));
  g.add(mk(new T.TubeGeometry(inner, q.seg(160, 60), 0.028, 10), K.metal(0xc9ccd2, 0.18)));
  const plate = brushedRadial(T, 'H');
  [-1, 1].forEach((s) => {
    g.add(mk(new T.CylinderGeometry(0.045, 0.045, 0.34, 20), K.metal(0xd8dade, 0.15), { x: s * 1.13, y: -0.2 }));
    g.add(mk(new T.TorusGeometry(0.64, 0.045, 16, q.seg(72, 32), Math.PI), K.metal(0xc9ccd2, 0.2), { x: s * 1.18, y: -0.98, ry: Math.PI / 2 }));
    const prof = [[0, 0], [0.52, 0], [0.58, 0.05], [0.61, 0.17], [0.57, 0.31], [0.47, 0.38], [0, 0.38]].map(([r, h]) => new T.Vector2(r, h));
    g.add(mk(new T.LatheGeometry(prof, q.seg(96, 36)), K.metal(0x2a2b31, 0.32, { clearcoat: 0.6 }), { x: s * 1.02, y: -0.98, rz: -s * Math.PI / 2, paint: true }));
    g.add(mk(new T.CircleGeometry(0.45, q.seg(96, 36)), K.metal(0xffffff, 0.32, { map: plate }), { x: s * 1.405, y: -0.98, ry: s * Math.PI / 2 }));
    g.add(mk(new T.TorusGeometry(0.47, 0.012, 8, 96), K.glow(0x7fd6ff, 2.2), { x: s * 1.4, y: -0.98, ry: Math.PI / 2, shadow: false }));
    g.add(mk(new T.TorusGeometry(0.4, 0.15, q.seg(28, 12), q.seg(72, 32)), K.leather(0x1c1916), { x: s * 0.95, y: -0.98, ry: Math.PI / 2 }));
    const grille = canvasTex(T, 256, 256, (c, w, h) => { c.fillStyle = '#121214'; c.fillRect(0, 0, w, h); c.fillStyle = '#2b2b30'; for (let x = 6; x < w; x += 12) for (let y = 6; y < h; y += 12) { c.beginPath(); c.arc(x + ((y / 12) % 2) * 6, y, 3, 0, 7); c.fill(); } });
    g.add(mk(new T.CircleGeometry(0.3, 48), K.matte(0xffffff, 0.7, { map: grille }), { x: s * 0.96, y: -0.98, ry: -s * Math.PI / 2 }));
  });
  return g;
}

function watch(T, q) {
  const K = kit(T); const mk = mkFactory(T); const g = new T.Group();
  const prof = [[0, -0.2], [0.93, -0.2], [1.04, -0.12], [1.08, 0.04], [1.03, 0.17], [0.92, 0.2], [0, 0.2]].map(([r, h]) => new T.Vector2(r, h));
  g.add(mk(new T.LatheGeometry(prof, q.seg(128, 48)), K.metal(0xd6d8dc, 0.16), { rx: Math.PI / 2 }));
  g.add(mk(new T.TorusGeometry(0.97, 0.075, 24, q.seg(128, 48)), K.lacquer(0x0c0f18), { z: 0.2, paint: true }));
  const ticks = new T.InstancedMesh(new T.BoxGeometry(0.018, 0.08, 0.02), K.gold(0.15), 60);
  const d = new T.Object3D();
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; d.position.set(Math.sin(a) * 0.97, Math.cos(a) * 0.97, 0.275); d.rotation.set(0, 0, -a); d.scale.set(1, i % 5 === 0 ? 1.6 : 0.8, 1); d.updateMatrix(); ticks.setMatrixAt(i, d.matrix); }
  g.add(ticks);
  const dial = canvasTex(T, 1024, 1024, (c, w, h) => {
    const cx = w / 2; const cy = h / 2;
    const grad = c.createRadialGradient(cx, cy, 20, cx, cy, w / 2); grad.addColorStop(0, '#1b2740'); grad.addColorStop(1, '#070a12');
    c.fillStyle = grad; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 360; i++) { c.strokeStyle = `rgba(255,255,255,${i % 2 ? 0.025 : 0.06})`; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(i) * w, cy + Math.cos(i) * w); c.stroke(); }
    c.strokeStyle = 'rgba(232,196,143,.8)'; c.lineWidth = 2;
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; const r1 = 470; const r2 = i % 5 ? 452 : 440; c.beginPath(); c.moveTo(cx + Math.sin(a) * r1, cy - Math.cos(a) * r1); c.lineTo(cx + Math.sin(a) * r2, cy - Math.cos(a) * r2); c.stroke(); }
    c.fillStyle = '#e8c48f'; c.textAlign = 'center'; c.font = '700 64px "Space Grotesk", Arial'; c.fillText('AF', cx, cy - 200);
    c.font = '500 26px Inter, Arial'; c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText('AUTOMATIC · CHRONO', cx, cy - 160);
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy + 210, 90, 0, 7); c.stroke();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.beginPath(); c.moveTo(cx + Math.sin(a) * 90, cy + 210 - Math.cos(a) * 90); c.lineTo(cx + Math.sin(a) * 76, cy + 210 - Math.cos(a) * 76); c.stroke(); }
  });
  g.add(mk(new T.CircleGeometry(0.88, q.seg(128, 48)), new T.MeshStandardMaterial({ map: dial, metalness: 0.35, roughness: 0.35 }), { z: 0.16, shadow: false }));
  const markers = new T.InstancedMesh(roundedBox(T, 0.06, 0.16, 0.04, 0.02, 0.01, 2), K.gold(0.1), 12);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; d.position.set(Math.sin(a) * 0.7, Math.cos(a) * 0.7, 0.18); d.rotation.set(0, 0, -a); d.scale.set(i % 3 ? 1 : 1.5, i % 3 ? 1 : 1.25, 1); d.updateMatrix(); markers.setMatrixAt(i, d.matrix); }
  g.add(markers);
  const hand = (w, l, mat, z) => { const geo = new T.BoxGeometry(w, l, 0.02); geo.translate(0, l / 2 - 0.08, 0); return mk(geo, mat, { z }); };
  const hH = hand(0.06, 0.48, K.gold(0.12), 0.21); const hM = hand(0.04, 0.7, K.gold(0.12), 0.23); const hS = hand(0.014, 0.82, K.glow(0xff4d3d, 1.4), 0.25);
  g.add(hH, hM, hS, mk(new T.CylinderGeometry(0.05, 0.05, 0.06, 24), K.gold(0.1), { z: 0.25, rx: Math.PI / 2 }));
  g.add(mk(new T.SphereGeometry(0.92, q.seg(96, 40), 24, 0, Math.PI * 2, 0, 0.38), K.glass(0xffffff, { thickness: 0.2, roughness: 0.01 }), { z: -0.02, rx: Math.PI / 2, s: [1, 0.32, 1], shadow: false }));
  g.add(mk(new T.CylinderGeometry(0.11, 0.11, 0.18, 28), K.metal(0xd6d8dc, 0.2, { flatShading: true }), { x: 1.16, rz: Math.PI / 2 }));
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => g.add(mk(roundedBox(T, 0.2, 0.36, 0.18, 0.06, 0.03, 3), K.metal(0xd6d8dc, 0.16), { x: sx * 0.52, y: sy * 0.98, z: -0.05 })));
  const outer = new T.InstancedMesh(roundedBox(T, 0.78, 0.17, 0.11, 0.04, 0.025, 2), K.metal(0xd6d8dc, 0.14), 30);
  const center = new T.InstancedMesh(roundedBox(T, 0.3, 0.15, 0.14, 0.04, 0.025, 2), K.gold(0.14), 30);
  center.userData.paint = true;
  const cz = -1.35; const R = 1.55;
  for (let i = 0; i < 30; i++) {
    const phi = 0.85 + (i / 29) * (2 * Math.PI - 1.7);
    d.position.set(0, R * Math.sin(phi), cz + R * Math.cos(phi)); d.rotation.set(-phi, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
    outer.setMatrixAt(i, d.matrix); center.setMatrixAt(i, d.matrix);
  }
  outer.castShadow = center.castShadow = true;
  g.add(outer, center);
  // r134 Box3 ignores InstancedMesh instances → invisible bounds proxy so fitting/floor include the bracelet
  const bounds = new T.Mesh(new T.BoxGeometry(1.2, 2 * R + 0.2, R + 1.75), new T.MeshBasicMaterial({ visible: false }));
  bounds.position.set(0, 0, cz + (R + 1.75) / 2 - R - 0.12); bounds.userData.bounds = true; bounds.castShadow = false; bounds.visible = false;
  g.add(bounds);
  g.userData.update = () => {
    const n = new Date(); const s = n.getSeconds() + n.getMilliseconds() / 1000; const m = n.getMinutes() + s / 60; const h = (n.getHours() % 12) + m / 60;
    hS.rotation.z = -(s / 60) * Math.PI * 2; hM.rotation.z = -(m / 60) * Math.PI * 2; hH.rotation.z = -(h / 12) * Math.PI * 2;
  };
  return g;
}

function car(T, q) {
  const K = kit(T); const mk = mkFactory(T); const g = new T.Group();
  const s = new T.Shape();
  s.moveTo(-2.05, 0.25); s.lineTo(-2.12, 0.56); s.quadraticCurveTo(-2.06, 0.8, -1.7, 0.84); s.lineTo(-0.95, 0.92);
  s.quadraticCurveTo(-0.45, 1.34, 0.25, 1.32); s.quadraticCurveTo(0.85, 1.29, 1.28, 0.92); s.lineTo(1.95, 0.8);
  s.quadraticCurveTo(2.18, 0.72, 2.14, 0.44); s.lineTo(2.06, 0.25); s.lineTo(1.78, 0.25);
  s.absarc(1.35, 0.25, 0.43, 0, Math.PI, false); s.lineTo(-0.92, 0.25); s.absarc(-1.35, 0.25, 0.43, 0, Math.PI, false); s.lineTo(-2.05, 0.25);
  const depth = 1.56;
  const body = new T.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.1, bevelSegments: q.seg(6, 3), curveSegments: q.seg(28, 12) });
  body.translate(0, 0, -depth / 2);
  g.add(mk(body, K.P({ color: 0x3b0f52, metalness: 0.65, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.03 }), { paint: true }));
  const w = new T.Shape(); w.moveTo(-0.82, 0.96); w.quadraticCurveTo(-0.4, 1.27, 0.25, 1.25); w.quadraticCurveTo(0.78, 1.23, 1.12, 0.95); w.lineTo(-0.82, 0.96);
  const win = new T.ExtrudeGeometry(w, { depth: depth + 0.3, bevelEnabled: false, curveSegments: 20 }); win.translate(0, 0, -(depth + 0.3) / 2);
  g.add(mk(win, K.P({ color: 0x07080c, metalness: 0.9, roughness: 0.04, clearcoat: 1 })));
  const tire = new T.TorusGeometry(0.3, 0.13, q.seg(20, 10), q.seg(48, 24));
  const rim = new T.CylinderGeometry(0.29, 0.29, 0.08, q.seg(40, 20));
  const spoke = new T.BoxGeometry(0.05, 0.5, 0.03);
  const wheels = [];
  [[1.35, 1], [-1.35, 1], [1.35, -1], [-1.35, -1]].forEach(([x, side]) => {
    const wg = new T.Group(); wg.position.set(x, 0.25, side * 0.93);
    wg.add(mk(tire, K.rubber()));
    wg.add(mk(rim, K.metal(0x2a2c33, 0.25), { rx: Math.PI / 2 }));
    for (let i = 0; i < 6; i++) wg.add(mk(spoke, K.metal(0xd6d8dc, 0.18), { rz: (i / 6) * Math.PI, z: side * 0.045 }));
    wg.add(mk(new T.CylinderGeometry(0.21, 0.21, 0.02, 32), K.metal(0x8a8d93, 0.4), { rx: Math.PI / 2, z: -side * 0.02 }));
    const caliper = mk(roundedBox(T, 0.16, 0.1, 0.06, 0.03, 0.015, 2), K.lacquer(0xd4402e), { y: 0.17, z: -side * 0.01 });
    g.add(wg); wheels.push(wg);
    const cal = caliper.clone(); cal.position.set(x, 0.42, side * 0.9); g.add(cal);
  });
  g.add(mk(new T.BoxGeometry(0.06, 0.05, 0.46), K.glow(0xeaf6ff, 3), { x: 2.13, y: 0.64, z: 0.5, shadow: false }));
  g.add(mk(new T.BoxGeometry(0.06, 0.05, 0.46), K.glow(0xeaf6ff, 3), { x: 2.13, y: 0.64, z: -0.5, shadow: false }));
  g.add(mk(new T.BoxGeometry(0.04, 0.025, 1.5), K.glow(0x5ef2ff, 2.6), { x: 2.18, y: 0.48, shadow: false }));
  g.add(mk(new T.BoxGeometry(0.04, 0.05, 1.6), K.glow(0xff3048, 2.8), { x: -2.16, y: 0.62, shadow: false }));
  g.add(mk(new T.BoxGeometry(3.4, 0.015, 1.45), K.glow(0x2ee6ff, 1.6), { y: 0.13, shadow: false }));
  g.add(mk(roundedBox(T, 0.42, 0.05, 1.8, 0.02, 0.015, 2), K.lacquer(0x0c0c10), { x: -1.92, y: 1.06 }));
  [-0.55, 0.55].forEach((z) => g.add(mk(new T.BoxGeometry(0.05, 0.22, 0.05), K.metal(0x2a2c33), { x: -1.88, y: 0.94, z })));
  const glowLight = new T.PointLight(0x2ee6ff, 1.4, 3.5); glowLight.position.set(0, 0.05, 0); g.add(glowLight);
  g.userData.update = (t) => { wheels.forEach((wg) => { wg.rotation.z = -t * 3; }); };
  return g;
}

function chair(T, q) {
  const K = kit(T); const mk = mkFactory(T); const rod = rodFactory(T, mk); const g = new T.Group();
  const geo = new T.SphereGeometry(1, q.seg(80, 36), q.seg(40, 18), 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.42);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i); let y = p.getY(i); let z = p.getZ(i);
    const back = Math.max(0, -z);
    y = y * 0.42 + back * back * 1.25 * (1 + y * 0.15);
    p.setXYZ(i, x * 1.05, y, z * 0.95);
  }
  geo.computeVertexNormals();
  const shell = mk(geo, K.P({ color: 0xf2ede4, roughness: 0.35, clearcoat: 0.5, side: T.DoubleSide }), { y: 0.05, paint: true });
  g.add(shell);
  const wood = K.P({ color: 0xffffff, map: woodTex(T, '#a8743f'), roughness: 0.55, clearcoat: 0.4 });
  const top = [[0.42, -0.38, 0.32], [-0.42, -0.38, 0.32], [0.42, -0.38, -0.32], [-0.42, -0.38, -0.32]];
  const foot = [[0.72, -1.85, 0.62], [-0.72, -1.85, 0.62], [0.72, -1.85, -0.62], [-0.72, -1.85, -0.62]];
  top.forEach((a, i) => { g.add(rod(a, foot[i], 0.055, wood, 20)); g.add(mk(new T.CylinderGeometry(0.06, 0.06, 0.03, 20), K.metal(0x222326, 0.3), { x: foot[i][0], y: -1.86, z: foot[i][2] })); });
  const steel = K.metal(0xd6d8dc, 0.2);
  const mid = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  [[0, 3], [1, 2]].forEach(([i, j]) => g.add(rod(top[i], mid(top[j], foot[j], 0.55), 0.016, steel, 8)));
  [[0, 2], [1, 3], [0, 1], [2, 3]].forEach(([i, j]) => g.add(rod(mid(top[i], foot[i], 0.55), mid(top[j], foot[j], 0.55), 0.016, steel, 8)));
  g.add(mk(new T.CylinderGeometry(0.34, 0.34, 0.05, 32), K.rubber(0x222222), { y: -0.36 }));
  return g;
}

function pavilion(T, q) {
  const K = kit(T); const mk = mkFactory(T); const g = new T.Group();
  const concrete = K.matte(0xc4beb4, 0.9); const white = K.lacquer(0xf3f1ec, { roughness: 0.3 });
  g.add(mk(roundedBox(T, 5.4, 0.3, 4.2, 0.06, 0.03, 2), concrete, { y: -0.15 }));
  g.add(mk(new T.BoxGeometry(1.7, 0.1, 3.4), K.P({ color: 0x1f8597, metalness: 0.1, roughness: 0.02, clearcoat: 1, transmission: 0.55, thickness: 0.4 }), { x: 1.75, y: 0.02, z: 0.05 }));
  g.add(mk(new T.BoxGeometry(1.9, 0.06, 0.12), concrete, { x: 1.75, y: 0.05, z: 1.82 }));
  const deck = new T.InstancedMesh(new T.BoxGeometry(0.16, 0.05, 1.6), K.P({ color: 0xffffff, map: woodTex(T, '#9b6a3c'), roughness: 0.6 }), 12);
  const dd = new T.Object3D(); for (let i = 0; i < 12; i++) { dd.position.set(-0.95 + i * 0.18, 0.03, 1.15); dd.updateMatrix(); deck.setMatrixAt(i, dd.matrix); }
  deck.receiveShadow = true; g.add(deck);
  g.add(mk(new T.BoxGeometry(3.2, 0.12, 2.3), white, { x: -0.75, y: 0.08, z: -0.65 }));
  g.add(mk(new T.BoxGeometry(3.9, 0.16, 3.0), white, { x: -0.55, y: 1.42, z: -0.45, paint: true }));
  g.add(mk(new T.BoxGeometry(3.92, 0.03, 0.04), K.gold(0.2), { x: -0.55, y: 1.42, z: 1.06 }));
  [[-2.2, 0.4], [0.75, 0.4], [-2.2, -1.7], [0.75, -1.7]].forEach(([x, z]) => g.add(mk(new T.CylinderGeometry(0.035, 0.035, 1.22, 16), K.metal(0x1b1c1f, 0.3), { x, y: 0.75, z })));
  const glass = K.glass(0xdfeef2, { thickness: 0.05, roughness: 0.02 });
  g.add(mk(new T.BoxGeometry(2.9, 1.2, 0.02), glass, { x: -0.72, y: 0.75, z: 0.36, shadow: false }));
  g.add(mk(new T.BoxGeometry(0.02, 1.2, 2.0), glass, { x: 0.71, y: 0.75, z: -0.65, shadow: false }));
  g.add(mk(new T.BoxGeometry(2.9, 1.2, 0.08), K.P({ color: 0xffffff, map: woodTex(T, '#6e4426'), roughness: 0.55 }), { x: -0.72, y: 0.75, z: -1.7 }));
  g.add(mk(new T.BoxGeometry(2.4, 0.025, 0.08), K.glow(0xffd29a, 2.6), { x: -0.72, y: 1.33, z: -0.2, shadow: false }));
  g.add(mk(roundedBox(T, 1.3, 0.28, 0.5, 0.08, 0.04, 3), K.matte(0x5a4e44, 0.95), { x: -1.1, y: 0.28, z: -1.25 }));
  g.add(mk(new T.CylinderGeometry(0.28, 0.28, 0.04, 32), K.lacquer(0x1c1917), { x: -0.3, y: 0.3, z: -0.75 }));
  const warm = new T.PointLight(0xffc98a, 1.1, 4); warm.position.set(-0.7, 1.1, -0.6); g.add(warm);
  g.add(mk(new T.BoxGeometry(1.9, 0.85, 1.6), K.lacquer(0x232120, { roughness: 0.4 }), { x: -1.15, y: 1.92, z: -0.8, paint: false }));
  g.add(mk(new T.BoxGeometry(1.6, 0.18, 0.02), K.glow(0xffd29a, 1.8), { x: -1.15, y: 1.95, z: 0.01, shadow: false }));
  [0, 1].forEach((i) => g.add(mk(new T.BoxGeometry(0.9 - i * 0.2, 0.08, 0.22), concrete, { x: -0.75, y: 0.04 + i * 0.07, z: 0.62 - i * 0.16 })));
  [[2.25, -1.6, 1.0], [-2.4, 1.6, 0.8], [2.4, 1.7, 0.7]].forEach(([x, z, s]) => {
    g.add(mk(new T.CylinderGeometry(0.04 * s, 0.06 * s, 0.7 * s, 10), K.matte(0x4a3324), { x, y: 0.35 * s, z }));
    g.add(mk(new T.IcosahedronGeometry(0.42 * s, 1), K.matte(0x4c6b3a, 0.8, { flatShading: true }), { x, y: 0.9 * s, z, s: [1, 1.25, 1] }));
  });
  return g;
}

function robot(T, q) {
  const K = kit(T); const mk = mkFactory(T); const g = new T.Group();
  const hs = [0.95, 1.05, 1];
  g.add(mk(new T.SphereGeometry(1, q.seg(80, 36), q.seg(60, 24)), K.lacquer(0xf4f2ee), { y: 1.25, s: hs, paint: true }));
  g.add(mk(new T.SphereGeometry(1.015, q.seg(64, 28), 24, Math.PI / 2 - 0.95, 1.9, 1.12, 0.78), K.lacquer(0x05060a, { roughness: 0.05 }), { y: 1.25, s: hs }));
  const eyeWrap = new T.Group(); eyeWrap.position.y = 1.25; eyeWrap.rotation.y = -(Math.PI / 2 - 0.7); eyeWrap.scale.set(hs[0] * 1.03, 1, hs[2] * 1.03);
  const eye = mk(new T.TorusGeometry(1.0, 0.03, 12, 64, 1.4), K.glow(0x52e6ff, 3), { rx: Math.PI / 2, shadow: false });
  eyeWrap.add(eye); g.add(eyeWrap);
  [-1, 1].forEach((s) => {
    g.add(mk(new T.CylinderGeometry(0.27, 0.27, 0.2, 48), K.metal(0x2a2c33, 0.3), { x: s * 0.94, y: 1.25, rz: Math.PI / 2 }));
    g.add(mk(new T.TorusGeometry(0.2, 0.025, 10, 48), K.glow(0x52e6ff, 2.4), { x: s * 1.05, y: 1.25, ry: Math.PI / 2, shadow: false }));
  });
  g.add(mk(new T.TorusGeometry(1.0, 0.008, 8, q.seg(96, 40)), K.matte(0x8a8580), { y: 1.25, ry: Math.PI / 2, s: [hs[2] * 1.005, hs[1] * 1.005, hs[0] * 1.005], shadow: false }));
  g.add(mk(new T.CylinderGeometry(0.025, 0.025, 0.5, 12), K.metal(0xd6d8dc), { y: 2.55 }));
  const tip = mk(new T.SphereGeometry(0.07, 24, 16), K.glow(0xff5a7a, 3), { y: 2.82, shadow: false }); g.add(tip);
  [0.08, 0.18, 0.28].forEach((y, i) => g.add(mk(new T.TorusGeometry(0.33 - i * 0.02, 0.05, 12, 48), K.metal(0x9a9da3, 0.25), { y, rx: Math.PI / 2 })));
  g.add(mk(new T.CylinderGeometry(0.28, 0.32, 0.4, 32), K.metal(0x2a2c33, 0.35), { y: 0.15 }));
  g.add(mk(new T.SphereGeometry(1.3, q.seg(72, 32), 32, 0, Math.PI * 2, 0, Math.PI * 0.42), K.lacquer(0x22252c, { metalness: 0.3 }), { y: -0.62, s: [1.25, 0.62, 0.8] }));
  g.add(mk(new T.BoxGeometry(0.5, 0.03, 0.02), K.glow(0x52e6ff, 2), { y: -0.1, z: 0.86, shadow: false }));
  g.userData.update = (t) => { tip.material.emissiveIntensity = 1.6 + Math.sin(t * 3) * 1.4; eye.material.emissiveIntensity = 2.4 + Math.sin(t * 1.3) * 0.6; };
  return g;
}

function sculpture(T, q) {
  const K = kit(T); const mk = mkFactory(T); const g = new T.Group();
  const geo = new T.SphereGeometry(1, q.seg(160, 64), q.seg(120, 48));
  const p = geo.attributes.position; const colors = new Float32Array(p.count * 3);
  const cA = new T.Color(0xf3d9b8); const cB = new T.Color(0xd4688a); const cC = new T.Color(0x6a5cff); const tmp = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const v = new T.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const n = Math.sin(v.x * 4.1 + v.y * 2.3) * Math.cos(v.z * 3.7 - v.y * 1.9) * 0.14 + Math.sin(v.y * 9) * 0.03;
    v.multiplyScalar(1 + n); p.setXYZ(i, v.x, v.y, v.z);
    const k = (v.y + 1.2) / 2.4; tmp.copy(k < 0.5 ? cA : cB).lerp(k < 0.5 ? cB : cC, (k < 0.5 ? k : k - 0.5) * 2);
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new T.BufferAttribute(colors, 3)); geo.computeVertexNormals();
  const blob = mk(geo, K.P({ vertexColors: true, metalness: 1, roughness: 0.16, clearcoat: 1 }), { y: 1.2, paint: false });
  g.add(blob);
  const rings = [1.5, 1.72, 1.94].map((r, i) => { const m = mk(new T.TorusGeometry(r, 0.018, 10, q.seg(160, 64)), K.gold(0.12), { y: 1.2, rx: 0.4 + i * 0.6, ry: i * 0.8, paint: i === 1 }); g.add(m); return m; });
  const orbs = Array.from({ length: 8 }, (_, i) => { const m = mk(new T.SphereGeometry(0.06, 20, 14), K.glow(i % 2 ? 0x6a5cff : 0xffc08a, 2.6), { shadow: false }); g.add(m); return m; });
  g.add(mk(new T.CylinderGeometry(0.8, 0.95, 0.22, 64), K.lacquer(0x141216), { y: -0.35 }));
  g.add(mk(new T.TorusGeometry(0.88, 0.012, 8, 96), K.glow(0xd4a574, 2), { y: -0.24, rx: Math.PI / 2, shadow: false }));
  g.userData.update = (t) => {
    blob.rotation.y = t * 0.25; blob.rotation.z = Math.sin(t * 0.4) * 0.1;
    rings.forEach((r, i) => { r.rotation.x += 0.003 * (i + 1); r.rotation.y += 0.002 * (3 - i); });
    orbs.forEach((o, i) => { const a = t * (0.5 + i * 0.05) + i * 0.8; const r = 1.6 + (i % 3) * 0.2; o.position.set(Math.cos(a) * r, 1.2 + Math.sin(a * 1.3) * 0.6, Math.sin(a) * r); });
  };
  return g;
}

function crystal(T, q) {
  const K = kit(T); const mk = mkFactory(T); const g = new T.Group();
  g.add(mk(new T.DodecahedronGeometry(1.1, 0), K.matte(0x2a2622, 0.9, { flatShading: true }), { y: -0.35, s: [1.4, 0.45, 1.2] }));
  g.add(mk(new T.OctahedronGeometry(1, 0), K.glass(0xeef3ff, { ior: 2.1, thickness: 1.8, flatShading: true, roughness: 0.0 }), { y: 1.2, s: [0.55, 1.55, 0.55], paint: true }));
  g.add(mk(new T.OctahedronGeometry(0.25, 0), K.glow(0xa98bff, 2.8), { y: 1.1, s: [1, 1.6, 1], shadow: false }));
  const tints = [0xf1e3ff, 0xdff6ff, 0xffeadf, 0xe9ffef, 0xf6e9ff, 0xffffff];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3; const r = 0.55 + (i % 2) * 0.2; const s = 0.35 + (i % 3) * 0.12;
    g.add(mk(new T.OctahedronGeometry(1, 0), K.glass(tints[i], { ior: 2.0, thickness: 0.8, flatShading: true }), { x: Math.cos(a) * r, y: 0.15 + s * 0.9, z: Math.sin(a) * r, rz: Math.cos(a) * 0.5, rx: Math.sin(a) * 0.5, s: [s * 0.5, s * 1.6, s * 0.5], paint: true }));
  }
  const pl = new T.PointLight(0xa98bff, 1.2, 4); pl.position.set(0, 1.1, 0); g.add(pl);
  return g;
}

function lamp(T, q) {
  const K = kit(T); const mk = mkFactory(T); const g = new T.Group();
  g.add(mk(new T.CylinderGeometry(0.55, 0.62, 0.18, 64), K.lacquer(0xffffff, { map: marbleTex(T) }), { y: 0.09 }));
  const curve = new T.QuadraticBezierCurve3(new T.Vector3(0, 0.18, 0), new T.Vector3(0, 3.4, 0), new T.Vector3(1.9, 2.75, 0));
  g.add(mk(new T.TubeGeometry(curve, q.seg(120, 48), 0.035, 12), K.gold(0.16)));
  const prof = [[0.02, 0], [0.24, -0.02], [0.47, -0.15], [0.61, -0.42], [0.64, -0.52]].map(([r, h]) => new T.Vector2(r, h));
  const shade = new T.Group(); shade.position.set(1.9, 2.75, 0); shade.rotation.z = -0.25;
  shade.add(mk(new T.LatheGeometry(prof, q.seg(96, 40)), K.lacquer(0x15151a, { side: T.FrontSide }), { paint: true }));
  shade.add(mk(new T.LatheGeometry(prof.map((v) => new T.Vector2(v.x * 0.985, v.y)), q.seg(96, 40)), new T.MeshStandardMaterial({ color: 0xfff0d8, emissive: 0xffc98a, emissiveIntensity: 0.9, side: T.BackSide }), { shadow: false }));
  shade.add(mk(new T.SphereGeometry(0.13, 32, 20), K.glow(0xfff1d6, 3.2), { y: -0.32, shadow: false }));
  const light = new T.PointLight(0xffd39a, 1.6, 7); light.position.set(0, -0.45, 0); shade.add(light);
  g.add(shade);
  return g;
}

// ------------------------------------------------------------------ registry
export const MODELS = [
  { id: 'perfume', cat: 'product', title: { ru: 'Флакон Lumina', en: 'Lumina bottle' }, build: perfume },
  { id: 'headphones', cat: 'product', title: { ru: 'Наушники Haniex', en: 'Haniex headphones' }, build: headphones },
  { id: 'watch', cat: 'product', title: { ru: 'Часы AF Chrono', en: 'AF Chrono watch' }, build: watch },
  { id: 'car', cat: 'auto', title: { ru: 'Концепт Neon Drift', en: 'Neon Drift concept' }, build: car },
  { id: 'pavilion', cat: 'arch', title: { ru: 'Павильон Aurora', en: 'Aurora pavilion' }, build: pavilion },
  { id: 'chair', cat: 'interior', title: { ru: 'Кресло Shell', en: 'Shell chair' }, build: chair },
  { id: 'lamp', cat: 'interior', title: { ru: 'Лампа Arc', en: 'Arc lamp' }, build: lamp },
  { id: 'robot', cat: 'character', title: { ru: 'Персонаж Vertex', en: 'Vertex character' }, build: robot },
  { id: 'sculpture', cat: 'motion', title: { ru: 'Скульптура Echo', en: 'Echo sculpture' }, build: sculpture },
  { id: 'crystal', cat: 'motion', title: { ru: 'Кристалл Prism', en: 'Prism crystal' }, build: crystal },
];

export const CATS = {
  product: { ru: 'Продукт', en: 'Product' }, auto: { ru: 'Авто', en: 'Automotive' }, arch: { ru: 'Архитектура', en: 'Architecture' },
  interior: { ru: 'Интерьер', en: 'Interior' }, character: { ru: 'Персонажи', en: 'Characters' }, motion: { ru: 'Motion / арт', en: 'Motion / art' },
};

/** Build a model by id. quality: 'high' | 'medium' | 'low' */
export function buildModel(THREE, id, quality = 'high') {
  const def = MODELS.find((m) => m.id === id) || MODELS[0];
  const hi = quality === 'high'; const lo = quality === 'low';
  const q = { hi, seg: (h, l) => (hi ? h : lo ? l : Math.round((h + l) / 2)) };
  const g = def.build(THREE, q);
  g.name = def.id;
  return g;
}

/** Fit a group into a box of `size` units, resting on y = floorY. */
export function fitObject(THREE, obj, size = 2.4, floorY = -1) {
  const box = new THREE.Box3().setFromObject(obj);
  const dim = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3());
  const s = size / Math.max(dim.x, dim.y, dim.z || 1);
  obj.scale.multiplyScalar(s);
  obj.position.sub(center.multiplyScalar(s));
  obj.position.y += (dim.y * s) / 2 + floorY;
  return obj;
}

export function disposeObject(obj) {
  obj.traverse((m) => {
    if (!m.isMesh) return;
    m.geometry?.dispose();
    [].concat(m.material).forEach((x) => { if (!x) return; Object.values(x).forEach((v) => { if (v && v.isTexture) v.dispose(); }); x.dispose(); });
  });
}
