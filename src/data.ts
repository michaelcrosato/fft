export type JobId = 'vanguard' | 'ranger' | 'arcanist' | 'cleric' | 'monk' | 'dragoon';
export type Facing = 'north' | 'east' | 'south' | 'west';
export type StatusId = 'guard' | 'haste' | 'slow' | 'poison' | 'focus';
export type Point = { x: number; z: number };
export type Terrain = 'grass' | 'stone' | 'water' | 'wood' | 'sand';
export interface Tile extends Point {
  h: number;
  terrain: Terrain;
  blocked?: boolean;
  decor?: string;
}
export interface Ability {
  id: string;
  name: string;
  description: string;
  icon: string;
  range: number;
  power: number;
  mp: number;
  radius: number;
  charge: number;
  type: 'physical' | 'magic' | 'heal' | 'revive' | 'buff';
  target: 'enemy' | 'ally' | 'self' | 'fallen';
  status?: StatusId;
  jp: number;
  job?: JobId;
  item?: string;
}
export interface Job {
  id: JobId;
  name: string;
  epithet: string;
  description: string;
  color: string;
  icon: string;
  hp: number;
  mp: number;
  atk: number;
  mag: number;
  def: number;
  speed: number;
  move: number;
  jump: number;
  range: number;
  unlock: number;
  skills: string[];
}
export const JOBS: Record<JobId, Job> = {
  vanguard: {
    id: 'vanguard',
    name: 'Vanguard',
    epithet: 'The steadfast blade',
    description: 'Hold the line. Break armor. Give your friends a fighting chance.',
    color: '#547f93',
    icon: 'sword',
    hp: 115,
    mp: 22,
    atk: 27,
    mag: 12,
    def: 10,
    speed: 10,
    move: 4,
    jump: 1,
    range: 1,
    unlock: 0,
    skills: ['rend', 'rally', 'cleave']
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    epithet: 'An arrow from above',
    description: 'Take the high ground and pick apart the enemy from a distance.',
    color: '#66815c',
    icon: 'bow',
    hp: 86,
    mp: 28,
    atk: 23,
    mag: 13,
    def: 6,
    speed: 11,
    move: 4,
    jump: 2,
    range: 4,
    unlock: 0,
    skills: ['aim', 'venom', 'volley']
  },
  arcanist: {
    id: 'arcanist',
    name: 'Arcanist',
    epithet: 'A spark becomes a storm',
    description: 'Shape destructive magick. Mind your allies inside the blast.',
    color: '#88709a',
    icon: 'spark',
    hp: 74,
    mp: 60,
    atk: 13,
    mag: 31,
    def: 4,
    speed: 9,
    move: 3,
    jump: 1,
    range: 1,
    unlock: 0,
    skills: ['ember', 'frost', 'tempest']
  },
  cleric: {
    id: 'cleric',
    name: 'Cleric',
    epithet: 'A light in the dark',
    description: 'Mend wounds, restore the fallen, and turn faith into strength.',
    color: '#d7c398',
    icon: 'sun',
    hp: 86,
    mp: 56,
    atk: 16,
    mag: 27,
    def: 6,
    speed: 10,
    move: 3,
    jump: 1,
    range: 1,
    unlock: 0,
    skills: ['mend', 'revive', 'sanctuary']
  },
  monk: {
    id: 'monk',
    name: 'Monk',
    epithet: 'An unbroken spirit',
    description: 'Fast feet and bare fists. Restore your strength without magick.',
    color: '#b47752',
    icon: 'fist',
    hp: 108,
    mp: 28,
    atk: 29,
    mag: 20,
    def: 7,
    speed: 12,
    move: 5,
    jump: 2,
    range: 1,
    unlock: 2,
    skills: ['wave', 'chakra', 'haste']
  },
  dragoon: {
    id: 'dragoon',
    name: 'Dragoon',
    epithet: 'The sky is no refuge',
    description: 'A long-reaching spear and a devastating leap over the front line.',
    color: '#687d92',
    icon: 'spear',
    hp: 116,
    mp: 36,
    atk: 30,
    mag: 15,
    def: 11,
    speed: 9,
    move: 4,
    jump: 3,
    range: 2,
    unlock: 3,
    skills: ['lance', 'jump', 'quake']
  }
};
const skill = (
  id: string,
  name: string,
  description: string,
  icon: string,
  range: number,
  power: number,
  mp: number,
  radius: number,
  charge: number,
  type: Ability['type'],
  target: Ability['target'],
  jp: number,
  job?: JobId,
  status?: StatusId
): Ability => ({
  id,
  name,
  description,
  icon,
  range,
  power,
  mp,
  radius,
  charge,
  type,
  target,
  jp,
  job,
  status
});
export const ABILITIES: Record<string, Ability> = Object.fromEntries(
  [
    skill(
      'attack',
      'Attack',
      'Strike with your equipped weapon. Flanking deals extra damage.',
      'sword',
      1,
      1,
      0,
      0,
      0,
      'physical',
      'enemy',
      0
    ),
    skill(
      'rend',
      'Armor break',
      'A heavy strike that slows the target for two turns.',
      'sword',
      1,
      1.25,
      5,
      0,
      0,
      'physical',
      'enemy',
      0,
      'vanguard',
      'slow'
    ),
    skill(
      'rally',
      'Rally',
      'Raise an ally’s damage by 35% for two turns.',
      'flag',
      3,
      0,
      6,
      0,
      0,
      'buff',
      'ally',
      60,
      'vanguard',
      'focus'
    ),
    skill(
      'cleave',
      'Crescent blade',
      'Sweep a cross-shaped area. Allies in the arc are also hit.',
      'sword',
      1,
      1.3,
      10,
      1,
      0,
      'physical',
      'enemy',
      110,
      'vanguard'
    ),
    skill(
      'aim',
      'True shot',
      'A carefully aimed arrow that ignores part of the target’s armor.',
      'bow',
      5,
      1.4,
      5,
      0,
      0,
      'physical',
      'enemy',
      0,
      'ranger'
    ),
    skill(
      'venom',
      'Briar arrow',
      'Poison an enemy for three turns.',
      'leaf',
      4,
      0.95,
      6,
      0,
      0,
      'physical',
      'enemy',
      60,
      'ranger',
      'poison'
    ),
    skill(
      'volley',
      'Arrow rain',
      'Arrows rain down on a cross-shaped area after 3 clock ticks.',
      'bow',
      5,
      1.5,
      12,
      1,
      3,
      'physical',
      'enemy',
      110,
      'ranger'
    ),
    skill(
      'ember',
      'Ember',
      'A charged burst of flame. Hits everyone in the marked area.',
      'flame',
      4,
      1.35,
      9,
      1,
      3,
      'magic',
      'enemy',
      0,
      'arcanist'
    ),
    skill(
      'frost',
      'Winter bind',
      'An instant ice spell that slows a single enemy.',
      'snow',
      4,
      1.05,
      8,
      0,
      0,
      'magic',
      'enemy',
      60,
      'arcanist',
      'slow'
    ),
    skill(
      'tempest',
      'Tempest',
      'A powerful, wide storm. Keep your allies clear of its reach.',
      'spark',
      5,
      1.65,
      18,
      2,
      5,
      'magic',
      'enemy',
      110,
      'arcanist'
    ),
    skill(
      'mend',
      'Mend',
      'Restore an ally’s HP with a gentle light.',
      'sun',
      4,
      1.5,
      7,
      0,
      0,
      'heal',
      'ally',
      0,
      'cleric'
    ),
    skill(
      'revive',
      'Rekindle',
      'Return a fallen ally to battle at half health.',
      'feather',
      4,
      0.5,
      13,
      0,
      2,
      'revive',
      'fallen',
      60,
      'cleric'
    ),
    skill(
      'sanctuary',
      'Sanctuary',
      'Heal allies in a cross-shaped area.',
      'sun',
      4,
      1.25,
      14,
      1,
      2,
      'heal',
      'ally',
      110,
      'cleric'
    ),
    skill(
      'wave',
      'Aura fist',
      'A focused strike that reaches across three tiles.',
      'fist',
      3,
      1.15,
      0,
      0,
      0,
      'physical',
      'enemy',
      0,
      'monk'
    ),
    skill(
      'chakra',
      'Chakra',
      'Restore your HP and 12 MP.',
      'sun',
      0,
      1.1,
      0,
      0,
      0,
      'heal',
      'self',
      60,
      'monk'
    ),
    skill(
      'haste',
      'Windstep',
      'Hasten an ally for three turns.',
      'wind',
      3,
      0,
      6,
      0,
      0,
      'buff',
      'ally',
      110,
      'monk',
      'haste'
    ),
    skill(
      'lance',
      'Piercing lance',
      'A powerful spear thrust from two tiles away.',
      'spear',
      2,
      1.3,
      5,
      0,
      0,
      'physical',
      'enemy',
      0,
      'dragoon'
    ),
    skill(
      'jump',
      'Skyfall',
      'A charged spear strike that ignores terrain and cover.',
      'feather',
      5,
      1.8,
      9,
      0,
      4,
      'physical',
      'enemy',
      60,
      'dragoon'
    ),
    skill(
      'quake',
      'Earthshaker',
      'Shatter the ground beneath an enemy formation.',
      'mountain',
      3,
      1.45,
      14,
      1,
      3,
      'physical',
      'enemy',
      110,
      'dragoon'
    ),
    {
      ...skill(
        'potion',
        'Tonic',
        'Restore 55 HP to yourself or an adjacent ally.',
        'flask',
        1,
        55,
        0,
        0,
        0,
        'heal',
        'ally',
        0
      ),
      item: 'potion'
    },
    {
      ...skill(
        'ether',
        'Aether vial',
        'Restore 25 MP to yourself or an adjacent ally.',
        'flask',
        1,
        25,
        0,
        0,
        0,
        'buff',
        'ally',
        0
      ),
      item: 'ether'
    },
    {
      ...skill(
        'feather',
        'Dawn feather',
        'Revive an adjacent ally at half health.',
        'feather',
        1,
        0.5,
        0,
        0,
        0,
        'revive',
        'fallen',
        0
      ),
      item: 'feather'
    }
  ].map((s) => [s.id, s])
);

export interface Hero {
  id: string;
  name: string;
  surname: string;
  description: string;
  job: JobId;
  secondary: JobId | null;
  level: number;
  xp: number;
  jp: number;
  learned: string[];
  weapon: number;
  armor: number;
  charm: string;
  available: number;
  color: string;
}
export const STARTING_HEROES: Hero[] = [
  {
    id: 'rowan',
    name: 'Rowan',
    surname: 'of the Cinders',
    description: 'A knight without a banner. Still deciding what is worth fighting for.',
    job: 'vanguard',
    secondary: null,
    level: 1,
    xp: 0,
    jp: 70,
    learned: ['rend'],
    weapon: 0,
    armor: 0,
    charm: 'none',
    available: 0,
    color: '#668ea0'
  },
  {
    id: 'wren',
    name: 'Wren',
    surname: 'the Wayward',
    description: 'A poacher with excellent aim and a deeply inconvenient conscience.',
    job: 'ranger',
    secondary: null,
    level: 1,
    xp: 0,
    jp: 70,
    learned: ['aim'],
    weapon: 0,
    armor: 0,
    charm: 'none',
    available: 0,
    color: '#738959'
  },
  {
    id: 'pip',
    name: 'Pip',
    surname: 'Ashwick',
    description: 'An apprentice who burned down a library. It was a very small library.',
    job: 'arcanist',
    secondary: null,
    level: 1,
    xp: 0,
    jp: 70,
    learned: ['ember'],
    weapon: 0,
    armor: 0,
    charm: 'none',
    available: 0,
    color: '#8c789d'
  },
  {
    id: 'alma',
    name: 'Alma',
    surname: 'of the Orchard',
    description: 'A village healer. She has mended soldiers from both sides of the war.',
    job: 'cleric',
    secondary: null,
    level: 1,
    xp: 0,
    jp: 70,
    learned: ['mend', 'revive'],
    weapon: 0,
    armor: 0,
    charm: 'none',
    available: 0,
    color: '#d4bd87'
  },
  {
    id: 'bram',
    name: 'Bram',
    surname: 'Stonehand',
    description: 'Once a royal guard, now a ferryman. His fists remember the old work.',
    job: 'monk',
    secondary: null,
    level: 2,
    xp: 0,
    jp: 90,
    learned: ['wave', 'chakra'],
    weapon: 0,
    armor: 0,
    charm: 'none',
    available: 2,
    color: '#b67b56'
  },
  {
    id: 'ida',
    name: 'Ida',
    surname: 'the Skylark',
    description: 'A deserter from the high guard. She has finally found a worthy cause.',
    job: 'dragoon',
    secondary: null,
    level: 3,
    xp: 0,
    jp: 90,
    learned: ['lance', 'jump'],
    weapon: 0,
    armor: 0,
    charm: 'none',
    available: 3,
    color: '#77939f'
  }
];
export interface EnemySpawn extends Point {
  job: JobId;
  name: string;
  level: number;
  boss?: boolean;
}
export interface Mission {
  id: number;
  name: string;
  subtitle: string;
  region: string;
  tagline: string;
  description: string;
  objective: string;
  objectiveType: 'rout' | 'leader' | 'survive';
  limit?: number;
  reward: number;
  sky: string;
  theme: string;
  intro: { who: string; text: string }[];
  outro: string;
  enemies: EnemySpawn[];
  tiles: Tile[];
  spawns: Point[];
}
export function makeMap(theme: string): Tile[] {
  const tiles: Tile[] = [];
  for (let z = 0; z < 10; z++)
    for (let x = 0; x < 12; x++) {
      const t: Tile = { x, z, h: 0, terrain: 'grass' };
      if ((x >= 3 && x <= 8) || (z >= 4 && z <= 6)) t.terrain = 'stone';
      if (z <= 2) t.h = 1;
      if (z <= 1 && x >= 5) t.h = 2;
      if (theme === 'river') {
        t.terrain = 'grass';
        t.h = 0;
        if (x === 5 || x === 6) {
          t.terrain = 'water';
          t.blocked = true;
        }
        if (z === 4 || z === 5) {
          t.terrain = x === 5 || x === 6 ? 'wood' : 'stone';
          t.blocked = false;
        }
        if (x >= 9) t.h = 1;
      }
      if (theme === 'abbey') {
        t.terrain = 'stone';
        t.h = z < 3 ? 2 : z < 5 ? 1 : 0;
        if ((x === 2 || x === 9) && z > 2 && z < 8) {
          t.blocked = true;
          t.decor = 'pillar';
        }
      }
      if (theme === 'ridge') {
        t.terrain = 'sand';
        t.h = Math.max(0, Math.floor((10 - z) / 3)) + (x > 7 ? 1 : 0);
        if ((x < 2 || x > 10) && z % 3 === 1) {
          t.blocked = true;
          t.decor = 'rock';
        }
      }
      if (theme === 'fortress') {
        t.terrain = 'stone';
        t.h = z <= 2 ? 3 : z <= 4 ? 2 : z <= 6 ? 1 : 0;
        if (z === 3 && (x < 4 || x > 7)) {
          t.blocked = true;
          t.decor = 'wall';
        }
      }
      tiles.push(t);
    }
  const decor = (x: number, z: number, type: string) => {
    const t = tiles.find((t) => t.x === x && t.z === z)!;
    t.decor = type;
    t.blocked = true;
  };
  if (theme === 'town' || theme === 'market') {
    for (const t of tiles) {
      if (t.x >= 2 && t.x <= 4 && t.z <= 1) t.h = 3;
      else if (t.x >= 2 && t.x <= 4 && t.z === 2) t.h = 2;
      else if (t.x >= 2 && t.x <= 4 && t.z === 3) t.h = 1;
      if (t.x === 7 && t.z <= 1) t.h = 3;
      if (t.x === 8 && t.z <= 1) t.h = 4;
    }
    for (const [x, z] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [9, 0],
      [10, 0],
      [9, 1],
      [10, 1],
      [0, 6],
      [1, 6],
      [0, 7],
      [1, 7]
    ])
      decor(x, z, 'house-part');
    tiles.find((t) => t.x === 0 && t.z === 0)!.decor = 'house';
    tiles.find((t) => t.x === 9 && t.z === 0)!.decor = 'tower';
    tiles.find((t) => t.x === 0 && t.z === 6)!.decor = 'house';
    decor(10, 7, 'tree');
    decor(11, 3, 'tree');
    decor(1, 4, 'tree');
    decor(3, 1, 'cart');
    decor(8, 8, 'crates');
    if (theme === 'market') {
      decor(5, 4, 'fountain');
      decor(6, 4, 'crates');
    }
  } else {
    for (const [x, z] of [
      [0, 1],
      [11, 8],
      [1, 8],
      [10, 1]
    ])
      decor(x, z, theme === 'ridge' ? 'rock' : 'tree');
    if (theme === 'abbey') {
      decor(5, 0, 'altar');
      decor(6, 0, 'altar');
    }
    if (theme === 'river') {
      decor(2, 1, 'house');
      decor(3, 1, 'house-part');
      decor(2, 2, 'house-part');
      decor(3, 2, 'house-part');
      decor(10, 7, 'cart');
    }
    if (theme === 'fortress') {
      for (const x of [0, 10]) {
        decor(x, 0, 'tower');
        decor(x + 1, 0, 'house-part');
        decor(x, 1, 'house-part');
        decor(x + 1, 1, 'house-part');
      }
    }
  }
  return tiles;
}
const e = (
  job: JobId,
  name: string,
  x: number,
  z: number,
  level = 1,
  boss = false
): EnemySpawn => ({ job, name, x, z, level, boss });
export const MISSIONS: Mission[] = [
  {
    id: 0,
    name: 'The Bellwether Square',
    subtitle: 'A spark in Bellwether.',
    region: 'THE LOWLANDS',
    tagline: 'Every rebellion begins with a small act of courage.',
    description:
      'The tithe collectors have come for the town’s last grain. Four unlikely allies stand between the Crown and an empty winter.',
    objective: 'Defeat the Crown patrol',
    objectiveType: 'rout',
    reward: 240,
    sky: '#e5e5d8',
    theme: 'town',
    intro: [
      {
        who: 'Wren',
        text: 'A royal tithe, is it? Funny how the king grows richer every time our harvest fails.'
      },
      { who: 'Captain Voss', text: 'Stand aside, little birds. The grain belongs to the Crown.' },
      {
        who: 'Rowan',
        text: 'Then the Crown can come and carry it. These people have nothing left.'
      }
    ],
    outro:
      'The patrol flees. A baker presses a warm loaf into Rowan’s hands. By sundown, the whole valley knows: someone finally said no.',
    enemies: [
      e('vanguard', 'Crown levy', 5, 4),
      e('ranger', 'Watch archer', 8, 2),
      e('vanguard', 'Tithe guard', 7, 4)
    ],
    tiles: makeMap('town'),
    spawns: [
      { x: 4, z: 8 },
      { x: 6, z: 8 },
      { x: 3, z: 7 },
      { x: 5, z: 9 }
    ]
  },
  {
    id: 1,
    name: 'The Rooftop Accord',
    subtitle: 'Above the law.',
    region: 'OLD BELLWETHER',
    tagline: 'The city has eyes. Most of them carry bows.',
    description:
      'A stolen ledger proves the grain was never bound for the capital. Cross the old market and silence the collectors before it disappears.',
    objective: 'Defeat all the collectors',
    objectiveType: 'rout',
    reward: 300,
    sky: '#e9decc',
    theme: 'market',
    intro: [
      {
        who: 'Pip',
        text: 'According to this ledger, the starving kingdom owns six thousand bottles of very expensive wine.'
      },
      {
        who: 'Alma',
        text: 'Get it to the abbey. Sister Meriel can tell every village what the king has done.'
      },
      {
        who: 'Wren',
        text: 'Archers on the high stones. Keep your heads down. Especially your pointy one, Pip.'
      }
    ],
    outro:
      'The ledger survives, singed at the corners. At the river, a ferryman waits. “Bram,” he says. “I hear you could use another pair of hands.”',
    enemies: [
      e('ranger', 'Roof sentinel', 3, 2, 2),
      e('ranger', 'High watch', 8, 1, 2),
      e('arcanist', 'Court pyre', 6, 3, 1),
      e('vanguard', 'Collector', 7, 5, 2)
    ],
    tiles: makeMap('market'),
    spawns: [
      { x: 4, z: 8 },
      { x: 6, z: 8 },
      { x: 3, z: 7 },
      { x: 5, z: 9 }
    ]
  },
  {
    id: 2,
    name: 'The Saffron Crossing',
    subtitle: 'A bridge worth keeping.',
    region: 'THE SAFFRON RIVER',
    tagline: 'Some bridges are better left unburned.',
    description:
      'The ferries are gone. Hold the old crossing until the last villagers reach safety. The enemy captain carries the orders to burn it.',
    objective: 'Hold for 32 turns or defeat the captain',
    objectiveType: 'survive',
    limit: 32,
    reward: 360,
    sky: '#dbe8df',
    theme: 'river',
    intro: [
      {
        who: 'Bram',
        text: 'Built this bridge with my father. I won’t let them turn it to kindling.'
      },
      { who: 'Rowan', text: 'Get the villagers across. We hold until they are safe.' }
    ],
    outro:
      'The last wagon crosses as the sun sets. Among the refugees is Ida, a royal dragoon who chose exile over burning a village.',
    enemies: [
      e('vanguard', 'Bridge captain', 10, 4, 3, true),
      e('ranger', 'River sentry', 8, 3, 2),
      e('arcanist', 'Torchbearer', 9, 6, 2),
      e('vanguard', 'Crown pikeman', 7, 5, 2)
    ],
    tiles: makeMap('river'),
    spawns: [
      { x: 3, z: 4 },
      { x: 3, z: 5 },
      { x: 2, z: 3 },
      { x: 2, z: 6 }
    ]
  },
  {
    id: 3,
    name: 'The Hollow Abbey',
    subtitle: 'Faith without a crown.',
    region: 'ST. BRIGID’S ABBEY',
    tagline: 'Stone walls remember the vows that men forget.',
    description:
      'The abbey bells are silent. The royal confessor has imprisoned the sisters. Break through his guard and set the bells ringing.',
    objective: 'Defeat Confessor Vale',
    objectiveType: 'leader',
    reward: 420,
    sky: '#e2dfe9',
    theme: 'abbey',
    intro: [
      {
        who: 'Alma',
        text: 'I learned to heal in these halls. I will not let them become a prison.'
      },
      { who: 'Confessor Vale', text: 'Peace is obedience, child.' },
      { who: 'Alma', text: 'Then I have been praying for the wrong thing.' }
    ],
    outro:
      'The bells ring out across the valley. The ledger is read from every pulpit. For the first time, the rebellion has a voice.',
    enemies: [
      e('cleric', 'Confessor Vale', 6, 1, 4, true),
      e('vanguard', 'Abbey guard', 5, 4, 3),
      e('vanguard', 'Abbey guard', 7, 4, 3),
      e('arcanist', 'Silent brother', 3, 2, 3),
      e('ranger', 'Bell keeper', 8, 2, 3)
    ],
    tiles: makeMap('abbey'),
    spawns: [
      { x: 4, z: 8 },
      { x: 6, z: 8 },
      { x: 5, z: 9 },
      { x: 7, z: 9 }
    ]
  },
  {
    id: 4,
    name: 'The Ember Heights',
    subtitle: 'The long way home.',
    region: 'EMBER RIDGE',
    tagline: 'The shortest road is rarely the kindest.',
    description:
      'Captain Voss waits on the high road. Break his ambush, take the ridge, and open the path to Cinderkeep.',
    objective: 'Break the high-road ambush',
    objectiveType: 'rout',
    reward: 480,
    sky: '#ebdcc8',
    theme: 'ridge',
    intro: [
      { who: 'Ida', text: 'Voss taught me to fight. He said the high ground was everything.' },
      { who: 'Wren', text: 'What did he say about being surrounded by people who hate him?' },
      { who: 'Ida', text: 'Nothing useful.' }
    ],
    outro:
      'Voss surrenders his sword. Rowan lets him walk away. “There is a life after orders,” she tells him. Below them, Cinderkeep’s gates close.',
    enemies: [
      e('dragoon', 'Captain Voss', 6, 1, 4, true),
      e('ranger', 'Ridge bow', 9, 2, 4),
      e('ranger', 'Ridge bow', 3, 2, 3),
      e('monk', 'Royal pugilist', 5, 4, 3),
      e('arcanist', 'Stormcaller', 8, 3, 3)
    ],
    tiles: makeMap('ridge'),
    spawns: [
      { x: 4, z: 8 },
      { x: 6, z: 8 },
      { x: 3, z: 9 },
      { x: 5, z: 9 }
    ]
  },
  {
    id: 5,
    name: 'The Cinder Crown',
    subtitle: 'No more little people.',
    region: 'CINDERKEEP',
    tagline: 'A kingdom is only as great as its smallest people.',
    description:
      'The gates are open. Lord Regent Aster has nowhere left to hide. End his rule, and decide what rises from the ashes.',
    objective: 'Defeat Lord Regent Aster',
    objectiveType: 'leader',
    reward: 650,
    sky: '#dce1df',
    theme: 'fortress',
    intro: [
      {
        who: 'Lord Regent Aster',
        text: 'A poacher. A hedge witch. A knight with no name. You call this an army?'
      },
      { who: 'Rowan', text: 'No. I call them my friends.' },
      { who: 'Pip', text: 'And I am a fully qualified hedge wizard, thank you.' }
    ],
    outro:
      'The crown falls, and no one picks it up. In Bellwether, the harvest is shared. Bram rebuilds the ferries. Alma opens the abbey doors. Pip starts a new library, with a very strict candle policy. Wren comes and goes. And Rowan? She keeps the little banner. Some things are worth carrying.',
    enemies: [
      e('dragoon', 'Regent Aster', 6, 1, 5, true),
      e('vanguard', 'Gilded guard', 4, 4, 4),
      e('vanguard', 'Gilded guard', 7, 4, 4),
      e('arcanist', 'Royal astrologer', 8, 2, 4),
      e('cleric', 'Crown chaplain', 3, 2, 4),
      e('ranger', 'Keep sentinel', 9, 1, 4)
    ],
    tiles: makeMap('fortress'),
    spawns: [
      { x: 4, z: 8 },
      { x: 6, z: 8 },
      { x: 3, z: 9 },
      { x: 5, z: 9 }
    ]
  }
];
export const CHAPTERS = ['I', 'II', 'III', 'IV', 'V', 'VI'];
export const SHOP = [
  {
    id: 'potion',
    name: 'Tonic',
    description: 'Restores 55 HP. Reach: 1 tile.',
    price: 35,
    icon: 'flask'
  },
  {
    id: 'ether',
    name: 'Aether vial',
    description: 'Restores 25 MP. Reach: 1 tile.',
    price: 45,
    icon: 'spark'
  },
  {
    id: 'feather',
    name: 'Dawn feather',
    description: 'Revives a fallen ally at half HP.',
    price: 65,
    icon: 'feather'
  },
  {
    id: 'weapon',
    name: 'Hone weapon',
    description: '+4 physical and magick power. Up to rank III.',
    price: 140,
    icon: 'sword'
  },
  {
    id: 'armor',
    name: 'Reinforce armor',
    description: '+15 HP and +3 defense. Up to rank III.',
    price: 120,
    icon: 'shield'
  },
  {
    id: 'boots',
    name: 'Wayfarer boots',
    description: 'Accessory · +1 movement.',
    price: 180,
    icon: 'boot'
  },
  {
    id: 'charm',
    name: 'Moonstone charm',
    description: 'Accessory · +15 MP and +3 magick.',
    price: 180,
    icon: 'moon'
  }
];
