import { MISSIONS, JOBS } from '../src/data.ts';
import {
  freshCampaign,
  createBattle,
  BattleEngine,
  learn,
  purchase,
  awardVictory
} from '../src/engine.ts';
for (const difficulty of ['story', 'classic', 'tactician'] as const) {
  const c = freshCampaign();
  c.settings.difficulty = difficulty;
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
    while (!e.battle.result && actions++ < 500) e.runAI();
    console.log(
      difficulty,
      m.id + 1,
      e.battle.result,
      e.battle.turn,
      party.map((h) => `${h.name} Lv${h.level} W${h.weapon}`).join(', ')
    );
    if (e.battle.result !== 'victory') {
      console.log(e.battle.log.join('\n'));
      break;
    }
    awardVictory(c);
    c.battle = null;
  }
}
