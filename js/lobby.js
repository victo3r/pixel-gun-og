// lobby: its own scene. A floating grass island at dusk with your character on a pedestal.
// The character uses Minecraft proportions: 1 pixel = 1/16 block, head 8x8x8, body 8x12x4, arms and legs 4x12x4.
const lobbyScene = new THREE.Scene();
const lobbyCam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, .1, 300);
{ // teal dusk sky
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#04141b'); gr.addColorStop(.5, '#0c4d57'); gr.addColorStop(.78, '#2ab0a2'); gr.addColorStop(1, '#0b3036');
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  lobbyScene.background = t;
}
lobbyScene.fog = new THREE.Fog(0x16707a, 22, 70);
lobbyScene.add(new THREE.HemisphereLight(0xcff6ff, 0x1a3030, 1));
const lKey = new THREE.DirectionalLight(0xfff0d8, 1.6); lKey.position.set(-4, 8, 7); lobbyScene.add(lKey);
const lRim = new THREE.DirectionalLight(0x5ff5e6, 1.4); lRim.position.set(3, 4, -6); lobbyScene.add(lRim);

// ---------- pixel helpers ----------
const rgb = ([r, g, b], k = 0) => `rgb(${r + k | 0},${g + k | 0},${b + k | 0})`;
const dot = (g, col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
const fillN = (g, w, h, c, v) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) dot(g, rgb(c, (Math.random() - .5) * v), x, y); };
function pixMat(w, h, draw, extra) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  return lam({ map: t, ...extra });
}

// ---------- floating islands ----------
const lCube = new THREE.BoxGeometry(1, 1, 1);
const DIRT = [125, 88, 55];
const lDirt = pixMat(16, 16, g => fillN(g, 16, 16, DIRT, 28));
const lGrassTop = pixMat(16, 16, g => fillN(g, 16, 16, [95, 160, 60], 30));
const lGrassSide = pixMat(16, 16, g => {
  fillN(g, 16, 16, DIRT, 28);
  for (let x = 0; x < 16; x++) { const d = 3 + (Math.random() * 2 | 0); for (let y = 0; y < d; y++) dot(g, rgb([92, 158, 58], (Math.random() - .5) * 30), x, y); }
});
const lStone = stoneMat(1, 1);
const lGrass = [lGrassSide, lGrassSide, lGrassTop, lDirt, lGrassSide, lGrassSide];
function island(cx, cy, cz, R) {
  const grass = [], dirt = [], stone = [];
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    const d = Math.hypot(x, z); if (d > R + .2) continue;
    grass.push([cx + x, cy - .5, cz + z]);
    const depth = Math.max(1, Math.round((R + .4 - d) * .9 + Math.random() * 1.5)); // deeper in the middle, so it hangs like a cone
    for (let y = 1; y <= depth; y++) (y <= 2 ? dirt : stone).push([cx + x, cy - .5 - y, cz + z]);
  }
  const o = new THREE.Object3D();
  for (const [mat, list] of [[lGrass, grass], [lDirt, dirt], [lStone, stone]]) { // one draw call per block type
    const m = new THREE.InstancedMesh(lCube, mat, list.length);
    list.forEach((p, i) => { o.position.set(...p); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    lobbyScene.add(m);
  }
}
island(0, 0, 0, 6);
island(-17, -4, -22, 3); island(19, 2, -28, 2); island(-26, 6, -40, 3); island(8, -9, -18, 1);

// pedestal you stand on: stone with a gold trim and a teal glow strip
const pedTop = stoneMat(2, 2), pedSide = stoneMat(2, .5);
const ped = new THREE.Mesh(new THREE.BoxGeometry(2.2, .5, 2.2), [pedSide, pedSide, pedTop, pedTop, pedSide, pedSide]);
ped.position.y = .25; lobbyScene.add(ped);
const trim = box(2.34, .08, 2.34, lam({ color: 0xffd23f, emissive: 0x6a4d00 })); trim.position.y = .45; lobbyScene.add(trim); // just under the top, so it shows as a gold band round the edge
const glowStrip = box(2.3, .06, 2.3, new THREE.MeshBasicMaterial({ color: 0x3ff0e0 })); glowStrip.position.y = .06; lobbyScene.add(glowStrip);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(.42, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .35 }));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = .505; lobbyScene.add(shadow);

// props: crates, trees, lamps, flowers
for (const [x, y, z, r] of [[-3.2, .5, -2.4, .2], [-4.2, .5, -1.5, -.3], [-3.5, 1.5, -2.1, .6], [3.8, .5, -2.8, .4]]) {
  const c = box(1, 1, 1, crateMat(1)); c.position.set(x, y, z); c.rotation.y = r; lobbyScene.add(c);
}
function lTree(x, z, h) {
  const t = box(1, h, 1, barkMat); t.position.set(x, h / 2, z); lobbyScene.add(t);
  const l1 = box(3, 2, 3, leafMat); l1.position.set(x, h + .5, z); lobbyScene.add(l1);
  const l2 = box(1.6, 1, 1.6, leafMat); l2.position.set(x, h + 2, z); lobbyScene.add(l2);
}
lTree(-4.6, -4.2, 3); lTree(4.9, -3.2, 2);
const lamps = [];
for (const x of [-3.1, 3.1]) {
  const post = box(.16, 2.2, .16, lam({ color: 0x2b2f33 })); post.position.set(x, 1.1, -1.8); lobbyScene.add(post);
  const lan = box(.38, .42, .38, lam({ color: 0xffc66b, emissive: 0xffa53a })); lan.position.set(x, 2.35, -1.8); lobbyScene.add(lan);
  const cap = box(.5, .08, .5, lam({ color: 0x2b2f33 })); cap.position.set(x, 2.6, -1.8); lobbyScene.add(cap);
  const pl = new THREE.PointLight(0xffb45a, 6, 7); pl.position.set(x, 2.3, -1.4); lobbyScene.add(pl);
  lamps.push(pl);
}
for (let i = 0; i < 14; i++) { // little flowers dotted on the grass
  const a = Math.random() * Math.PI * 2, d = 1.8 + Math.random() * 3.8;
  const f = box(.14, .14, .14, lam({ color: [0xff4d6d, 0xffd23f, 0xb48cff, 0xffffff][i % 4] }));
  f.position.set(Math.cos(a) * d, .07, Math.sin(a) * d); lobbyScene.add(f);
}

// floating glowing cubes, drifting clouds, stars
const floaters = [];
for (let i = 0; i < 16; i++) {
  const s = .18 + Math.random() * .3, a = i / 16 * Math.PI * 2, r = 7.5 + Math.random() * 4;
  const m = box(s, s, s, new THREE.MeshBasicMaterial({ color: i % 3 ? 0x46f2e2 : 0xffd23f, transparent: true, opacity: .85 }));
  m.position.set(Math.cos(a) * r, -1 + Math.random() * 6, Math.sin(a) * r - 2);
  floaters.push({ m, y: m.position.y, p: Math.random() * 6, s: .3 + Math.random() * .6 });
  lobbyScene.add(m);
}
const clouds = [];
const cloudMat = lam({ color: 0xe8fbff, transparent: true, opacity: .8 });
for (let i = 0; i < 7; i++) {
  const c = box(4 + Math.random() * 6, 1, 2 + Math.random() * 3, cloudMat);
  c.position.set(-40 + i * 13 + Math.random() * 5, 9 + Math.random() * 6, -25 - Math.random() * 20);
  clouds.push(c); lobbyScene.add(c);
}
{
  const pts = [];
  for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI - Math.PI, e = .25 + Math.random() * 1.1; pts.push(Math.cos(a) * 110 * Math.cos(e), 110 * Math.sin(e), Math.sin(a) * 110 * Math.cos(e)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  lobbyScene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: .8 })));
}

// ---------- your character ----------
const SK = [214, 163, 124], HAIR = [74, 48, 28], SHIRT = [28, 158, 152], PANTS = [44, 62, 128], SHOE = [58, 58, 64];
const n = () => (Math.random() - .5) * 18;
const headFront = blink => pixMat(8, 8, g => {
  fillN(g, 8, 8, SK, 10);
  for (let x = 0; x < 8; x++) { dot(g, rgb(HAIR, n()), x, 0); dot(g, rgb(HAIR, n()), x, 1); }
  dot(g, rgb(HAIR, n()), 0, 2); dot(g, rgb(HAIR, n()), 7, 2); dot(g, rgb(HAIR, n()), 1, 2);
  dot(g, rgb(HAIR, 12), 1, 3, 2, 1); dot(g, rgb(HAIR, 12), 5, 3, 2, 1); // eyebrows
  if (blink) { dot(g, rgb(SK, -35), 1, 4, 2, 1); dot(g, rgb(SK, -35), 5, 4, 2, 1); }
  else { dot(g, '#fff', 1, 4); dot(g, '#2d5fa8', 2, 4); dot(g, '#2d5fa8', 5, 4); dot(g, '#fff', 6, 4); }
  dot(g, rgb(SK, -24), 3, 5, 2, 1); // nose
  dot(g, '#9a5a48', 2, 6, 4, 1); // mouth
});
const headSide = frontLeft => pixMat(8, 8, g => { // frontLeft: which edge of the texture faces forward
  fillN(g, 8, 8, SK, 10);
  const X = i => frontLeft ? i : 7 - i;
  for (let i = 0; i < 8; i++) { dot(g, rgb(HAIR, n()), X(i), 0); dot(g, rgb(HAIR, n()), X(i), 1); }
  for (let i = 4; i < 8; i++) for (let y = 2; y < (i > 5 ? 7 : 5); y++) dot(g, rgb(HAIR, n()), X(i), y);
  dot(g, rgb(SK, -28), X(3), 4, 1, 2); // ear
});
const hairAll = pixMat(8, 8, g => fillN(g, 8, 8, HAIR, 18));
const faceOpen = headFront(false), faceBlink = headFront(true);
const headMats = [headSide(true), headSide(false), hairAll, pixMat(8, 8, g => fillN(g, 8, 8, SK, 10)), faceOpen, hairAll];
const shirtSide = (w, h, front) => pixMat(w, h, g => {
  fillN(g, w, h, SHIRT, 22); dot(g, rgb(SHIRT, -30), 0, h - 1, w, 1); // darker hem
  if (front) { dot(g, rgb(SK), 2, 0, 4, 1); dot(g, rgb(SK), 3, 1, 2, 1); dot(g, '#ffd23f', 5, 3, 2, 2); dot(g, '#b8901f', 6, 4); } // v-neck + gold badge
});
const bodyMats = [shirtSide(4, 12), shirtSide(4, 12), shirtSide(8, 4), pixMat(8, 4, g => fillN(g, 8, 4, PANTS, 18)), shirtSide(8, 12, true), shirtSide(8, 12)];
const armSide = pixMat(4, 12, g => { fillN(g, 4, 12, SK, 10); fillN(g, 4, 3, SHIRT, 22); dot(g, rgb(SHIRT, -30), 0, 3, 4, 1); });
const armMats = [armSide, armSide, pixMat(4, 4, g => fillN(g, 4, 4, SHIRT, 22)), pixMat(4, 4, g => fillN(g, 4, 4, SK, 14)), armSide, armSide];
const legSide = pixMat(4, 12, g => { fillN(g, 4, 12, PANTS, 18); for (let x = 0; x < 4; x++) { dot(g, rgb(SHOE, n()), x, 10); dot(g, rgb(SHOE, n()), x, 11); } });
const legMats = [legSide, legSide, pixMat(4, 4, g => fillN(g, 4, 4, PANTS, 18)), pixMat(4, 4, g => fillN(g, 4, 4, SHOE, 14)), legSide, legSide];

const U = 1 / 16; // one skin pixel
const part = (w, h, d, mats) => new THREE.Mesh(new THREE.BoxGeometry(w * U, h * U, d * U), mats);
const hero = new THREE.Group(); hero.position.y = .5; lobbyScene.add(hero);
const torso = part(8, 12, 4, bodyMats); torso.position.y = 18 * U; hero.add(torso);
const headPiv = new THREE.Group(); headPiv.position.y = 24 * U; hero.add(headPiv);
const heroHead = part(8, 8, 8, headMats); heroHead.position.y = 4 * U; headPiv.add(heroHead);
const limb = (x, y, mats, dy) => { const p = new THREE.Group(); p.position.set(x * U, y * U, 0); const m = part(4, 12, 4, mats); m.position.y = dy * U; p.add(m); hero.add(p); return p; };
const armL = limb(-6, 22, armMats, -4), armR = limb(6, 22, armMats, -4); // armL = your right arm (on the left of the screen)
limb(-2, 12, legMats, -6); limb(2, 12, legMats, -6);

// ---------- animation, drag to spin, head follows the mouse ----------
const REST = .45; // default 3/4 view
let spin = REST, spinV = 0, dragX = null, lastDrag = -1e9, blinkT = 3, mNX = 0, mNY = 0;
const heroScreen = { x: innerWidth * .7, y: innerHeight / 2 };
const stage = $('stage');
stage.addEventListener('pointerdown', e => { dragX = e.clientX; spinV = 0; stage.setPointerCapture(e.pointerId); });
const endDrag = () => { if (dragX !== null) { dragX = null; lastDrag = performance.now(); } };
stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);
addEventListener('pointermove', e => {
  if (!inLobby) return;
  mNX = Math.max(-1, Math.min(1, (e.clientX - heroScreen.x) / (innerWidth * .4)));
  mNY = Math.max(-1, Math.min(1, (heroScreen.y - e.clientY) / (innerHeight * .4)));
  if (dragX !== null) { const d = (e.clientX - dragX) * .012; spin += d; spinV = d * 30; dragX = e.clientX; }
});

// frame the camera so the character sits in the middle of the #stage area, whatever the window size
function frameLobby() {
  const W = innerWidth, H = innerHeight, r = stage.getBoundingClientRect();
  const sw = r.width || W, sh = r.height || H, cx = r.left + sw / 2, cy = r.top + sh * .5;
  const tan = Math.tan(THREE.MathUtils.degToRad(lobbyCam.fov / 2));
  const visH = Math.max(3.6 / (sh / H * .9), 2.2 / (sw / W * .9) / (W / H)); // ~3.6 blocks tall in the stage
  const dist = Math.max(5, Math.min(20, visH / 2 / tan));
  lobbyCam.aspect = W / H;
  lobbyCam.position.set(0, 1.5 + dist * .14, dist); lobbyCam.lookAt(0, 1.4, 0);
  lobbyCam.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H); // slide the picture so the hero lands on the stage
  heroScreen.x = cx; heroScreen.y = cy;
}

function updateLobby(dt) {
  const t = performance.now() / 1000;
  if (dragX === null) {
    spin += spinV * dt; spinV *= Math.exp(-4 * dt);
    if (performance.now() - lastDrag > 2500) { // drift back to the 3/4 view after a bit
      const rest = REST + Math.round((spin - REST) / (Math.PI * 2)) * Math.PI * 2;
      spin += (rest - spin) * Math.min(1, dt * 1.5);
    }
  }
  hero.rotation.y = spin;
  // idle: arms sway a little, chest breathes
  armL.rotation.z = -.05 - Math.sin(t * 1.6) * .03; armR.rotation.z = .05 + Math.sin(t * 1.6) * .03;
  armL.rotation.x = Math.sin(t * 1.1) * .05; armR.rotation.x = -Math.sin(t * 1.1) * .05;
  torso.scale.z = 1 + Math.sin(t * 1.6) * .02;
  // head turns toward the mouse (only as far as a neck can)
  let rel = mNX * .9 - spin; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  headPiv.rotation.y += (Math.max(-.9, Math.min(.9, rel)) - headPiv.rotation.y) * Math.min(1, dt * 6);
  headPiv.rotation.x += (-mNY * .45 - headPiv.rotation.x) * Math.min(1, dt * 6);
  // blink every few seconds
  blinkT -= dt;
  headMats[4] = blinkT < 0 ? faceBlink : faceOpen; heroHead.material = headMats;
  if (blinkT < -.13) blinkT = 2 + Math.random() * 3;
  // scenery
  for (const f of floaters) { f.m.position.y = f.y + Math.sin(t * f.s + f.p) * .4; f.m.rotation.x += dt * f.s; f.m.rotation.y += dt * f.s * .7; }
  for (const c of clouds) { c.position.x += dt * .6; if (c.position.x > 50) c.position.x = -50; }
  for (const l of lamps) l.intensity = 5.5 + Math.sin(t * 9 + l.position.x) * .4 + Math.sin(t * 23) * .2; // lantern flicker
  glowStrip.material.color.setHSL(.48, .85, .5 + Math.sin(t * 2) * .08);
  frameLobby();
}
