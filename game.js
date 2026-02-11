import * as THREE from 'https://unpkg.com/three@0.162.0/build/three.module.js';

const state = {
  stage: 1,
  coins: 0,
  inShop: false,
  isBossStage: false,
  killCount: 0,
  bossAlive: false,
  enemies: [],
  projectiles: [],
  potions: [],
  inventory: [],
  skills: {
    強體訣: { level: 0, max: 3, desc: '最大生命 +15/級', cost: 25 },
    凝神訣: { level: 0, max: 3, desc: '最大內力 +10/級', cost: 25 },
    神行訣: { level: 0, max: 3, desc: '氣回復 +15%/級', cost: 20 },
    破軍式: { level: 0, max: 3, desc: '普攻傷害 +20%/級', cost: 30 },
    玄門勁: { level: 0, max: 3, desc: '武學傷害 +25%/級', cost: 35 },
  },
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
  purchasedThisShop: 0,
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
  keyState[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'j') attack();
  if (e.key.toLowerCase() === 'k') castSkill();
});
window.addEventListener('keyup', (e) => { keyState[e.key.toLowerCase()] = false; });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b111d);
scene.fog = new THREE.Fog(0x0b111d, 40, 110);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(24, 28, 24);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xb9d8ff, 0x1e222f, 1.1);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.65);
dir.position.set(10, 18, 9);
scene.add(dir);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80, 20, 20),
  new THREE.MeshStandardMaterial({ color: 0x1d2b3d, wireframe: false })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(80, 28, 0x2f4667, 0x1f2f47);
grid.position.y = 0.01;
scene.add(grid);

const player = createPlayer();
scene.add(player.mesh);

function createPlayer() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.2, 3, 6), new THREE.MeshStandardMaterial({ color: 0xd2bea6 }));
  body.position.y = 1;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.8, 4), new THREE.MeshStandardMaterial({ color: 0x2f5f93 }));
  hat.position.y = 2.15;
  group.add(body, hat);
  return {
    mesh: group,
    attackCd: 0,
    skillCd: 0,
    invincible: 0,
  };
}

function spawnEnemy(isBoss = false) {
  const hp = isBoss ? 400 + state.stage * 40 : 36 + state.stage * 8;
  const speed = isBoss ? 2.8 : 2.8 + Math.min(state.stage * 0.08, 1.3);
  const size = isBoss ? 1.7 : 1;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size * 1.2, size * 1.6, size * 1.2),
    new THREE.MeshStandardMaterial({ color: isBoss ? 0x843a17 : 0x8f2020 })
  );
  mesh.position.set((Math.random() - 0.5) * 56, size * 0.8, (Math.random() - 0.5) * 56);
  scene.add(mesh);
  state.enemies.push({ mesh, hp, maxHp: hp, speed, isBoss, hitCd: 0 });
}

function spawnPotion(pos) {
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshStandardMaterial({ color: 0x68b0ff }));
  mesh.position.copy(pos);
  mesh.position.y = 0.6;
  scene.add(mesh);
  state.potions.push({ mesh });
}

function stageEnemyCount() {
  return state.isBossStage ? 1 : 6 + state.stage * 2;
}

function startStage() {
  state.isBossStage = state.stage % 3 === 0;
  state.killCount = 0;
  state.bossAlive = state.isBossStage;
  resetHpMp();
  clearRoundObjects();
  const count = stageEnemyCount();
  for (let i = 0; i < count; i++) spawnEnemy(state.isBossStage && i === 0);
  toast(state.isBossStage ? `第 ${state.stage} 回合：首領戰！` : `第 ${state.stage} 回合開始。`);
}

function clearRoundObjects() {
  state.enemies.forEach(e => scene.remove(e.mesh));
  state.potions.forEach(p => scene.remove(p.mesh));
  state.projectiles.forEach(p => scene.remove(p.mesh));
  state.enemies = [];
  state.potions = [];
  state.projectiles = [];
}

function resetHpMp() {
  state.stats.hp = state.stats.hpMax;
  state.stats.mp = state.stats.mpMax;
}

function attack() {
  if (state.inShop || player.attackCd > 0 || state.stats.sp < 12) return;
  state.stats.sp -= 12;
  player.attackCd = 0.32;

  const dmgBase = state.stats.attack;
  const bonus = 1 + state.skills.破軍式.level * 0.2;
  const range = 2.6;
  state.enemies.forEach((enemy) => {
    const dist = enemy.mesh.position.distanceTo(player.mesh.position);
    if (dist <= range) {
      const crit = Math.random() < state.stats.crit ? 1.7 : 1;
      enemy.hp -= dmgBase * bonus * crit;
      enemy.mesh.material.color.set(0xffccaa);
      setTimeout(() => enemy.mesh.material.color.set(enemy.isBoss ? 0x843a17 : 0x8f2020), 70);
    }
  });
}

function castSkill() {
  if (state.inShop || player.skillCd > 0 || state.stats.mp < 22) return;
  state.stats.mp -= 22;
  player.skillCd = 1.1;

  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), new THREE.MeshStandardMaterial({ color: 0x63c6ff, emissive: 0x214e73 }));
  orb.position.copy(player.mesh.position).add(new THREE.Vector3(0, 1, 0));
  scene.add(orb);

  const dir = new THREE.Vector3(
    (keyState['a'] ? -1 : 0) + (keyState['d'] ? 1 : 0),
    0,
    (keyState['w'] ? -1 : 0) + (keyState['s'] ? 1 : 0)
  );
  if (dir.lengthSq() < 0.1) dir.set(0, 0, -1);
  dir.normalize();

  state.projectiles.push({
    mesh: orb,
    vel: dir.multiplyScalar(18),
    ttl: 1.5,
    dmg: state.stats.skillPower * (1 + state.skills.玄門勁.level * 0.25),
  });
}

function updatePlayer(dt) {
  if (player.attackCd > 0) player.attackCd -= dt;
  if (player.skillCd > 0) player.skillCd -= dt;
  if (player.invincible > 0) player.invincible -= dt;

  let speed = state.stats.moveSpeed;
  const move = new THREE.Vector3(
    (keyState['a'] ? -1 : 0) + (keyState['d'] ? 1 : 0),
    0,
    (keyState['w'] ? -1 : 0) + (keyState['s'] ? 1 : 0)
  );
  if (move.lengthSq() > 0) {
    move.normalize();
    const sprinting = keyState['shift'] && state.stats.sp > 0;
    if (sprinting) {
      speed *= 1.55;
      state.stats.sp = Math.max(0, state.stats.sp - 22 * dt);
    }
    player.mesh.position.addScaledVector(move, speed * dt);
    player.mesh.rotation.y = Math.atan2(move.x, move.z);
  }

  const regenFactor = 1 + state.skills.神行訣.level * 0.15;
  state.stats.sp = Math.min(state.stats.spMax, state.stats.sp + state.stats.spRegen * regenFactor * dt);

  player.mesh.position.x = THREE.MathUtils.clamp(player.mesh.position.x, -38, 38);
  player.mesh.position.z = THREE.MathUtils.clamp(player.mesh.position.z, -38, 38);

  state.potions = state.potions.filter((pot) => {
    if (pot.mesh.position.distanceTo(player.mesh.position) < 1.4) {
      resetHpMp();
      toast('拾取丹藥：生命與內力完全回復。');
      scene.remove(pot.mesh);
      return false;
    }
    return true;
  });
}

function updateEnemies(dt) {
  state.enemies.forEach((enemy) => {
    const dir = player.mesh.position.clone().sub(enemy.mesh.position);
    const dist = dir.length();
    dir.normalize();
    enemy.mesh.position.addScaledVector(dir, enemy.speed * dt);
    enemy.mesh.lookAt(player.mesh.position.x, enemy.mesh.position.y, player.mesh.position.z);

    enemy.hitCd -= dt;
    if (dist < (enemy.isBoss ? 2.2 : 1.4) && enemy.hitCd <= 0 && player.invincible <= 0) {
      const raw = enemy.isBoss ? 18 + state.stage : 9 + state.stage * 0.7;
      const dmg = Math.max(2, raw - state.stats.defense);
      state.stats.hp -= dmg;
      enemy.hitCd = enemy.isBoss ? 1.0 : 1.35;
      player.invincible = 0.32;
      if (state.stats.hp <= 0) {
        toast('你已倒下，按「重新開始」再戰江湖。');
        state.inShop = true;
      }
    }
  });

  const alive = [];
  for (const enemy of state.enemies) {
    if (enemy.hp > 0) {
      alive.push(enemy);
      continue;
    }
    scene.remove(enemy.mesh);
    state.killCount += 1;
    const reward = enemy.isBoss ? 120 : 10 + Math.floor(Math.random() * 8);
    state.coins += reward;
    if (Math.random() < (enemy.isBoss ? 0.65 : 0.15)) spawnPotion(enemy.mesh.position);
  }
  state.enemies = alive;

  if (state.enemies.length === 0 && !state.inShop) {
    openShop();
  }
}

function updateProjectiles(dt) {
  const remaining = [];
  for (const p of state.projectiles) {
    p.ttl -= dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    let hit = false;
    for (const enemy of state.enemies) {
      if (enemy.mesh.position.distanceTo(p.mesh.position) < (enemy.isBoss ? 1.5 : 1.0)) {
        enemy.hp -= p.dmg;
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

const toolPool = [
  { name: '鐵木劍', type: 'tool', desc: '攻擊 +6', cost: 40, apply: () => state.stats.attack += 6 },
  { name: '輕甲', type: 'tool', desc: '防禦 +3', cost: 38, apply: () => state.stats.defense += 3 },
  { name: '行囊符', type: 'tool', desc: '最大氣 +20', cost: 34, apply: () => { state.stats.spMax += 20; state.stats.sp += 20; } },
  { name: '強心散', type: 'tool', desc: '生命上限 +25', cost: 44, apply: () => { state.stats.hpMax += 25; state.stats.hp += 25; } },
  { name: '聚元丹', type: 'tool', desc: '內力上限 +18', cost: 42, apply: () => { state.stats.mpMax += 18; state.stats.mp += 18; } },
];

function openShop() {
  state.inShop = true;
  state.purchasedThisShop = 0;
  ui.shop.classList.remove('hidden');
  ui.shopTitle.textContent = state.isBossStage ? '首領戰後整備' : '江湖商會';
  ui.shopDesc.textContent = `你目前有 ${state.coins} 銅錢。每回合可購買任意數量，請謹慎分配。`;
  renderShopOffers();
}

function renderShopOffers() {
  const offers = [];
  const skillNames = Object.keys(state.skills).filter((name) => state.skills[name].level < state.skills[name].max);
  for (let i = 0; i < 2 && skillNames.length; i++) {
    const idx = Math.floor(Math.random() * skillNames.length);
    const name = skillNames.splice(idx, 1)[0];
    const node = state.skills[name];
    offers.push({
      name,
      type: 'skill',
      desc: `${node.desc}（目前 Lv.${node.level}）`,
      cost: node.cost + node.level * 8,
      buy: () => levelSkill(name),
    });
  }
  const tools = [...toolPool].sort(() => Math.random() - 0.5).slice(0, 3);
  tools.forEach((t) => offers.push({ ...t, buy: () => buyTool(t) }));

  ui.shopItems.innerHTML = '';
  offers.forEach((offer) => {
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `<strong>${offer.name}</strong><p>${offer.desc}</p><p>價格：${offer.cost} 銅錢</p>`;
    const btn = document.createElement('button');
    btn.textContent = '購買';
    btn.onclick = () => {
      if (state.coins < offer.cost) return toast('銅錢不足。');
      state.coins -= offer.cost;
      offer.buy();
      state.purchasedThisShop += 1;
      updateUI();
      renderCharacterPanels();
      renderShopOffers();
    };
    div.appendChild(btn);
    ui.shopItems.appendChild(div);
  });
}

function buyTool(tool) {
  state.inventory.push(tool.name);
  tool.apply();
  toast(`購入工具：${tool.name}`);
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
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  };
});
ui.restartBtn.onclick = () => location.reload();

function renderCharacterPanels() {
  ui.skillsTab.innerHTML = Object.entries(state.skills).map(([name, node]) => `
    <div class="skill-node">
      <strong>${name}</strong>
      <p>${node.desc}</p>
      <p>等級：Lv.${node.level} / ${node.max}</p>
    </div>
  `).join('');

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
  }

  updateUI();
  messageTimer -= dt;
  if (messageTimer <= 0) ui.message.textContent = '';

  const target = player.mesh.position.clone().add(new THREE.Vector3(24, 28, 24));
  camera.position.lerp(target, 0.06);
  camera.lookAt(player.mesh.position);

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
