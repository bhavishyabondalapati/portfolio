/* ======================================================= the Boston world
   Night on the Charles. The Esplanade bank is the near ground, a granite
   seawall and railing hold its edge, the river runs through the middle
   distance, and Back Bay stands across the water: a row of brownstones, then
   towers. Everything here is generic architecture drawn in code; nothing is a
   named building, a sign or a logo. The water reflects the city two ways: a
   dim mirrored copy of it below the surface, and long broken light streaks. */
const SEASON  = qs('season', 'snow') === 'autumn' ? 'autumn' : 'snow';
const BANK_Z  = -4.6;            /* the seawall's river face            */
const WATER_Y = -1.25;           /* the Charles, below the bank         */
const SHORE_Z = -60;             /* the far bank                        */
WORLD.city = null;               /* everything the river mirrors        */
WORLD.streaks = [];              /* light streaks on the water          */
WORLD.windowMats = [];           /* lit facades, dimmed at dawn         */
WORLD.dawn = 0;

/* a facade of windows: dark frame, scattered warm lights, a few cool ones */
function texWindows(seed, cols, rows, litP, cool) {
  const cw = 16, ch = 22, W = cols * cw, H = rows * ch, c = cvs(W, H), x = c.getContext('2d');
  const rnd = mulberry32(seed);
  x.fillStyle = cool ? 'rgb(6,10,17)' : 'rgb(10,8,8)'; x.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++) {
    /* whole floors go dark or light together more often than single rooms */
    const floor = rnd() < .22 ? 0 : rnd() < .2 ? 1.6 : 1;
    for (let k = 0; k < cols; k++) {
      const lit = rnd() < litP * floor;
      const v = .55 + rnd() * .45;
      if (lit) {
        const warm = !cool || rnd() < .45;
        x.fillStyle = warm ? `rgb(${255 * v | 0},${178 * v | 0},${92 * v | 0})` : `rgb(${200 * v | 0},${214 * v | 0},${235 * v | 0})`;
      } else x.fillStyle = cool ? `rgba(18,28,42,${.55 + rnd() * .3})` : `rgba(22,17,16,${.6 + rnd() * .3})`;
      x.fillRect(k * cw + 4, r * ch + 5, cw - 8, ch - 9);
    }
  }
  return c;
}

/* map a box's six faces onto window cells of about cell x cell2 world units */
function boxUV(geo, w, h, d, cell, cell2) {
  const uv = geo.attributes.uv;
  /* BoxGeometry faces, four vertices each: +x, -x, +y, -y, +z, -z */
  const span = [[d, h], [d, h], [0, 0], [0, 0], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v, s = span[f];
    if (!s[0]) uv.setXY(i, .001, .999);         /* roofs read as the dark frame */
    else uv.setXY(i, uv.getX(i) * s[0] / cell, uv.getY(i) * s[1] / cell2);
  }
  uv.needsUpdate = true;
  return geo;
}

function facadeMat(seed, cool, litP, gain) {
  const t = tx(texWindows(seed, 16, 44, litP, cool), { wrap: THREE.RepeatWrapping, aniso: 8 });
  t.repeat.set(1 / 16, 1 / 44);
  const m = new THREE.MeshBasicMaterial({ map: t, color: hdr(gain, gain * .96, gain * .92), fog: true });
  m.userData.gain = gain;
  WORLD.windowMats.push(m);
  return m;
}

/* the night sky over the city: navy above, the city's own glow low down */
function texCitySky() {
  const W = 512, H = 512, c = cvs(W, H), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgb(7,14,32)'); g.addColorStop(.42, 'rgb(13,28,56)');
  g.addColorStop(.74, 'rgb(30,42,74)'); g.addColorStop(.9, 'rgb(78,58,66)');
  g.addColorStop(1, 'rgb(30,30,44)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.globalAlpha = .22; x.globalCompositeOperation = 'overlay';
  x.drawImage(fbmCanvas(W, H, 512, 5, 3, .9), 0, 0);
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  const rnd = mulberry32(882);
  for (let i = 0; i < 260; i++) {
    const sx = rnd() * W, sy = rnd() * H * .6, r = .4 + rnd() * rnd() * 1.4;
    x.fillStyle = 'rgba(222,230,244,' + (.10 + rnd() * .36) * (1 - sy / (H * .6)) + ')';
    x.beginPath(); x.arc(sx, sy, r, 0, TAU); x.fill();
  }
  return c;
}
/* the same sky at first light: steel blue above, rose at the horizon */
function texDawnSky() {
  const W = 256, H = 512, c = cvs(W, H), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgb(46,66,98)'); g.addColorStop(.5, 'rgb(118,124,150)');
  g.addColorStop(.8, 'rgb(231,160,140)'); g.addColorStop(.92, 'rgb(246,196,158)');
  g.addColorStop(1, 'rgb(150,120,128)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  return c;
}

/* a broken vertical light streak, as city lights lie on moving water */
function texStreak(seed) {
  const W = 64, H = 512, c = cvs(W, H), x = c.getContext('2d');
  const rnd = mulberry32(seed);
  for (let i = 0; i < 150; i++) {
    const y = rnd() * H, w = (.25 + rnd() * .75) * W * (.4 + .6 * (y / H)), h = 1 + rnd() * 4;
    const a = (.25 + rnd() * .75) * Math.sin(Math.PI * y / H);
    x.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
    x.fillRect((W - w) / 2 + (rnd() - .5) * W * .25, y, w, h);
  }
  return c;
}

function buildBank() {
  /* the sky, and first light hung just in front of it */
  /* the backdrop stops at the waterline: below it the river must be dark, not sky seen through water */
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(520, 190),
    new THREE.MeshBasicMaterial({ color: hdr(.95, 1.0, 1.08), map: tx(texCitySky()), depthWrite: false, fog: false, toneMapped: false }));
  sky.position.set(0, WATER_Y + 95, -150); sky.renderOrder = 0; scene.add(sky); WORLD.sky = sky;
  const dawn = new THREE.Mesh(new THREE.PlaneGeometry(520, 190),
    new THREE.MeshBasicMaterial({ map: tx(texDawnSky()), transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false }));
  dawn.position.set(0, WATER_Y + 95, -149); dawn.renderOrder = 0; scene.add(dawn); WORLD.dawnSky = dawn;

  /* the Esplanade: the bank runs from the seawall back past the camera */
  const fT = texFloor();
  const bankMat = new THREE.MeshStandardMaterial({
    map: tx(fT.map, { wrap: THREE.RepeatWrapping, repeat: [10, 4], aniso: 16 }),
    normalMap: tx(fT.normal, { wrap: THREE.RepeatWrapping, repeat: [10, 4], srgb: false, aniso: 16 }),
    normalScale: new THREE.Vector2(.25, .25), roughness: .86, metalness: .02, color: 0x4a5652
  });
  const bank = new THREE.Mesh(new THREE.PlaneGeometry(220, 64), bankMat);
  bank.rotation.x = -Math.PI / 2; bank.position.set(0, 0, BANK_Z + 32); bank.receiveShadow = true;
  scene.add(bank); WORLD.floor = bank;

  /* the granite seawall and its coping, then the railing along the top */
  const granite = surface(lib('granite', () => texStone(17)), [40, 1], { color: 0x76808a, metalness: 0, normal: 1.3 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(220, -WATER_Y + .25, 1.2), granite);
  wall.position.set(0, (WATER_Y - .25) / 2 + .05, BANK_Z + .6); wall.receiveShadow = true; scene.add(wall);
  const cope = new THREE.Mesh(new THREE.BoxGeometry(220, .2, 1.5), granite);
  cope.position.set(0, .1, BANK_Z + .7); cope.receiveShadow = true; scene.add(cope);
  const iron = new THREE.MeshStandardMaterial({ color: 0x15211c, roughness: .55, metalness: .45 });
  const bars = [];
  for (let px = -80; px <= 80; px += 2.4) bars.push(new THREE.CylinderGeometry(.045, .05, 1.05, 8).translate(px, .72, BANK_Z + .9));
  [.62, 1.22].forEach(y => bars.push(new THREE.CylinderGeometry(.035, .035, 160, 8).rotateZ(Math.PI / 2).translate(0, y, BANK_Z + .9)));
  const rail = new THREE.Mesh(mergeGeos(bars), iron); rail.castShadow = true; scene.add(rail);

  /* the river: see-through near the bank, more reflective toward the far shore */
  const ac = cvs(8, 256), ax = ac.getContext('2d'), ag = ax.createLinearGradient(0, 256, 0, 0);
  ag.addColorStop(0, 'rgb(238,238,238)'); ag.addColorStop(1, 'rgb(150,150,150)');
  ax.fillStyle = ag; ax.fillRect(0, 0, 8, 256);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(420, -SHORE_Z + BANK_Z + 4),
    new THREE.MeshBasicMaterial({ color: 0x040a13, transparent: true, opacity: 1, alphaMap: tx(ac, { srgb: false }), depthWrite: false, fog: true }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, WATER_Y, (BANK_Z + SHORE_Z) / 2 - 2); water.renderOrder = 3;
  scene.add(water); WORLD.water = water;
}

/* Back Bay across the water: the far embankment, a brownstone row, towers */
const TOWERS = [
  /* x     z    w    d    h    kind */
  [-44, -120, 7, 6, 8, 'b'], [-36, -116, 7, 6, 11, 'b'], [-28, -112, 6, 6, 14, 'b'],
  [-19, -120, 7, 6, 18, 'b'], [-10, -113, 5, 5, 12, 'b'], [-2, -122, 8, 4.5, 25, 'glass'],
  [8, -118, 7, 7, 21, 'crown'], [15.5, -111, 5.5, 5.5, 11, 'b'], [22, -121, 7, 6, 16, 'b'],
  [30, -115, 6, 6, 9, 'b'], [38, -119, 7, 6, 13, 'b'], [47, -113, 6, 6, 7, 'b']
];
function buildCity() {
  const city = new THREE.Group();
  /* the far embankment and its treeline */
  const shore = new THREE.Mesh(new THREE.BoxGeometry(420, 1.6, 6), new THREE.MeshBasicMaterial({ color: 0x070b12, fog: true }));
  shore.position.set(0, WATER_Y + .55, SHORE_Z - 3); city.add(shore);
  const trees = new THREE.Mesh(new THREE.PlaneGeometry(260, 7),
    new THREE.MeshBasicMaterial({ map: tx(texRidge()), transparent: true, color: 0x0a0f17, depthWrite: false, fog: true }));
  trees.position.set(0, WATER_Y + 3.4, SHORE_Z - 2.5); trees.renderOrder = 1; city.add(trees);
  /* the road lamps along the far bank, a dotted line just above the water */
  const dc = cvs(1024, 16), dx = dc.getContext('2d');
  for (let i = 0; i < 64; i++) { const gx = dx.createRadialGradient(i * 16 + 8, 8, 0, i * 16 + 8, 8, 6); gx.addColorStop(0, 'rgba(255,206,140,1)'); gx.addColorStop(1, 'rgba(255,160,80,0)'); dx.fillStyle = gx; dx.fillRect(i * 16, 0, 16, 16); }
  const dots = new THREE.Mesh(new THREE.PlaneGeometry(200, .3),
    new THREE.MeshBasicMaterial({ map: tx(dc), color: hdr(1.25, 1.1, .95), transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  dots.position.set(0, WATER_Y + 1.5, SHORE_Z - .2); dots.renderOrder = 2; city.add(dots);

  /* the brownstone row: bays of slightly different heights, warm windows */
  const rowMat = facadeMat(41, false, .34, 1.55), rowGeos = [];
  const rnd = mulberry32(19);
  for (let x0 = -90; x0 < 90;) {
    const w = 2.4 + rnd() * 1.3, h = 3.4 + rnd() * 2.2, d = 4;
    rowGeos.push(boxUV(new THREE.BoxGeometry(w, h, d), w, h, d, 1.2, 1.3).translate(x0 + w / 2, WATER_Y + 1.3 + h / 2, -80));
    x0 += w + .04;
  }
  city.add(new THREE.Mesh(mergeGeos(rowGeos), rowMat));

  /* the towers */
  const warm = facadeMat(7, false, .26, 1.7), cool = facadeMat(11, true, .18, 1.55);
  const geosW = [], geosC = [];
  const base = WATER_Y + 1.3;
  TOWERS.forEach(t => {
    const [x, z, w, d, h, kind] = t;
    const list = kind === 'glass' ? geosC : geosW;
    list.push(boxUV(new THREE.BoxGeometry(w, h, d), w, h, d, 1.1, 1.45).translate(x, base + h / 2, z));
    if (kind === 'crown') {
      /* a set-back crown and a thin mast with a slow red aircraft light */
      list.push(boxUV(new THREE.BoxGeometry(w * .62, 3, d * .62), w * .62, 3, d * .62, 1.1, 1.45).translate(x, base + h + 1.5, z));
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(.07, .12, 6, 6), new THREE.MeshBasicMaterial({ color: 0x11161e, fog: true }));
      mast.position.set(x, base + h + 6, z); city.add(mast);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8),
        new THREE.MeshBasicMaterial({ color: hdr(3.2, .25, .2), transparent: true, fog: false, toneMapped: false }));
      beacon.position.set(x, base + h + 9.1, z); city.add(beacon); WORLD.beacon = beacon;
    }
  });
  city.add(new THREE.Mesh(mergeGeos(geosW), warm));
  city.add(new THREE.Mesh(mergeGeos(geosC), cool));
  /* the city's glow lit from below the fog, so the towers' feet do not go black */
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(200, 26),
    new THREE.MeshBasicMaterial({ map: tx(texGlow('rgba(255,170,110,.55)', 'rgba(120,80,90,.16)')),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: .22 }));
  glow.position.set(0, base + 4, SHORE_Z - 14); glow.renderOrder = 1; glow.name = 'noReflect'; city.add(glow); WORLD.cityGlow = glow;
  scene.add(city); WORLD.city = city;
}

/* the river's reflections: a dim mirrored city below the surface, which ripples, then streaks */
function buildReflections() {
  const dimmed = new Map();
  const mirror = WORLD.city.clone();
  mirror.scale.y = -1; mirror.position.y = 2 * WATER_Y;
  /* glows and the moon disc do not mirror: on moving water the moon is a broken streak, not a second disc */
  mirror.traverse(o => { if (o.name === 'noReflect') o.visible = false; });
  mirror.traverse(o => {
    if (!o.material) return;
    if (!dimmed.has(o.material)) {
      const m = o.material.clone();
      m.side = THREE.DoubleSide;
      if (m.color) m.color.multiplyScalar(.55);
      if (m.userData.gain) m.userData.gain *= .55;
      if (m.opacity !== undefined && m.transparent) m.opacity *= .5;
      m.onBeforeCompile = sh => {
        sh.uniforms.uT = WORLD.uT;
        sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\n' +
          'vec4 wq = modelMatrix * vec4(transformed, 1.0);\n' +
          'float dep = max(0.0, ' + WATER_Y.toFixed(2) + ' - wq.y);\n' +
          'transformed.x += sin(wq.y * 2.1 + uT * 1.4 + wq.x * .3) * min(dep * .05, .6);\n');
      };
      if (WORLD.windowMats.includes(o.material)) WORLD.windowMats.push(m);
      dimmed.set(o.material, m);
    }
    o.material = dimmed.get(o.material);
  });
  mirror.renderOrder = -1;
  scene.add(mirror); WORLD.mirror = mirror;

  /* streaks: under each tower's lit faces, the far road lamps, and the moon */
  const texs = [tx(texStreak(5)), tx(texStreak(6)), tx(texStreak(7))];
  texs.forEach(t => { t.wrapT = THREE.RepeatWrapping; });
  const streak = (x, z0, z1, w, col, op, k) => {
    const len = z0 - z1;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len),
      new THREE.MeshBasicMaterial({ map: texs[Math.abs(Math.round(k)) % 3], color: col, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, fog: true, opacity: op }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, WATER_Y + .02, (z0 + z1) / 2); m.renderOrder = 4;
    m.userData = { op: op, ph: k * 1.7 };
    scene.add(m); WORLD.streaks.push(m);
  };
  TOWERS.forEach((t, i) => streak(t[0] + (i % 2 ? .6 : -.4), SHORE_Z - .5, -14 - (i % 3) * 4, t[2] * .55, hdr(1.5, 1.0, .55), .28, i));
  for (let x = -60; x <= 60; x += 7.5) streak(x + 1.3, SHORE_Z - .3, SHORE_Z + 14, .5, hdr(1.4, 1.05, .6), .26, x + 99);
  /* the moon's path on the water, from the far bank toward the seawall */
  streak(MOON.x * .55, SHORE_Z - .5, -9, 5.5, hdr(1.25, 1.2, 1.05), .3, 4);
  WORLD.moonStreak = WORLD.streaks[WORLD.streaks.length - 1];
}

/* the moon: pale cream, high on the right, with a wide soft corona */
const MOON = { x: 30, y: 31, z: -135, r: 7.2 };
function buildMoon() {
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(MOON.r * 2, MOON.r * 2),
    new THREE.MeshBasicMaterial({ map: tx(texMoon()), color: hdr(2.05, 1.92, 1.68),
      transparent: true, depthWrite: false, fog: false, toneMapped: false }));
  disc.position.set(MOON.x, MOON.y, MOON.z); disc.renderOrder = 1; disc.name = 'noReflect';
  WORLD.city.add(disc); WORLD.moon = disc;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(MOON.r * 6.4, MOON.r * 6.4),
    new THREE.MeshBasicMaterial({ map: tx(texGlow('rgba(236,226,206,.85)', 'rgba(150,170,205,.22)')),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: .38 }));
  halo.position.set(MOON.x, MOON.y, MOON.z - .3); halo.renderOrder = 0; halo.name = 'noReflect';
  WORLD.city.add(halo); WORLD.moonHalo = halo;
}
function placeMoon() {
  if (!WORLD.moon) return;
  const x = MOON.x * (1 - .40 * aspectFix());
  WORLD.moon.position.x = x;
  WORLD.moonHalo.position.x = x;
}

/* a Beacon Hill style gas lamp: iron post and cross-bar, a four-sided glass
   lantern with a warm flame, a cap, and its halo and light */
function buildGasLamp(x, z, s) {
  const iron = lib('lampIron', () => new THREE.MeshStandardMaterial({ color: 0x101414, roughness: .5, metalness: .6 }));
  const g = new THREE.Group();
  const add = (geo, y, m) => { const k = new THREE.Mesh(geo, m || iron); k.position.y = y; k.castShadow = true; g.add(k); return k; };
  add(new THREE.CylinderGeometry(.16, .22, .34, 12), .17);
  add(new THREE.CylinderGeometry(.06, .085, 2.5, 10), 1.55);
  add(new THREE.BoxGeometry(.62, .05, .05), 2.42);
  add(new THREE.CylinderGeometry(.13, .08, .16, 8), 2.86);
  const glass = new THREE.MeshBasicMaterial({ color: hdr(2.6, 1.42, .55), fog: false, toneMapped: false });
  add(new THREE.CylinderGeometry(.27, .17, .62, 4, 1, true).rotateY(Math.PI / 4), 3.24, glass);
  [[.2, .2], [-.2, .2], [.2, -.2], [-.2, -.2]].forEach(p => {
    const b = add(new THREE.BoxGeometry(.03, .66, .03), 3.24); b.position.x = p[0] * .95; b.position.z = p[1] * .95;
  });
  add(new THREE.ConeGeometry(.38, .3, 4).rotateY(Math.PI / 4), 3.7);
  add(new THREE.SphereGeometry(.05, 8, 6), 3.9);
  WORLD.lampGlass = WORLD.lampGlass || glass;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6),
    new THREE.MeshBasicMaterial({ map: tx(texGlow('rgba(255,196,120,.95)', 'rgba(242,150,60,.26)')),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: .55 }));
  glow.position.y = 3.24; glow.renderOrder = 2; g.add(glow);
  const lt = new THREE.PointLight(0xffa64a, 2.6, 11, 2);
  lt.position.set(0, 3.24, 0); g.add(lt);
  WORLD.lanternLights = WORLD.lanternLights || []; WORLD.lanternLights.push(lt);
  WORLD.lanternGlows = WORLD.lanternGlows || []; WORLD.lanternGlows.push(glow);
  g.position.set(x, 0, z); g.scale.setScalar(s || 1);
  scene.add(g);
  WORLD.lamps = WORLD.lamps || []; WORLD.lamps.push(g);
  return g;
}

/* an American elm: a tall trunk that opens into a vase of arching limbs.
   In snow it carries only a few last leaves; in autumn, a full amber crown. */
function buildElm(seed, x, z, scale) {
  const rnd = mulberry32(seed);
  const parts = [], tips = [];
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3(), pos = new THREE.Vector3();
  function seg(from, to, r0, r1) {
    dir.subVectors(to, from);
    const len = dir.length(); dir.normalize();
    const geo = new THREE.CylinderGeometry(r1, r0, len, 6, 1, true);
    Q.setFromUnitVectors(UP, dir);
    pos.addVectors(from, to).multiplyScalar(.5);
    M.compose(pos, Q, new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(M);
    parts.push(geo);
  }
  function branch(from, dirV, len, rad, depth) {
    const to = from.clone().addScaledVector(dirV, len);
    seg(from, to, rad, rad * .7);
    if (depth >= 4 || len < .3) { tips.push(to.clone()); return; }
    const n = depth < 2 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const d = dirV.clone();
      /* the vase: limbs keep climbing near the trunk and arch outward late */
      d.x += (rnd() - .5) * (.6 + depth * .35); d.z += (rnd() - .5) * (.6 + depth * .35);
      d.y += depth < 2 ? .55 : -.05 + rnd() * .2;
      d.normalize();
      branch(to, d, len * (.68 + rnd() * .14), rad * .68, depth + 1);
    }
  }
  const root = new THREE.Vector3(0, 0, 0), fork = new THREE.Vector3(0, 2.6, 0);
  seg(root, fork, .26, .2);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + rnd();
    branch(fork, new THREE.Vector3(Math.cos(a) * .45, 1, Math.sin(a) * .45).normalize(), 1.7, .17, 0);
  }
  const trunk = new THREE.Mesh(mergeGeos(parts),
    new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: .94, metalness: 0, side: THREE.DoubleSide }));
  trunk.castShadow = true;
  const per = SEASON === 'snow' ? (LOW ? 1 : 2) : (LOW ? 5 : 8);
  const leafMat = new THREE.MeshStandardMaterial({
    map: tx(texLeaf()), color: 0x5a3a12, alphaTest: .42, side: THREE.DoubleSide,
    roughness: .86, metalness: 0, emissive: 0x2a1404, emissiveIntensity: .35
  });
  const inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(.34, .34), leafMat, tips.length * per);
  const m4 = new THREE.Matrix4(), e = new THREE.Euler(), q2 = new THREE.Quaternion(), sc = new THREE.Vector3();
  let k = 0;
  tips.forEach(t => {
    for (let i = 0; i < per; i++) {
      const p = new THREE.Vector3(t.x + (rnd() - .5) * .9, t.y + (rnd() - .5) * .7, t.z + (rnd() - .5) * .9);
      e.set(rnd() * TAU, rnd() * TAU, rnd() * TAU); q2.setFromEuler(e);
      const s = .7 + rnd() * .7; sc.set(s, s, s);
      m4.compose(p, q2, sc); inst.setMatrixAt(k++, m4);
    }
  });
  inst.instanceMatrix.needsUpdate = true; inst.frustumCulled = false;
  const g = new THREE.Group();
  g.add(trunk); g.add(inst);
  g.position.set(x, 0, z); g.scale.setScalar(scale || 1); g.rotation.y = rnd() * TAU;
  scene.add(g);
  return g;
}

/* granite riprap at the foot of the seawall, half in the water */
function buildRiprap() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x2e363b, roughness: .5, metalness: .08 });
  const rnd = mulberry32(405), n = noise2D(89);
  for (let i = 0; i < 26; i++) {
    const r = .45 + rnd() * .55;
    const geo = new THREE.IcosahedronGeometry(r, 2), p = geo.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const vx = p.getX(v), vy = p.getY(v), vz = p.getZ(v);
      const d = 1 + .3 * fbm(n, vx * 1.6 + i * 7, vz * 1.6 + vy, 3, 2.2, .5);
      p.setXYZ(v, vx * d, vy * d * .7, vz * d);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.position.set(-36 + i * 2.85 + (rnd() - .5) * 1.4, WATER_Y + r * .25, BANK_Z - .4 - rnd() * .9);
    m.rotation.set(rnd(), rnd() * TAU, rnd() * .4);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }
}

/* moonlight from high on the right, the city's warm glow low across the water */
function buildLights() {
  scene.add(new THREE.HemisphereLight(0x35609a, 0x05080d, .19));
  const key = new THREE.DirectionalLight(0xbcd0f2, .95);
  key.position.set(14, 24, -10);
  key.target.position.set(0, 1.5, -6); scene.add(key.target);
  if (WANT_SHADOW) {
    key.castShadow = true;
    const S = LOW ? 1024 : 2048;
    key.shadow.mapSize.set(S, S);
    const c = key.shadow.camera;
    c.left = -30; c.right = 30; c.top = 26; c.bottom = -16; c.near = 3; c.far = 70;
    key.shadow.bias = -0.0012; key.shadow.normalBias = .035; key.shadow.radius = 2.2;
  }
  scene.add(key); WORLD.key = key;
  const rim = new THREE.DirectionalLight(0xffe2bc, .35);
  rim.position.set(26, 30, -60); rim.target.position.set(0, 4, -20); scene.add(rim.target); scene.add(rim);
  WORLD.rim = rim;
  const city = new THREE.PointLight(0xffb46a, 2.2, 90, 2);
  city.position.set(0, 6, -48); scene.add(city); WORLD.cityLight = city;
  const fill = new THREE.PointLight(0x7f9fd2, .8, 34, 2);
  fill.position.set(-2, 11, 4); scene.add(fill);
}

/* snow in the dark, or the last leaves of autumn */
function texFlake() {
  const c = cvs(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return c;
}
function buildLeafFall() {
  const snow = SEASON === 'snow';
  const N = snow ? (LOW ? 320 : 720) : (LOW ? 110 : 260);
  const mat = snow
    ? new THREE.MeshBasicMaterial({ map: tx(texFlake()), color: hdr(.92, .96, 1.04), transparent: true, depthWrite: false, fog: true, opacity: .7 })
    : new THREE.MeshStandardMaterial({ map: tx(texLeaf()), alphaTest: .42, side: THREE.DoubleSide,
        color: 0x4a2408, roughness: .84, metalness: 0, emissive: 0x6a3006, emissiveIntensity: .6 });
  const inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(snow ? .085 : .40, snow ? .085 : .40), mat, N);
  inst.frustumCulled = false; inst.renderOrder = 5;
  inst.castShadow = inst.receiveShadow = false;
  const rnd = mulberry32(404), list = [];
  for (let i = 0; i < N; i++) list.push({
    x: (rnd() - .5) * 2 * LEAF_R, z: (rnd() - .5) * 2 * LEAF_R, y: rnd() * 26,
    fall: snow ? .4 + rnd() * .5 : .5 + rnd() * .9,
    sway: snow ? .3 + rnd() * .7 : .45 + rnd() * 1.5, swayPh: rnd() * TAU, swayAmp: snow ? .15 + rnd() * .45 : .30 + rnd() * .95,
    spin: (rnd() - .5) * 2.6, roll: rnd() * TAU, rollSp: .5 + rnd() * 2.0,
    tilt: rnd() * TAU, s: snow ? .35 + rnd() * .65 : .55 + rnd() * .9
  });
  scene.add(inst);
  WORLD.leaves = { mesh: inst, list: list, snow: snow };
}
