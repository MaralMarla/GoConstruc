import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050b1a);
scene.fog = new THREE.FogExp2(0x050b1a, 0.0012);

const W = window.innerWidth || 600, H = window.innerHeight || 400;
const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 300);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x050b1a, 1);
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// Orbit control — diagonal angle
const TARGET = new THREE.Vector3(0, 5, 0);
let theta = 0.55, phi = 1.15, radius = 68;
let isDragging = false, prevX = 0, prevY = 0;
let thetaVel = 0.003;

function updateCamera() {
  camera.position.set(
    TARGET.x + radius * Math.sin(phi) * Math.sin(theta),
    TARGET.y + radius * Math.cos(phi),
    TARGET.z + radius * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(TARGET);
}
updateCamera();

const el = renderer.domElement;
el.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; thetaVel = 0; });
el.addEventListener('mousemove', e => {
  if (!isDragging) return;
  theta -= (e.clientX - prevX) * 0.006;
  phi = Math.max(0.25, Math.min(1.45, phi + (e.clientY - prevY) * 0.006));
  prevX = e.clientX; prevY = e.clientY;
  updateCamera();
});
window.addEventListener('mouseup', () => { isDragging = false; thetaVel = 0.003; });
el.addEventListener('touchstart', e => { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; thetaVel = 0; });
el.addEventListener('touchmove', e => {
  if (!isDragging) return;
  theta -= (e.touches[0].clientX - prevX) * 0.006;
  phi = Math.max(0.25, Math.min(1.45, phi + (e.touches[0].clientY - prevY) * 0.006));
  prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
  updateCamera();
});
window.addEventListener('touchend', () => { isDragging = false; thetaVel = 0.003; });

// Lighting
scene.add(new THREE.AmbientLight(0x1a1a2e));
const keyLight = new THREE.DirectionalLight(0x88aaff, 0.9);
keyLight.position.set(5, 12, 8); scene.add(keyLight);
const fillLight = new THREE.PointLight(0x44aaff, 0.45);
fillLight.position.set(-4, 6, 10); scene.add(fillLight);
const rimLight = new THREE.PointLight(0xffaa66, 0.5);
rimLight.position.set(3, 9, -14); scene.add(rimLight);
const backRim = new THREE.PointLight(0x88aaff, 0.4);
backRim.position.set(-3, 7, -12); scene.add(backRim);
const centerGlow = new THREE.PointLight(0x33aaff, 0.55, 40);
centerGlow.position.set(0, 4, 0); scene.add(centerGlow);

// Glow texture
function createGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 24;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 24, 24);
  ctx.beginPath(); ctx.arc(12, 12, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#66ccff'; ctx.fill();
  ctx.beginPath(); ctx.arc(12, 12, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#aaffff'; ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath(); ctx.arc(12, 12, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = 'white'; ctx.fill();
  return new THREE.CanvasTexture(c);
}
const particleSprite = createGlowTexture();

// Bridge geometry
const vertices = [], edges = [], points = [];
function addVertex(x, y, z) { vertices.push(new THREE.Vector3(x, y, z)); return vertices.length - 1; }
function addPoint(x, y, z)  { points.push(new THREE.Vector3(x, y, z)); }

const deckMinX = -40, deckMaxX = 40, deckY = 0;
const towerX = [-26, 26], towerHeight = 32, mainCableSag = 12, cableLateralOffset = 2.4;

function addTower(tx) {
  const pw = 2.6, pd = 4.0, steps = 32;
  for (let y = 0; y <= towerHeight; y += towerHeight / steps) {
    for (let dx of [-pw / 2, pw / 2]) {
      for (let dz of [-pd / 2, pd / 2]) {
        const idx = addVertex(tx + dx, y, dz);
        if (y > 0) { const prev = addVertex(tx + dx, y - towerHeight / steps, dz); edges.push([prev, idx]); }
        if (Math.abs(y - towerHeight) < 0.6 || y < 1) addPoint(tx + dx, y, dz);
      }
    }
  }
  for (let y = 2; y <= towerHeight; y += 2.5) {
    const lf = addVertex(tx - pw / 2, y, -pd / 2), rf = addVertex(tx + pw / 2, y, -pd / 2);
    const lb = addVertex(tx - pw / 2, y,  pd / 2), rb = addVertex(tx + pw / 2, y,  pd / 2);
    edges.push([lf, rf], [lb, rb], [lf, lb], [rf, rb], [lf, rb], [rf, lb]);
    addPoint(tx, y, 0);
  }
  const cy = towerHeight + 0.8;
  for (let w of [-2, -1, 0, 1, 2]) {
    const lc = addVertex(tx + w, cy, -1.5), rc = addVertex(tx + w, cy, 1.5);
    edges.push([lc, rc]); addPoint(tx + w, cy, 0);
  }
  addVertex(tx, towerHeight + 1.2, 0);
}
towerX.forEach(tx => addTower(tx));

// Foundations
const fw = 7, fd = 9, fy = -1.8;
for (let tx of towerX) {
  const bc = [[tx - fw / 2, fy, -fd / 2], [tx + fw / 2, fy, -fd / 2], [tx + fw / 2, fy, fd / 2], [tx - fw / 2, fy, fd / 2]];
  const bi = [];
  for (let c of bc) { bi.push(addVertex(c[0], c[1], c[2])); addPoint(c[0], c[1] + 0.15, c[2]); }
  for (let i = 0; i < 4; i++) edges.push([bi[i], bi[(i + 1) % 4]]);
  for (let i = 0; i < 4; i++) { const l = addVertex(bc[i][0], fy - 1.5, bc[i][2]); edges.push([bi[i], l]); addPoint(bc[i][0], fy - 0.8, bc[i][2]); }
}
for (let ax of [-44, 44]) {
  const aw = 6, ah = 4, ad = 7, ay = -1;
  const cs = [[ax - aw / 2, ay, -ad / 2], [ax + aw / 2, ay, -ad / 2], [ax + aw / 2, ay, ad / 2], [ax - aw / 2, ay, ad / 2]];
  const ai = [];
  for (let c of cs) { ai.push(addVertex(c[0], c[1], c[2])); addPoint(c[0], c[1] + 0.25, c[2]); }
  for (let i = 0; i < 4; i++) edges.push([ai[i], ai[(i + 1) % 4]]);
  const uy = ay + 2.2;
  for (let i = 0; i < 4; i++) { const u = addVertex(cs[i][0], uy, cs[i][2]); edges.push([ai[i], u]); addPoint(cs[i][0], uy + 0.15, cs[i][2]); }
}

// Main cables (parabolic)
const N = 56;
for (let side of [-1, 1]) {
  const z = side * cableLateralOffset; let prev = null;
  for (let i = 0; i <= N; i++) {
    const x = -40 + (i / N) * 80;
    let yc;
    if (x < -26)      { const d = Math.abs(x + 44); yc = 1.2 + d * 0.09; }
    else if (x > 26)  { const d = Math.abs(x - 44); yc = 1.2 + d * 0.09; }
    else              { const t = (Math.abs(x) - 26) / 26; yc = towerHeight - (t * mainCableSag); }
    const idx = addVertex(x, yc, z);
    if (prev !== null) edges.push([prev, idx]);
    prev = idx;
    if (i % 5 === 0) addPoint(x, yc, z);
  }
}

// Hangers
for (let x = -37; x <= 37; x += 2.5) {
  if (Math.abs(x) < 23 && Math.abs(x) > 1.5) {
    for (let side of [-1, 1]) {
      const z = side * cableLateralOffset;
      let cy;
      if (x < -26)     { const d = Math.abs(x + 44); cy = 1.2 + d * 0.09; }
      else if (x > 26) { const d = Math.abs(x - 44); cy = 1.2 + d * 0.09; }
      else             { const t = (Math.abs(x) - 26) / 26; cy = towerHeight - (t * mainCableSag); }
      const cp = addVertex(x, cy, z), dp = addVertex(x, deckY + 0.3, side * 1.8);
      edges.push([cp, dp]); addPoint(x, (cy + deckY) / 2, z);
    }
  }
}

// Deck
for (let z of [-2.5, -1, 0, 1, 2.5]) {
  let prev = null;
  for (let x = deckMinX; x <= deckMaxX; x += 0.7) {
    const idx = addVertex(x, deckY + 0.15, z);
    if (prev !== null) edges.push([prev, idx]); prev = idx;
    if (x % 2 < 0.1) addPoint(x, deckY + 0.22, z);
  }
}
for (let side of [-1, 1]) {
  const zr = side * 3.2; let pl = null, ph = null;
  for (let x = deckMinX; x <= deckMaxX; x += 0.75) {
    const lo = addVertex(x, deckY + 1, zr); if (pl !== null) edges.push([pl, lo]); pl = lo; addPoint(x, deckY + 1.05, zr);
    const hi = addVertex(x, deckY + 1.6, zr); if (ph !== null) edges.push([ph, hi]); ph = hi; addPoint(x, deckY + 1.65, zr);
    edges.push([lo, hi]);
  }
}

// Under-deck truss
const td = 1.2;
for (let x = deckMinX; x <= deckMaxX; x += 1.4) {
  const lt = addVertex(x, deckY + 0.15, -2), rt = addVertex(x, deckY + 0.15, 2);
  const lb = addVertex(x, deckY - td, -2),   rb = addVertex(x, deckY - td, 2);
  edges.push([lt, lb], [rt, rb], [lb, rb], [lt, rb], [rt, lb]);
  if (x % 2.8 < 0.1) addPoint(x, deckY - 0.6, 0);
}
for (let side of [-1, 1]) {
  let prev = null; const zb = side * 2;
  for (let x = deckMinX; x <= deckMaxX; x += 0.9) {
    const idx = addVertex(x, deckY - td, zb);
    if (prev !== null) edges.push([prev, idx]); prev = idx;
  }
}

// Cross-bracing
for (let x = deckMinX + 2; x <= deckMaxX - 2; x += 2.8) {
  const tl = addVertex(x, deckY + 0.15, -2.2), tr = addVertex(x, deckY + 0.15, 2.2);
  const bl = addVertex(x, deckY - 0.7, -2.2),  br = addVertex(x, deckY - 0.7, 2.2);
  edges.push([tl, br], [tr, bl], [bl, br]);
}
for (let side of [-1, 1]) {
  const zw = side * 3.8; let prev = null;
  for (let x = deckMinX; x <= deckMaxX; x += 1.1) {
    const idx = addVertex(x, deckY + 0.8, zw);
    if (prev !== null) edges.push([prev, idx]); prev = idx;
    if (x % 3 < 0.1) addPoint(x, deckY + 0.85, zw);
  }
}

// Anchor tension
for (let side of [-1, 1]) {
  const az = side * 2.5;
  for (let ax of [-44, 44]) {
    const b = addVertex(ax, 0.3, az), t = addVertex(ax + (side * 1.5), 1.5, az);
    edges.push([b, t]); addPoint(ax, 0.6, az);
  }
}

// Detail points
for (let i = 0; i < 2200; i++) {
  const x = (Math.random() - 0.5) * 88, y = Math.random() * 28, z = (Math.random() - 0.5) * 16;
  if (Math.abs(x) < 44 && (y < 22 || Math.abs(x) > 24)) points.push(new THREE.Vector3(x, y, z));
}
for (let i = 0; i < 1500; i++) {
  const x = (Math.random() - 0.5) * 100, z = (Math.random() - 0.5) * 50, y = -2.5 + Math.random() * 2;
  if (Math.abs(x) < 60 && Math.abs(z) < 40) points.push(new THREE.Vector3(x, y, z));
}

// Build geometry
const linePosArr = [];
edges.forEach(e => {
  const p1 = vertices[e[0]], p2 = vertices[e[1]];
  if (p1 && p2) linePosArr.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
});
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePosArr), 3));
scene.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
  color: 0x44ccff, transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending
})));

const ptArr = new Float32Array(points.length * 3);
points.forEach((p, i) => { ptArr[i * 3] = p.x; ptArr[i * 3 + 1] = p.y; ptArr[i * 3 + 2] = p.z; });
const ptGeo = new THREE.BufferGeometry();
ptGeo.setAttribute('position', new THREE.BufferAttribute(ptArr, 3));
scene.add(new THREE.Points(ptGeo, new THREE.PointsMaterial({
  color: 0xaaffdd, size: 0.16, map: particleSprite, transparent: true, blending: THREE.AdditiveBlending
})));

// Stars
const starArr = [];
for (let i = 0; i < 2000; i++) {
  starArr.push((Math.random() - 0.5) * 400, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 150 - 80);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(starArr), 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
  color: 0x88aaff, size: 0.09, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending
}));
scene.add(stars);

let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.012;
  centerGlow.intensity = Math.min(0.75, 0.55 + Math.sin(time * 1.2) * 0.12);
  stars.rotation.y += 0.0003;
  if (!isDragging) { theta += thetaVel; updateCamera(); }
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = (window.innerWidth || 600) / (window.innerHeight || 400);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth || 600, window.innerHeight || 400);
});
