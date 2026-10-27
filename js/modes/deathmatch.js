// deathmatch mode: you vs a bot that fights like a player, using the same guns you do.
// The bot lives in the zombies list (type 'bot'), so your bullets, knife, fire and rockets already hurt it.
// react = how long it has to see you before it shoots. turn = how fast its aim catches up to you (higher = snappier).
// lead = how far ahead of you it aims when you're moving. aimErr = random wobble on each shot, in radians.
// dmgMul = its guns do this much of their normal damage to you.
// moveErr = extra wobble when you're running (at full speed), so strafing really does make it miss more.
const BOT = { hp: 100, speed: 5, react: .45, turn: 8, lead: .05, aimErr: .025, moveErr: .045, dmgMul: .5, respawn: 1.5 };
const SNIPE_T = .9; // a sniper bot holds its red laser on you this long before it fires
// guns a bot can spawn with, and the distance it tries to keep from you with each one [closest, furthest]
const BOT_GUNS = {
  0: [6, 13],  // pistol
  1: [2.5, 6], // shotgun: rushes you
  2: [8, 16],  // rifle
  3: [16, 32], // sniper: hangs back
  4: [6, 12],  // minigun
};

// ---------- the bot's look: a Minecraft-style player in a red shirt ----------
const SKIN_C = [214, 163, 124];
const botSkinT = tex(g => noise(g, SKIN_C, 14));
const botHairT = tex(g => noise(g, [62, 42, 26], 20));
const botSideT = tex(g => { noise(g, SKIN_C, 14); g.fillStyle = '#3e2a1a'; g.fillRect(0, 0, 16, 5); });
const botFaceT = tex(g => {
  noise(g, SKIN_C, 14); g.fillStyle = '#3e2a1a'; g.fillRect(0, 0, 16, 4); g.fillRect(0, 4, 2, 2); g.fillRect(14, 4, 2, 2);
  g.fillStyle = '#fff'; g.fillRect(3, 7, 3, 2); g.fillRect(10, 7, 3, 2);
  g.fillStyle = '#222'; g.fillRect(5, 7, 1, 2); g.fillRect(10, 7, 1, 2);
  g.fillStyle = '#b06a50'; g.fillRect(7, 10, 2, 1); g.fillStyle = '#8a4a3a'; g.fillRect(5, 12, 6, 1);
});
const botShirtT = tex(g => { noise(g, [185, 40, 40], 26); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 15, 16, 1); });
const tagMat = (() => { // "BOT" name tag floating over its head
  const c = document.createElement('canvas'); c.width = 64; c.height = 16;
  const g = c.getContext('2d'); g.font = 'bold 13px monospace'; g.textAlign = 'center';
  g.fillStyle = '#000'; g.fillText('BOT', 33, 13); g.fillStyle = '#ff5a5a'; g.fillText('BOT', 32, 12);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return new THREE.SpriteMaterial({ map: t, transparent: true });
})();

function makeBot(x, z) {
  const keys = Object.keys(BOT_GUNS), gun = +keys[Math.random() * keys.length | 0], W = BASE[gun];
  const skin = lam({ map: botSkinT }), side = lam({ map: botSideT }), face = lam({ map: botFaceT }), hair = lam({ map: botHairT });
  const shirt = lam({ map: botShirtT }), pants = lam({ map: pantsTex });
  const g = new THREE.Group(); g.rotation.order = 'YXZ'; g.position.set(x, 0, z);
  const head = box(.5, .5, .5, [side, side, hair, skin, face, hair]); head.position.y = 1.6; head.userData.head = true;
  const body = box(.5, .7, .3, shirt); body.position.y = 1.0;
  const armL = box(.18, .18, .65, skin); armL.position.set(-.34, 1.25, .25); // both arms out front holding the gun
  const armR = box(.18, .18, .65, skin); armR.position.set(.34, 1.25, .25);
  const mkLeg = sx => { const piv = new THREE.Group(); piv.position.set(sx, .65, 0); const l = box(.22, .65, .25, pants); l.position.y = -.325; piv.add(l); return [piv, l]; };
  const [pivL, legL] = mkLeg(-.13), [pivR, legR] = mkLeg(.13);
  const gunM = box(.09, .13, W.len, lam({ color: W.color })); gunM.position.set(.16, 1.33, .42 + W.len / 2);
  const tip = new THREE.Object3D(); tip.position.set(.16, 1.33, .47 + W.len);
  const flashM = box(.14, .14, .14, new THREE.MeshBasicMaterial({ color: 0xffdd55 })); flashM.position.copy(tip.position); flashM.visible = false;
  const tag = new THREE.Sprite(tagMat); tag.scale.set(1, .25, 1); tag.position.y = 2.25;
  g.add(head, body, armL, armR, pivL, pivR, gunM, tip, flashM, tag); scene.add(g);
  const yaw = Math.atan2(P.pos.x - x, P.pos.z - z);
  g.rotation.y = yaw;
  const b = { g, head, tip, flashM, tag, pivL, pivR, parts: [head, body, armL, armR, legL, legR], mats: [skin, side, face, hair, shirt, pants],
    type: 'bot', hp: BOT.hp, maxHp: BOT.hp, scale: 1, r: .3, coins: 0, t: 0, flash: 0, dead: 0, burn: 0,
    gun, ammo: W.mag, reload: 0, cd: .3, burst: 5, muzzle: 0, seeT: 0, aimT: 0, aimYaw: yaw, aimPitch: 0,
    strafe: 1, strafeT: 0, detour: 0, detourDir: 1, lpx: P.pos.x, lpz: P.pos.z, pvx: 0, pvz: 0 };
  b.parts.forEach(p => p.userData.zombie = b);
  zombies.push(b);
  return b;
}
function spawnBot() { // somewhere open, well away from you
  for (let tries = 0; tries < 200; tries++) {
    const x = (Math.random() * 2 - 1) * (A - 2), z = (Math.random() * 2 - 1) * (A - 2);
    if (!blocked(x, z, .45, 0) && Math.hypot(x - P.pos.x, z - P.pos.z) > (tries < 150 ? 16 : 8)) return makeBot(x, z);
  }
}
function botDown(b) {
  b.tag.visible = false; b.flashM.visible = false; laser.visible = false;
  beep(180, .3, 'sawtooth', .12); toast('+1 KILL', '#ffd23f');
}

// ---------- seeing and shooting ----------
const eye = new THREE.Vector3(), aimV = new THREE.Vector3(), dirV = new THREE.Vector3(), hitV = new THREE.Vector3(), muz = new THREE.Vector3(), losDir = new THREE.Vector3();
const losRay = new THREE.Raycaster(), pBox = new THREE.Box3();
function clearLine(a, c) { // nothing solid between two points (crates block, the see-through fence doesn't)
  losDir.subVectors(c, a); const d = losDir.length(); if (d < .01) return true;
  losRay.set(a, losDir.divideScalar(d)); losRay.far = d;
  return !losRay.intersectObjects(crateMeshes, false).length;
}
// shot tracers: a quick yellow streak so you can see where the bot's bullets went
const tracers = [];
function tracer(a, c) {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, c]), new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true }));
  scene.add(l); tracers.push({ l, t: .08 });
}
// sniper bots show a red laser while they line up a shot. Move when you see it!
const laser = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3)),
  new THREE.LineBasicMaterial({ color: 0xff2222, transparent: true }));
laser.frustumCulled = false; laser.visible = false; scene.add(laser);
function setLaser(a, c, op) {
  const p = laser.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, c.x, c.y, c.z); p.needsUpdate = true;
  laser.material.opacity = op; laser.visible = true;
}
const aimDir = (yaw, pitch, out) => out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));

function botFire(b, W, dist) {
  b.ammo--; b.muzzle = .05;
  if (W.auto) { b.cd = W.rate; if (--b.burst <= 0) { b.burst = 4 + (Math.random() * 6 | 0); b.cd = .35 + Math.random() * .35; } } // fires in bursts
  else b.cd = W.rate * 1.5 + Math.random() * .15; // semi-auto guns: a bit slower than you can click
  if (W.scope) b.aimT = 0; // has to line up the next sniper shot from scratch
  if (b.ammo <= 0) b.reload = W.reload * 1.2;
  shotSound(W.vol * Math.max(.15, 1 - dist / 45), .15, W.cut);
  b.tip.getWorldPosition(muz);
  pBox.min.set(P.pos.x - .35, P.pos.y, P.pos.z - .35); pBox.max.set(P.pos.x + .35, P.pos.y + 1.85, P.pos.z + .35);
  // the sniper's listed spread is its unscoped hip-fire, but the bot lines up its shots, so it gets a tighter cone
  const err = BOT.aimErr + W.spread * (W.scope ? .1 : .8), walls = [ground, ...crateMeshes];
  for (let i = 0; i < W.pellets; i++) {
    const wob = () => (Math.random() + Math.random() - 1) * err;
    aimDir(b.aimYaw + wob(), b.aimPitch + wob(), dirV);
    losRay.set(eye, dirV); losRay.far = 90;
    const wall = losRay.intersectObjects(walls, false)[0];
    const onYou = losRay.ray.intersectBox(pBox, hitV), youD = onYou ? eye.distanceTo(hitV) : Infinity;
    let end;
    if (onYou && (!wall || wall.distance > youD) && !dead) {
      const head = hitV.y > P.pos.y + 1.45;
      hurtPlayer(Math.max(1, Math.round(W.dmg * BOT.dmgMul * (head ? 1.5 : 1))));
      end = hitV;
    } else if (wall) { end = wall.point; burst(wall.point, 0x999999, 2); }
    else end = hitV.copy(eye).addScaledVector(dirV, 90);
    if (i < 3) tracer(muz, end); // a shotgun blast only draws 3 of its pellets
  }
}

function updateBot(b, dt) {
  const W = BASE[b.gun], keep = BOT_GUNS[b.gun], pos = b.g.position, sniper = !!W.scope;
  eye.set(pos.x, 1.6, pos.z);
  const dx = P.pos.x - pos.x, dz = P.pos.z - pos.z, dist = Math.hypot(dx, dz) || .001;
  const sees = !dead && (clearLine(eye, aimV.set(P.pos.x, P.pos.y + 1.1, P.pos.z)) || clearLine(eye, camera.position));
  b.seeT = sees ? b.seeT + dt : 0;

  // aim: turns toward your chest and leads you a little, but lags behind. Changing direction makes it miss.
  if (dt > 0) { b.pvx += ((P.pos.x - b.lpx) / dt - b.pvx) * Math.min(1, dt * 8); b.pvz += ((P.pos.z - b.lpz) / dt - b.pvz) * Math.min(1, dt * 8); }
  b.lpx = P.pos.x; b.lpz = P.pos.z;
  const tx = dx + b.pvx * BOT.lead, tz = dz + b.pvz * BOT.lead;
  const wantYaw = Math.atan2(tx, tz), wantPitch = Math.atan2(P.pos.y + 1.1 - 1.6, Math.hypot(tx, tz)), k = Math.min(1, dt * BOT.turn);
  b.aimYaw += Math.atan2(Math.sin(wantYaw - b.aimYaw), Math.cos(wantYaw - b.aimYaw)) * k;
  b.aimPitch += (wantPitch - b.aimPitch) * k;
  b.g.rotation.y = b.aimYaw; b.head.rotation.x = -b.aimPitch;

  // shooting
  b.cd -= dt; b.muzzle -= dt; b.flashM.visible = b.muzzle > 0;
  if (b.reload > 0 && (b.reload -= dt) <= 0) b.ammo = W.mag;
  const ready = sees && b.seeT >= BOT.react && b.reload <= 0;
  b.aimT = ready && sniper ? b.aimT + dt : 0;
  laser.visible = false;
  if (b.aimT > 0) { b.tip.getWorldPosition(muz); setLaser(muz, aimV.copy(eye).addScaledVector(aimDir(b.aimYaw, b.aimPitch, dirV), dist + 2), .25 + .6 * Math.min(1, b.aimT / SNIPE_T)); }
  if (ready && b.cd <= 0 && (!sniper || b.aimT >= SNIPE_T)) botFire(b, W, dist);

  // moving: keep the distance its gun likes, strafe side to side while fighting, come looking when it can't see you
  let radial = 1, side = 0;
  if (sees) {
    radial = dist > keep[1] ? 1 : dist < keep[0] ? -1 : 0;
    if (b.reload > 0 && dist < keep[1] + 4) radial = -1; // backs off while it reloads
    if ((b.strafeT -= dt) <= 0) { b.strafeT = .4 + Math.random() * 1.1; b.strafe = Math.random() < .15 ? 0 : Math.random() < .5 ? -1 : 1; }
    side = b.strafe * (sniper && b.aimT > 0 ? .3 : 1); // a sniper holds fairly still while lining up
  }
  if (dist < 1.5) radial = -1;
  if (b.detour > 0) { b.detour -= dt; side = b.detourDir; radial *= .3; } // stuck on a crate: sidestep around it
  const ux = dx / dist, uz = dz / dist;
  let mx = ux * radial + uz * side, mz = uz * radial - ux * side;
  const ml = Math.hypot(mx, mz);
  if (ml > .05) {
    const s = BOT.speed * dt / ml; mx *= s; mz *= s;
    const ox = pos.x, oz = pos.z; let bump = false;
    if (!blocked(pos.x + mx, pos.z, b.r, 0)) pos.x += mx; else bump = true;
    if (!blocked(pos.x, pos.z + mz, b.r, 0)) pos.z += mz; else bump = true;
    if (bump && sees) b.strafe = -b.strafe; // strafed into a crate: go the other way
    if (Math.hypot(pos.x - ox, pos.z - oz) < BOT.speed * dt * .3 && b.detour <= 0) { b.detour = .5 + Math.random() * .4; b.detourDir = Math.random() < .5 ? -1 : 1; }
    b.t += dt * BOT.speed * 2.2;
    b.pivL.rotation.x = Math.sin(b.t) * .6; b.pivR.rotation.x = -Math.sin(b.t) * .6;
  } else { b.pivL.rotation.x *= .8; b.pivR.rotation.x *= .8; }

  // red flash when hit, orange flicker when burning
  b.flash -= dt;
  const e = b.flash > 0 ? 0x880000 : b.burn > 0 ? (Math.sin(performance.now() * .03) > 0 ? 0x993300 : 0x441100) : 0;
  b.mats.forEach(m => m.emissive.setHex(e));
}

// ---------- mode setup and per-frame upkeep ----------
let botWait = 0;
function updateDM(dt) {
  if (!zombies.some(z => z.type === 'bot') && (botWait -= dt) <= 0) { spawnBot(); botWait = BOT.respawn; } // respawns a bit after its body falls
  if (!zombies.some(z => z.type === 'bot' && !z.dead)) laser.visible = false;
}
function updateTracers(dt) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i]; t.t -= dt; t.l.material.opacity = Math.max(0, t.t / .08);
    if (t.t <= 0) { scene.remove(t.l); t.l.geometry.dispose(); t.l.material.dispose(); tracers.splice(i, 1); }
  }
}
// called at the end of restart(): sets up whichever mode you picked in the lobby
function setupMode() {
  tracers.forEach(t => scene.remove(t.l)); tracers.length = 0; laser.visible = false; botWait = 1.5;
  if (mode === 'dm') { // no shop here, so you start with a loadout: rifle + shotgun (primary), sniper, pistol, knife
    for (const g of [1, 2, 3]) { owned[g] = true; reserve[g] = resMax(g); }
    slotGun[slotOf(2)] = 2; slotGun[slotOf(3)] = 3;
    cur = 2; buildGun(); renderHotbar();
  }
  const tips = mode === 'dm'
    ? ['Kill the bot as many times as you can before it gets you', 'It respawns with a random gun. Sniper bots show a red laser before they fire']
    : ['Kill zombies for coins, then spend them in the shop after each wave', 'Grab health, ammo and armor pickups from the pads around the map'];
  $('tip1').textContent = tips[0]; $('tip2').textContent = tips[1];
}
