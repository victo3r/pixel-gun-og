// map: the yard (small map) - ground, fence, tower, trees
// ---------- world ----------
const A = 24; // arena half-size (where the fence is)
const G = 160; // how far the ground goes out; the fog hides the edge
const ground = new THREE.Mesh(new THREE.PlaneGeometry(G * 2, G * 2), lam({ map: tex(g => noise(g, [90, 160, 60], 40), G * 2, G * 2) }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);
const solids = [];
function addBlock(x, z, w, d, h, m) {
  const mesh = box(w, h, d, m); mesh.position.set(x, h / 2, z); scene.add(mesh);
  solids.push({ mesh, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: h });
}
// invisible wall: stops players and zombies (even jumping off a tall crate) but bullets go through
const addWall = (x, z, w, d) => solids.push({ mesh: null, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: 99 });
addWall(0, -A, A * 2 + .3, .3); addWall(0, A, A * 2 + .3, .3);
addWall(-A, 0, .3, A * 2 + .3); addWall(A, 0, .3, A * 2 + .3);

// ---------- fence: see-through chain-link with barbed wire on top, gate on the north side ----------
const FH = 2.6, GATE = 2.2; // chain-link height (barbed wire sits above it), half-width of the gate gap
const metal = lam({ color: 0x8a9099 }), darkMetal = lam({ color: 0x4a4f55 });
const seeThru = t => new THREE.MeshLambertMaterial({ map: t, alphaTest: .3, side: THREE.DoubleSide });
const chainMat = (rx, ry) => seeThru(tex(g => { g.fillStyle = '#b4bcc4'; for (let i = 0; i < 16; i++) { g.fillRect(i, i, 1, 1); g.fillRect(15 - i, i, 1, 1); } }, rx, ry));
const barbMat = rx => seeThru(tex(g => {
  g.fillStyle = '#5c6066';
  for (const y of [2, 8, 14]) { g.fillRect(0, y, 16, 1); for (const x of [4, 12]) { g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y - 1, 1, 1); g.fillRect(x - 1, y + 1, 1, 1); g.fillRect(x + 1, y + 1, 1, 1); } }
}, rx, 1));
const postSpots = [];
function flat(geo, mat, x, y, z, ry) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; }
function fenceRun(x1, z1, x2, z2, chain = true) { // one straight stretch of fence from (x1,z1) to (x2,z2)
  const len = Math.hypot(x2 - x1, z2 - z1), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, ry = Math.atan2(-(z2 - z1), x2 - x1);
  flat(new THREE.PlaneGeometry(len, .9), barbMat(len), cx, FH + .55, cz, ry);
  if (!chain) return;
  flat(new THREE.PlaneGeometry(len, FH), chainMat(len, FH), cx, FH / 2, cz, ry);
  const rail = box(len, .07, .07, metal); rail.position.set(cx, FH, cz); rail.rotation.y = ry; scene.add(rail);
  const n = Math.max(1, Math.round(len / 3)); for (let i = 0; i <= n; i++) postSpots.push([x1 + (x2 - x1) * i / n, z1 + (z2 - z1) * i / n]);
}
fenceRun(-A, A, A, A); fenceRun(A, -A, A, A); fenceRun(-A, -A, -A, A);
fenceRun(-A, -A, -GATE, -A); fenceRun(GATE, -A, A, -A); fenceRun(-GATE, -A, GATE, -A, false); // barbed wire runs over the gate too
const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(.14, FH + 1.05, .14), metal, postSpots.length);
const dummy = new THREE.Object3D();
postSpots.forEach(([x, z], i) => { dummy.position.set(x, (FH + 1.05) / 2, z); dummy.updateMatrix(); posts.setMatrixAt(i, dummy.matrix); });
scene.add(posts);
// gate: two closed leaves with a chain and padlock on the outside
for (const s of [-1, 1]) { const gp = box(.24, FH + 1.2, .24, darkMetal); gp.position.set(s * GATE, (FH + 1.2) / 2, -A); scene.add(gp); }
function gateLeaf(x0, x1) {
  const w = Math.abs(x1 - x0), cx = (x0 + x1) / 2, y0 = .12, h = FH - .2, cy = y0 + h / 2, z = -A;
  flat(new THREE.PlaneGeometry(w, h), chainMat(w, h), cx, cy, z, 0);
  for (const y of [y0, y0 + h, cy]) { const b = box(w, .09, .09, darkMetal); b.position.set(cx, y, z); scene.add(b); }
  for (const x of [x0, x1]) { const b = box(.09, h, .09, darkMetal); b.position.set(x, cy, z); scene.add(b); }
  const brace = box(.07, Math.hypot(w, h), .07, darkMetal); brace.position.set(cx, cy, z); brace.rotation.z = Math.atan2(x1 - x0, h); scene.add(brace);
}
gateLeaf(-GATE + .15, -.05); gateLeaf(.05, GATE - .15);
const lockMat = lam({ color: 0x9a9a9a, emissive: 0x111111 });
for (const [x, y] of [[-.12, 1.42], [.12, 1.42], [0, 1.5]]) { const c = box(.14, .05, .05, darkMetal); c.position.set(x, y, -A - .07); scene.add(c); }
const lock = box(.16, .2, .08, lockMat); lock.position.set(0, 1.3, -A - .1); scene.add(lock);
// dirt road leading away from the gate
const dirt = new THREE.MeshLambertMaterial({ map: tex(g => noise(g, [135, 105, 70], 30), 3, (G - A) / 1.5), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const road = new THREE.Mesh(new THREE.PlaneGeometry(4.5, G - A), dirt); road.rotation.x = -Math.PI / 2; road.position.set(0, .02, -A - (G - A) / 2); scene.add(road);

// ---------- guard tower outside the north-east corner ----------
const wood = lam({ map: tex(g => { noise(g, [115, 82, 50], 25); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 5, 16, 1); g.fillRect(0, 11, 16, 1); }) });
const TX = A + 5, TZ = -A - 5, TH = 7; // tower spot and platform height
const tower = new THREE.Group(); tower.position.set(TX, 0, TZ); scene.add(tower);
const tw = (w, h, d, x, y, z, m = wood) => { const b = box(w, h, d, m); b.position.set(x, y, z); tower.add(b); return b; };
for (const sx of [-1.4, 1.4]) for (const sz of [-1.4, 1.4]) { tw(.35, TH, .35, sx, TH / 2, sz); tw(.22, 2.3, .22, sx, TH + 1.45, sz); } // legs + roof posts
const brLen = Math.hypot(2.8, 3.2), brA = Math.atan2(2.8, 3.2);
for (const yc of [1.8, 5.2]) for (const s of [-1.4, 1.4]) for (const d of [-1, 1]) {
  tw(.14, brLen, .14, 0, yc, s).rotation.z = brA * d; // X braces on the north/south faces
  tw(.14, brLen, .14, s, yc, 0).rotation.x = brA * d; // and the east/west faces
}
tw(3.8, .3, 3.8, 0, TH + .15, 0); // platform floor
for (const s of [-1.84, 1.84]) { tw(3.8, .9, .12, 0, TH + .75, s); tw(.12, .9, 3.8, s, TH + .75, 0); } // railing walls
const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.4, 4), lam({ map: tex(g => noise(g, [120, 45, 35], 25)) }));
roof.rotation.y = Math.PI / 4; roof.position.set(0, TH + 3.3, 0); tower.add(roof);
for (const s of [-.35, .35]) tw(.1, TH + .3, .1, 1.75, (TH + .3) / 2, s); // ladder on the outside face
for (let y = .4; y < TH; y += .5) tw(.08, .08, .8, 1.75, y, 0);
const lamp = new THREE.Group(); lamp.rotation.order = 'YXZ'; lamp.position.set(-1.25, TH + 1.35, 1.25);
lamp.rotation.set(.3, Math.atan2(-TX, -TZ), 0); tower.add(lamp); // searchlight aimed at the yard
const lampBody = box(.45, .4, .55, darkMetal), lens = box(.36, .3, .05, new THREE.MeshBasicMaterial({ color: 0xfff2a8 }));
lens.position.z = .29; lamp.add(lampBody, lens);

// ---------- trees, bushes and tall grass outside the fence (same layout every game) ----------
let seed = 1337; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
// gap = how far outside the fence it must be, r = how much room it needs (keeps things off the road and the tower)
const clear = (x, z, gap, r) => Math.max(Math.abs(x), Math.abs(z)) > A + gap && !(Math.abs(x) < 2.3 + r && z < -A) && Math.hypot(x - TX, z - TZ) > 2.8 + r;
function scatter(n, gap, r, R) { const out = []; while (out.length < n) { const x = (rnd() * 2 - 1) * R, z = (rnd() * 2 - 1) * R; if (clear(x, z, gap, r)) out.push([x, z]); } return out; }
const tint = new THREE.Color();
function instanced(geo, mat, list) { // list of [x, y, z, sx, sy, sz, rotY, color]
  const m = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach(([x, y, z, sx, sy, sz, ry, c], i) => {
    dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, tint.setHex(c));
  });
  scene.add(m);
}
const unit = new THREE.BoxGeometry(1, 1, 1);
const leafMat = lam({ map: tex(g => { noise(g, [60, 130, 45], 35); g.fillStyle = 'rgba(0,40,0,.35)'; for (let i = 0; i < 12; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }) });
const barkMat = lam({ map: tex(g => { noise(g, [95, 70, 45], 25); g.fillStyle = 'rgba(0,0,0,.3)'; for (const x of [3, 8, 12]) g.fillRect(x, 0, 1, 16); }) });
const LEAF_TINTS = [0xffffff, 0xddeecc, 0xc8dca8, 0xeaffd8, 0xb8d098];
const trunks = [], leaves = [];
for (const [x, z] of [...scatter(70, 4, 1.6, 60), ...scatter(70, 20, 1.6, 120)]) {
  const s = .8 + rnd() * .7, h = 2.6 * s, ry = rnd() * Math.PI, c = LEAF_TINTS[rnd() * LEAF_TINTS.length | 0];
  trunks.push([x, h / 2, z, .6 * s, h, .6 * s, ry, 0xffffff]);
  leaves.push([x, h + 1 * s, z, 2.8 * s, 2.4 * s, 2.8 * s, ry, c], [x, h + 2.6 * s, z, 1.7 * s, 1.2 * s, 1.7 * s, ry, c]);
}
instanced(unit, barkMat, trunks); instanced(unit, leafMat, leaves);
const bushes = [...scatter(40, 1.4, 1.2, 40), ...scatter(60, 4, 1.2, 100)].map(([x, z]) => {
  const w = 1.2 + rnd() * 1, h = .8 + rnd() * .5;
  return [x, h / 2, z, w, h, w * (.8 + rnd() * .4), rnd() * Math.PI, LEAF_TINTS[rnd() * LEAF_TINTS.length | 0]];
});
instanced(unit, leafMat, bushes);
const grassMat = seeThru(tex(g => {
  for (let x = 0; x < 16; x++) {
    if (Math.random() < .25) continue;
    const top = 1 + Math.random() * 9 | 0, k = Math.random() * 40 - 20 | 0;
    for (let y = top; y < 16; y++) { g.fillStyle = `rgb(${70 + k + (16 - y) * 2},${140 + k + (16 - y) * 3},${45 + k})`; g.fillRect(x, y, 1, 1); }
  }
}));
grassMat.alphaTest = .5;
const grassGeo = new THREE.PlaneGeometry(1, 1).translate(0, .5, 0);
const tufts = scatter(900, .7, .3, 70).map(([x, z]) => { const s = .8 + rnd() * .7; return [x, 0, z, 1.1 * s, 1 * s, 1, rnd() * Math.PI, LEAF_TINTS[rnd() * LEAF_TINTS.length | 0]]; });
instanced(grassGeo, grassMat, tufts);
instanced(grassGeo, grassMat, tufts.map(t => { const u = [...t]; u[6] += Math.PI / 2; return u; })); // second plane crossed with the first
// Each map has a fixed layout: same pad spots and same crates every game. A new map = a new entry here.
// Pad count depends on map size. Each map's pads list must have exactly that many spots.
const PAD_COUNT = { small: 4, medium: 6, large: 8 };
// most players a match can have on a map this size (you + bots, later real players too)
const MAX_PLAYERS = { small: 4, medium: 8, large: 8 };
const MAPS = {
  yard: {
    size: 'small',
    pads: [[12, 0], [-12, 0], [0, 12], [0, -12]],
    // [x, z, tall] (tall: 1 = double-height crate)
    crates: [[-20, 17, 1], [-11.5, 9, 0], [-7, 10, 0], [1.5, 7.5, 0], [12.5, -10.5, 0], [8.5, 8, 1], [7.5, -1.5, 0], [12.5, -15, 0], [17, 7.5, 0],
      [3, 16.5, 0], [-5, -6.5, 0], [-6.5, -14, 1], [-3, -8, 0], [15, -17.5, 1], [-3, -12.5, 0], [-18, -5.5, 0], [6.5, 17, 0], [-13.5, -4, 1]],
  },
};
const MAP = MAPS.yard;
if (MAP.pads.length !== PAD_COUNT[MAP.size]) console.warn(`map has ${MAP.pads.length} pads, ${MAP.size} maps should have ${PAD_COUNT[MAP.size]}`);
const crate1 = crateMat(1), crate2 = crateMat(2);
for (const [x, z, tall] of MAP.crates) addBlock(x, z, 1.2, 1.2, tall ? 2.4 : 1.2, tall ? crate2 : crate1);

