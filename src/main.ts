import './fonts.css';
import './style.css';
import './polish.css';
import {
  ABILITIES,
  CHAPTERS,
  JOBS,
  MISSIONS,
  SHOP,
  type Facing,
  type Hero,
  type JobId,
  type Point,
  type Ability
} from './data';
import {
  BattleEngine,
  SAVE_KEY,
  awardVictory,
  changeJob,
  createBattle,
  distance,
  freshCampaign,
  key,
  learn,
  purchase,
  stats,
  validateSave,
  type Campaign,
  type Unit
} from './engine';
import { Diorama } from './scene';
import { Soundscape } from './audio';
import { esc, icon } from './icons';

const app = document.querySelector<HTMLDivElement>('#app')!,
  modalRoot = document.querySelector<HTMLDivElement>('#modal-root')!,
  labels = document.querySelector<HTMLDivElement>('#labels')!;
let saveWarning = '';
function load(): Campaign {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    if (s) {
      const parsed = validateSave(JSON.parse(s));
      if (parsed) return parsed;
      saveWarning = 'The saved file could not be read. A fresh company is ready.';
    }
  } catch {
    saveWarning = 'Browser storage is unavailable. Export your progress in Settings.';
  }
  return freshCampaign();
}
let campaign = load(),
  missionId = Math.min(campaign.completed.length, 5),
  view: 'campaign' | 'battle' = campaign.battle ? 'battle' : 'campaign';
let engine: BattleEngine | null = campaign.battle ? new BattleEngine(campaign.battle) : null;
let modal = '',
  dialogue = 0,
  partyHero = campaign.selected[0],
  partyTab = 'skills',
  mode = 'inspect',
  ability = 'attack',
  selectedPoint: Point | null = null,
  hover: Point | null = null,
  inspected: string | null = null;
let busy = false,
  loaded = false,
  showLog = false,
  showGrid = false,
  aiTimer: ReturnType<typeof setTimeout> | null = null,
  toastTimer: ReturnType<typeof setTimeout> | null = null,
  focusReturn: HTMLElement | null = null;
let reward: ReturnType<typeof awardVictory> = null;
let deploySelection = [...campaign.selected],
  modalStack: string[] = [];
const scene = new Diorama(document.querySelector('#world')!),
  sound = new Soundscape();
const btn = (action: string, label: string, ic = '', cls = '', extra = '') =>
  `<button data-action="${action}" class="${cls}" ${label ? `aria-label="${esc(label)}"` : ''} ${extra}>${ic ? icon(ic) : ''}${label ? `<span>${label}</span>` : ''}</button>`;
const ibtn = (action: string, label: string, ic: string, cls = '') =>
  btn(action, '', ic, `icon-button ${cls}`, `aria-label="${label}" title="${label}"`);
const small = (text: string) => `<span class="eyebrow">${text}</span>`;
const stars = (n: number) =>
  `<span class="stars" aria-label="${n} of 3 stars">${[1, 2, 3].map((i) => `<span class="${i <= n ? 'lit' : ''}">${icon('star', 13)}</span>`).join('')}</span>`;
const portrait = (job: JobId, team = 'ally', large = false) =>
  `<div class="portrait ${job} ${team} ${large ? 'large' : ''}" style="--job:${JOBS[job].color}"><div class="portrait-halo"></div><div class="p-cape"></div><div class="p-neck"></div><div class="p-face"><i></i><i></i></div><div class="p-hair"></div><div class="p-hat"></div><div class="p-body"></div><span class="p-symbol">${icon(JOBS[job].icon, large ? 32 : 18)}</span></div>`;
function save() {
  campaign.savedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(campaign));
  } catch {
    if (!saveWarning) toast('Automatic saving is unavailable. Export your story in Settings.');
    saveWarning = 'Storage is full or unavailable. Export a save from Settings.';
  }
}
function settings() {
  sound.enabled = campaign.settings.sound;
  sound.musicEnabled = campaign.settings.music;
  scene.reduced = campaign.settings.reducedMotion;
  document.documentElement.classList.toggle('reduced-motion', campaign.settings.reducedMotion);
}
function toast(text: string) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.append(el);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3200);
}
function topbar() {
  return `<header class="topbar"><button data-action="home" class="brand" aria-label="Crown and Cinder, campaign home"><span class="brand-mark">${icon('crown', 25)}</span><span>CROWN <em>&</em> CINDER<small>A LITTLE REBELLION</small></span></button><nav aria-label="Main navigation">${btn('home', 'Campaign', 'map', view === 'campaign' ? 'nav-button active' : 'nav-button')}${btn('party', 'Company', 'people', 'nav-button')}${btn('journal', 'Chronicle', 'book', 'nav-button')}</nav><div class="top-actions"><span class="coin-count">${icon('coin', 17)} ${campaign.coins}</span>${ibtn('sound', campaign.settings.sound ? 'Mute audio' : 'Enable audio', campaign.settings.sound ? 'sound' : 'mute')}${ibtn('guide', 'Field guide', 'help')}${ibtn('settings', 'Settings', 'settings')}</div></header>`;
}
function cameraUI() {
  return `<div class="camera-tools">${ibtn('rotate-left', 'Rotate camera left (Q)', 'rotate')}${ibtn('rotate-right', 'Rotate camera right (E)', 'rotate', 'mirror')}${ibtn('zoom-out', 'Zoom out', 'minus')}${ibtn('zoom-in', 'Zoom in', 'plus')}${ibtn('camera-reset', 'Reset camera', 'compass')}${view === 'battle' ? ibtn('grid', 'Toggle tactical grid (G)', 'grid', showGrid ? 'is-active' : '') : ''}</div>`;
}
function renderCampaign() {
  const m = MISSIONS[missionId],
    done = campaign.completed.includes(m.id),
    locked = m.id > campaign.completed.length,
    resume = campaign.battle && !campaign.battle.result;
  return `${topbar()}<main class="campaign-ui"><div class="chapter-caption">${icon('flag', 15)} THE BELLWETHER CHRONICLES <span>•</span> A TACTICAL ADVENTURE</div><section class="mission-brief"><div class="chapter-kicker"><span class="fine-line"></span> CHAPTER ${CHAPTERS[m.id]} <span class="tiny-diamond">◆</span> ${m.region}</div><h1>${m.subtitle.replace(/\.$/, '')}<span class="gold-period">.</span></h1><p class="mission-description">${m.description}</p><div class="brief-meta"><span>${icon('people', 16)} 4 companions</span><span>${icon('hourglass', 16)} 10–20 min</span></div>${btn(resume ? 'resume' : 'begin', resume ? 'Continue battle' : locked ? 'Chapter locked' : done ? 'Return to the field' : 'Begin this chapter', resume ? 'play' : locked ? 'lock' : 'arrow', 'primary begin-button', !loaded || locked ? 'disabled' : '')}<div class="under-button">${done ? `${stars(campaign.stars[m.id] ?? 0)} <span>Chapter completed</span>` : `<span class="save-dot"></span> ${resume ? 'Your company is waiting.' : 'Your story is saved as you play.'}`}</div><div class="company-peek">${campaign.selected
    .map((id) => {
      const h = campaign.heroes.find((h) => h.id === id)!;
      return `<button data-action="hero:${h.id}" title="${h.name} · ${JOBS[h.job].name}">${portrait(h.job)}</button>`;
    })
    .join(
      ''
    )}<div><strong>The Cinder Company</strong><button data-action="party" class="text-button">Meet your companions ${icon('arrow', 13)}</button></div></div></section><div class="location-tag"><span class="pin-dot"></span><div><span>${m.region}</span><strong>${m.name.replace('The ', '')}</strong></div></div><div class="world-compass"><span>N</span>${icon('compass', 49)}<small>BELLWETHER · 1472</small></div>${cameraUI()}<div class="scene-hint">${icon('move', 14)} Drag to turn the world <span>·</span> Scroll to look closer</div><section class="journey"><div class="journey-heading"><div>${icon('map', 17)}<span>YOUR JOURNEY</span></div><span>${campaign.completed.length} / 6 CHAPTERS</span></div><div class="chapter-track">${MISSIONS.map((m, i) => `<button data-action="mission:${i}" class="chapter-stop ${i === missionId ? 'selected' : ''} ${i > campaign.completed.length ? 'locked' : ''} ${campaign.completed.includes(i) ? 'completed' : ''}" aria-label="Chapter ${i + 1}: ${m.name}${i > campaign.completed.length ? ', locked' : ''}" ${i > campaign.completed.length ? 'disabled' : ''}><span class="stop-number">${campaign.completed.includes(i) ? icon('check', 14) : i > campaign.completed.length ? icon('lock', 12) : CHAPTERS[i]}</span><span><small>CHAPTER ${CHAPTERS[i]}</small><strong>${m.name.replace('The ', '')}</strong></span>${i === missionId ? icon('arrow', 17) : ''}</button>`).join('')}</div></section><footer class="campaign-footer"><span>A little company. A kingdom to change.</span><button data-action="guide">${icon('book', 14)} Learn the art of battle</button><span class="version">CROWN & CINDER <i>•</i> VOL. I</span></footer></main>`;
}
function hpbar(u: Unit, details = true) {
  return `<div class="vital-line"><span>HP</span><div class="bar hp"><i style="width:${(u.hp / u.maxHp) * 100}%"></i></div><b>${u.hp}<em> / ${u.maxHp}</em></b></div><div class="vital-line"><span>MP</span><div class="bar mp"><i style="width:${(u.mp / u.maxMp) * 100}%"></i></div><b>${u.mp}<em> / ${u.maxMp}</em></b></div>${details ? btn(`unit-info:${u.id}`, 'Details', 'eye', 'unit-info-button') : ''}`;
}
function renderBattle() {
  if (!engine) return '';
  const b = engine.battle,
    u = engine.active,
    m = MISSIONS[b.mission],
    inspect = b.units.find((t) => t.id === inspected) ?? u,
    ours = u?.team === 'ally' && !busy && !b.result;
  const order = engine.turnOrder(innerWidth < 650 ? 5 : 8);
  let message = ours
    ? mode === 'move'
      ? 'Choose a blue tile to move.'
      : mode === 'target'
        ? `Choose a target for ${ABILITIES[ability].name}.`
        : mode === 'wait'
          ? 'Choose your facing, then end the turn.'
          : `${u?.name}’s turn. Move and act in either order.`
    : busy || u?.team === 'enemy'
      ? `${u?.name ?? 'The enemy'} is taking a turn…`
      : 'The field grows quiet.';
  if (engine.isCharging(u ?? b.units[0]) && ours)
    message = 'Magick is charging. You may move or end the turn.';
  return `${topbar()}<main class="battle-ui"><div class="battle-heading"><div><span class="eyebrow">CHAPTER ${CHAPTERS[m.id]} <span> / </span> TURN ${b.turn}${m.objectiveType === 'survive' ? ` / ${m.limit}` : ''}</span><h2>${m.name.replace('The ', '')}</h2><p>${icon('flag', 14)} ${m.objective}</p></div><div class="battle-controls">${btn('retreat', 'Retreat', 'flag', 'subtle-button')}${ibtn('log', 'Battle chronicle', 'log', showLog ? 'is-active' : '')}</div></div><div class="turn-order"><span class="turn-label">${icon('hourglass', 16)}<span>TURN<br>ORDER</span></span>${order.map((o, i) => `<button class="turn-chip ${o.team} ${i === 0 ? 'current' : ''}" data-action="inspect:${o.id}" title="${o.name}${o.cast ? ' · resolves' : ` · ${o.inTicks} ticks`}">${o.cast ? `<span class="cast-chip">${icon(ABILITIES[o.cast].icon)}</span>` : portrait(o.job, o.team)}<small>${i === 0 ? 'NOW' : o.cast ? 'CAST' : o.inTicks}</small></button>`).join('')}<span class="turn-dots">···</span></div>${
    showLog
      ? `<aside class="battle-log"><div>${small('FIELD CHRONICLE')}${ibtn('log', 'Close chronicle', 'close')}</div>${b.log
          .slice(-12)
          .map((l) => `<p>${esc(l)}</p>`)
          .join('')}</aside>`
      : ''
  }${cameraUI()}<div id="hover-card"></div><div class="battle-bottom"><div class="turn-message" role="status"><span class="${ours ? 'save-dot' : 'thinking-dot'}"></span>${message}${campaign.tutorial && ours ? btn('tutorial-off', 'Got it', 'check', 'text-button') : ''}</div><div class="battle-dock">${
    inspect
      ? `<section class="unit-card ${inspect.team}">${portrait(inspect.job, inspect.team, true)}<div class="unit-details"><div class="unit-name"><h3>${inspect.name}</h3><span>Lv. ${inspect.level}</span></div><p>${JOBS[inspect.job].name}${inspect.boss ? ' · Commander' : ''} <span class="status-list">${Object.keys(
          inspect.statuses
        )
          .map((s) => `<i>${s}</i>`)
          .join(
            ''
          )}</span></p>${hpbar(inspect)}<div class="unit-foot"><span>${icon('move', 12)} ${inspect.move}</span><span>${icon('mountain', 12)} ${engine.tile(inspect)?.h ?? 0}</span><span>${icon('sword', 12)} ${inspect.atk}</span><span>${inspect.hp <= 0 ? `Fallen · ${inspect.down} turns` : inspect.team === 'ally' ? 'CINDER COMPANY' : 'CROWN FORCES'}</span></div></div></section>`
      : ''
  }<div class="command-area"><div class="commands">${btn('move', b.moved ? 'Moved' : 'Move', 'move', `command ${mode === 'move' ? 'selected' : ''}`, !ours || b.moved ? 'disabled' : '')}${btn('attack', 'Attack', JOBS[u?.job ?? 'vanguard'].icon, `command ${mode === 'target' && ability === 'attack' ? 'selected' : ''}`, !ours || b.acted || (u && engine.isCharging(u)) ? 'disabled' : '')}${btn('skills', 'Abilities', 'spark', `command ${mode === 'skills' || (mode === 'target' && ability !== 'attack') ? 'selected' : ''}`, !ours || b.acted || (u && engine.isCharging(u)) ? 'disabled' : '')}${btn('items', 'Satchel', 'bag', `command ${mode === 'items' ? 'selected' : ''}`, !ours || b.acted || (u && engine.isCharging(u)) ? 'disabled' : '')}${btn('wait', 'End turn', 'hourglass', `command wait ${mode === 'wait' ? 'selected' : ''}`, !ours ? 'disabled' : '')}</div><div class="command-foot"><span>${ours ? `${b.moved ? '✓' : '○'} Move <i>·</i> ${b.acted ? '✓' : '○'} Act` : 'Tactics reward patience.'}</span>${b.moved && !b.acted && ours ? btn('undo', 'Undo move', 'back', 'text-button') : ''}<span class="keyboard-hint">M Move <i>·</i> A Attack <i>·</i> W Wait</span></div></div></div>${renderActionTray()}</div>${campaign.tutorial && ours && b.turn < 3 ? `<aside class="tutorial-tip"><span>${icon('spark', 17)} A LITTLE FIELD WISDOM</span><p>Move onto a <b>blue tile</b>, then attack an enemy in range. You can act before moving, too. Use <b>End turn</b> when you’re ready.</p></aside>` : ''}</main>`;
}
function impactLabel(a: Ability, amount: number) {
  if (a.type === 'buff' && a.id !== 'ether')
    return a.status ? a.status[0].toUpperCase() + a.status.slice(1) : 'Support';
  return `${a.type === 'heal' || a.type === 'revive' || a.id === 'ether' ? '+' : '−'}${amount} ${a.id === 'ether' ? 'MP' : 'HP'}`;
}
function renderActionTray() {
  if (!engine?.active || busy) return '';
  const u = engine.active,
    b = engine.battle;
  if (mode === 'skills' || mode === 'items') {
    const skills =
      mode === 'skills'
        ? u.learned.map((id) => ABILITIES[id])
        : ['potion', 'ether', 'feather'].map((id) => ABILITIES[id]);
    return `<div class="action-tray"><div class="tray-title">${small(mode === 'skills' ? `${JOBS[u.job].name} · abilities` : 'Company satchel')}${ibtn('cancel', 'Close abilities', 'close')}</div><div class="ability-options">${skills.map((a) => `<button data-action="ability:${a.id}" class="ability-option" ${u.mp < a.mp || (a.item && !b.inventory[a.item]) ? 'disabled' : ''}><span class="ability-icon">${icon(a.icon)}</span><span><strong>${a.name}</strong><small>${a.range} range${a.radius ? ` · ${a.radius} area` : ''}${a.charge ? ` · ${a.charge} ticks` : ''}</small><em>${a.description}</em></span><b>${a.item ? `×${b.inventory[a.item] ?? 0}` : `${a.mp} MP`}</b></button>`).join('')}</div></div>`;
  }
  if (mode === 'wait')
    return `<div class="action-tray facing-tray"><div>${small('End your turn')}<h3>Face the next move.</h3><p>Enemies behind you deal more damage.${!b.acted ? ' You will guard if you have not acted.' : ''}</p></div><div class="facing-options">${(['north', 'east', 'south', 'west'] as Facing[]).map((f) => btn(`face:${f}`, f[0].toUpperCase() + f.slice(1), 'arrow', `facing ${f}`)).join('')}</div>${btn('cancel', 'Cancel', '', 'text-button')}</div>`;
  if (selectedPoint && mode === 'move')
    return `<div class="target-confirm"><div><span class="eyebrow">MOVEMENT</span><h3>Take this position?</h3><p>${engine.reachable(u).get(key(selectedPoint))?.length ?? 0} tiles · height ${engine.tile(selectedPoint)?.h ?? 0}</p></div>${btn('confirm-move', 'Move here', 'check', 'primary')}${ibtn('cancel', 'Cancel movement', 'close')}</div>`;
  if (selectedPoint && mode === 'target') {
    const a = ABILITIES[ability],
      p = engine.preview(u, a, selectedPoint),
      t = engine.unitAt(selectedPoint);
    return `<div class="target-confirm"><div><span class="eyebrow">${a.name}${a.charge ? ` · ${a.charge} TICKS` : ''}</span><h3>${t?.name ?? 'Target area'} <span class="preview-number">${impactLabel(a, p.amount)}</span></h3><p>${p.valid ? `${p.chance}% hit${p.flank ? ` · ${p.flank}` : ''}${p.targets.length > 1 ? ` · ${p.targets.length} targets` : ''}` : p.reason}</p>${p.targets.some((t) => t.team === 'ally') && a.target === 'enemy' ? '<small class="friendly-warning">Allies in the marked area will also be hit.</small>' : ''}</div>${btn('confirm-action', a.charge ? 'Begin casting' : 'Confirm', 'check', 'primary', !p.valid ? 'disabled' : '')}${ibtn('cancel-target', 'Choose another target', 'close')}</div>`;
  }
  if (mode === 'target' && !selectedPoint) {
    const a = ABILITIES[ability],
      targets = b.units.filter((t) => !t.removed && engine!.preview(u, a, t).valid);
    return `<div class="action-tray quick-targets"><div class="tray-title">${small(`${a.name} · choose a target`)}${ibtn('cancel', 'Cancel targeting', 'close')}</div>${
      targets.length
        ? `<div class="target-list">${targets
            .map((t) => {
              const p = engine!.preview(u, a, t);
              return `<button data-action="target-unit:${t.id}" class="target-unit ${t.team}">${icon(JOBS[t.job].icon, 17)}<span>${t.name}<small>${t.hp} / ${t.maxHp} HP</small></span><b>${impactLabel(a, p.amount)} <small>${p.chance}%</small></b>${icon('chevron', 14)}</button>`;
            })
            .join(
              ''
            )}</div><p class="section-note">Or tap a marked tile on the field${a.radius ? ' to place the area' : ''}.</p>`
        : '<p class="section-note">No targets are in range. Move closer, or choose another ability.</p>'
    }</div>`;
  }
  return '';
}
function render() {
  app.innerHTML = view === 'campaign' ? renderCampaign() : renderBattle();
  document.body.dataset.view = view;
  scene.setCampaign(view === 'campaign');
  renderLabels();
  updateHighlights();
  renderModal();
}
function renderLabels() {
  if (!loaded) return;
  labels.innerHTML = '';
  const units = view === 'battle' && engine ? engine.battle.units : previewUnits();
  for (const u of units) {
    if (u.removed) continue;
    const el = document.createElement('button');
    el.className = `unit-label ${u.team} ${engine?.active?.id === u.id && view === 'battle' ? 'active' : ''} ${u.hp <= 0 ? 'fallen' : ''}`;
    el.dataset.unit = u.id;
    el.setAttribute('aria-label', `${u.name}, ${JOBS[u.job].name}, ${u.hp} of ${u.maxHp} HP`);
    el.innerHTML = `<i class="label-leader"></i>${u.hp <= 0 ? `<b>${u.down}</b>` : u.boss ? icon('crown', 12) : ''}<span class="label-name">${u.name}</span><span class="label-hp"><i style="width:${(u.hp / u.maxHp) * 100}%"></i></span>${engine?.isCharging(u) && view === 'battle' ? `<span class="charging">${icon('spark', 12)}</span>` : ''}`;
    el.addEventListener('click', () => {
      if (view === 'battle') {
        if (mode === 'target' || mode === 'move') tileClick(u);
        else {
          inspected = u.id;
          render();
        }
      }
    });
    labels.append(el);
  }
  labels.classList.toggle('preview-labels', view === 'campaign');
  labels.classList.toggle('choosing-move', mode === 'move');
  labels.inert = view === 'campaign';
  labels.setAttribute('aria-hidden', String(view === 'campaign'));
}
scene.onFrame = (positions) => {
  if (view !== 'battle') return;
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const elements = [...labels.querySelectorAll<HTMLElement>('[data-unit]')]
    .map((el) => ({
      el,
      p: positions.get(el.dataset.unit!),
      w: el.offsetWidth,
      h: el.offsetHeight
    }))
    .filter((item) => item.p)
    .sort((a, b) => b.p!.y - a.p!.y);
  for (const { el, p, w, h } of elements) {
    el.style.display = p!.visible ? '' : 'none';
    if (!p!.visible) continue;
    let chosen = { x: p!.x - w / 2, y: p!.y - h, w, h };
    const offsets = [
      { x: 0, y: 0 },
      { x: -w * 0.7, y: -4 },
      { x: w * 0.7, y: -4 },
      { x: 0, y: -h - 5 },
      { x: -w * 0.7, y: -h - 9 },
      { x: w * 0.7, y: -h - 9 },
      { x: 0, y: -h * 2 - 10 },
      { x: -w, y: -h * 2 - 12 },
      { x: w, y: -h * 2 - 12 },
      { x: 0, y: -h * 3 - 16 }
    ];
    for (const offset of offsets) {
      const r = {
        x: Math.max(8, Math.min(innerWidth - w - 8, p!.x - w / 2 + offset.x)),
        y: Math.max(110, p!.y - h + offset.y),
        w,
        h
      };
      chosen = r;
      if (
        !placed.some(
          (o) =>
            r.x < o.x + o.w + 3 && r.x + r.w + 3 > o.x && r.y < o.y + o.h + 3 && r.y + r.h + 3 > o.y
        )
      )
        break;
    }
    placed.push(chosen);
    el.style.transform = `translate(${chosen.x}px,${chosen.y}px)`;
    const dx = p!.x - (chosen.x + w / 2),
      dy = p!.y + 8 - (chosen.y + h),
      leader = el.querySelector<HTMLElement>('.label-leader')!;
    leader.style.height = `${Math.hypot(dx, dy)}px`;
    leader.style.transform = `rotate(${-Math.atan2(dx, dy)}rad)`;
  }
};
function previewUnits() {
  const c = structuredClone(campaign);
  c.battle = null;
  c.completed = [0, 1, 2, 3, 4, 5];
  return createBattle(c, missionId).units;
}
function updateHighlights() {
  if (!loaded) return;
  scene.clearHighlights();
  if (view !== 'battle' || !engine) return;
  const e = engine,
    u = e.active;
  if (showGrid)
    scene.highlight(
      e.tiles.filter((t) => !t.blocked),
      '#d9e8ce',
      0.09
    );
  if (u) {
    scene.selection(u, u.team === 'ally' ? '#f5d176' : '#e79173');
    if (mode === 'move' && !e.battle.moved) {
      const points = [...e.reachable(u).keys()]
        .filter((k) => k !== key(u))
        .map((k) => {
          const [x, z] = k.split(',').map(Number);
          return { x, z };
        });
      scene.highlight(points, '#68c3d0', 0.37);
    }
    if (mode === 'target') {
      const a = ABILITIES[ability];
      scene.highlight(
        e.tiles.filter((t) => !t.blocked && distance(t, u) <= e.range(u, a)),
        a.target === 'ally' || a.target === 'self' || a.target === 'fallen' ? '#90c998' : '#e6a477',
        0.22
      );
      if (selectedPoint)
        scene.highlight(
          e.tiles.filter((t) => distance(t, selectedPoint!) <= a.radius),
          '#edc15b',
          0.55
        );
    }
  }
  for (const c of e.battle.casts)
    scene.highlight(
      e.tiles.filter((t) => distance(t, c.target) <= ABILITIES[c.ability].radius),
      '#c185df',
      0.38
    );
  if (selectedPoint) scene.selection(selectedPoint, '#fff4ca');
}
function tileClick(p: Point) {
  if (view !== 'battle' || !engine || modal || busy) return;
  const u = engine.active;
  if (!u || u.team !== 'ally') return;
  if (mode === 'move') {
    const path = engine.reachable(u).get(key(p));
    if (!path?.length) {
      toast('Choose a highlighted, unoccupied tile.');
      return;
    }
    selectedPoint = { x: p.x, z: p.z };
    render();
  } else if (mode === 'target') {
    const preview = engine.preview(u, ABILITIES[ability], p);
    if (!preview.valid) {
      toast(preview.reason);
      return;
    }
    selectedPoint = { x: p.x, z: p.z };
    render();
  } else {
    const t = engine.unitAt(p);
    if (t) {
      inspected = t.id;
      render();
    } else {
      toast(`Height ${engine.tile(p)?.h ?? 0} · ${engine.tile(p)?.terrain ?? 'Ground'}`);
    }
  }
}
scene.onTile = tileClick;
scene.onHover = (p) => {
  hover = p;
  if (view !== 'battle' || !engine || modal) return;
  const el = document.querySelector('#hover-card');
  if (!el) return;
  if (!p) {
    el.innerHTML = '';
    return;
  }
  const tile = engine.tile(p),
    u = engine.unitAt(p);
  el.innerHTML = `<div class="terrain-info">${icon('mountain', 14)} ${u ? esc(u.name) : tile?.blocked ? 'Obstructed' : (tile?.terrain ?? '')}<span>HEIGHT ${tile?.h ?? 0}</span></div>`;
};
function processEffects() {
  if (!engine) return;
  for (const e of engine.effects.splice(0)) {
    scene.effect(e);
    sound.play(e.kind);
    const el = document.createElement('span');
    el.className = `floating-number ${e.kind}`;
    el.textContent = e.text;
    const target = labels.querySelector<HTMLElement>(`[data-unit="${e.target}"]`);
    if (target) {
      el.style.left = `${target.getBoundingClientRect().left + target.clientWidth / 2}px`;
      el.style.top = `${target.getBoundingClientRect().top}px`;
      document.body.append(el);
      setTimeout(() => el.remove(), 1400);
    }
  }
}
function afterAction() {
  if (!engine) return;
  scene.syncUnits(engine.battle.units);
  processEffects();
  inspected = engine.active?.id ?? null;
  selectedPoint = null;
  mode = 'inspect';
  if (engine.battle.result) {
    busy = false;
    reward = awardVictory(campaign) ?? engine.battle.reward ?? null;
    sound.play(engine.battle.result);
    modal = 'result';
    if (aiTimer) clearTimeout(aiTimer);
  }
  save();
  render();
  scheduleAI();
}
function scheduleAI() {
  if (aiTimer) clearTimeout(aiTimer);
  if (loaded && view === 'battle' && engine?.battle.result && !modal) {
    afterAction();
    return;
  }
  if (
    view !== 'battle' ||
    !engine ||
    modal ||
    engine.battle.result ||
    engine.active?.team !== 'enemy'
  ) {
    busy = false;
    return;
  }
  busy = true;
  render();
  aiTimer = setTimeout(() => {
    if (!engine || view !== 'battle' || modal) {
      busy = false;
      return;
    }
    const u = engine.active;
    if (!u || u.team !== 'enemy') {
      busy = false;
      return;
    }
    const plan = engine.planAI(u);
    if (distance(u, plan.to)) {
      const path = engine.move(plan.to);
      sound.play('move');
      scene.syncUnits(engine.battle.units);
      if (path) scene.moveUnit(u.id, path);
    }
    aiTimer = setTimeout(() => {
      if (!engine) return;
      if (plan.ability && plan.target) engine.perform(plan.ability, plan.target);
      processEffects();
      scene.syncUnits(engine.battle.units);
      renderLabels();
      save();
      aiTimer = setTimeout(() => {
        if (!engine) return;
        if (!engine.battle.result) {
          const foe = engine.living('ally').sort((a, b) => distance(u, a) - distance(u, b))[0];
          engine.endTurn(foe ? engine.facing(u, foe) : u.facing, !engine.battle.acted);
        }
        busy = false;
        afterAction();
      }, 500 / campaign.settings.speed);
    }, 500 / campaign.settings.speed);
  }, 700 / campaign.settings.speed);
}
function openModal(name: string) {
  focusReturn = document.activeElement as HTMLElement;
  if (modal && ['deploy', 'party', 'shop', 'settings'].includes(modal)) modalStack.push(modal);
  modal = name;
  renderModal();
  if (aiTimer) clearTimeout(aiTimer);
  busy = false;
}
function closeModal() {
  modal = modalStack.pop() ?? '';
  render();
  focusReturn?.focus();
  scheduleAI();
}
function modalShell(title: string, content: string, cls = '') {
  return `<div class="modal-backdrop" data-backdrop><section class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${title}" tabindex="-1"><header class="modal-header"><div>${small('CROWN & CINDER')}<h2>${title}</h2></div>${ibtn('close-modal', 'Close dialog', 'close')}</header>${content}</section></div>`;
}
function renderModal() {
  app.inert = !!modal;
  labels.inert = !!modal || view === 'campaign';
  if (!modal) {
    modalRoot.innerHTML = '';
    return;
  }
  const h = campaign.heroes.find((h) => h.id === partyHero) ?? campaign.heroes[0],
    inBattle = !!campaign.battle && !campaign.battle.result;
  let html = '';
  if (modal === 'party') {
    const j = JOBS[h.job],
      s = stats(h);
    html = modalShell(
      'The Cinder Company',
      `<div class="company-layout"><aside class="hero-list">${campaign.heroes.map((hero) => `<button data-action="choose-hero:${hero.id}" class="hero-row ${h.id === hero.id ? 'selected' : ''}" ${hero.available > campaign.completed.length ? 'disabled' : ''}>${portrait(hero.job)}<span><strong>${hero.name}</strong><small>${hero.available > campaign.completed.length ? `Joins after chapter ${CHAPTERS[hero.available - 1]}` : `${JOBS[hero.job].name} · Lv. ${hero.level}`}</small></span>${campaign.selected.includes(hero.id) ? `<span class="deploy-dot" title="Deployed"></span>` : ''}</button>`).join('')}<p class="list-note">Four companions take the field. Choose your formation before each battle.</p></aside><div class="hero-sheet"><div class="hero-intro">${portrait(h.job, 'ally', true)}<div>${small(j.epithet)}<h3>${h.name} <em>${h.surname}</em></h3><p>${h.description}</p></div></div><div class="hero-stats">${[
        ['HP', s.maxHp],
        ['MP', s.maxMp],
        ['ATK', s.atk],
        ['MAG', s.mag],
        ['DEF', s.def],
        ['MOVE', s.move]
      ]
        .map(([n, v]) => `<div><strong>${v}</strong><span>${n}</span></div>`)
        .join(
          ''
        )}</div><div class="progression"><span>LEVEL ${h.level} <b>${h.xp} / 100 XP</b></span><div class="bar xp"><i style="width:${h.xp}%"></i></div><span class="jp-badge">${icon('spark', 15)} ${h.jp} JP</span></div><div class="sheet-tabs">${['skills', 'jobs', 'equipment'].map((t) => btn(`party-tab:${t}`, t[0].toUpperCase() + t.slice(1), '', partyTab === t ? 'active' : '')).join('')}</div>${
        partyTab === 'skills'
          ? `<p class="section-note">Spend job points to learn abilities. Earn more by taking action in battle.</p><div class="skill-list">${j.skills
              .map((id) => {
                const a = ABILITIES[id],
                  known = h.learned.includes(id);
                return `<div class="learn-skill"><span class="ability-icon">${icon(a.icon)}</span><div><strong>${a.name}</strong><p>${a.description}</p><small>${a.mp} MP · ${a.range} range${a.charge ? ` · ${a.charge} ticks` : ''}</small></div>${btn(`learn:${id}`, known ? 'Learned' : `${a.jp} JP`, known ? 'check' : 'plus', known ? 'learned' : 'small-button', known || h.jp < a.jp || inBattle ? 'disabled' : '')}</div>`;
              })
              .join(
                ''
              )}</div><label class="secondary-job">Secondary discipline <select id="secondary-job" ${inBattle ? 'disabled' : ''}><option value="">None</option>${Object.values(
              JOBS
            )
              .filter(
                (j) =>
                  j.id !== h.job &&
                  j.unlock <= campaign.completed.length &&
                  h.learned.some((id) => ABILITIES[id]?.job === j.id)
              )
              .map(
                (j) =>
                  `<option value="${j.id}" ${h.secondary === j.id ? 'selected' : ''}>${j.name}</option>`
              )
              .join(
                ''
              )}</select></label><p class="section-note">Keep learned abilities from one other job while changing your primary role.</p>`
          : partyTab === 'jobs'
            ? `<div class="job-grid">${Object.values(JOBS)
                .map(
                  (j) =>
                    `<button data-action="job:${j.id}" class="job-option ${j.id === h.job ? 'selected' : ''}" ${j.unlock > campaign.completed.length || inBattle ? 'disabled' : ''}>${icon(j.icon, 25)}<strong>${j.name}</strong><small>${j.unlock > campaign.completed.length ? `After chapter ${CHAPTERS[j.unlock - 1]}` : j.epithet}</small><p>${j.description}</p></button>`
                )
                .join('')}</div>`
            : `<div class="equipment-list"><div>${icon('sword', 28)}<span><strong>${['Traveler’s', 'Tempered', 'Masterwork', 'Heirloom'][h.weapon]} ${h.job === 'ranger' ? 'bow' : h.job === 'arcanist' || h.job === 'cleric' ? 'staff' : h.job === 'monk' ? 'wraps' : h.job === 'dragoon' ? 'spear' : 'blade'}</strong><small>Weapon rank ${h.weapon} · +${h.weapon * 4} power</small></span></div><div>${icon('shield', 28)}<span><strong>${['Travelworn', 'Reinforced', 'Forged', 'Royal'][h.armor]} armor</strong><small>Armor rank ${h.armor} · +${h.armor * 15} HP · +${h.armor * 3} defense</small></span></div><div>${icon(h.charm === 'boots' ? 'boot' : 'moon', 28)}<span><strong>${h.charm === 'boots' ? 'Wayfarer boots' : h.charm === 'charm' ? 'Moonstone charm' : 'No accessory'}</strong><small>${h.charm === 'boots' ? '+1 movement' : h.charm === 'charm' ? '+15 MP · +3 magick' : 'Accessories can be bought at the supply wagon.'}</small></span></div></div>${btn('shop', 'Visit the supply wagon', 'bag', 'primary', inBattle ? 'disabled' : '')}`
      }${inBattle ? '<p class="section-note">The company can change jobs and equipment between battles.</p>' : ''}</div></div>`,
      'wide-modal'
    );
  } else if (modal === 'unit') {
    const u = engine?.battle.units.find((u) => u.id === inspected);
    if (u) {
      const cast = engine!.battle.casts.find((c) => c.caster === u.id);
      html = modalShell(
        u.name,
        `<div class="hero-intro">${portrait(u.job, u.team, true)}<div>${small(u.team === 'ally' ? 'Cinder Company' : 'Crown forces')}<h3>${JOBS[u.job].name} <em>Level ${u.level}${u.boss ? ' · Commander' : ''}</em></h3><p>Facing ${u.facing} · ${u.ct} charge time${u.hp <= 0 ? ` · ${u.down} turns to withdrawal` : ''}</p></div></div>${hpbar(u, false)}<div class="inspect-stats">${[
          ['Attack', u.atk],
          ['Magick', u.mag],
          ['Defense', u.def],
          ['Speed', u.speed],
          ['Move', u.move],
          ['Jump', u.jump],
          ['Range', u.range],
          ['Height', engine!.tile(u)?.h ?? 0]
        ]
          .map(([label, value]) => `<div><strong>${value}</strong><span>${label}</span></div>`)
          .join('')}</div><p class="section-note">${
          Object.entries(u.statuses).length
            ? Object.entries(u.statuses)
                .map(([name, turns]) => `${name}: ${turns} turn${turns === 1 ? '' : 's'}`)
                .join(' · ')
            : 'No active conditions.'
        }${cast ? ` Charging ${ABILITIES[cast.ability].name}: ${Math.max(0, cast.due - engine!.battle.ticks)} clock ticks remain.` : ''}</p><div class="skill-list">${u.learned
          .map((id) => {
            const a = ABILITIES[id];
            return `<div class="learn-skill"><span class="ability-icon">${icon(a.icon)}</span><div><strong>${a.name}</strong><p>${a.description}</p><small>${a.mp} MP · ${a.range} range${a.charge ? ` · ${a.charge} ticks` : ''}</small></div></div>`;
          })
          .join('')}</div>`
      );
    }
  } else if (modal === 'shop') {
    html = modalShell(
      'The supply wagon',
      `<div class="shop-intro"><p>“A little preparation goes a long way.”</p><span class="coin-count">${icon('coin')} ${campaign.coins} crowns</span></div><label class="shop-recipient">Equipment for <select id="shop-hero">${campaign.heroes
        .filter((h) => h.available <= campaign.completed.length)
        .map(
          (hero) =>
            `<option value="${hero.id}" ${hero.id === h.id ? 'selected' : ''}>${hero.name}</option>`
        )
        .join('')}</select></label><div class="shop-grid">${SHOP.map((item) => {
        const max = (item.id === 'weapon' || item.id === 'armor') && h[item.id] >= 3,
          owned = (item.id === 'boots' || item.id === 'charm') && h.charm === item.id;
        return `<div class="shop-item"><span class="ability-icon">${icon(item.icon, 25)}</span><h3>${item.name}</h3><p>${item.description}</p><small>${['potion', 'ether', 'feather'].includes(item.id) ? `${campaign.inventory[item.id]} in satchel` : item.id === 'weapon' || item.id === 'armor' ? `${h.name} · rank ${h[item.id]}` : `For ${h.name}`}</small>${btn(`buy:${item.id}`, max ? 'Maximum rank' : owned ? 'Equipped' : `${item.price} crowns`, max || owned ? 'check' : 'coin', 'small-button', max || owned || campaign.coins < item.price || inBattle ? 'disabled' : '')}</div>`;
      }).join('')}</div>`,
      'wide-modal'
    );
  } else if (modal === 'journal') {
    html = modalShell(
      'The Bellwether chronicle',
      `<p class="modal-lead">A record of small choices that changed a kingdom.</p><div class="chronicle-list">${MISSIONS.map((m) => `<article class="chronicle-entry ${campaign.completed.includes(m.id) ? 'read' : ''}"><span>${CHAPTERS[m.id]}</span><div><small>${m.region}</small><h3>${m.name}</h3><p>${campaign.completed.includes(m.id) ? m.outro : m.id === campaign.completed.length ? m.description : 'This page has yet to be written.'}</p>${campaign.completed.includes(m.id) ? stars(campaign.stars[m.id] ?? 0) : ''}</div></article>`).join('')}</div>${campaign.completed.length === 6 ? btn('ending', 'Read the epilogue', 'book', 'primary') : ''}`,
      'journal-modal'
    );
  } else if (modal === 'guide') {
    html = modalShell(
      'A little field guide',
      `<p class="modal-lead">Good company. High ground. A plan worth changing.</p><div class="guide-grid">${[
        [
          'move',
          'Make your move',
          'Each turn gives you one move and one action, in either order. Tap Move, choose a blue tile, and confirm. You can undo movement until you act.'
        ],
        [
          'sword',
          'Choose your moment',
          'Choose Attack or an ability, then a highlighted target. Review damage and hit chance before committing. Attack the side for +10% damage or the back for +25%.'
        ],
        [
          'mountain',
          'Read the ground',
          'Height improves physical damage and extends bow range. Each job has a jump limit. Tall buildings block arrows; spells can reach over them.'
        ],
        [
          'hourglass',
          'The battle clock',
          'Speed fills Charge Time to 100. The timeline shows who acts next and when spells resolve. Doing only one thing makes your next turn arrive sooner.'
        ],
        [
          'spark',
          'Respect the magick',
          'Charged abilities resolve on a fixed tile after their shown clock ticks. Move out of the purple area to escape. Offensive area attacks also hit allies. Charging units take 50% more physical damage.'
        ],
        [
          'shield',
          'Finish facing danger',
          'End your turn facing the enemy. If you did not act, you guard and reduce incoming damage by 45% until your next turn. Your MP restores by 2 each turn.'
        ],
        [
          'heart',
          'Look after your friends',
          'Mend restores HP. Dawn feathers and Rekindle revive fallen allies. You have three of their personal turns to revive them; then they withdraw. Everyone recovers between battles.'
        ],
        [
          'people',
          'Build your company',
          'Earn XP and job points by acting and winning. Learn skills, switch jobs, and carry one secondary discipline. New companions and jobs join as the story unfolds.'
        ],
        [
          'leaf',
          'Know your conditions',
          'Poison costs 10% max HP for three turns. Slow reduces speed to 65% for two turns. Haste raises it to 150% for three turns. Focus raises damage by 35% for two turns.'
        ],
        [
          'save',
          'Keep your story',
          'Progress and battles save automatically on this device. Export or import a save in Settings. Retreat restores your starting supplies. Replaying chapters earns extra XP, JP, and crowns. Earn three stars with no allies falling, two with one or two falls, or one for any victory.'
        ]
      ]
        .map(
          ([ic, title, text]) => `<article>${icon(ic, 25)}<h3>${title}</h3><p>${text}</p></article>`
        )
        .join(
          ''
        )}</div><div class="keyboard-guide"><strong>Keyboard & touch</strong><p>M Move · A Attack · S Abilities · I Satchel · W End turn · Q / E Rotate · G Grid · Esc Back<br>Arrow keys move the tile cursor; Enter selects a tile or confirms. Drag the world to rotate. Use + / − to zoom.</p></div><p class="credits">An original tactical adventure inspired by Final Fantasy Tactics. All characters, writing, models, and music were created for Crown & Cinder.</p>`,
      'wide-modal'
    );
  } else if (modal === 'settings') {
    html = modalShell(
      'Make yourself at home',
      `<div class="settings-list"><label><span><strong>Sound</strong><small>Battle effects and interface sounds</small></span><input data-setting="sound" type="checkbox" ${campaign.settings.sound ? 'checked' : ''}/></label><label><span><strong>Music</strong><small>A quiet, original music-box score</small></span><input data-setting="music" type="checkbox" ${campaign.settings.music ? 'checked' : ''}/></label><label><span><strong>Reduced motion</strong><small>Instant camera and unit transitions</small></span><input data-setting="reducedMotion" type="checkbox" ${campaign.settings.reducedMotion ? 'checked' : ''}/></label><label><span><strong>Battle pace</strong><small>Enemy turns and animations</small></span><select data-setting="speed"><option value="1" ${campaign.settings.speed === 1 ? 'selected' : ''}>Unhurried · 1×</option><option value="2" ${campaign.settings.speed === 2 ? 'selected' : ''}>Brisk · 2×</option></select></label><label><span><strong>Difficulty</strong><small>Applies when starting a new battle</small></span><select data-setting="difficulty"><option value="story" ${campaign.settings.difficulty === 'story' ? 'selected' : ''}>Story</option><option value="classic" ${campaign.settings.difficulty === 'classic' ? 'selected' : ''}>Classic</option><option value="tactician" ${campaign.settings.difficulty === 'tactician' ? 'selected' : ''}>Tactician</option></select></label><label><span><strong>Visual quality</strong><small>Changes apply after reloading</small></span><select data-setting="quality"><option value="auto" ${campaign.settings.quality === 'auto' ? 'selected' : ''}>Balanced</option><option value="high" ${campaign.settings.quality === 'high' ? 'selected' : ''}>High</option><option value="low" ${campaign.settings.quality === 'low' ? 'selected' : ''}>Battery saver</option></select></label></div><div class="save-options">${btn('export', 'Export save', 'download', 'subtle-button')}${btn('import', 'Import save', 'upload', 'subtle-button')}<input type="file" id="import-file" accept="application/json,.json" hidden/></div><p class="save-note">${saveWarning || 'Saved automatically on this browser.'} <span>${scene.backend} · Three.js</span></p>${btn('new-game', 'Start a new story', 'rotate', 'text-button danger')}`
    );
  } else if (modal === 'dialogue') {
    const m = MISSIONS[missionId],
      line = m.intro[dialogue],
      hero = campaign.heroes.find((h) => h.name === line.who);
    html = `<div class="story-shade"><section class="dialogue-box" role="dialog" aria-modal="true" aria-label="Chapter introduction"><div class="dialogue-portrait">${portrait(hero?.job ?? 'vanguard', hero ? 'ally' : 'enemy', true)}</div><div class="dialogue-copy">${small(`${m.name} · ${dialogue + 1} / ${m.intro.length}`)}<h3>${line.who}</h3><p>“${line.text}”</p><div>${btn('skip-story', 'Skip', '', 'text-button')}${btn('next-dialogue', dialogue < m.intro.length - 1 ? 'Continue' : 'Gather the company', 'arrow', 'primary')}</div></div></section></div>`;
  } else if (modal === 'deploy') {
    const m = MISSIONS[missionId];
    html = modalShell(
      'Gather the company',
      `<div class="deploy-intro">${small(`CHAPTER ${CHAPTERS[m.id]} · ${m.region}`)}<h3>${m.name}</h3><p>${m.description}</p><div class="objective-banner">${icon('flag')} ${m.objective}</div></div><div class="deploy-grid">${campaign.heroes
        .filter((h) => h.available <= campaign.completed.length)
        .map(
          (h) =>
            `<button class="deploy-hero ${deploySelection.includes(h.id) ? 'selected' : ''}" data-action="deploy-toggle:${h.id}" aria-pressed="${deploySelection.includes(h.id)}">${portrait(h.job, 'ally', true)}<strong>${h.name}</strong><small>${JOBS[h.job].name} · Lv. ${h.level}</small><span>${deploySelection.includes(h.id) ? icon('check', 17) : icon('plus', 17)}</span></button>`
        )
        .join(
          ''
        )}</div><p class="section-note">${deploySelection.length} / 4 selected · Your formation follows the order you select companions.</p><div class="deploy-footer">${btn('shop', 'Supplies', 'bag', 'subtle-button')}${btn('party', 'Manage company', 'people', 'subtle-button')}${btn('start-battle', 'To the field', 'sword', 'primary', deploySelection.length !== 4 ? 'disabled' : '')}</div>`,
      'wide-modal'
    );
  } else if (modal === 'result') {
    const b = engine!.battle,
      m = MISSIONS[b.mission],
      won = b.result === 'victory';
    html = `<div class="modal-backdrop result-backdrop"><section class="modal result-modal" role="dialog" aria-modal="true" aria-label="${won ? 'Victory' : 'Defeat'}"><div class="result-emblem">${icon(won ? 'flag' : 'shield', 40)}</div>${small(won ? 'A PAGE FOR THE CHRONICLE' : 'EVERY STORY HAS ITS SETBACKS')}<h2>${won ? 'The field is yours.' : 'A moment to regroup.'}</h2>${won ? stars(campaign.stars[m.id] ?? reward?.stars ?? 1) : ''}<p>${won ? m.outro : 'Your company survives, and your supplies will be restored. Change your approach, strengthen your equipment, or choose Story difficulty in Settings.'}</p>${won ? `<div class="reward-row"><div>${icon('coin')}<strong>+${reward?.coins ?? Math.round(m.reward * 0.4)}</strong><span>CROWNS</span></div><div>${icon('star')}<strong>+${reward?.xp ?? 35}</strong><span>BONUS XP</span></div><div>${icon('spark')}<strong>+${reward?.jp ?? 20}</strong><span>BONUS JP</span></div></div><small class="section-note">Action XP and JP added · +2 tonics · +1 aether vial · Company restored</small>` : ''}<div class="result-buttons">${won ? btn('continue-campaign', m.id === 5 ? 'Turn the last page' : 'Return to the road', 'arrow', 'primary') : btn('retry', 'Try again', 'rotate', 'primary')}${!won ? btn('leave-battle', 'Return to camp', 'tent', 'subtle-button') : ''}</div></section></div>`;
  } else if (modal === 'ending') {
    html = modalShell(
      'A kingdom of little things',
      `<div class="epilogue"><div class="result-emblem">${icon('crown', 48)}</div>${small('THE END OF ONE STORY')}<h3>And the beginning<br>of a thousand more.</h3><p>${MISSIONS[5].outro}</p><p class="ending-thanks">Thank you for carrying the little banner.</p><div class="ending-stats"><span>${campaign.completed.length} chapters written</span><span>${Object.values(campaign.stars).reduce((a, b) => a + b, 0)} / 18 stars</span><span>${campaign.victories} victories</span></div>${btn('close-modal', 'The road is still yours', 'arrow', 'primary')}<small>Revisit any chapter, master every job, and earn all eighteen stars.</small></div>`
    );
  } else if (modal === 'retreat' || modal === 'new-game') {
    const reset = modal === 'new-game';
    html = modalShell(
      reset ? 'Start a new story?' : 'Return to camp?',
      `<p class="modal-lead">${reset ? 'This replaces your current company and progress. Export a save first if you would like to keep this story.' : 'You will leave this battle and restore the supplies you brought into it. Your completed chapters and company progress are safe.'}</p><div class="confirm-buttons">${btn('close-modal', 'Keep playing', '', 'subtle-button')}${btn(reset ? 'confirm-new' : 'leave-battle', reset ? 'Begin anew' : 'Return to camp', reset ? 'rotate' : 'tent', 'primary')}</div>`
    );
  }
  const oldFocus = (document.activeElement as HTMLElement)?.id;
  modalRoot.innerHTML = html;
  if (oldFocus && modalRoot.querySelector(`#${oldFocus}`))
    (modalRoot.querySelector(`#${oldFocus}`) as HTMLElement).focus();
  else {
    const dialog = modalRoot.querySelector<HTMLElement>('[role="dialog"]');
    if (dialog) {
      dialog.tabIndex = -1;
      dialog.focus({ preventScroll: true });
    }
  }
}
function startBattle() {
  campaign.selected = [...deploySelection];
  campaign.battle = createBattle(campaign, missionId);
  engine = new BattleEngine(campaign.battle);
  engine.nextTurn();
  view = 'battle';
  modal = '';
  modalStack = [];
  mode = 'inspect';
  inspected = engine.active?.id ?? null;
  scene.loadMap(missionId);
  scene.syncUnits(engine.battle.units);
  scene.resetCamera();
  sound.battle = true;
  save();
  render();
  scheduleAI();
}
function leaveBattle() {
  if (campaign.battle && !campaign.battle.rewarded)
    campaign.inventory = { ...campaign.battle.startingInventory };
  campaign.battle = null;
  engine = null;
  busy = false;
  if (aiTimer) clearTimeout(aiTimer);
  view = 'campaign';
  modal = '';
  mode = 'inspect';
  sound.battle = false;
  scene.loadMap(missionId);
  scene.syncUnits(previewUnits());
  save();
  render();
}
async function action(name: string) {
  sound.play('click');
  const [a, arg] = name.split(':');
  if (a === 'home') {
    view = 'campaign';
    modal = '';
    busy = false;
    if (aiTimer) clearTimeout(aiTimer);
    sound.battle = false;
    scene.loadMap(missionId);
    scene.syncUnits(previewUnits());
    render();
    return;
  }
  if (a === 'resume') {
    view = 'battle';
    missionId = engine!.battle.mission;
    modal = '';
    scene.loadMap(missionId);
    scene.syncUnits(engine!.battle.units);
    sound.battle = true;
    render();
    scheduleAI();
    return;
  }
  if (a === 'mission') {
    missionId = Number(arg);
    scene.loadMap(missionId);
    scene.syncUnits(previewUnits());
    render();
    return;
  }
  if (a === 'sound') {
    campaign.settings.sound = !campaign.settings.sound;
    settings();
    if (campaign.settings.sound) sound.unlock();
    save();
    render();
    return;
  }
  if (a === 'rotate-left') {
    scene.rotate(-1);
    return;
  }
  if (a === 'rotate-right') {
    scene.rotate(1);
    return;
  }
  if (a === 'zoom-in') {
    scene.changeZoom(0.1);
    return;
  }
  if (a === 'zoom-out') {
    scene.changeZoom(-0.1);
    return;
  }
  if (a === 'camera-reset') {
    scene.resetCamera();
    return;
  }
  if (
    ['party', 'guide', 'settings', 'journal', 'shop', 'retreat', 'new-game', 'ending'].includes(a)
  ) {
    openModal(a);
    return;
  }
  if (a === 'hero') {
    partyHero = arg;
    openModal('party');
    return;
  }
  if (a === 'choose-hero') {
    partyHero = arg;
    renderModal();
    return;
  }
  if (a === 'party-tab') {
    partyTab = arg;
    renderModal();
    return;
  }
  if (a === 'close-modal') {
    if (modal === 'result') return;
    closeModal();
    return;
  }
  if (a === 'begin') {
    dialogue = 0;
    deploySelection = [...campaign.selected];
    openModal('dialogue');
    return;
  }
  if (a === 'next-dialogue') {
    if (++dialogue >= MISSIONS[missionId].intro.length) modal = 'deploy';
    renderModal();
    return;
  }
  if (a === 'skip-story') {
    modal = 'deploy';
    renderModal();
    return;
  }
  if (a === 'deploy-toggle') {
    if (deploySelection.includes(arg)) deploySelection = deploySelection.filter((id) => id !== arg);
    else if (deploySelection.length < 4) deploySelection.push(arg);
    else toast('Deselect a companion to make room.');
    renderModal();
    return;
  }
  if (a === 'start-battle') {
    startBattle();
    return;
  }
  if (a === 'learn') {
    if (learn(campaign, partyHero, arg)) {
      sound.play('heal');
      save();
      toast(`${ABILITIES[arg].name} learned.`);
    }
    renderModal();
    return;
  }
  if (a === 'job') {
    if (changeJob(campaign, partyHero, arg as JobId)) {
      save();
      scene.syncUnits(previewUnits());
      render();
    }
    return;
  }
  if (a === 'buy') {
    if (purchase(campaign, arg, partyHero)) {
      save();
      toast('Ready for the road.');
      render();
    }
    return;
  }
  if (a === 'export') {
    save();
    const blob = new Blob([JSON.stringify(campaign, null, 2)], { type: 'application/json' }),
      url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = 'crown-and-cinder-save.json';
    link.click();
    URL.revokeObjectURL(url);
    toast('Your story has been exported.');
    return;
  }
  if (a === 'import') {
    document.querySelector<HTMLInputElement>('#import-file')?.click();
    return;
  }
  if (a === 'confirm-new') {
    campaign = freshCampaign();
    deploySelection = [...campaign.selected];
    modalStack = [];
    settings();
    missionId = 0;
    leaveBattle();
    return;
  }
  if (a === 'leave-battle') {
    leaveBattle();
    return;
  }
  if (a === 'retry') {
    if (campaign.battle) campaign.inventory = { ...campaign.battle.startingInventory };
    startBattle();
    return;
  }
  if (a === 'continue-campaign') {
    const last = engine!.battle.mission === 5;
    missionId = Math.min(campaign.completed.length, 5);
    leaveBattle();
    if (last) openModal('ending');
    return;
  }
  if (a === 'grid') {
    showGrid = !showGrid;
    render();
    return;
  }
  if (a === 'log') {
    showLog = !showLog;
    render();
    return;
  }
  if (a === 'unit-info') {
    inspected = arg;
    openModal('unit');
    return;
  }
  if (a === 'inspect') {
    const u = engine?.battle.units.find((u) => u.id === arg);
    if (u) {
      if (mode === 'target') tileClick(u);
      else {
        inspected = arg;
        render();
      }
    }
    return;
  }
  if (a === 'tutorial-off') {
    campaign.tutorial = false;
    save();
    render();
    return;
  }
  if (!engine || busy || engine.active?.team !== 'ally' || engine.battle.result) return;
  if (a === 'move') {
    mode = 'move';
    selectedPoint = null;
    inspected = engine.active.id;
    render();
    return;
  }
  if (a === 'attack') {
    mode = 'target';
    ability = 'attack';
    selectedPoint = null;
    inspected = engine.active.id;
    render();
    return;
  }
  if (a === 'skills' || a === 'items' || a === 'wait') {
    mode = a;
    selectedPoint = null;
    inspected = engine.active.id;
    render();
    return;
  }
  if (a === 'ability') {
    ability = arg;
    mode = 'target';
    selectedPoint =
      ABILITIES[arg].target === 'self' ? { x: engine.active.x, z: engine.active.z } : null;
    render();
    return;
  }
  if (a === 'target-unit') {
    const target = engine.battle.units.find((u) => u.id === arg);
    if (target) tileClick(target);
    return;
  }
  if (a === 'cancel') {
    mode = 'inspect';
    selectedPoint = null;
    render();
    return;
  }
  if (a === 'cancel-target') {
    selectedPoint = null;
    render();
    return;
  }
  if (a === 'confirm-move' && selectedPoint) {
    const id = engine.active.id,
      path = engine.move(selectedPoint);
    if (path) {
      sound.play('move');
      scene.moveUnit(id, path);
    }
    afterAction();
    return;
  }
  if (a === 'undo') {
    engine.undoMove();
    afterAction();
    return;
  }
  if (a === 'confirm-action' && selectedPoint) {
    engine.perform(ability, selectedPoint);
    afterAction();
    return;
  }
  if (a === 'face') {
    engine.endTurn(arg as Facing, !engine.battle.acted);
    afterAction();
    return;
  }
}
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
  if (b && !b.disabled) void action(b.dataset.action!);
});
document.addEventListener('change', async (e) => {
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  if (el.dataset.setting) {
    const k = el.dataset.setting as keyof Campaign['settings'];
    const value =
      el instanceof HTMLInputElement && el.type === 'checkbox'
        ? el.checked
        : k === 'speed'
          ? Number(el.value)
          : el.value;
    Object.assign(campaign.settings, { [k]: value });
    settings();
    save();
    return;
  }
  if (el.id === 'secondary-job') {
    const h = campaign.heroes.find((h) => h.id === partyHero)!;
    h.secondary = (el.value as JobId) || null;
    save();
    renderModal();
  }
  if (el.id === 'shop-hero') {
    partyHero = el.value;
    renderModal();
  }
  if (el.id === 'import-file') {
    const file = (el as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error();
      const parsed = validateSave(JSON.parse(await file.text()));
      if (!parsed) throw new Error();
      campaign = parsed;
      engine = campaign.battle ? new BattleEngine(campaign.battle) : null;
      missionId = engine?.battle.mission ?? Math.min(campaign.completed.length, 5);
      view = engine ? 'battle' : 'campaign';
      modal = '';
      modalStack = [];
      deploySelection = [...campaign.selected];
      partyHero = campaign.selected[0];
      inspected = engine?.active?.id ?? null;
      mode = 'inspect';
      selectedPoint = null;
      reward = null;
      busy = false;
      sound.battle = view === 'battle';
      settings();
      scene.loadMap(missionId);
      scene.syncUnits(view === 'battle' ? engine!.battle.units : previewUnits());
      save();
      render();
      scheduleAI();
      toast('Your company has returned.');
    } catch {
      toast('That file is not a valid Crown & Cinder save. Your story is unchanged.');
    }
  }
});
let cursor: Point = { x: 4, z: 8 };
document.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).matches('input,select,textarea')) return;
  if (e.key === 'Tab' && modal) {
    const els = [
      ...modalRoot.querySelectorAll<HTMLElement>(
        'button:not(:disabled),select,input,[tabindex="0"]'
      )
    ];
    if (!els.length) return;
    const first = els[0],
      last = els.at(-1)!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
    return;
  }
  if (e.key === 'Escape') {
    if (modal && modal !== 'result' && modal !== 'dialogue') {
      closeModal();
    } else void action('cancel');
    return;
  }
  if (modal) return;
  const shortcuts: Record<string, string> = {
    q: 'rotate-left',
    e: 'rotate-right',
    '+': 'zoom-in',
    '=': 'zoom-in',
    '-': 'zoom-out',
    m: 'move',
    a: 'attack',
    s: 'skills',
    i: 'items',
    w: 'wait',
    g: 'grid'
  };
  const k = e.key.toLowerCase();
  if (shortcuts[k]) {
    e.preventDefault();
    void action(shortcuts[k]);
  }
  if (
    view === 'battle' &&
    engine &&
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
  ) {
    e.preventDefault();
    if (!hover && !selectedPoint) cursor = { x: engine.active?.x ?? 4, z: engine.active?.z ?? 8 };
    cursor = {
      x: Math.max(
        0,
        Math.min(11, cursor.x + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0))
      ),
      z: Math.max(
        0,
        Math.min(9, cursor.z + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0))
      )
    };
    hover = cursor;
    updateHighlights();
    scene.selection(cursor, '#ffffff');
  }
  if (e.key === 'Enter' && !(e.target as HTMLElement).closest('button')) {
    e.preventDefault();
    if (selectedPoint) void action(mode === 'move' ? 'confirm-move' : 'confirm-action');
    else tileClick(cursor);
  }
});
settings();
render();
const loading = document.createElement('div');
loading.className = 'loading-world';
loading.innerHTML = `<span>${icon('crown', 30)}</span><p>A little world is waking…</p>`;
document.body.append(loading);
try {
  await scene.init(campaign.settings.quality);
  loaded = true;
  loading.remove();
  if (engine && view === 'battle') {
    missionId = engine.battle.mission;
    scene.loadMap(missionId);
    scene.syncUnits(engine.battle.units);
    if (!engine.battle.active) engine.nextTurn();
    sound.battle = true;
  } else {
    scene.loadMap(missionId);
    scene.syncUnits(previewUnits());
  }
  render();
  scheduleAI();
  if (saveWarning) toast(saveWarning);
} catch (error) {
  loading.innerHTML = `${icon('mountain', 32)}<h2>The world needs a little help.</h2><p>${esc(error instanceof Error ? error.message : error)}</p><button onclick="location.reload()">Try again</button>`;
  console.error(error);
}
// Read-only diagnostics make renderer and turn state observable for smoke checks.
Object.defineProperty(window, '__CINDER__', {
  get: () => ({
    ready: loaded,
    renderer: scene.backend,
    view,
    modal,
    mode,
    busy,
    campaign: structuredClone(campaign),
    tiles: loaded ? scene.tiles.map((t) => ({ ...t, screen: scene.project(t) })) : [],
    drawCalls: scene.renderer?.info?.render?.drawCalls ?? scene.renderer?.info?.render?.calls,
    triangles: scene.renderer?.info?.render?.triangles
  })
});
