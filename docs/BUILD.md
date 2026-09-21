# Crown & Cinder: A Little Rebellion

## Brief and scope
Create a finished original browser tactical RPG inspired by Final Fantasy Tactics, with a mobile-first interface, low-poly miniature art, Three.js, WebGPU first, and WebGL2 / WebGL1 fallbacks. The chosen iconic sequence is the climb from a merchant-town street battle to a fortress confrontation, inspired by Dorter's elevated rooftops and Chapter I's political conflict. Original cast, writing, maps, models, music, and branding.

## Required finished experience
- Six authored encounters forming a complete narrative arc, distinct geography and objectives, ending, replayable battles.
- Deployment, CT initiative, movement and jump constraints, facing, height/range/line of sight, attacks, charged area spells, healing, revival, items, statuses, enemy AI, victory/defeat, retreat/retry.
- Six switchable jobs, unlocks, JP skills, experience/levels, secondary abilities, equipment, a shop, battle rewards, saved campaign and in-progress battles.
- Responsive campaign, roster, journal, field guide, battle HUD, targeting previews, options, sound/music, clear tutorial, keyboard/touch controls.
- Original detailed low-poly 3D dioramas, animated units and effects, shadows, warm atmospheric lighting, camera rotation/zoom, readable unit markers and grid.
- Production build, meaningful engine tests, full campaign simulation, desktop and mobile browser checks, renderer fallback checks and screenshots.

## Sources consulted
- https://gamefaqs.gamespot.com/ps/197339-final-fantasy-tactics/faqs
- https://gamefaqs.gamespot.com/ps/197339-final-fantasy-tactics/faqs/76070 — progression, recovery, turn inspection.
- https://gamefaqs.gamespot.com/psp/937312-final-fantasy-tactics-the-war-of-the-lions/faqs/76070/dorter-slums-4 — elevation, archers, charged spells, defensive positioning.
- https://gamefaqs.gamespot.com/psp/937312-final-fantasy-tactics-the-war-of-the-lions/faqs/76070/generic-jobs — jobs and learned abilities.
- https://threejs.org/manual/pages/webgpurenderer — current WebGPU rendering with WebGL2 backend.
- https://github.com/mrdoob/three.js/releases/tag/r186 — current release verified on 2026-09-20.
- https://playwright.dev/docs/browsers — full Chromium's headless mode for hardware-backed verification.

## Verification status
Completed on 2026-09-20. The finished scope is a six-chapter original campaign with a complete ending and replay loop.

| Area | Evidence |
| --- | --- |
| Rules and progression | 28 engine tests pass, covering movement, height, facing, charge resolution, friendly fire, healing, revival, resource limits, statuses, objectives, jobs, equipment, and validated persistence. |
| Full campaign | A deterministic Classic-difficulty simulation wins all six chapters through legal actions, with skill learning, equipment purchases, rewards, and level progression. |
| Browser gameplay | All 13 Playwright scenarios pass in one run (49.0 seconds). The first chapter is played from story and deployment to victory using actual UI and canvas clicks. |
| Menus and recovery | Company management, secondary jobs, shopping, export/import, keyboard inspection, victory reload, defeat reload, retry, retreat, restored supplies, epilogue, and unlocked replays are exercised. |
| Mobile | Portrait viewports of 360×740, 390×844, and 412×915; landscape 844×390; real browser touch events at device scale factor 2. All six chapter controls fit the tested layouts, with no horizontal page overflow. |
| Desktop and art | 1264×569 and 1440×900 layouts inspected; all six dioramas captured and visually reviewed. Final fixes include crowded labels, supported abbey lintels, tall-map framing, and controls clear of the journey track. |
| Renderers | Production bundles render and accept battle controls through WebGPU, WebGL2, and actual WebGL1. No page/console errors and no external runtime asset requests in the production check. |
| Build | Strict TypeScript check and Vite production build pass. Prettier check passes. Renderer bundles are loaded dynamically; Three.js produces an expected large-chunk advisory. |

The final production scene is sampled at 1920×1080, High quality, with full Chromium. Windows reports an RTX 4070 Super; the browser reports an NVIDIA Lovelace adapter. See `artifacts/production-check.json` for frame counts, timings, renderer identity, draw calls, and triangles. These are short desktop animation-frame samples. Physical Samsung S26 thermals, battery use, and sustained performance remain unmeasured.

## Delivery and evidence

- Source and lockfile: repository root. Production files: `dist/`.
- Development: `http://localhost:5174`. Production preview: `http://localhost:4174`.
- `artifacts/verified-desktop-campaign.png`, `verified-desktop-battle.png`, `verified-mobile-target.png`, `verified-touch-battle.png`, and `verified-touch-details.png` show the final interface.
- `artifacts/map-1.png` through `map-6.png` show every authored battlefield.
- `artifacts/verified-victory.png`, `verified-defeat.png`, and `verified-ending.png` show the complete result flows.
- `artifacts/production-auto.png`, `production-webgl2.png`, and `production-webgl1.png` show the built renderer paths.

No backend, account, credentials, paid service, or externally hosted game asset is required. Font licenses are bundled in `public/fonts/`. The game contains original art, writing, models, and synthesized audio.
