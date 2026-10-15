const $ = id => document.getElementById(id);
const R = new THREE.WebGLRenderer({ antialias: true });
R.setSize(innerWidth, innerHeight);
R.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(R.domElement);

const S = new THREE.Scene();
S.background = new THREE.Color(0x1a1f4a);
S.fog = new THREE.Fog(0x1a1f4a, 35, 130);

const cam = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, .1, 250);
cam.position.set(0, 4.6, 7.5);
cam.lookAt(0, 1.5, -8);

S.add(new THREE.HemisphereLight(0xaab8ff, 0x334, 1));
const sun = new THREE.DirectionalLight(0xffffff, .7);
sun.position.set(5, 12, 8);
S.add(sun);

const rim = new THREE.PointLight(0x88aaff, 1.2, 14);
S.add(rim);

const moon = new THREE.Mesh(new THREE.SphereGeometry(8, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false }));
moon.position.set(-40, 45, -150);
S.add(moon);

// chão
const gc = document.createElement('canvas');
gc.width = gc.height = 128;
const g = gc.getContext('2d');
g.fillStyle = '#3b4268';
g.fillRect(0, 0, 128, 128);
g.fillStyle = '#4a5280';
g.fillRect(0, 0, 128, 6);
g.fillStyle = '#8f98c8';
g.fillRect(41, 16, 3, 40);
g.fillRect(85, 16, 3, 40);
g.fillRect(41, 80, 3, 40);
g.fillRect(85, 80, 3, 40);

const gt = new THREE.CanvasTexture(gc);
gt.wrapS = gt.wrapT = THREE.RepeatWrapping;
gt.repeat.set(1, 28);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 224), new THREE.MeshLambertMaterial({ map: gt }));
ground.rotation.x = -Math.PI / 2;
ground.position.z = -90;
S.add(ground);

// prédios
const bc = document.createElement('canvas');
bc.width = 64;
bc.height = 128;
const b = bc.getContext('2d');
b.fillStyle = '#161a38';
b.fillRect(0, 0, 64, 128);
for (let y = 6; y < 124; y += 14) {
  for (let x = 6; x < 60; x += 14) {
    b.fillStyle = Math.random() < .4 ? '#ffd27a' : '#232850';
    b.fillRect(x, y, 7, 8);
  }
}

const bt = new THREE.CanvasTexture(bc);
bt.wrapS = bt.wrapT = THREE.RepeatWrapping;
const bm = new THREE.MeshLambertMaterial({ map: bt });
const blds = [];

for (let i = 0; i < 26; i++) {
  const side = i % 2 ? 1 : -1, h = 12 + Math.random() * 28, w = 5 + Math.random() * 3;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), bm);
  m.position.set(side * (9 + w / 2 + Math.random() * 3), h / 2 - 1, -200 + (i >> 1) * 18);
  S.add(m);
  blds.push(m);
}

// ninja
const blk = new THREE.MeshLambertMaterial({ color: 0x141416, emissive: 0x0a0a12 }),
      gry = new THREE.MeshLambertMaterial({ color: 0x2c2c36 }),
      skin = new THREE.MeshBasicMaterial({ color: 0xd9a77a });

const ninja = new THREE.Group();
S.add(ninja);

function box(w, h, d, m, x, y, z, p) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  (p || ninja).add(o);
  return o;
}

box(.72, .95, .42, blk, 0, 1.15, 0);
box(.76, .14, .46, gry, 0, .78, 0);

const head = new THREE.Mesh(new THREE.SphereGeometry(.31, 16, 12), blk);
head.position.y = 1.85;
ninja.add(head);

box(.44, .09, .05, skin, 0, 1.88, -.28);

const band = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .09, 16), gry);
band.position.y = 1.97;
ninja.add(band);

const tails = new THREE.Group();
tails.position.set(0, 1.97, .3);
ninja.add(tails);

box(.09, .05, .6, blk, -.07, 0, .3, tails);
box(.09, .05, .5, blk, .07, 0, .25, tails);

const kat = box(.07, 1.2, .07, gry, .15, 1.3, .28);
kat.rotation.z = .6;

function limb(x, y, len, w) {
  const p = new THREE.Group();
  p.position.set(x, y, 0);
  ninja.add(p);
  box(w, len, w, blk, 0, -len / 2, 0, p);
  return p;
}

const aL = limb(-.47, 1.55, .8, .2),
      aR = limb(.47, 1.55, .8, .2),
      lL = limb(-.18, .72, .75, .25),
      lR = limb(.18, .72, .75, .25);

// estado
let state = 'menu', phase = 1, speed = 10, dist = 0, coins = 0, lane = 0, px = 0, py = 0, vy = 0, slide = 0, nxt = 0, t = 0, best = 0, obs = [], cns = [];
try { best = +localStorage.getItem('nr_best') || 0 } catch (e) {}

const cg = new THREE.CylinderGeometry(.38, .38, .1, 16);
cg.rotateX(Math.PI / 2);
const cmat = new THREE.MeshLambertMaterial({ color: 0xffc83d, emissive: 0x8a6000 });
const red = new THREE.MeshLambertMaterial({ color: 0xc0392b }),
      wht = new THREE.MeshLambertMaterial({ color: 0xeeeeee }),
      trn = new THREE.MeshLambertMaterial({ color: 0x4b6a8a }),
      win = new THREE.MeshBasicMaterial({ color: 0xaee4ff });

function mkObs(l, z) {
  const g = new THREE.Group(), r = Math.random();
  let t, hl;
  if (r < .35 - Math.min(phase, 8) * .025) {
    t = 'low'; hl = .5;
    box(2.6, .9, .6, red, 0, .45, 0, g);
    box(2.6, .15, .62, wht, 0, .7, 0, g);
  } else if (r < .65 - Math.min(phase, 8) * .03) {
    t = 'high'; hl = .3;
    box(.22, 2.2, .22, gry, -1.2, 1.1, 0, g);
    box(.22, 2.2, .22, gry, 1.2, 1.1, 0, g);
    box(2.7, .55, .4, red, 0, 1.75, 0, g);
  } else {
    t = 'train'; hl = 5;
    box(2.5, 3.4, 10, trn, 0, 1.7, 0, g);
    box(2.1, .7, .1, win, 0, 2.4, -5.02, g);
    box(2.52, .4, 10.02, wht, 0, .9, 0, g);
  }
  g.position.set(l * 3, 0, z);
  S.add(g);
  obs.push({ m: g, l, z, hl, t });
}

function mkCoins(l, z) {
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(cg, cmat);
    c.position.set(l * 3, 1.2, z - i * 2.2);
    S.add(c);
    cns.push({ m: c, l, z: z - i * 2.2 });
  }
}

function spawn(z) {
  const free = Math.floor(Math.random() * 3) - 1;
  for (let l = -1; l <= 1; l++) {
    if (l === free) {
      if (Math.random() < .75) mkCoins(l, z);
    } else if (Math.random() < .7 + Math.min(phase, 8) * .035) {
      mkObs(l, z);
    }
  }
}

function clear(a) {
  a.forEach(o => S.remove(o.m));
  a.length = 0;
}

function setSky(p) {
  const c = new THREE.Color().setHSL((.64 + p * .11) % 1, .55, .17);
  S.background = c;
  S.fog.color = c;
  $('f').textContent = 'Fase ' + p;
}

function banner(p) {
  const e = $('bn');
  e.textContent = 'FASE ' + p + ' — mais rápido!';
  e.style.opacity = 1;
  setTimeout(() => e.style.opacity = 0, 1800);
}

function start() {
  clear(obs);
  clear(cns);
  state = 'play';
  speed = 18;
  dist = 0;
  coins = 0;
  phase = 1;
  setSky(1);
  lane = 0;
  px = 0;
  py = 0;
  vy = 0;
  slide = 0;
  nxt = 10;
  ninja.rotation.set(0, 0, 0);
  $('menu').style.display = 'none';
}

function over() {
  state = 'over';
  const d = Math.floor(dist);
  if (d > best) {
    best = d;
    try { localStorage.setItem('nr_best', d) } catch (e) {}
  }
  $('msg').innerHTML = `Você caiu! 💥<br>Fase ${phase} · <b>${d} m</b> · 🪙 ${coins}<br>Recorde: ${best} m`;
  $('go').textContent = 'Jogar de novo';$('menu').style.display = 'flex';
}

function move(d) {
  if (state === 'play') lane = Math.max(-1, Math.min(1, lane + d));
}

function jump() {
  if (state === 'play' && py <= .01) {
    vy = 12;
    slide = 0;
  }
}

function dive() {
  if (state === 'play') {
    slide = .7;
    if (py > .01) vy = -18;
  }
}

$('go').onclick = start;

addEventListener('keydown', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a') move(-1);
  else if (k === 'ArrowRight' || k === 'd') move(1);
  else if (k === 'ArrowUp' || k === 'w' || k === ' ') jump();
  else if (k === 'ArrowDown' || k === 's') dive();
  else if (k === 'Enter' && state !== 'play') start();
});

let sx, sy;
R.domElement.addEventListener('pointerdown', e => {
  sx = e.clientX;
  sy = e.clientY;
});

R.domElement.addEventListener('pointerup', e => {
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
  else dy < 0 ? jump() : dive();
});

addEventListener('resize', () => {
  R.setSize(innerWidth, innerHeight);
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
});

const clock = new THREE.Clock();

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), .05);
  t += dt;

  const sp = state === 'play' ? speed : state === 'over' ? 0 : 8;
  gt.offset.y += sp * dt / 8;
  blds.forEach(m => {
    m.position.z += sp * dt;
    if (m.position.z > 30) m.position.z -= 234;
  });

  if (state === 'play') {
    const np = 1 + Math.floor(dist / 500);
    if (np !== phase) {
      phase = np;
      setSky(phase);
      banner(phase);
    }
    speed = Math.min(60, 16 + phase * 3 + (dist % 500) * .004);
    dist += speed * dt;
    px += (lane * 3 - px) * Math.min(1, dt * 14);

    if (py > 0 || vy > 0) {
      vy -= 34 * dt;
      py = Math.max(0, py + vy * dt);
      if (py === 0) vy = 0;
    }
    if (slide > 0) slide -= dt;

    nxt -= speed * dt;
    if (nxt <= 0) {
      spawn(-140);
      nxt = Math.max(14, 26 - phase * 1.5) + Math.random() * Math.max(4, 10 - phase);
    }

    for (let i = obs.length - 1; i >= 0; i--) {
      const o = obs[i];
      o.z += speed * dt;
      o.m.position.z = o.z;
      if (o.z > o.hl + 12) {
        S.remove(o.m);
        obs.splice(i, 1);
        continue;
      }
      if (o.l === lane && Math.abs(o.z) < o.hl + .35 && Math.abs(px - o.l * 3) < 1.1) {
        if ((o.t === 'low' && py < .9) || (o.t === 'high' && slide <= 0) || (o.t === 'train' && py < 3.5)) {
          over();
        }
      }
    }

    for (let i = cns.length - 1; i >= 0; i--) {
      const c = cns[i];
      c.z += speed * dt;
      c.m.position.z = c.z;
      c.m.rotation.y += dt * 5;
      if (c.l === lane && Math.abs(c.z) < .9 && py < 2.4) {
        coins++;
        S.remove(c.m);
        cns.splice(i, 1);
        continue;
      }
      if (c.z > 12) {
        S.remove(c.m);
        cns.splice(i, 1);
      }
    }

    $('d').textContent = Math.floor(dist) + ' m';$('c').textContent = '🪙 ' + coins;
  }

  // ninja
  ninja.position.set(px, py, 0);
  if (state === 'over') {
    ninja.rotation.x = Math.min(ninja.rotation.x + dt * 6, -1.4);
    ninja.position.y = .2;
  } else {
    ninja.scale.y = slide > 0 ? .55 : 1;
    ninja.rotation.z = (lane * 3 - px) * -.08;
    const s = Math.sin(t * (8 + sp * .25)) * .9;
    if (py > .05) {
      aL.rotation.x = aR.rotation.x = -2.6;
      lL.rotation.x = -.6;
      lR.rotation.x = .5;
    } else if (slide > 0) {
      aL.rotation.x = aR.rotation.x = -.5;
      lL.rotation.x = -1.3;
      lR.rotation.x = -1.1;
    } else {
      aL.rotation.x = s;
      aR.rotation.x = -s;
      lL.rotation.x = -s;
      lR.rotation.x = s;
    }
  }

  tails.rotation.y = Math.sin(t * 12) * .35;
  tails.rotation.x = .15 + Math.sin(t * 9) * .1;
  rim.position.set(px, 5, 3);
  cam.position.x += (px * .6 - cam.position.x) * Math.min(1, dt * 6);
  R.render(S, cam);
}

loop();