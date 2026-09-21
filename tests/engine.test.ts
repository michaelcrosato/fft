import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES, JOBS, MISSIONS } from '../src/data.ts';
import {
  BattleEngine,
  awardVictory,
  changeJob,
  createBattle,
  distance,
  freshCampaign,
  learn,
  purchase,
  validateSave,
  type Unit
} from '../src/engine.ts';

function setup(mission = 0) {
  const c = freshCampaign();
  c.completed = Array.from({ length: mission }, (_, i) => i);
  c.battle = createBattle(c, mission);
  const e = new BattleEngine(c.battle);
  e.nextTurn();
  return { c, e, b: e.battle };
}
function place(u: Unit, x: number, z: number) {
  u.x = x;
  u.z = z;
}

test('charged spells resolve through the initiative clock without a manual trigger', () => {
  const { e, b } = setup();
  const mage = b.units.find((u) => u.id === 'pip')!,
    target = e.living('enemy')[0];
  for (const unit of b.units) unit.ct = 0;
  mage.ct = 100;
  b.active = mage.id;
  place(mage, 4, 5);
  place(target, 4, 3);
  target.facing = 'south';
  const hp = target.hp;
  assert.ok(e.perform('ember', target));
  assert.ok(e.turnOrder().some((entry) => entry.cast === 'ember'));
  e.endTurn('north');
  assert.equal(b.casts.length, 0);
  assert.ok(target.hp < hp);
  assert.ok(b.ticks >= 4);
});
test('job jump height changes which routes are legal on the rooftops', () => {
  const { e, b } = setup();
  const knight = e.active!,
    dragoon = { ...knight, job: 'dragoon' as const, jump: 3 };
  place(knight, 8, 2);
  dragoon.x = 8;
  dragoon.z = 2;
  const knightPath = e.reachable(knight).get('8,1'),
    dragoonPath = e.reachable(dragoon).get('8,1');
  assert.ok(dragoonPath);
  assert.equal(dragoonPath.length, 1);
  assert.ok(!knightPath || knightPath.length > 1);
  void b;
});
test('healing and mana previews show only the amount that can be restored', () => {
  const { e } = setup();
  const u = e.active!;
  u.hp = u.maxHp - 7;
  u.mp = u.maxMp - 3;
  assert.equal(e.preview(u, ABILITIES.potion, u).amount, 7);
  assert.equal(e.preview(u, ABILITIES.ether, u).amount, 3);
});

test('a fresh campaign has four unique deployed heroes and passes save validation', () => {
  const c = freshCampaign();
  assert.equal(new Set(c.selected).size, 4);
  assert.ok(validateSave(c));
});
test('chapters cannot be entered out of order', () => {
  assert.throws(() => createBattle(freshCampaign(), 2), /not unlocked/);
});
test('movement respects occupied tiles, limits and blocked terrain', () => {
  const { e } = setup();
  const u = e.active!;
  const paths = e.reachable(u);
  for (const p of paths.values()) {
    assert.ok(p.length <= u.move);
    if (p.length) {
      assert.ok(!e.tile(p.at(-1)!)?.blocked);
      assert.ok(!e.unitAt(p.at(-1)!));
    }
  }
  assert.ok(!paths.has('0,0'));
});
test('only one move per turn; movement can be undone before acting', () => {
  const { e } = setup();
  const u = e.active!,
    original = { x: u.x, z: u.z };
  assert.ok(e.move({ x: 4, z: 6 }));
  assert.equal(e.move({ x: 4, z: 5 }), null);
  assert.ok(e.undoMove());
  assert.equal(u.x, original.x);
  assert.equal(u.z, original.z);
});
test('attacks enforce range and one action; resource checks prevent overspending', () => {
  const { e, b } = setup();
  const u = e.active!,
    enemy = e.living('enemy')[0];
  assert.equal(e.perform('attack', enemy), false);
  place(enemy, 4, 7);
  enemy.facing = 'north';
  assert.ok(e.perform('attack', enemy));
  assert.equal(e.perform('attack', enemy), false);
  assert.equal(b.acted, true);
  u.mp = 0;
  assert.equal(e.preview(u, ABILITIES.rend, enemy).valid, false);
});
test('back and height advantages are reflected by the damage preview', () => {
  const { e } = setup();
  const u = e.active!,
    t = e.living('enemy')[0];
  place(u, 4, 5);
  place(t, 4, 4);
  t.facing = 'south';
  const front = e.preview(u, ABILITIES.attack, t);
  t.facing = 'north';
  const back = e.preview(u, ABILITIES.attack, t);
  assert.equal(back.chance, 100);
  assert.ok(back.amount > front.amount);
  assert.equal(back.flank, 'Back attack');
});
test('a confirmed attack matches its deterministic preview when it hits', () => {
  const { e } = setup();
  const u = e.active!,
    t = e.living('enemy')[0];
  place(t, 4, 7);
  t.facing = 'north';
  const p = e.preview(u, ABILITIES.attack, t);
  const before = t.hp;
  assert.ok(e.perform('attack', t));
  assert.equal(before - t.hp, p.amount);
});
test('tonics consume one item and heal only up to maximum HP', () => {
  const { e, b } = setup();
  const u = e.active!;
  u.hp -= 20;
  const n = b.inventory.potion;
  assert.ok(e.perform('potion', u));
  assert.equal(u.hp, u.maxHp);
  assert.equal(b.inventory.potion, n - 1);
});
test('empty items cannot be used', () => {
  const { e, b } = setup();
  b.inventory.potion = 0;
  e.active!.hp = 10;
  assert.equal(e.perform('potion', e.active!), false);
});
test('charged spells lock to a tile and include friendly fire', () => {
  const { e, b } = setup();
  const mage = b.units.find((u) => u.id === 'pip')!,
    ally = b.units.find((u) => u.id === 'rowan')!,
    enemy = e.living('enemy')[0];
  b.active = mage.id;
  place(mage, 4, 5);
  place(ally, 5, 3);
  place(enemy, 5, 2);
  const ah = ally.hp,
    eh = enemy.hp,
    mp = mage.mp;
  assert.ok(e.perform('ember', enemy));
  assert.equal(b.casts.length, 1);
  assert.equal(mage.mp, mp - 9);
  assert.equal(enemy.hp, eh);
  e.resolve(mage, ABILITIES.ember, { x: enemy.x, z: enemy.z });
  assert.ok(ally.hp < ah);
  assert.ok(enemy.hp < eh);
});
test('moving out of a charged area avoids its impact', () => {
  const { e, b } = setup();
  const mage = b.units.find((u) => u.id === 'pip')!,
    enemy = e.living('enemy')[0];
  place(mage, 4, 5);
  place(enemy, 4, 3);
  b.active = mage.id;
  assert.ok(e.perform('ember', enemy));
  place(enemy, 9, 7);
  const hp = enemy.hp;
  e.resolve(mage, ABILITIES.ember, { x: 4, z: 3 });
  assert.equal(enemy.hp, hp);
});
test('a dawn feather revives a fallen ally and resets the withdrawal clock', () => {
  const { e, b } = setup();
  const ally = b.units.find((u) => u.id === 'wren')!;
  place(ally, 4, 7);
  ally.hp = 0;
  ally.down = 1;
  assert.ok(e.perform('feather', ally));
  assert.equal(ally.hp, Math.round(ally.maxHp / 2));
  assert.equal(ally.down, 3);
});
test('defeat is detected when the entire company falls', () => {
  const { e, b } = setup();
  b.units.filter((u) => u.team === 'ally').forEach((u) => (u.hp = 0));
  e.checkResult();
  assert.equal(b.result, 'defeat');
});
test('leader objectives can be won without defeating every guard', () => {
  const { e, b } = setup(3);
  b.units.find((u) => u.boss)!.hp = 0;
  e.checkResult();
  assert.equal(b.result, 'victory');
  assert.ok(e.living('enemy').length > 0);
});
test('the bridge can be held without routing every enemy', () => {
  const { e, b } = setup(2);
  b.turn = 32;
  e.checkResult();
  assert.equal(b.result, 'victory');
  assert.ok(e.living('enemy').some((u) => u.boss));
});
test('victory rewards are idempotent and unlock the next chapter', () => {
  const { e, b, c } = setup();
  e.living('enemy').forEach((u) => (u.hp = 0));
  e.checkResult();
  const coins = c.coins;
  const reward = awardVictory(c);
  assert.ok(reward);
  assert.equal(c.coins, coins + MISSIONS[0].reward);
  assert.deepEqual(c.completed, [0]);
  assert.equal(awardVictory(c), null);
  assert.equal(c.coins, coins + MISSIONS[0].reward);
  const restored = validateSave(JSON.parse(JSON.stringify(c)))!;
  assert.deepEqual(restored.battle!.reward, reward);
  assert.equal(awardVictory(restored), null);
  assert.equal(restored.coins, c.coins);
});
test('job unlocks, skill purchases, and equipment enforce progression and prices', () => {
  const c = freshCampaign();
  assert.equal(changeJob(c, 'rowan', 'dragoon'), false);
  assert.ok(learn(c, 'rowan', 'rally'));
  assert.equal(c.heroes[0].jp, 10);
  assert.equal(learn(c, 'rowan', 'rally'), false);
  assert.ok(purchase(c, 'weapon', 'rowan'));
  assert.equal(c.coins, 80);
  assert.equal(purchase(c, 'weapon', 'rowan'), false);
  c.completed = [0, 1, 2];
  assert.ok(changeJob(c, 'rowan', 'dragoon'));
  assert.ok(c.heroes[0].learned.includes('lance'));
});
test('battle saves round trip including casts and random state', () => {
  const { c } = setup();
  const s = validateSave(JSON.parse(JSON.stringify(c)));
  assert.ok(s);
  assert.deepEqual(s.battle, c.battle);
});
test('malformed and foreign saves are rejected', () => {
  assert.equal(validateSave({}), null);
  const c = freshCampaign();
  c.heroes[0].job = 'bogus' as any;
  assert.equal(validateSave(c), null);
  const other = freshCampaign();
  other.coins = NaN;
  assert.equal(validateSave(other), null);
});
test('imported names and malformed battle fields cannot inject markup or crash play', () => {
  const { c } = setup();
  c.heroes[0].name = '<img src=x onerror=alert(1)>';
  assert.equal(validateSave(c), null);
  const { c: other } = setup();
  other.battle!.units[0].maxHp = 0;
  assert.equal(validateSave(other), null);
});
test('guard expires when the defender next takes a turn', () => {
  const { e, b } = setup();
  const u = e.active!;
  e.endTurn('north', true);
  assert.equal(u.statuses.guard, 1);
  b.active = null;
  u.ct = 200;
  e.nextTurn();
  assert.equal(e.active?.id, u.id);
  assert.equal(u.statuses.guard, undefined);
});
test('a melee sweep hits enemies without striking its own user', () => {
  const { e, b } = setup();
  const u = e.active!,
    t = e.living('enemy')[0];
  u.learned.push('cleave');
  place(t, 4, 7);
  t.facing = 'north';
  const hp = u.hp;
  e.perform('cleave', t);
  assert.equal(u.hp, hp);
  assert.ok(t.hp < t.maxHp);
  assert.equal(b.acted, true);
});
test('AI resuming after a saved movement cannot plan a second move', () => {
  const { e } = setup();
  e.move({ x: 4, z: 6 });
  const u = e.active!,
    plan = e.planAI(u);
  assert.deepEqual(plan.to, { x: u.x, z: u.z });
});
test('all six maps have legal, connected spawn regions and distinct objectives', () => {
  for (const m of MISSIONS) {
    const { e, b } = setup(m.id);
    const occupied = new Set<string>();
    for (const u of b.units) {
      const k = `${u.x},${u.z}`;
      assert.ok(!occupied.has(k), `${m.name}: duplicate spawn`);
      occupied.add(k);
      assert.ok(!e.tile(u)?.blocked, `${m.name}: blocked spawn ${u.name}`);
      assert.ok(e.reachable(u).size > 1, `${m.name}: trapped ${u.name}`);
    }
    assert.ok(e.living('enemy').length >= 3);
  }
});
test('the complete Classic campaign is winnable through real legal actions with progression', () => {
  const c = freshCampaign();
  const report = [];
  for (const m of MISSIONS) {
    const party = c.heroes.filter((h) => c.selected.includes(h.id));
    for (const h of party) for (const id of JOBS[h.job].skills) learn(c, h.id, id);
    while (c.coins >= 140) {
      const h = [...party].filter((h) => h.weapon < 3).sort((a, b) => a.weapon - b.weapon)[0];
      if (!h) break;
      purchase(c, 'weapon', h.id);
    }
    c.battle = createBattle(c, m.id);
    const e = new BattleEngine(c.battle);
    e.nextTurn();
    let actions = 0;
    while (!e.battle.result && actions < 600) {
      e.runAI();
      actions++;
    }
    report.push({
      chapter: m.id + 1,
      result: e.battle.result,
      turns: e.battle.turn,
      remaining: e.living('ally').map((u) => `${u.name}:${u.hp}`)
    });
    assert.equal(e.battle.result, 'victory', JSON.stringify(report));
    awardVictory(c);
    c.battle = null;
  }
  assert.equal(c.completed.length, 6);
  console.log('Campaign simulation:', JSON.stringify(report));
});
