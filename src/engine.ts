import {
  ABILITIES,
  JOBS,
  MISSIONS,
  SHOP,
  STARTING_HEROES,
  type Ability,
  type Facing,
  type Hero,
  type JobId,
  type Point,
  type StatusId,
  type Tile
} from './data';

export interface Unit extends Point {
  id: string;
  name: string;
  job: JobId;
  team: 'ally' | 'enemy';
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  mag: number;
  def: number;
  speed: number;
  move: number;
  jump: number;
  range: number;
  ct: number;
  facing: Facing;
  statuses: Partial<Record<StatusId, number>>;
  learned: string[];
  boss: boolean;
  down: number;
  removed: boolean;
  xp: number;
  jp: number;
}
export interface Cast {
  id: number;
  caster: string;
  ability: string;
  target: Point;
  due: number;
}
export interface BattleReward {
  coins: number;
  xp: number;
  jp: number;
  stars: number;
  first: boolean;
}
export interface Battle {
  mission: number;
  units: Unit[];
  active: string | null;
  moved: boolean;
  acted: boolean;
  moveOrigin: Point | null;
  ticks: number;
  turn: number;
  casts: Cast[];
  log: string[];
  result: 'victory' | 'defeat' | null;
  rewarded: boolean;
  reward?: BattleReward;
  seed: number;
  casualties: number;
  inventory: Record<string, number>;
  startingInventory: Record<string, number>;
}
export interface Settings {
  sound: boolean;
  music: boolean;
  reducedMotion: boolean;
  quality: 'auto' | 'high' | 'low';
  speed: 1 | 2;
  difficulty: 'story' | 'classic' | 'tactician';
}
export interface Campaign {
  version: 1;
  heroes: Hero[];
  coins: number;
  inventory: Record<string, number>;
  completed: number[];
  stars: Record<number, number>;
  selected: string[];
  battle: Battle | null;
  settings: Settings;
  tutorial: boolean;
  victories: number;
  savedAt: number;
}
export interface Effect {
  target: string;
  text: string;
  kind: 'damage' | 'heal' | 'buff' | 'miss' | 'cast';
}
export interface Preview {
  valid: boolean;
  reason: string;
  amount: number;
  chance: number;
  flank: string;
  targets: Unit[];
}
export const key = (p: Point) => `${p.x},${p.z}`;
export const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
export const dirs: Record<Facing, Point> = {
  north: { x: 0, z: -1 },
  east: { x: 1, z: 0 },
  south: { x: 0, z: 1 },
  west: { x: -1, z: 0 }
};
export const SAVE_KEY = 'crown-cinder-save-v1';
export function freshCampaign(): Campaign {
  return {
    version: 1,
    heroes: structuredClone(STARTING_HEROES),
    coins: 220,
    inventory: { potion: 5, ether: 3, feather: 3 },
    completed: [],
    stars: {},
    selected: ['rowan', 'wren', 'pip', 'alma'],
    battle: null,
    settings: {
      sound: true,
      music: true,
      reducedMotion: false,
      quality: 'auto',
      speed: 1,
      difficulty: 'classic'
    },
    tutorial: true,
    victories: 0,
    savedAt: Date.now()
  };
}
export function stats(
  hero: Hero
): Omit<Unit, 'x' | 'z' | 'team' | 'ct' | 'facing' | 'statuses' | 'boss' | 'down' | 'removed'> {
  const j = JOBS[hero.job],
    l = hero.level - 1;
  const hp = j.hp + l * 9 + hero.armor * 15,
    mp = j.mp + l * 3 + (hero.charm === 'charm' ? 15 : 0);
  return {
    id: hero.id,
    name: hero.name,
    job: hero.job,
    level: hero.level,
    hp,
    maxHp: hp,
    mp,
    maxMp: mp,
    atk: j.atk + l * 2 + hero.weapon * 4,
    mag: j.mag + l * 2 + hero.weapon * 4 + (hero.charm === 'charm' ? 3 : 0),
    def: j.def + hero.armor * 3 + l,
    speed: j.speed,
    move: j.move + (hero.charm === 'boots' ? 1 : 0),
    jump: j.jump,
    range: j.range,
    learned: hero.learned.filter((id) => {
      const a = ABILITIES[id];
      return a && (a.job === hero.job || a.job === hero.secondary);
    }),
    xp: 0,
    jp: 0
  };
}
export function createBattle(c: Campaign, missionId: number): Battle {
  const m = MISSIONS[missionId];
  if (!m || missionId > c.completed.length) throw new Error('This chapter is not unlocked.');
  const heroes = c.selected
    .map((id) => c.heroes.find((h) => h.id === id))
    .filter((h): h is Hero => !!h && h.available <= c.completed.length)
    .slice(0, 4);
  if (heroes.length !== 4) throw new Error('Choose four companions before setting out.');
  const units: Unit[] = heroes.map((h, i) => ({
    ...stats(h),
    ...m.spawns[i],
    team: 'ally',
    ct: i === 0 ? 99 : 70 - i * 6,
    facing: 'north',
    statuses: {},
    boss: false,
    down: 3,
    removed: false
  }));
  const factor =
    c.settings.difficulty === 'story' ? 0.78 : c.settings.difficulty === 'tactician' ? 1.28 : 1;
  m.enemies.forEach((e, i) => {
    const u = stats({
      ...STARTING_HEROES[0],
      id: `enemy-${i}`,
      name: e.name,
      job: e.job,
      level: e.level,
      learned: JOBS[e.job].skills.slice(0, e.level >= 4 ? 3 : e.level >= 2 ? 2 : 1),
      weapon: 0,
      armor: 0,
      secondary: null
    });
    u.maxHp = u.hp = Math.round(u.hp * factor * (e.boss ? 1.4 : 0.9));
    u.atk = Math.round(u.atk * factor * 0.78);
    u.mag = Math.round(u.mag * factor * 0.78);
    units.push({
      ...u,
      x: e.x,
      z: e.z,
      team: 'enemy',
      ct: 25 + i * 5,
      facing: 'south',
      statuses: {},
      boss: !!e.boss,
      down: 3,
      removed: false
    });
  });
  return {
    mission: missionId,
    units,
    active: null,
    moved: false,
    acted: false,
    moveOrigin: null,
    ticks: 0,
    turn: 0,
    casts: [],
    log: [`${m.name} — ${m.objective}.`],
    result: null,
    rewarded: false,
    seed: 31847 + missionId * 1987,
    casualties: 0,
    inventory: { ...c.inventory },
    startingInventory: { ...c.inventory }
  };
}
export class BattleEngine {
  battle: Battle;
  tiles: Tile[];
  tileMap: Map<string, Tile>;
  effects: Effect[] = [];
  constructor(b: Battle) {
    this.battle = b;
    this.tiles = MISSIONS[b.mission].tiles;
    this.tileMap = new Map(this.tiles.map((t) => [key(t), t]));
  }
  get active() {
    return this.battle.units.find((u) => u.id === this.battle.active) ?? null;
  }
  tile(p: Point) {
    return this.tileMap.get(key(p));
  }
  unitAt(p: Point) {
    return this.battle.units.find((u) => !u.removed && u.x === p.x && u.z === p.z);
  }
  living(team?: Unit['team']) {
    return this.battle.units.filter((u) => u.hp > 0 && !u.removed && (!team || u.team === team));
  }
  isCharging(u: Unit) {
    return this.battle.casts.some((c) => c.caster === u.id);
  }
  log(s: string) {
    this.battle.log.push(s);
    if (this.battle.log.length > 70) this.battle.log.shift();
  }
  random() {
    let x = this.battle.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.battle.seed = x >>> 0;
    return (x >>> 0) / 4294967296;
  }
  reachable(u: Unit): Map<string, Point[]> {
    const paths = new Map<string, Point[]>([[key(u), []]]),
      queue: Point[] = [{ x: u.x, z: u.z }];
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i],
        path = paths.get(key(p))!;
      if (path.length >= u.move) continue;
      for (const d of Object.values(dirs)) {
        const n = { x: p.x + d.x, z: p.z + d.z },
          t = this.tile(n),
          from = this.tile(p)!;
        if (!t || t.blocked || Math.abs(t.h - from.h) > u.jump || paths.has(key(n))) continue;
        const occ = this.unitAt(n);
        if (occ && occ.id !== u.id && occ.team !== u.team) continue;
        paths.set(key(n), [...path, n]);
        queue.push(n);
      }
    }
    for (const [k, path] of paths) {
      if (path.length && this.unitAt(path.at(-1)!)) paths.delete(k);
    }
    return paths;
  }
  move(to: Point): Point[] | null {
    const b = this.battle,
      u = this.active;
    if (!u || b.moved || b.result || u.hp <= 0) return null;
    const path = this.reachable(u).get(key(to));
    if (!path?.length) return null;
    b.moveOrigin = { x: u.x, z: u.z };
    u.facing = this.facing(path.length > 1 ? path[path.length - 2] : u, to);
    u.x = to.x;
    u.z = to.z;
    b.moved = true;
    return path;
  }
  undoMove() {
    const b = this.battle,
      u = this.active;
    if (!u || !b.moved || b.acted || !b.moveOrigin) return false;
    Object.assign(u, b.moveOrigin);
    b.moved = false;
    b.moveOrigin = null;
    return true;
  }
  facing(a: Point, b: Point): Facing {
    const dx = b.x - a.x,
      dz = b.z - a.z;
    return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : dz > 0 ? 'south' : 'north';
  }
  skills(u: Unit): Ability[] {
    return ['attack', ...u.learned, 'potion', 'ether', 'feather']
      .map((id) => ABILITIES[id])
      .filter(Boolean);
  }
  range(u: Unit, a: Ability, from: Point = u) {
    let r = a.id === 'attack' ? u.range : a.range;
    if (a.icon === 'bow' || (a.id === 'attack' && u.job === 'ranger'))
      r += Math.max(0, Math.floor((this.tile(from)?.h ?? 0) / 2));
    return r;
  }
  lineOfSight(from: Point, to: Point): boolean {
    const n = Math.max(Math.abs(to.x - from.x), Math.abs(to.z - from.z)),
      ha = (this.tile(from)?.h ?? 0) + 2,
      hb = (this.tile(to)?.h ?? 0) + 2;
    for (let i = 1; i < n; i++) {
      const f = i / n,
        t = this.tile({
          x: Math.round(from.x + (to.x - from.x) * f),
          z: Math.round(from.z + (to.z - from.z) * f)
        });
      if (t?.blocked && t.h + 2.5 > ha + (hb - ha) * f) return false;
    }
    return true;
  }
  preview(u: Unit, a: Ability, to: Point, from: Point = u): Preview {
    const bad = (reason: string): Preview => ({
      valid: false,
      reason,
      amount: 0,
      chance: 0,
      flank: '',
      targets: []
    });
    if (!this.tile(to) || this.tile(to)!.blocked) return bad('Choose an open tile.');
    if (u.mp < a.mp) return bad(`Needs ${a.mp} MP.`);
    if (a.item && !(this.battle.inventory[a.item] > 0))
      return bad('None left in the shared satchel.');
    if (distance(from, to) > this.range(u, a, from)) return bad('Out of range.');
    if (a.target === 'self' && distance(from, to) !== 0)
      return bad('This ability targets the caster.');
    const target = this.unitAt(to);
    if (a.target === 'fallen' && (!target || target.hp > 0 || target.team !== u.team))
      return bad('Choose a fallen ally.');
    if (
      a.target === 'enemy' &&
      a.radius === 0 &&
      (!target || target.team === u.team || target.hp <= 0)
    )
      return bad('Choose a standing enemy.');
    if (a.target === 'ally' && (!target || target.team !== u.team || target.hp <= 0))
      return bad('Choose a standing ally.');
    if (
      a.target === 'enemy' &&
      !target &&
      a.radius > 0 &&
      !this.living().some((t) => distance(t, to) <= a.radius)
    )
      return bad('No targets in this area.');
    if (a.type === 'physical' && a.id !== 'jump' && a.id !== 'quake') {
      if (
        this.range(u, a, from) <= 2 &&
        Math.abs((this.tile(from)?.h ?? 0) - (this.tile(to)?.h ?? 0)) > u.jump
      )
        return bad('Too much difference in height.');
      if (this.range(u, a, from) > 2 && !this.lineOfSight(from, to))
        return bad('The line of fire is blocked.');
    }
    const targets = this.battle.units.filter(
      (t) =>
        !t.removed &&
        (a.id !== 'cleave' || t.id !== u.id) &&
        distance(t.id === u.id ? from : t, to) <= a.radius &&
        (a.type === 'revive' ? t.hp === 0 && t.team === u.team : t.hp > 0) &&
        (a.type === 'heal' || a.type === 'buff' ? t.team === u.team : true)
    );
    let flank = '',
      chance = 100,
      amount = 0;
    const t = target ?? targets[0];
    if (t) {
      if (a.type === 'physical') {
        const d = dirs[t.facing],
          dx = from.x - t.x,
          dz = from.z - t.z,
          dot = d.x * dx + d.z * dz;
        flank = dot < 0 ? 'Back attack' : dot === 0 ? 'Side attack' : 'Front attack';
        chance = dot < 0 ? 100 : dot === 0 ? 95 : 90;
        if (this.isCharging(t)) chance = 100;
        amount = Math.round(
          Math.max(5, u.atk * a.power - (a.id === 'aim' ? t.def * 0.4 : t.def)) *
            (dot < 0 ? 1.25 : dot === 0 ? 1.1 : 1) *
            (1 +
              Math.max(
                -0.15,
                Math.min(0.3, ((this.tile(from)?.h ?? 0) - (this.tile(t)?.h ?? 0)) * 0.1)
              ))
        );
        if (this.isCharging(t)) amount = Math.round(amount * 1.5);
      } else if (a.type === 'magic') amount = Math.round(u.mag * a.power - t.def * 0.3);
      else if (a.type === 'heal')
        amount = Math.min(t.maxHp - t.hp, a.item ? a.power : Math.round(u.mag * a.power + 15));
      else if (a.type === 'revive') amount = Math.round(t.maxHp * 0.5);
      else if (a.id === 'ether') amount = Math.min(t.maxMp - t.mp, a.power);
      if ((a.type === 'physical' || a.type === 'magic') && u.statuses.focus)
        amount = Math.round(amount * 1.35);
      if ((a.type === 'physical' || a.type === 'magic') && t.statuses.guard)
        amount = Math.round(amount * 0.55);
    }
    return { valid: true, reason: '', amount, chance, flank, targets };
  }
  perform(id: string, to: Point): boolean {
    const b = this.battle,
      u = this.active,
      a = ABILITIES[id];
    if (
      !u ||
      !a ||
      b.acted ||
      b.result ||
      u.hp <= 0 ||
      this.isCharging(u) ||
      !this.skills(u).some((s) => s.id === id)
    )
      return false;
    const p = this.preview(u, a, to);
    if (!p.valid) return false;
    b.acted = true;
    u.mp -= a.mp;
    if (a.item) b.inventory[a.item]--;
    if (distance(u, to) > 0) u.facing = this.facing(u, to);
    if (a.charge) {
      b.casts.push({
        id: b.ticks * 100 + b.turn,
        caster: u.id,
        ability: id,
        target: { ...to },
        due: b.ticks + a.charge
      });
      this.log(`${u.name} prepares ${a.name} (${a.charge} ticks).`);
      this.effects.push({ target: u.id, text: a.name, kind: 'cast' });
    } else this.resolve(u, a, to);
    u.xp += 12;
    u.jp += 8;
    this.checkResult();
    return true;
  }
  resolve(u: Unit, a: Ability, to: Point) {
    // Resources and range were checked when committed; a delayed spell resolves at its fixed tile.
    const targets = this.battle.units.filter(
      (t) =>
        !t.removed &&
        (a.id !== 'cleave' || t.id !== u.id) &&
        distance(t, to) <= a.radius &&
        (a.type === 'revive' ? t.hp === 0 && t.team === u.team : t.hp > 0) &&
        (a.type === 'heal' || a.type === 'buff' ? t.team === u.team : true)
    );
    this.log(`${u.name} uses ${a.name}.`);
    if (!targets.length) this.log('The marked ground is empty.');
    for (const t of targets) {
      if (a.type === 'heal') {
        const amount = a.item ? a.power : Math.round(u.mag * a.power + 15),
          actual = Math.min(t.maxHp - t.hp, amount);
        t.hp += actual;
        if (a.id === 'chakra') u.mp = Math.min(u.maxMp, u.mp + 12);
        this.effects.push({ target: t.id, text: `+${actual}`, kind: 'heal' });
        this.log(`${t.name} recovers ${actual} HP.`);
      } else if (a.type === 'revive') {
        t.hp = Math.round(t.maxHp * 0.5);
        t.down = 3;
        this.effects.push({ target: t.id, text: 'Revived', kind: 'heal' });
        this.log(`${t.name} returns to the fight.`);
      } else if (a.type === 'buff') {
        if (a.id === 'ether') {
          const actual = Math.min(t.maxMp - t.mp, a.power);
          t.mp += actual;
          this.effects.push({ target: t.id, text: `+${actual} MP`, kind: 'buff' });
        }
        if (a.status) {
          t.statuses[a.status] =
            a.status === 'haste' || (a.status === 'focus' && t.id === u.id) ? 3 : 2;
          this.effects.push({ target: t.id, text: a.status, kind: 'buff' });
        }
      } else {
        // Friendly fire still uses the same damage formula even though ally targeting is disallowed in the UI.
        const d = dirs[t.facing],
          dot = d.x * (u.x - t.x) + d.z * (u.z - t.z);
        let amount =
          a.type === 'magic'
            ? Math.round(u.mag * a.power - t.def * 0.3)
            : Math.round(
                Math.max(5, u.atk * a.power - (a.id === 'aim' ? t.def * 0.4 : t.def)) *
                  (dot < 0 ? 1.25 : dot === 0 ? 1.1 : 1) *
                  (1 +
                    Math.max(
                      -0.15,
                      Math.min(0.3, ((this.tile(u)?.h ?? 0) - (this.tile(t)?.h ?? 0)) * 0.1)
                    ))
              );
        if (a.type === 'physical' && this.isCharging(t)) amount = Math.round(amount * 1.5);
        if (u.statuses.focus) amount = Math.round(amount * 1.35);
        if (t.statuses.guard) amount = Math.round(amount * 0.55);
        const chance =
          a.type === 'magic' || this.isCharging(t) ? 100 : dot < 0 ? 100 : dot === 0 ? 95 : 90;
        if (this.random() * 100 >= chance) {
          this.effects.push({ target: t.id, text: 'Evaded', kind: 'miss' });
          this.log(`${t.name} evades.`);
          continue;
        }
        t.hp = Math.max(0, t.hp - amount);
        this.effects.push({ target: t.id, text: `−${amount}`, kind: 'damage' });
        this.log(`${t.name} takes ${amount} damage.`);
        if (a.status && t.hp > 0) t.statuses[a.status] = a.status === 'poison' ? 3 : 2;
        if (t.hp === 0) {
          t.down = 3;
          t.statuses = {};
          this.battle.casts = this.battle.casts.filter((c) => c.caster !== t.id);
          if (t.team === 'ally') this.battle.casualties++;
          this.log(`${t.name} falls. Three personal turns remain to revive.`);
        }
      }
    }
  }
  checkResult() {
    const b = this.battle,
      m = MISSIONS[b.mission];
    if (b.result) return;
    if (!this.living('ally').length) b.result = 'defeat';
    else if (
      !this.living('enemy').length ||
      (m.objectiveType !== 'rout' && !this.living('enemy').some((u) => u.boss)) ||
      (m.objectiveType === 'survive' && b.turn >= (m.limit ?? 32))
    )
      b.result = 'victory';
    if (b.result) {
      b.active = null;
      this.log(b.result === 'victory' ? 'The field is yours.' : 'The company must regroup.');
    }
  }
  endTurn(facing?: Facing, guard = false) {
    const u = this.active,
      b = this.battle;
    if (!u || b.result) return;
    if (facing) u.facing = facing;
    if (u.statuses.focus) {
      u.statuses.focus--;
      if (u.statuses.focus <= 0) delete u.statuses.focus;
    }
    if (guard && !b.acted && !this.isCharging(u)) {
      u.statuses.guard = 1;
      b.acted = true;
      this.log(`${u.name} takes a defensive stance.`);
    }
    u.ct = Math.max(0, u.ct - (b.moved && b.acted ? 100 : b.moved || b.acted ? 80 : 60));
    b.active = null;
    this.nextTurn();
  }
  nextTurn() {
    const b = this.battle;
    if (b.result || b.active) return;
    for (let safe = 0; safe < 1000; safe++) {
      this.checkResult();
      if (b.result) return;
      const ready = b.units.filter((u) => !u.removed && u.ct >= 100).sort((a, b) => b.ct - a.ct);
      if (ready.length) {
        const u = ready[0];
        if (u.hp <= 0) {
          u.down--;
          u.ct -= 100;
          if (u.down <= 0) {
            u.removed = true;
            this.log(`${u.name} withdraws from the battle.`);
          }
          continue;
        }
        for (const s of Object.keys(u.statuses) as StatusId[]) {
          if (s === 'focus') continue;
          if (s === 'poison') {
            const damage = Math.ceil(u.maxHp * 0.1);
            u.hp = Math.max(0, u.hp - damage);
            this.effects.push({ target: u.id, text: `−${damage}`, kind: 'damage' });
            this.log(`${u.name} takes ${damage} poison damage.`);
          }
          u.statuses[s]!--;
          if (u.statuses[s]! <= 0) delete u.statuses[s];
        }
        if (u.hp <= 0) {
          u.down = 3;
          b.casts = b.casts.filter((c) => c.caster !== u.id);
          if (u.team === 'ally') b.casualties++;
          this.checkResult();
          continue;
        }
        u.mp = Math.min(u.maxMp, u.mp + 2);
        b.active = u.id;
        b.moved = false;
        b.acted = false;
        b.moveOrigin = null;
        b.turn++;
        this.checkResult();
        return;
      }
      b.ticks++;
      for (const u of b.units)
        if (!u.removed)
          u.ct += Math.max(
            1,
            Math.round(u.speed * (u.statuses.haste ? 1.5 : 1) * (u.statuses.slow ? 0.65 : 1))
          );
      const due = b.casts.filter((c) => c.due <= b.ticks);
      b.casts = b.casts.filter((c) => c.due > b.ticks);
      for (const c of due) {
        const u = b.units.find((u) => u.id === c.caster);
        if (u && u.hp > 0) this.resolve(u, ABILITIES[c.ability], c.target);
      }
    }
    throw new Error('Initiative could not advance.');
  }
  turnOrder(
    count = 8
  ): { id: string; name: string; team: string; job: JobId; inTicks: number; cast?: string }[] {
    const result: {
        id: string;
        name: string;
        team: string;
        job: JobId;
        inTicks: number;
        cast?: string;
      }[] = [],
      units = this.living().map((u) => ({
        ...u,
        ct: u.ct - (u.id === this.battle.active ? 100 : 0)
      }));
    if (this.active)
      result.push({
        id: this.active.id,
        name: this.active.name,
        team: this.active.team,
        job: this.active.job,
        inTicks: 0
      });
    for (let tick = 0; tick < 100 && result.length < count; tick++) {
      for (const c of this.battle.casts.filter((c) => c.due - this.battle.ticks === tick)) {
        const u = this.battle.units.find((u) => u.id === c.caster)!;
        result.push({
          id: `cast-${c.id}`,
          name: ABILITIES[c.ability].name,
          team: u.team,
          job: u.job,
          inTicks: tick,
          cast: c.ability
        });
      }
      let r = units.filter((u) => u.ct >= 100).sort((a, b) => b.ct - a.ct);
      for (const u of r) {
        result.push({ id: u.id, name: u.name, team: u.team, job: u.job, inTicks: tick });
        u.ct -= 100;
      }
      for (const u of units)
        u.ct += Math.round(u.speed * (u.statuses.haste ? 1.5 : 1) * (u.statuses.slow ? 0.65 : 1));
    }
    return result.slice(0, count);
  }
  planAI(u: Unit): { to: Point; ability?: string; target?: Point; score: number } {
    const foes = this.living(u.team === 'ally' ? 'enemy' : 'ally'),
      friends = this.battle.units.filter((t) => t.team === u.team && !t.removed);
    const positions = [
      { x: u.x, z: u.z },
      ...(this.battle.moved
        ? []
        : Array.from(this.reachable(u).values())
            .filter((p) => p.length)
            .map((p) => p.at(-1)!))
    ];
    let best = { to: { x: u.x, z: u.z }, score: -Infinity } as {
      to: Point;
      ability?: string;
      target?: Point;
      score: number;
    };
    for (const pos of positions) {
      const near = Math.min(...foes.map((t) => distance(pos, t))),
        height = this.tile(pos)?.h ?? 0;
      let score = -near * 1.9 + height * 0.2;
      for (const c of this.battle.casts)
        if (distance(pos, c.target) <= ABILITIES[c.ability].radius) score -= 20;
      if (score > best.score) best = { to: pos, score };
      if (this.isCharging(u) || this.battle.acted) continue;
      for (const a of this.skills(u).filter((a) => u.team === 'ally' || !a.item)) {
        const targets =
          a.target === 'self' ? [u] : a.target === 'ally' || a.target === 'fallen' ? friends : foes;
        for (const target of targets) {
          const tp = target.id === u.id ? pos : target,
            p = this.preview(u, a, tp, pos);
          if (!p.valid) continue;
          let value = 0;
          if (a.type === 'heal')
            value =
              Math.min(target.maxHp - target.hp, p.amount) * 1.2 -
              (target.hp / target.maxHp > 0.75 ? 35 : 0);
          else if (a.type === 'revive') value = 65;
          else if (a.type === 'buff')
            value =
              a.id === 'ether'
                ? target.maxMp - target.mp > 18
                  ? 22
                  : -20
                : a.status && !target.statuses[a.status]
                  ? 12
                  : -20;
          else {
            for (const t of p.targets) {
              const d = Math.min(t.hp, p.amount);
              value += (t.team !== u.team ? 1 : -1.6) * (d + (d >= t.hp ? 25 : 0));
            }
            if (a.charge) {
              const targetWait = Math.ceil(
                (100 - target.ct) /
                  (target.speed *
                    (target.statuses.haste ? 1.5 : 1) *
                    (target.statuses.slow ? 0.65 : 1))
              );
              value *= targetWait <= a.charge && !this.isCharging(target) ? 0.45 : 0.92;
            }
          }
          value -= a.mp * 0.2;
          if (a.item) value -= 10;
          const total = value + score * 0.25;
          if (total > best.score && value > 0)
            best = { to: pos, ability: a.id, target: { x: tp.x, z: tp.z }, score: total };
        }
      }
    }
    return best;
  }
  runAI() {
    const u = this.active;
    if (!u || this.battle.result) return;
    const plan = this.planAI(u);
    if (distance(u, plan.to)) this.move(plan.to);
    if (plan.ability && plan.target) this.perform(plan.ability, plan.target);
    if (!this.battle.result) {
      const target = this.living(u.team === 'ally' ? 'enemy' : 'ally').sort(
        (a, b) => distance(u, a) - distance(u, b)
      )[0];
      this.endTurn(target ? this.facing(u, target) : u.facing, !this.battle.acted);
    }
  }
}
export function awardVictory(c: Campaign): BattleReward | null {
  const b = c.battle;
  if (!b || b.result !== 'victory' || b.rewarded) return null;
  const m = MISSIONS[b.mission],
    first = !c.completed.includes(m.id),
    coins = first ? m.reward : Math.round(m.reward * 0.4),
    xp = first ? 65 + m.id * 8 : 35,
    jp = first ? 45 : 20;
  const stars = b.casualties === 0 ? 3 : b.casualties <= 2 ? 2 : 1;
  c.coins += coins;
  c.inventory = { ...b.inventory };
  c.inventory.potion += 2;
  c.inventory.ether += 1;
  for (const u of b.units.filter((u) => u.team === 'ally')) {
    const h = c.heroes.find((h) => h.id === u.id)!;
    h.xp += xp + u.xp;
    h.jp += jp + u.jp;
    while (h.xp >= 100 && h.level < 20) {
      h.xp -= 100;
      h.level++;
    }
    if (h.level === 20) h.xp = Math.min(h.xp, 99);
  }
  if (first) c.completed.push(m.id);
  c.completed.sort((a, b) => a - b);
  c.stars[m.id] = Math.max(c.stars[m.id] ?? 0, stars);
  c.victories++;
  b.rewarded = true;
  b.reward = { coins, xp, jp, stars, first };
  return b.reward;
}
export function changeJob(c: Campaign, id: string, job: JobId) {
  const h = c.heroes.find((h) => h.id === id),
    j = JOBS[job];
  if (!h || !j || j.unlock > c.completed.length || (c.battle && !c.battle.result)) return false;
  h.job = job;
  if (h.secondary === job) h.secondary = null;
  const base = j.skills[0];
  if (!h.learned.includes(base)) h.learned.push(base);
  return true;
}
export function learn(c: Campaign, id: string, ability: string) {
  const h = c.heroes.find((h) => h.id === id),
    a = ABILITIES[ability];
  if (
    !h ||
    !a ||
    h.learned.includes(ability) ||
    h.jp < a.jp ||
    a.job !== h.job ||
    (c.battle && !c.battle.result)
  )
    return false;
  h.jp -= a.jp;
  h.learned.push(ability);
  return true;
}
export function purchase(c: Campaign, id: string, heroId: string) {
  const item = SHOP.find((i) => i.id === id),
    h = c.heroes.find((h) => h.id === heroId);
  if (!item || !h || c.coins < item.price || (c.battle && !c.battle.result)) return false;
  if ((id === 'weapon' || id === 'armor') && h[id] >= 3) return false;
  if ((id === 'boots' || id === 'charm') && h.charm === id) return false;
  c.coins -= item.price;
  if (id === 'weapon' || id === 'armor') h[id]++;
  else if (id === 'boots' || id === 'charm') h.charm = id;
  else c.inventory[id] = (c.inventory[id] ?? 0) + 1;
  return true;
}
export function validateSave(value: unknown): Campaign | null {
  try {
    if (!value || typeof value !== 'object') return null;
    const c = value as Campaign;
    if (
      c.version !== 1 ||
      !Array.isArray(c.heroes) ||
      c.heroes.length !== 6 ||
      !Array.isArray(c.completed) ||
      !Array.isArray(c.selected) ||
      c.selected.length !== 4 ||
      new Set(c.selected).size !== 4
    )
      return null;
    if (!Number.isFinite(c.coins) || c.coins < 0 || !c.inventory || !c.settings || !c.stars)
      return null;
    if (
      !['story', 'classic', 'tactician'].includes(c.settings.difficulty) ||
      ![1, 2].includes(c.settings.speed) ||
      !['auto', 'high', 'low'].includes(c.settings.quality)
    )
      return null;
    if (c.completed.some((n, i) => n !== i) || c.completed.length > 6) return null;
    for (const k of ['potion', 'ether', 'feather'])
      if (!Number.isInteger(c.inventory[k]) || c.inventory[k] < 0) return null;
    for (const h of c.heroes) {
      if (
        !STARTING_HEROES.some((s) => s.id === h.id) ||
        !JOBS[h.job] ||
        !Number.isInteger(h.level) ||
        h.level < 1 ||
        h.level > 20 ||
        !Number.isFinite(h.jp) ||
        !Array.isArray(h.learned) ||
        h.learned.some((id) => !ABILITIES[id])
      )
        return null;
    }
    if (
      new Set(c.heroes.map((h) => h.id)).size !== 6 ||
      c.selected.some((id) => !c.heroes.some((h) => h.id === id))
    )
      return null;
    if (c.battle) {
      const b = c.battle;
      if (
        !MISSIONS[b.mission] ||
        !Array.isArray(b.units) ||
        !b.units.length ||
        !Array.isArray(b.casts) ||
        !Array.isArray(b.log) ||
        !b.inventory ||
        !b.startingInventory ||
        !Number.isFinite(b.ticks) ||
        !Number.isFinite(b.seed)
      )
        return null;
      for (const u of b.units) {
        if (
          !JOBS[u.job] ||
          !Number.isFinite(u.hp) ||
          !Number.isFinite(u.ct) ||
          !u.statuses ||
          !Array.isArray(u.learned) ||
          !MISSIONS[b.mission].tiles.some((t) => t.x === u.x && t.z === u.z)
        )
          return null;
      }
      if (b.active && !b.units.some((u) => u.id === b.active)) return null;
      for (const cast of b.casts)
        if (
          !ABILITIES[cast.ability] ||
          !b.units.some((u) => u.id === cast.caster) ||
          !Number.isFinite(cast.due)
        )
          return null;
    }
    const integer = (n: unknown, min = 0, max = 1_000_000) =>
      typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
    if (
      !integer(c.coins) ||
      !integer(c.victories) ||
      typeof c.tutorial !== 'boolean' ||
      !Number.isFinite(c.savedAt)
    )
      return null;
    if (
      ['sound', 'music', 'reducedMotion'].some(
        (k) => typeof c.settings[k as keyof Settings] !== 'boolean'
      )
    )
      return null;
    if (
      Object.entries(c.stars).some(
        ([k, v]) => !c.completed.includes(Number(k)) || !integer(v, 1, 3)
      )
    )
      return null;
    for (const h of c.heroes) {
      const original = STARTING_HEROES.find((s) => s.id === h.id)!;
      if (
        h.name !== original.name ||
        h.surname !== original.surname ||
        h.description !== original.description ||
        h.color !== original.color ||
        h.available !== original.available
      )
        return null;
      if (
        !integer(h.xp, 0, 99) ||
        !integer(h.jp) ||
        !integer(h.weapon, 0, 3) ||
        !integer(h.armor, 0, 3) ||
        !['none', 'boots', 'charm'].includes(h.charm) ||
        (h.secondary !== null && !JOBS[h.secondary])
      )
        return null;
      if (
        h.learned.length > Object.keys(ABILITIES).length ||
        new Set(h.learned).size !== h.learned.length
      )
        return null;
    }
    if (c.selected.some((id) => c.heroes.find((h) => h.id === id)!.available > c.completed.length))
      return null;
    if (c.battle) {
      const b = c.battle,
        m = MISSIONS[b.mission];
      if (
        b.reward &&
        (!b.rewarded ||
          b.result !== 'victory' ||
          !integer(b.reward.coins) ||
          !integer(b.reward.xp) ||
          !integer(b.reward.jp) ||
          !integer(b.reward.stars, 1, 3) ||
          typeof b.reward.first !== 'boolean')
      )
        return null;
      if (
        ![null, 'victory', 'defeat'].includes(b.result) ||
        !integer(b.turn) ||
        !integer(b.ticks) ||
        !integer(b.casualties) ||
        typeof b.acted !== 'boolean' ||
        typeof b.moved !== 'boolean' ||
        typeof b.rewarded !== 'boolean'
      )
        return null;
      if (
        b.units.length !== 4 + m.enemies.length ||
        new Set(b.units.map((u) => u.id)).size !== b.units.length ||
        new Set(b.units.filter((u) => !u.removed).map(key)).size !==
          b.units.filter((u) => !u.removed).length
      )
        return null;
      if (b.log.length > 70 || b.log.some((s) => typeof s !== 'string' || s.length > 1000))
        return null;
      for (const inv of [b.inventory, b.startingInventory])
        if (['potion', 'ether', 'feather'].some((k) => !integer(inv[k]))) return null;
      for (const u of b.units) {
        const original =
          u.team === 'ally'
            ? c.heroes.find((h) => h.id === u.id)
            : m.enemies[Number(u.id.replace('enemy-', ''))];
        if (
          !original ||
          u.name !== original.name ||
          !['ally', 'enemy'].includes(u.team) ||
          !Object.hasOwn(dirs, u.facing)
        )
          return null;
        if (u.team === 'ally' && !c.selected.includes(u.id)) return null;
        for (const n of [
          u.hp,
          u.maxHp,
          u.mp,
          u.maxMp,
          u.atk,
          u.mag,
          u.def,
          u.speed,
          u.ct,
          u.xp,
          u.jp
        ])
          if (!integer(n, 0, 10000)) return null;
        if (
          u.maxHp < 1 ||
          u.hp > u.maxHp ||
          u.mp > u.maxMp ||
          !integer(u.move, 1, 10) ||
          !integer(u.jump, 0, 5) ||
          !integer(u.range, 1, 8) ||
          !integer(u.down, 0, 3) ||
          typeof u.removed !== 'boolean' ||
          typeof u.boss !== 'boolean'
        )
          return null;
        if (
          u.learned.some((id) => !ABILITIES[id]) ||
          Object.entries(u.statuses).some(
            ([k, v]) =>
              !['guard', 'haste', 'slow', 'poison', 'focus'].includes(k) || !integer(v, 1, 3)
          )
        )
          return null;
      }
      for (const cast of b.casts)
        if (
          !m.tiles.some((t) => !t.blocked && t.x === cast.target?.x && t.z === cast.target?.z) ||
          !integer(cast.due)
        )
          return null;
      if (
        b.moveOrigin &&
        !m.tiles.some((t) => !t.blocked && t.x === b.moveOrigin!.x && t.z === b.moveOrigin!.z)
      )
        return null;
    }
    return c;
  } catch {
    return null;
  }
}
