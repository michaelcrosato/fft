# Crown & Cinder — A Little Rebellion

An original, playable browser tactical RPG inspired by the elevated town battles and job-based party building of Final Fantasy Tactics. Lead four companions through six authored chapters, from Bellwether's grain-tithe uprising to the gates of Cinderkeep.

## Run

Requires Node.js 22.12+ (developed with Node 24) and npm.

```sh
npm ci
npm run dev
```

Open the URL Vite prints. The current development session uses **http://localhost:5174** because port 5173 belongs to another application.

```sh
npm run build       # Type-check and create dist/
npm run preview     # Serve the production build
npm test            # Deterministic combat, progression, save, and campaign tests
npm run test:e2e    # Real browser controls, mobile layouts, saves, and renderer fallbacks
```

If a Playwright browser is not present, run `npx playwright install chromium` before the browser suite. `dist/` can be served by any static HTTPS host. No backend, credentials, or external runtime assets are required.

To verify the built bundles and record a rendering sample, run `npm run preview -- --port 4174 --strictPort` and, in a second terminal, `npm run test:production`. Results and screenshots are written to `artifacts/production-*`. The browser suite uses full Chromium and includes a complete chapter played through the UI. It passed in 49 seconds with hardware acceleration; software rendering can take several minutes.

## Play

- Choose a chapter, follow the story, and select four companions.
- Each turn allows one move and one action, in either order. Tap a tile or choose an ability's target list, then confirm.
- End the turn with a facing. Guard automatically if you have not acted.
- Learn skills with JP, change jobs, equip a secondary discipline, and upgrade gear at the supply wagon.
- Win chapters to unlock new companions, jobs, and the ending. Replay for additional rewards and up to eighteen stars.

Drag to rotate; pinch or use the camera controls to zoom. Keyboard: **M** move, **A** attack, **S** abilities, **I** items, **W** end turn, **Q/E** rotate, **G** grid, **+/−** zoom, **Escape** back. Arrow keys move a tile cursor; **Enter** selects or confirms. The in-game field guide explains initiative, height, facing, charged spells, friendly fire, statuses, and revival.

The game saves after actions and purchases. Settings provides save export/import, three difficulties, audio controls, battle speed, reduced motion, and a battery-saving renderer setting. Retreat restores starting supplies; defeated companions recover between battles.

## Rendering

Three.js r186's `WebGPURenderer` is the primary renderer, with its WebGL2 backend used automatically when necessary. An isolated Three.js r160 renderer provides actual WebGL1 compatibility. Force either compatibility path with `?renderer=webgl2` or `?renderer=webgl1`.

WebGPU requires HTTPS or localhost. A phone visiting a plain HTTP LAN address will normally use WebGL2; serve the production build over HTTPS to enable WebGPU there. Mobile layouts and touch input are tested in Chromium at 360–412 CSS pixels wide, including landscape. Physical Samsung S26 performance has not been measured.

The production fortress scene was checked at 1920×1080 on this Windows machine with an RTX 4070 Super and a reported NVIDIA Lovelace WebGPU adapter. A short animation-frame sample reached approximately 144 FPS at High quality. This is a desktop rendering sample, not a sustained mobile benchmark; the raw measurements are in `artifacts/production-check.json`.

Models are procedural original low-poly geometry, batched by material. Modern rendering includes AgX tone mapping, physically based materials, shadow mapping, a Three Shader Language water shader, animated flags, particles, combat effects, and bounded pixel density. The compatibility renderer uses the same game and scene data with simpler water and lighting.

## Project layout

- `src/data.ts`: six maps, story, jobs, abilities, companions, shop.
- `src/engine.ts`: deterministic rules, pathfinding, initiative, targeting, AI, progression, save validation.
- `src/scene.ts`: renderer selection, dioramas, original miniature models, camera and effects.
- `src/main.ts`: campaign and battle UI, input, persistence, accessibility, dialogs.
- `src/audio.ts`: original synthesized music and sound effects.
- `tests/`: rules tests and Playwright browser coverage.
- `artifacts/`: verification screenshots.
- `docs/BUILD.md`: original brief, requirements, and research sources.

## Credits

All game writing, characters, models, and synthesized audio are original to this project. The design research references are listed in `docs/BUILD.md`; no Final Fantasy artwork, text, models, or music is distributed.

Cormorant Garamond and DM Sans are bundled locally under the SIL Open Font License. Their licenses are included in `public/fonts/`. Three.js is MIT licensed; its package licenses are included by npm.
