import * as THREE from 'https://unpkg.com/three@0.162.0/build/three.module.js';

const ACTIVE_SKILLS = {
  k: { name: '震山掌（K）', desc: '對周圍造成範圍傷害', cost: 65, mpCost: 24, cooldown: 1.2 },
  l: { name: '金鐘護體（L）', desc: '短時間無敵', cost: 72, mpCost: 30, cooldown: 7.0 },
  colon: { name: '毒罡護身（:）', desc: '短時間使接觸你的敵人中毒', cost: 68, mpCost: 28, cooldown: 8.0 },
};

const state = {
  stage: 1,
  coins: 0,
  inShop: false,
  isBossStage: false,
  enemies: [],
  projectiles: [],
  slashEffects: [],
  skillEffects: [],
  potions: [],
  inventory: [],
  skills: {
    強體訣: { level: 0, max: 3, desc: '最大生命 +15/級', cost: 25 },
    凝神訣: { level: 0, max: 3, desc: '最大內力 +10/級', cost: 25 },
    神行訣: { level: 0, max: 3, desc: '氣回復 +15%/級', cost: 20 },
    破軍式: { level: 0, max: 3, desc: '普攻傷害 +20%/級', cost: 30 },
    玄門勁: { level: 0, max: 3, desc: '武學傷害 +25%/級', cost: 35 },
  },
  activeSkillOwnership: { k: false, l: false, colon: false },
  stats: {
    hpMax: 120,
    mpMax: 90,
    spMax: 110,
    hp: 120,
    mp: 90,
    sp: 110,
    attack: 18,
    skillPower: 32,
    defense: 4,
    crit: 0.08,
    spRegen: 26,
    moveSpeed: 8,
  },
};

const ui = {
  hpBar: document.getElementById('hpBar'),
  mpBar: document.getElementById('mpBar'),
  spBar: document.getElementById('spBar'),
  hpText: document.getElementById('hpText'),
  mpText: document.getElementById('mpText'),
  spText: document.getElementById('spText'),
  roundText: document.getElementById('roundText'),
  coinsText: document.getElementById('coinsText'),
  waveText: document.getElementById('waveText'),
  message: document.getElementById('message'),
  panel: document.getElementById('panel'),
  panelBtn: document.getElementById('panelBtn'),
  closePanel: document.getElementById('closePanel'),
  tabs: [...document.querySelectorAll('.tab')],
  skillsTab: document.getElementById('skills'),
  inventoryTab: document.getElementById('inventory'),
  statsTab: document.getElementById('stats'),
  shop: document.getElementById('shop'),
  shopTitle: document.getElementById('shopTitle'),
  shopDesc: document.getElementById('shopDesc'),
  shopItems: document.getElementById('shopItems'),
  continueBtn: document.getElementById('continueBtn'),
  restartBtn: document.getElementById('restartBtn'),
};

const keyState = {};
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keyState[key] = true;
  if (key === 'j') attack();
  if (key === 'k') useSkillK();
  if (key === 'l') useSkillL();
  if (key === ':' || key === ';') useSkillColon();
});
window.addEventListener('keyup', (e) => {
  keyState[e.key.toLowerCase()] = false;
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc7d6cd);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(26, 28, 26);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xfff3dc, 0x3d4d52, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0cc, 1.15);
sun.position.set(26, 42, 15);
scene.add(sun);

const floor = createFloor();
scene.add(floor);

const grid = new THREE.GridHelper(80, 26, 0x88aa9c, 0x6c877f);
grid.position.y = 0.015;
grid.material.opacity = 0.22;
grid.material.transparent = true;
scene.add(grid);

buildEnvironment(scene);

const player = createPlayer();
scene.add(player.root);

function createFloor() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(256, 256, 20, 256, 256, 320);
  gradient.addColorStop(0, '#a8ba94');
  gradient.addColorStop(1, '#7f9474');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = `rgba(76,97,66,${Math.random() * 0.2})`;
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 2.5 + 0.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const floorMesh = new THREE.Mesh(
    new THREE.CircleGeometry(40, 90),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0 })
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0.001;
  return floorMesh;
}

function buildEnvironment(targetScene) {
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x6d7f78, roughness: 1 });
  const bambooStemMat = new THREE.MeshStandardMaterial({ color: 0x56794f, roughness: 0.85 });
  const bambooLeafMat = new THREE.MeshStandardMaterial({ color: 0x7dab67, roughness: 0.88 });

  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(4 + Math.random() * 5, 8 + Math.random() * 10, 6), mountainMat);
    const angle = (i / 24) * Math.PI * 2;
    const radius = 45 + Math.random() * 8;
    m.position.set(Math.cos(angle) * radius, 4.5, Math.sin(angle) * radius);
    m.rotation.y = Math.random() * Math.PI;
    targetScene.add(m);
  }

  for (let i = 0; i < 38; i++) {
    const root = new THREE.Group();
    const px = (Math.random() - 0.5) * 72;
    const pz = (Math.random() - 0.5) * 72;
    if (Math.abs(px) < 10 && Math.abs(pz) < 10) continue;

    const stemCount = 3 + Math.floor(Math.random() * 3);
    for (let s = 0; s < stemCount; s++) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.8 + Math.random() * 2.6, 6), bambooStemMat);
      stem.position.set((Math.random() - 0.5) * 1.2, stem.geometry.parameters.height / 2, (Math.random() - 0.5) * 1.2);
      root.add(stem);

      for (let l = 0; l < 4; l++) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 1.2), bambooLeafMat);
        leaf.position.y = stem.position.y + 1 + l * 0.8;
        leaf.position.x = stem.position.x + (Math.random() - 0.5) * 0.6;
        leaf.rotation.y = Math.random() * Math.PI;
        leaf.rotation.z = (Math.random() - 0.5) * 0.8;
        root.add(leaf);
      }
    }

    root.position.set(px, 0, pz);
    targetScene.add(root);
  }

  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.45, 3.4),
    new THREE.MeshStandardMaterial({ color: 0x7b5a41, roughness: 0.96 })
  );
  bridge.position.set(-18, 0.24, -18);
  bridge.rotation.y = Math.PI / 4;
  targetScene.add(bridge);

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(8, 40),
    new THREE.MeshStandardMaterial({ color: 0x6ea7ba, roughness: 0.32, metalness: 0.06, transparent: true, opacity: 0.82 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-18, 0.03, -18);
  targetScene.add(water);
}

function createHumanoid(colorMain, colorAccent, withSword = false) {
  const root = new THREE.Group();
  const parts = {};

  const robeMat = new THREE.MeshStandardMaterial({ color: colorMain, roughness: 0.86 });
  const accentMat = new THREE.MeshStandardMaterial({ color: colorAccent, roughness: 0.84 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd6b08f, roughness: 0.75 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2a1d1d, roughness: 0.9 });

  const pelvis = new THREE.Group();
  root.add(pelvis);

  parts.torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.8), robeMat);
  parts.torso.position.y = 2.2;
  pelvis.add(parts.torso);

  parts.chestWrap = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.28, 0.86), accentMat);
  parts.chestWrap.position.set(0, 2.35, 0.01);
  pelvis.add(parts.chestWrap);

  parts.head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.62), skinMat);
  parts.head.position.y = 3.55;
  pelvis.add(parts.head);

  parts.hair = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.95, 0.68), hairMat);
  parts.hair.position.set(0, 3.62, -0.05);
  parts.hair.scale.z = 0.78;
  pelvis.add(parts.hair);

  parts.ponyTail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), hairMat);
  parts.ponyTail.position.set(0, 3.2, -0.48);
  pelvis.add(parts.ponyTail);

  const robeLower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.05, 1.25, 7), robeMat);
  robeLower.position.y = 1.18;
  pelvis.add(robeLower);

  parts.leftArm = createArm(skinMat, robeMat, -0.82, 2.4);
  parts.rightArm = createArm(skinMat, robeMat, 0.82, 2.4);
  parts.leftLeg = createLeg(robeMat, -0.33, 0.65);
  parts.rightLeg = createLeg(robeMat, 0.33, 0.65);
  pelvis.add(parts.leftArm.group, parts.rightArm.group, parts.leftLeg.group, parts.rightLeg.group);

  if (withSword) {
    const sword = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.35, 0.22), new THREE.MeshStandardMaterial({ color: 0xbfc9d0, roughness: 0.44 }));
    blade.position.y = -0.75;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.18), accentMat);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8), hairMat);
    handle.position.y = -0.02;
    sword.add(blade, guard, handle);
    sword.position.set(0.1, -0.42, -0.16);
    parts.rightArm.hand.add(sword);
    parts.sword = sword;
  }

  return { root, parts, pelvis };
}

function createArm(skinMat, clothMat, x, y) {
  const group = new THREE.Group();
  group.position.set(x, y, 0);
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 8), clothMat);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.8, 0.32), clothMat);
  upper.position.y = -0.38;
  const elbow = new THREE.Group();
  elbow.position.y = -0.78;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.72, 0.28), clothMat);
  lower.position.y = -0.36;
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), skinMat);
  hand.position.y = -0.8;
  elbow.add(lower, hand);
  group.add(shoulder, upper, elbow);
  return { group, elbow, hand };
}

function createLeg(clothMat, x, y) {
  const group = new THREE.Group();
  group.position.set(x, y, 0);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.9, 0.42), clothMat);
  upper.position.y = -0.45;
  const knee = new THREE.Group();
  knee.position.y = -0.9;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.75, 0.35), clothMat);
  lower.position.y = -0.38;
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.26, 0.55), new THREE.MeshStandardMaterial({ color: 0x23201f, roughness: 0.95 }));
  boot.position.set(0, -0.74, 0.08);
  knee.add(lower, boot);
  group.add(upper, knee);
  return { group, knee };
}

function createHealthBar() {
  const group = new THREE.Group();
  group.position.set(0, 4.6, 0);
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.16), new THREE.MeshBasicMaterial({ color: 0x2c1111, depthTest: false }));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 0.1), new THREE.MeshBasicMaterial({ color: 0x6eff7d, depthTest: false }));
  fill.position.z = 0.01;
  fill.position.x = -0.04;
  group.add(bg, fill);
  return { group, fill };
}

function updateEnemyHealthBar(enemy) {
  const ratio = THREE.MathUtils.clamp(enemy.hp / enemy.maxHp, 0, 1);
  enemy.healthFill.scale.x = ratio;
  enemy.healthFill.position.x = -0.76 + 0.76 * ratio;
  enemy.healthFill.material.color.set(ratio > 0.5 ? 0x73ff79 : ratio > 0.25 ? 0xffd45a : 0xff5e5e);
}

function createPlayer() {
  const human = createHumanoid(0x4a6fa0, 0xe5d4bb, true);
  human.root.position.y = 0.1;
  return {
    ...human,
    attackCd: 0,
    skillCd: { k: 0, l: 0, colon: 0 },
    invincible: 0,
    attackAnim: 0,
    skillAnim: 0,
    poisonAuraTimer: 0,
    shieldTimer: 0,
  };
}

function createEnemy(isBoss = false) {
  const human = createHumanoid(isBoss ? 0x7f1f1f : 0x654136, isBoss ? 0xe0b062 : 0xb08b74, isBoss);
  human.root.scale.setScalar(isBoss ? 1.22 : 1.02);
  const hpBar = createHealthBar();
  human.root.add(hpBar.group);
  return { ...human, healthBar: hpBar.group, healthFill: hpBar.fill };
}

function spawnEnemy(isBoss = false) {
  const hp = isBoss ? 450 + state.stage * 38 : 40 + state.stage * 8;
  const speed = isBoss ? 2.6 : 2.7 + Math.min(state.stage * 0.08, 1.25);
  const enemyBody = createEnemy(isBoss);
  enemyBody.root.position.set((Math.random() - 0.5) * 56, 0.1, (Math.random() - 0.5) * 56);
  scene.add(enemyBody.root);
  state.enemies.push({
    ...enemyBody,
    hp,
    maxHp: hp,
    speed,
    isBoss,
    hitCd: 0,
    walkCycle: Math.random() * Math.PI * 2,
    hurtFlash: 0,
    poisonTimer: 0,
    poisonTickCd: 0,
  });
}

function spawnPotion(pos) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 12, 24), new THREE.MeshStandardMaterial({ color: 0x59d5ff, emissive: 0x1a4766 }));
  ring.position.copy(pos);
  ring.position.y = 0.5;
  ring.rotation.x = Math.PI / 2;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), new THREE.MeshStandardMaterial({ color: 0xccf0ff, emissive: 0x2f6791 }));
  core.position.copy(ring.position);
  scene.add(ring, core);
  state.potions.push({ ring, core, phase: Math.random() * Math.PI * 2 });
}

function stageEnemyCount() {
  return state.isBossStage ? 1 : 6 + state.stage * 2;
}

function resetHpMp() {
  state.stats.hp = state.stats.hpMax;
  state.stats.mp = state.stats.mpMax;
}

function clearRoundObjects() {
  state.enemies.forEach((e) => scene.remove(e.root));
  state.projectiles.forEach((p) => scene.remove(p.mesh));
  state.slashEffects.forEach((s) => scene.remove(s.mesh));
  state.skillEffects.forEach((s) => scene.remove(s.mesh));
  state.potions.forEach((p) => {
    scene.remove(p.ring);
    scene.remove(p.core);
  });
  state.enemies = [];
  state.projectiles = [];
  state.slashEffects = [];
  state.skillEffects = [];
  state.potions = [];
}

function startStage() {
  state.isBossStage = state.stage % 3 === 0;
  resetHpMp();
  clearRoundObjects();
  const count = stageEnemyCount();
  for (let i = 0; i < count; i += 1) spawnEnemy(state.isBossStage && i === 0);
  toast(state.isBossStage ? `第 ${state.stage} 回合：首領戰！` : `第 ${state.stage} 回合開始。`);
}

function performAttackAnimation() {
  player.attackAnim = 0.24;
  player.parts.rightArm.group.rotation.x = -0.9;
  player.parts.rightArm.elbow.rotation.x = -0.6;
  player.parts.leftArm.group.rotation.x = 0.2;

  const slash = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.06, 8, 30, Math.PI * 1.15),
    new THREE.MeshBasicMaterial({ color: 0xe9f3ff, transparent: true, opacity: 0.75, depthTest: false })
  );
  slash.position.copy(player.root.position).add(new THREE.Vector3(0, 1.5, 0));
  slash.rotation.y = player.root.rotation.y;
  scene.add(slash);
  state.slashEffects.push({ mesh: slash, ttl: 0.22 });
}

function attack() {
  if (state.inShop || player.attackCd > 0 || state.stats.sp < 12) return;
  state.stats.sp -= 12;
  player.attackCd = 0.32;
  performAttackAnimation();

  const dmgBase = state.stats.attack;
  const bonus = 1 + state.skills.破軍式.level * 0.2;
  const range = 2.7;

  state.enemies.forEach((enemy) => {
    const dist = enemy.root.position.distanceTo(player.root.position);
    if (dist > range) return;
    const crit = Math.random() < state.stats.crit ? 1.7 : 1;
    enemy.hp -= dmgBase * bonus * crit;
    enemy.hurtFlash = 0.12;
    enemy.parts.torso.material.color.set(0xffd4bf);
    updateEnemyHealthBar(enemy);
  });
}

function triggerAoE() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 4.8, 42),
    new THREE.MeshBasicMaterial({ color: 0x8ce6ff, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthTest: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(player.root.position).setY(0.15);
  scene.add(ring);
  state.skillEffects.push({ mesh: ring, ttl: 0.35, kind: 'aoe' });

  state.enemies.forEach((enemy) => {
    const dist = enemy.root.position.distanceTo(player.root.position);
    if (dist <= 4.8) {
      enemy.hp -= state.stats.skillPower * (1 + state.skills.玄門勁.level * 0.25) * 1.15;
      enemy.hurtFlash = 0.2;
      enemy.parts.torso.material.color.set(0xa6e6ff);
      updateEnemyHealthBar(enemy);
    }
  });
}

function useSkillK() {
  if (!state.activeSkillOwnership.k) return toast('尚未解鎖技能：震山掌（K）');
  if (state.inShop || player.skillCd.k > 0 || state.stats.mp < ACTIVE_SKILLS.k.mpCost) return;
  state.stats.mp -= ACTIVE_SKILLS.k.mpCost;
  player.skillCd.k = ACTIVE_SKILLS.k.cooldown;
  player.skillAnim = 0.35;
  triggerAoE();
  castForwardProjectile(0.75);
}

function useSkillL() {
  if (!state.activeSkillOwnership.l) return toast('尚未解鎖技能：金鐘護體（L）');
  if (state.inShop || player.skillCd.l > 0 || state.stats.mp < ACTIVE_SKILLS.l.mpCost) return;
  state.stats.mp -= ACTIVE_SKILLS.l.mpCost;
  player.skillCd.l = ACTIVE_SKILLS.l.cooldown;
  player.shieldTimer = 2.2;
  player.invincible = Math.max(player.invincible, 2.2);
  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(1.25, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd98f, transparent: true, opacity: 0.32, wireframe: true, depthTest: false })
  );
  aura.position.copy(player.root.position).add(new THREE.Vector3(0, 1.7, 0));
  scene.add(aura);
  state.skillEffects.push({ mesh: aura, ttl: 2.2, kind: 'shield' });
  toast('施展金鐘護體：短時間無敵。');
}

function useSkillColon() {
  if (!state.activeSkillOwnership.colon) return toast('尚未解鎖技能：毒罡護身（:）');
  if (state.inShop || player.skillCd.colon > 0 || state.stats.mp < ACTIVE_SKILLS.colon.mpCost) return;
  state.stats.mp -= ACTIVE_SKILLS.colon.mpCost;
  player.skillCd.colon = ACTIVE_SKILLS.colon.cooldown;
  player.poisonAuraTimer = 6.0;
  const poisonRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.11, 12, 28),
    new THREE.MeshBasicMaterial({ color: 0x9afc6f, transparent: true, opacity: 0.55, depthTest: false })
  );
  poisonRing.position.copy(player.root.position).add(new THREE.Vector3(0, 1.0, 0));
  poisonRing.rotation.x = Math.PI / 2;
  scene.add(poisonRing);
  state.skillEffects.push({ mesh: poisonRing, ttl: 6.0, kind: 'poison' });
  toast('施展毒罡護身：接觸你者中毒。');
}

function castForwardProjectile(dmgScale = 1) {
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), new THREE.MeshStandardMaterial({ color: 0x7fe6ff, emissive: 0x2f7faa, roughness: 0.18 }));
  orb.position.copy(player.root.position).add(new THREE.Vector3(0, 1.2, 0));
  scene.add(orb);

  const dir = new THREE.Vector3(0, 0, 1);
  dir.applyQuaternion(player.root.quaternion).normalize();

  state.projectiles.push({
    mesh: orb,
    vel: dir.multiplyScalar(20),
    ttl: 1.7,
    rot: new THREE.Vector3(6, 8, 4),
    dmg: state.stats.skillPower * (1 + state.skills.玄門勁.level * 0.25) * dmgScale,
  });
}

function updatePlayerAnimation(dt, moveSpeed) {
  const walkPower = Math.min(1, moveSpeed / state.stats.moveSpeed);
  const walkTime = performance.now() * 0.008;

  player.parts.leftLeg.group.rotation.x = Math.sin(walkTime) * 0.45 * walkPower;
  player.parts.rightLeg.group.rotation.x = Math.sin(walkTime + Math.PI) * 0.45 * walkPower;
  player.parts.leftLeg.knee.rotation.x = Math.max(0, Math.sin(walkTime + Math.PI) * 0.35 * walkPower);
  player.parts.rightLeg.knee.rotation.x = Math.max(0, Math.sin(walkTime) * 0.35 * walkPower);

  if (player.attackAnim > 0) {
    player.attackAnim -= dt;
  } else {
    player.parts.rightArm.group.rotation.x = Math.sin(walkTime + Math.PI) * 0.2 * walkPower;
    player.parts.rightArm.elbow.rotation.x = 0;
    player.parts.leftArm.group.rotation.x = Math.sin(walkTime) * 0.2 * walkPower;
  }

  if (player.skillAnim > 0) {
    player.skillAnim -= dt;
    player.parts.leftArm.group.rotation.x = -0.95;
    player.parts.rightArm.group.rotation.x = -0.75;
    player.parts.hair.rotation.y = Math.sin(performance.now() * 0.02) * 0.15;
  } else {
    player.parts.hair.rotation.y *= 0.84;
  }

  const breath = 1 + Math.sin(performance.now() * 0.004) * 0.01;
  player.parts.torso.scale.y = breath;
}

function updatePlayer(dt) {
  if (player.attackCd > 0) player.attackCd -= dt;
  player.skillCd.k = Math.max(0, player.skillCd.k - dt);
  player.skillCd.l = Math.max(0, player.skillCd.l - dt);
  player.skillCd.colon = Math.max(0, player.skillCd.colon - dt);
  if (player.invincible > 0) player.invincible -= dt;
  if (player.shieldTimer > 0) player.shieldTimer -= dt;
  if (player.poisonAuraTimer > 0) player.poisonAuraTimer -= dt;

  let speed = state.stats.moveSpeed;
  const move = new THREE.Vector3((keyState.a ? -1 : 0) + (keyState.d ? 1 : 0), 0, (keyState.w ? -1 : 0) + (keyState.s ? 1 : 0));

  if (move.lengthSq() > 0) {
    move.normalize();
    const sprinting = keyState.shift && state.stats.sp > 0;
    if (sprinting) {
      speed *= 1.55;
      state.stats.sp = Math.max(0, state.stats.sp - 22 * dt);
    }
    player.root.position.addScaledVector(move, speed * dt);
    player.root.rotation.y = Math.atan2(move.x, move.z);
  }

  const regenFactor = 1 + state.skills.神行訣.level * 0.15;
  state.stats.sp = Math.min(state.stats.spMax, state.stats.sp + state.stats.spRegen * regenFactor * dt);

  player.root.position.x = THREE.MathUtils.clamp(player.root.position.x, -38, 38);
  player.root.position.z = THREE.MathUtils.clamp(player.root.position.z, -38, 38);

  updatePlayerAnimation(dt, move.lengthSq() > 0 ? speed : 0);

  state.potions = state.potions.filter((potion) => {
    potion.phase += dt * 2.7;
    potion.ring.rotation.z += dt * 1.7;
    potion.ring.position.y = 0.52 + Math.sin(potion.phase) * 0.08;
    potion.core.position.y = 0.68 + Math.sin(potion.phase + 0.9) * 0.08;

    if (potion.core.position.distanceTo(player.root.position) < 1.35) {
      resetHpMp();
      toast('拾取丹藥：生命與內力完全回復。');
      scene.remove(potion.ring);
      scene.remove(potion.core);
      return false;
    }
    return true;
  });
}

function updateEnemyAnimation(enemy, dt, distToPlayer) {
  enemy.walkCycle += dt * (enemy.isBoss ? 5.8 : 6.8);
  const intensity = THREE.MathUtils.clamp(1 - distToPlayer / 15, 0.25, 1);
  enemy.parts.leftLeg.group.rotation.x = Math.sin(enemy.walkCycle) * 0.36 * intensity;
  enemy.parts.rightLeg.group.rotation.x = Math.sin(enemy.walkCycle + Math.PI) * 0.36 * intensity;
  enemy.parts.leftArm.group.rotation.x = Math.sin(enemy.walkCycle + Math.PI) * 0.24 * intensity;
  enemy.parts.rightArm.group.rotation.x = Math.sin(enemy.walkCycle) * 0.24 * intensity;

  if (enemy.isBoss && enemy.parts.sword) enemy.parts.sword.rotation.z = Math.sin(enemy.walkCycle * 0.6) * 0.4;

  if (enemy.hurtFlash > 0) {
    enemy.hurtFlash -= dt;
    if (enemy.hurtFlash <= 0) enemy.parts.torso.material.color.set(enemy.isBoss ? 0x7f1f1f : 0x654136);
  }
}

function updateEnemies(dt) {
  state.enemies.forEach((enemy) => {
    const toPlayer = player.root.position.clone().sub(enemy.root.position);
    const dist = toPlayer.length();
    toPlayer.normalize();

    enemy.root.position.addScaledVector(toPlayer, enemy.speed * dt);
    enemy.root.lookAt(player.root.position.x, enemy.root.position.y, player.root.position.z);
    enemy.healthBar.quaternion.copy(camera.quaternion);
    updateEnemyAnimation(enemy, dt, dist);

    if (player.poisonAuraTimer > 0 && dist < 1.8) enemy.poisonTimer = Math.max(enemy.poisonTimer, 2.2);

    if (enemy.poisonTimer > 0) {
      enemy.poisonTimer -= dt;
      enemy.poisonTickCd -= dt;
      if (enemy.poisonTickCd <= 0) {
        enemy.poisonTickCd = 0.5;
        enemy.hp -= 7 + state.stage * 0.4;
        enemy.parts.torso.material.color.set(0x84ff84);
        enemy.hurtFlash = 0.1;
        updateEnemyHealthBar(enemy);
      }
    }

    enemy.hitCd -= dt;
    if (dist < (enemy.isBoss ? 2.35 : 1.45) && enemy.hitCd <= 0 && player.invincible <= 0) {
      const raw = enemy.isBoss ? 19 + state.stage : 9 + state.stage * 0.68;
      const dmg = Math.max(2, raw - state.stats.defense);
      state.stats.hp -= dmg;
      enemy.hitCd = enemy.isBoss ? 0.88 : 1.25;
      player.invincible = 0.32;
      if (state.stats.hp <= 0) {
        toast('你已倒下，按「重新開始」再戰江湖。');
        state.inShop = true;
      }
    }

    updateEnemyHealthBar(enemy);
  });

  const alive = [];
  for (const enemy of state.enemies) {
    if (enemy.hp > 0) {
      alive.push(enemy);
      continue;
    }
    scene.remove(enemy.root);
    state.coins += enemy.isBoss ? 120 : 10 + Math.floor(Math.random() * 8);
    if (Math.random() < (enemy.isBoss ? 0.65 : 0.15)) spawnPotion(enemy.root.position);
  }
  state.enemies = alive;
  if (state.enemies.length === 0 && !state.inShop) openShop();
}

function updateProjectiles(dt) {
  const remaining = [];
  for (const p of state.projectiles) {
    p.ttl -= dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += dt * p.rot.x;
    p.mesh.rotation.y += dt * p.rot.y;
    p.mesh.rotation.z += dt * p.rot.z;

    let hit = false;
    for (const enemy of state.enemies) {
      if (enemy.root.position.distanceTo(p.mesh.position) < (enemy.isBoss ? 1.55 : 1.0)) {
        enemy.hp -= p.dmg;
        enemy.hurtFlash = 0.15;
        enemy.parts.torso.material.color.set(0xa6e6ff);
        updateEnemyHealthBar(enemy);
        hit = true;
        break;
      }
    }

    if (!hit && p.ttl > 0) {
      remaining.push(p);
    } else {
      scene.remove(p.mesh);
    }
  }
  state.projectiles = remaining;
}

function updateEffects(dt) {
  const slashRest = [];
  for (const slash of state.slashEffects) {
    slash.ttl -= dt;
    slash.mesh.rotation.z += dt * 14;
    slash.mesh.material.opacity = Math.max(0, slash.ttl * 3.8);
    slash.mesh.scale.multiplyScalar(1 + dt * 2.2);
    if (slash.ttl <= 0) scene.remove(slash.mesh);
    else slashRest.push(slash);
  }
  state.slashEffects = slashRest;

  const skillRest = [];
  for (const effect of state.skillEffects) {
    effect.ttl -= dt;
    if (effect.kind === 'aoe') {
      effect.mesh.scale.multiplyScalar(1 + dt * 3.5);
      effect.mesh.material.opacity = Math.max(0, effect.ttl * 2.4);
    }
    if (effect.kind === 'shield') {
      effect.mesh.position.copy(player.root.position).add(new THREE.Vector3(0, 1.7, 0));
      effect.mesh.rotation.y += dt * 3;
      effect.mesh.material.opacity = 0.15 + Math.sin(performance.now() * 0.015) * 0.08;
    }
    if (effect.kind === 'poison') {
      effect.mesh.position.copy(player.root.position).add(new THREE.Vector3(0, 1, 0));
      effect.mesh.rotation.z += dt * 4;
      effect.mesh.material.opacity = 0.3 + Math.sin(performance.now() * 0.02) * 0.2;
    }

    if (effect.ttl <= 0) scene.remove(effect.mesh);
    else skillRest.push(effect);
  }
  state.skillEffects = skillRest;
}

const toolPool = [
  { name: '鐵木劍', desc: '攻擊 +6', cost: 40, apply: () => { state.stats.attack += 6; } },
  { name: '輕甲', desc: '防禦 +3', cost: 38, apply: () => { state.stats.defense += 3; } },
  { name: '行囊符', desc: '最大氣 +20', cost: 34, apply: () => { state.stats.spMax += 20; state.stats.sp += 20; } },
  { name: '強心散', desc: '生命上限 +25', cost: 44, apply: () => { state.stats.hpMax += 25; state.stats.hp += 25; } },
  { name: '聚元丹', desc: '內力上限 +18', cost: 42, apply: () => { state.stats.mpMax += 18; state.stats.mp += 18; } },
];

function buyTool(tool) {
  state.inventory.push(tool.name);
  tool.apply();
  toast(`購入工具：${tool.name}`);
}

function buyActiveSkill(key) {
  state.activeSkillOwnership[key] = true;
  toast(`解鎖技能：${ACTIVE_SKILLS[key].name}`);
}

function levelSkill(name) {
  state.skills[name].level += 1;
  if (name === '強體訣') {
    state.stats.hpMax += 15;
    state.stats.hp += 15;
  }
  if (name === '凝神訣') {
    state.stats.mpMax += 10;
    state.stats.mp += 10;
  }
  toast(`武學提升：${name} Lv.${state.skills[name].level}`);
}

function openShop() {
  state.inShop = true;
  ui.shop.classList.remove('hidden');
  ui.shopTitle.textContent = state.isBossStage ? '首領戰後整備' : '江湖商會';
  ui.shopDesc.textContent = `你目前有 ${state.coins} 銅錢。每回合可購買任意數量，請謹慎分配。`;
  renderShopOffers();
}

function renderShopOffers() {
  const offers = [];

  const skillNames = Object.keys(state.skills).filter((n) => state.skills[n].level < state.skills[n].max);
  for (let i = 0; i < 2 && skillNames.length; i += 1) {
    const idx = Math.floor(Math.random() * skillNames.length);
    const name = skillNames.splice(idx, 1)[0];
    const node = state.skills[name];
    offers.push({
      name,
      desc: `${node.desc}（目前 Lv.${node.level}）`,
      cost: node.cost + node.level * 8,
      buy: () => levelSkill(name),
    });
  }

  Object.entries(ACTIVE_SKILLS).forEach(([key, skill]) => {
    if (!state.activeSkillOwnership[key]) {
      offers.push({
        name: skill.name,
        desc: `${skill.desc}｜耗內力 ${skill.mpCost}`,
        cost: skill.cost,
        buy: () => buyActiveSkill(key),
      });
    }
  });

  const tools = [...toolPool].sort(() => Math.random() - 0.5).slice(0, 2);
  tools.forEach((tool) => offers.push({ ...tool, buy: () => buyTool(tool) }));

  ui.shopItems.innerHTML = '';
  offers.forEach((offer) => {
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `<strong>${offer.name}</strong><p>${offer.desc}</p><p>價格：${offer.cost} 銅錢</p>`;
    const button = document.createElement('button');
    button.textContent = '購買';
    button.onclick = () => {
      if (state.coins < offer.cost) return toast('銅錢不足。');
      state.coins -= offer.cost;
      offer.buy();
      updateUI();
      renderCharacterPanels();
      renderShopOffers();
    };
    div.appendChild(button);
    ui.shopItems.appendChild(div);
  });
}

ui.continueBtn.onclick = () => {
  ui.shop.classList.add('hidden');
  state.inShop = false;
  state.stage += 1;
  startStage();
};

ui.panelBtn.onclick = () => {
  ui.panel.classList.remove('hidden');
  renderCharacterPanels();
};
ui.closePanel.onclick = () => ui.panel.classList.add('hidden');

ui.tabs.forEach((tab) => {
  tab.onclick = () => {
    ui.tabs.forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((panel) => panel.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  };
});

ui.restartBtn.onclick = () => location.reload();

function renderCharacterPanels() {
  const activeSkillSummary = [
    `震山掌（K）：${state.activeSkillOwnership.k ? '已解鎖' : '未解鎖'}`,
    `金鐘護體（L）：${state.activeSkillOwnership.l ? '已解鎖' : '未解鎖'}`,
    `毒罡護身（:）：${state.activeSkillOwnership.colon ? '已解鎖' : '未解鎖'}`,
  ].map((line) => `<div class="skill-node">${line}</div>`).join('');

  ui.skillsTab.innerHTML =
    Object.entries(state.skills)
      .map(([name, node]) => `
      <div class="skill-node">
        <strong>${name}</strong>
        <p>${node.desc}</p>
        <p>等級：Lv.${node.level} / ${node.max}</p>
      </div>
    `)
      .join('') + activeSkillSummary;

  if (state.inventory.length === 0) {
    ui.inventoryTab.innerHTML = '<div class="inv-item">目前沒有工具。請於回合商店購買。</div>';
  } else {
    ui.inventoryTab.innerHTML = state.inventory.map((item, idx) => `<div class="inv-item">${idx + 1}. ${item}</div>`).join('');
  }

  const s = state.stats;
  ui.statsTab.innerHTML = [
    `生命上限：${Math.floor(s.hpMax)}`,
    `內力上限：${Math.floor(s.mpMax)}`,
    `氣上限：${Math.floor(s.spMax)}`,
    `普攻傷害：${Math.floor(s.attack)}`,
    `武學威力：${Math.floor(s.skillPower)}`,
    `防禦：${Math.floor(s.defense)}`,
    `會心：${Math.floor(s.crit * 100)}%`,
    `氣回復 / 秒：${Math.floor(s.spRegen * (1 + state.skills.神行訣.level * 0.15))}`,
  ].map((line) => `<div class="stat-row">${line}</div>`).join('');
}

function updateUI() {
  const { hp, hpMax, mp, mpMax, sp, spMax } = state.stats;
  ui.hpBar.style.width = `${Math.max(0, (hp / hpMax) * 100)}%`;
  ui.mpBar.style.width = `${Math.max(0, (mp / mpMax) * 100)}%`;
  ui.spBar.style.width = `${Math.max(0, (sp / spMax) * 100)}%`;
  ui.hpText.textContent = `${Math.max(0, Math.floor(hp))} / ${Math.floor(hpMax)}`;
  ui.mpText.textContent = `${Math.max(0, Math.floor(mp))} / ${Math.floor(mpMax)}`;
  ui.spText.textContent = `${Math.max(0, Math.floor(sp))} / ${Math.floor(spMax)}`;
  ui.roundText.textContent = `回合：${state.stage}${state.isBossStage ? '（首領）' : ''}`;
  ui.coinsText.textContent = `銅錢：${state.coins}`;
  ui.waveText.textContent = `敵人：${state.enemies.length}`;
}

let messageTimer = 0;
function toast(msg) {
  ui.message.textContent = msg;
  messageTimer = 3.5;
}

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());

  if (!state.inShop) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateEffects(dt);
  }

  updateUI();
  messageTimer -= dt;
  if (messageTimer <= 0) ui.message.textContent = '';

  const target = player.root.position.clone().add(new THREE.Vector3(24, 26, 24));
  camera.position.lerp(target, 0.06);
  camera.lookAt(player.root.position.x, 2.4, player.root.position.z);

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

startStage();
renderCharacterPanels();
loop();
