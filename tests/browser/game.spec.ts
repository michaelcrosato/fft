import { test, expect, type Page } from '@playwright/test';
import {
  BattleEngine,
  createBattle,
  freshCampaign,
  purchase,
  SAVE_KEY,
  type Campaign
} from '../../src/engine.ts';
import { MISSIONS } from '../../src/data.ts';

const state = (page: Page) => page.evaluate(() => (window as any).__CINDER__);
async function ready(page: Page, url = '/') {
  await page.goto(url);
  await expect.poll(async () => (await state(page).catch(() => undefined))?.ready).toBe(true);
}
async function press(page: Page, action: string) {
  const dialog = page.locator(`#modal-root [data-action="${action}"]`);
  await (
    (await dialog.count()) ? dialog.last() : page.locator(`[data-action="${action}"]`).first()
  ).click();
}
async function start(page: Page) {
  await press(page, 'begin');
  await press(page, 'skip-story');
  await press(page, 'start-battle');
  await expect(page.getByRole('button', { name: 'Move', exact: true })).toBeEnabled();
}
async function tile(page: Page, p: { x: number; z: number }) {
  const s = await state(page),
    t = s.tiles.find((t: any) => t.x === p.x && t.z === p.z);
  await page.mouse.click(t.screen.x, t.screen.y);
}
async function seed(page: Page, c: Campaign) {
  await page.addInitScript(
    ({ key, c }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(c));
    },
    { key: SAVE_KEY, c }
  );
}
function errors(page: Page) {
  const list: string[] = [];
  page.on('pageerror', (e) => list.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') list.push(m.text());
  });
  return list;
}

test('desktop: story, deployment, real canvas movement, attack, facing, and saved turn', async ({
  page
}) => {
  const err = errors(page);
  await ready(page);
  await expect(page).toHaveTitle(/Crown & Cinder/);
  await page.screenshot({ path: 'artifacts/verified-desktop-campaign.png' });
  await start(page);
  await press(page, 'move');
  await tile(page, { x: 5, z: 5 });
  await expect(page.getByText('Take this position?')).toBeVisible();
  await press(page, 'confirm-move');
  expect((await state(page)).campaign.battle.units[0]).toMatchObject({ x: 5, z: 5 });
  await press(page, 'attack');
  await press(page, 'target-unit:enemy-0');
  await expect(page.getByText('Front attack', { exact: false })).toBeVisible();
  await press(page, 'confirm-action');
  expect((await state(page)).campaign.battle.acted).toBe(true);
  await expect(page.getByRole('button', { name: 'Attack', exact: true })).toBeDisabled();
  await press(page, 'wait');
  await press(page, 'face:north');
  const s = await state(page);
  expect(s.campaign.battle.turn).toBeGreaterThan(1);
  await page.reload();
  await expect.poll(async () => (await state(page))?.ready).toBe(true);
  expect((await state(page)).campaign.battle.units[0]).toMatchObject({ x: 5, z: 5 });
  expect(err).toEqual([]);
  await page.screenshot({ path: 'artifacts/verified-desktop-battle.png' });
});
test('camp: learn, change jobs, equip a secondary job, buy supplies, return to deployment', async ({
  page
}) => {
  await ready(page);
  await press(page, 'begin');
  await press(page, 'skip-story');
  await press(page, 'deploy-toggle:rowan');
  await press(page, 'party');
  await press(page, 'learn:rally');
  expect((await state(page)).campaign.heroes[0].jp).toBe(10);
  await press(page, 'party-tab:jobs');
  await press(page, 'job:ranger');
  await press(page, 'party-tab:skills');
  await page.locator('#secondary-job').selectOption('vanguard');
  expect((await state(page)).campaign.heroes[0].secondary).toBe('vanguard');
  await press(page, 'close-modal');
  await expect(page.getByRole('dialog', { name: 'Gather the company' })).toBeVisible();
  await expect(page.getByText('3 / 4 selected', { exact: false })).toBeVisible();
  await press(page, 'shop');
  await press(page, 'buy:weapon');
  expect((await state(page)).campaign.coins).toBe(80);
  await press(page, 'close-modal');
  await press(page, 'deploy-toggle:rowan');
  await press(page, 'start-battle');
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(saved.selected).toHaveLength(4);
  expect(saved.heroes[0].weapon).toBe(1);
  expect(
    saved.battle.units.some(
      (u: any) => u.id === 'rowan' && u.learned.includes('rally') && u.job === 'ranger'
    )
  ).toBe(true);
});
test('phone: complete menus and touch-sized target choices without horizontal overflow', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const err = errors(page);
  await ready(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/verified-mobile-campaign.png' });
  await press(page, 'guide');
  await page.getByText('Keep your story', { exact: true }).scrollIntoViewIfNeeded();
  await press(page, 'close-modal');
  await start(page);
  await press(page, 'move');
  await tile(page, { x: 5, z: 5 });
  await press(page, 'confirm-move');
  await press(page, 'attack');
  await expect(page.locator('.target-unit').first()).toBeVisible();
  expect((await page.locator('.target-unit').first().boundingBox())!.height).toBeGreaterThanOrEqual(
    44
  );
  await press(page, 'target-unit:enemy-0');
  await page.screenshot({ path: 'artifacts/verified-mobile-target.png' });
  await press(page, 'confirm-action');
  await press(page, 'settings');
  await page.screenshot({ path: 'artifacts/verified-mobile-settings.png' });
  await press(page, 'close-modal');
  expect(err).toEqual([]);
});
for (const backend of ['webgl2', 'webgl1'])
  test(`${backend}: renders a playable river battle and animated water`, async ({ page }) => {
    const c = freshCampaign();
    c.completed = [0, 1];
    c.battle = createBattle(c, 2);
    new BattleEngine(c.battle).nextTurn();
    await seed(page, c);
    const err = errors(page);
    await ready(page, `/?renderer=${backend}`);
    expect((await state(page)).renderer.toLowerCase()).toBe(backend);
    await expect(page.getByRole('button', { name: 'Move', exact: true })).toBeEnabled();
    await press(page, 'move');
    await page.screenshot({ path: `artifacts/verified-${backend}.png` });
    expect(err).toEqual([]);
  });
test('full first chapter is won using only the actual battle controls', async ({ page }) => {
  test.setTimeout(600_000);
  const c = freshCampaign();
  c.settings.speed = 2;
  c.settings.reducedMotion = true;
  purchase(c, 'weapon', 'rowan');
  await seed(page, c);
  const err = errors(page);
  await ready(page);
  await start(page);
  let turns = 0;
  while (turns++ < 100) {
    await expect
      .poll(async () => {
        const s = await state(page);
        return (
          !!s.campaign.battle.result ||
          (!s.busy &&
            s.campaign.battle.units.find((u: any) => u.id === s.campaign.battle.active)?.team ===
              'ally')
        );
      })
      .toBe(true);
    const s = await state(page);
    if (s.campaign.battle.result) break;
    const e = new BattleEngine(s.campaign.battle),
      u = e.active!,
      plan = e.planAI(u);
    console.log(`Playing turn ${s.campaign.battle.turn}: ${u.name}`);
    if (plan.to.x !== u.x || plan.to.z !== u.z) {
      await press(page, 'move');
      await tile(page, plan.to);
      await press(page, 'confirm-move');
    }
    if (plan.ability && plan.target) {
      if (plan.ability === 'attack') await press(page, 'attack');
      else {
        await press(
          page,
          ['potion', 'ether', 'feather'].includes(plan.ability) ? 'items' : 'skills'
        );
        await press(page, `ability:${plan.ability}`);
      }
      if (!(await page.locator('[data-action="confirm-action"]').count())) {
        const current = await state(page),
          t = current.campaign.battle.units.find(
            (t: any) => t.x === plan.target!.x && t.z === plan.target!.z && !t.removed
          );
        if (t) await press(page, `target-unit:${t.id}`);
        else await tile(page, plan.target);
      }
      await press(page, 'confirm-action');
    }
    if ((await state(page)).campaign.battle.result) break;
    const after = new BattleEngine((await state(page)).campaign.battle),
      acting = after.active!,
      foe = after
        .living('enemy')
        .sort(
          (a, b) =>
            Math.abs(a.x - acting.x) +
            Math.abs(a.z - acting.z) -
            Math.abs(b.x - acting.x) -
            Math.abs(b.z - acting.z)
        )[0];
    await press(page, 'wait');
    await press(page, `face:${foe ? after.facing(acting, foe) : 'north'}`);
  }
  const s = await state(page);
  expect(s.campaign.battle.result).toBe('victory');
  expect(s.campaign.completed).toEqual([0]);
  expect(s.campaign.battle.rewarded).toBe(true);
  await page.screenshot({ path: 'artifacts/verified-victory.png' });
  await press(page, 'continue-campaign');
  await expect(page.getByRole('heading', { name: 'Above the law.' })).toBeVisible();
  expect(err).toEqual([]);
});
test('final blow awards the campaign ending and all chapters remain replayable', async ({
  page
}) => {
  const c = freshCampaign();
  c.completed = [0, 1, 2, 3, 4];
  c.stars = { 0: 3, 1: 3, 2: 3, 3: 3, 4: 3 };
  c.battle = createBattle(c, 5);
  const b = c.battle;
  b.active = 'rowan';
  b.units[0].ct = 100;
  const boss = b.units.find((u) => u.boss)!;
  boss.x = 4;
  boss.z = 7;
  boss.hp = 1;
  boss.facing = 'north';
  for (const u of b.units.filter((u) => u.team === 'enemy' && !u.boss)) {
    u.hp = 0;
    u.removed = true;
  }
  await seed(page, c);
  await ready(page);
  await press(page, 'attack');
  await press(page, `target-unit:${boss.id}`);
  await press(page, 'confirm-action');
  await expect(page.getByRole('dialog', { name: 'Victory', exact: true })).toBeVisible();
  expect((await state(page)).campaign.completed).toHaveLength(6);
  const awardedCoins = (await state(page)).campaign.coins;
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Victory', exact: true })).toBeVisible();
  expect((await state(page)).campaign.coins).toBe(awardedCoins);
  await expect(page.locator('.reward-row')).toContainText(`+${MISSIONS[5].reward}`);
  await press(page, 'continue-campaign');
  await expect(page.getByRole('dialog', { name: 'A kingdom of little things' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/verified-ending.png' });
  await press(page, 'close-modal');
  await expect(page.locator('.chapter-stop:disabled')).toHaveCount(0);
});
test('save export and invalid import preserve the current company', async ({ page }) => {
  await ready(page);
  await press(page, 'settings');
  const downloadPromise = page.waitForEvent('download');
  await press(page, 'export');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('crown-and-cinder-save.json');
  const before = (await state(page)).campaign;
  await page.locator('#import-file').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":1,"heroes":[]}')
  });
  await expect(page.getByRole('status').filter({ hasText: 'not a valid' })).toBeVisible();
  expect((await state(page)).campaign.heroes).toEqual(before.heroes);
});
test('each authored environment loads with its own mission and intact controls', async ({
  page
}) => {
  const err = errors(page);
  await ready(page);
  for (const m of MISSIONS) {
    const c = freshCampaign();
    c.completed = Array.from({ length: m.id }, (_, i) => i);
    c.battle = createBattle(c, m.id);
    new BattleEngine(c.battle).nextTurn();
    await page.evaluate(({ key, c }) => localStorage.setItem(key, JSON.stringify(c)), {
      key: SAVE_KEY,
      c
    });
    await page.reload();
    await expect.poll(async () => (await state(page))?.ready).toBe(true);
    await expect(page.getByRole('heading', { name: m.name.replace('The ', '') })).toBeVisible();
    await page.screenshot({ path: `artifacts/map-${m.id + 1}.png` });
  }
  expect(err).toEqual([]);
});

test('defeat can retry a healthy company, and retreat restores the original supplies', async ({
  page
}) => {
  const c = freshCampaign();
  c.settings.speed = 2;
  c.settings.reducedMotion = true;
  c.battle = createBattle(c, 0);
  const b = c.battle;
  b.inventory.potion = 2;
  for (const u of b.units.filter((u) => u.team === 'ally')) u.hp = u.id === 'rowan' ? 1 : 0;
  b.units[0].facing = 'south';
  const enemy = b.units.find((u) => u.team === 'enemy')!;
  enemy.x = 4;
  enemy.z = 7;
  enemy.atk = 200;
  enemy.ct = 100;
  b.active = enemy.id;
  await seed(page, c);
  const err = errors(page);
  await ready(page);
  await expect(page.getByRole('dialog', { name: 'Defeat', exact: true })).toBeVisible({
    timeout: 30_000
  });
  await page.screenshot({ path: 'artifacts/verified-defeat.png' });
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Defeat', exact: true })).toBeVisible();
  await press(page, 'retry');
  let current = (await state(page)).campaign;
  expect(current.battle.inventory.potion).toBe(5);
  expect(
    current.battle.units.filter((u: any) => u.team === 'ally').every((u: any) => u.hp === u.maxHp)
  ).toBe(true);
  await press(page, 'items');
  await press(page, 'ability:potion');
  await press(page, 'target-unit:rowan');
  await press(page, 'confirm-action');
  expect((await state(page)).campaign.battle.inventory.potion).toBe(4);
  await press(page, 'retreat');
  await press(page, 'leave-battle');
  current = (await state(page)).campaign;
  expect(current.battle).toBeNull();
  expect(current.inventory.potion).toBe(5);
  expect(current.completed).toEqual([]);
  expect(err).toEqual([]);
});

test('valid import restores a different company, options, and keyboard battle inspection', async ({
  page
}) => {
  const err = errors(page);
  await ready(page);
  await press(page, 'settings');
  const imported = freshCampaign();
  imported.completed = [0, 1];
  imported.coins = 777;
  imported.selected = ['rowan', 'wren', 'alma', 'bram'];
  imported.settings.reducedMotion = true;
  imported.settings.sound = false;
  await page.locator('#import-file').setInputFiles({
    name: 'company.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported))
  });
  await expect(
    page.getByRole('status').filter({ hasText: 'Your company has returned.' })
  ).toBeVisible();
  expect((await state(page)).campaign.selected).toEqual(imported.selected);
  await start(page);
  expect((await state(page)).campaign.battle.units.some((u: any) => u.id === 'bram')).toBe(true);
  await press(page, 'unit-info:rowan');
  await expect(page.getByRole('dialog', { name: 'Rowan', exact: true })).toBeVisible();
  await expect(page.getByText('Defense', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  const origin = (await state(page)).campaign.battle.units[0];
  await page.keyboard.press('m');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Take this position?')).toBeVisible();
  await press(page, 'confirm-move');
  expect((await state(page)).campaign.battle.units[0]).toMatchObject({
    x: origin.x,
    z: origin.z - 1
  });
  const before = (await state(page)).tiles[0].screen;
  await page.keyboard.press('q');
  await expect.poll(async () => (await state(page)).tiles[0].screen.x).not.toBe(before.x);
  await press(page, 'camera-reset');
  await press(page, 'settings');
  await page.locator('[data-setting="difficulty"]').selectOption('story');
  await page.locator('[data-setting="quality"]').selectOption('low');
  await press(page, 'close-modal');
  await page.reload();
  await expect.poll(async () => (await state(page))?.ready).toBe(true);
  expect((await state(page)).campaign.settings).toMatchObject({
    sound: false,
    difficulty: 'story',
    quality: 'low'
  });
  expect(err).toEqual([]);
});

test('small phone, landscape phone, and short desktop keep chapter controls reachable', async ({
  page
}) => {
  const c = freshCampaign();
  c.completed = [0, 1, 2, 3, 4, 5];
  c.settings.reducedMotion = true;
  await seed(page, c);
  await ready(page);
  for (const size of [
    { width: 360, height: 740 },
    { width: 844, height: 390 },
    { width: 1264, height: 569 }
  ]) {
    await page.setViewportSize(size);
    for (const m of MISSIONS) {
      await press(page, `mission:${m.id}`);
      await expect(page.locator('[data-action="begin"]')).toBeVisible();
      const overlaps = await page.evaluate(() => {
        const begin = document.querySelector('.begin-button')!.getBoundingClientRect();
        const journey = document.querySelector('.journey')!.getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          overlap: begin.bottom > journey.top,
          within: begin.bottom < innerHeight && begin.left >= 0 && begin.right <= innerWidth
        };
      });
      expect(overlaps, `${size.width}×${size.height}, chapter ${m.id + 1}`).toEqual({
        overflow: false,
        overlap: false,
        within: true
      });
    }
    await page.screenshot({ path: `artifacts/verified-layout-${size.width}x${size.height}.png` });
    await start(page);
    await press(page, 'items');
    await expect(page.locator('[data-action="ability:potion"]')).toBeVisible();
    await page.screenshot({ path: `artifacts/verified-battle-${size.width}x${size.height}.png` });
    await press(page, 'cancel');
    await press(page, 'retreat');
    await press(page, 'leave-battle');
  }
});

test('touch phone can move, inspect units, and rotate the battlefield', async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: 'http://localhost:5174',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  try {
    const err = errors(page);
    await ready(page);
    for (const a of ['begin', 'skip-story', 'start-battle', 'move']) {
      await page.locator(`[data-action="${a}"]`).tap();
    }
    const s = await state(page),
      t = s.tiles.find((t: any) => t.x === 5 && t.z === 5);
    await page.touchscreen.tap(t.screen.x, t.screen.y);
    await page.locator('[data-action="confirm-move"]').tap();
    expect((await state(page)).campaign.battle.units[0]).toMatchObject({ x: 5, z: 5 });
    await page.locator('[data-action="unit-info:rowan"]').tap();
    await expect(page.getByRole('dialog', { name: 'Rowan', exact: true })).toBeVisible();
    await page.screenshot({ path: 'artifacts/verified-touch-details.png' });
    await page.locator('[data-action="close-modal"]').tap();
    const original = (await state(page)).tiles[0].screen;
    await page.locator('[data-action="rotate-right"]').tap();
    await expect.poll(async () => (await state(page)).tiles[0].screen.x).not.toBe(original.x);
    await page.locator('[data-action="camera-reset"]').tap();
    await page.screenshot({ path: 'artifacts/verified-touch-battle.png' });
    expect(err).toEqual([]);
  } finally {
    await context.close();
  }
});
