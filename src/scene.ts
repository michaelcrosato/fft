import { JOBS, MISSIONS, type Point, type Tile } from './data';
import { type Unit, type Effect, key } from './engine';

// All scene objects are built with the selected Three.js implementation so the
// WebGL1 fallback never mixes objects from different Three.js revisions.
type Any3D = any;
export class Diorama {
  T: Any3D;
  renderer: Any3D;
  scene: Any3D;
  camera: Any3D;
  board: Any3D;
  unitsRoot: Any3D;
  highlights: Any3D;
  effectsRoot: Any3D;
  ray: Any3D;
  pointer: Any3D;
  geometries: Record<string, Any3D> = {};
  materials = new Map<string, Any3D>();
  models = new Map<string, Any3D>();
  pickTiles: Any3D[] = [];
  unitData: Unit[] = [];
  tiles: Tile[] = [];
  clouds: Any3D[] = [];
  flags: Any3D[] = [];
  particles: Any3D;
  water: Any3D;
  backend = '';
  shader: Any3D;
  angle = 0.76;
  targetAngle = 0.76;
  zoom = 1;
  campaign = true;
  grid = false;
  reduced = false;
  low = false;
  dragging = false;
  onTile: (p: Point) => void = () => {};
  onHover: (p: Point | null) => void = () => {};
  onReady: () => void = () => {};
  onFrame: (positions: Map<string, { x: number; y: number; visible: boolean }>) => void = () => {};
  lastTime = 0;
  frame = 0;
  disposed = false;
  private drag: { x: number; y: number; angle: number; time: number } | null = null;
  constructor(public host: HTMLElement) {}
  async init(quality = 'auto') {
    this.low = quality === 'low';
    const forced = new URLSearchParams(location.search).get('renderer');
    if (forced !== 'webgl1') {
      try {
        this.T = await import('three/webgpu');
        this.renderer = new this.T.WebGPURenderer({
          antialias: true,
          alpha: true,
          forceWebGL: forced === 'webgl2',
          powerPreference: 'high-performance'
        });
        await this.renderer.init();
        this.backend = this.renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2';
      } catch (error) {
        console.warn('Modern renderer unavailable; trying compatibility renderer.', error);
        this.renderer?.dispose();
        this.renderer = null;
      }
    }
    if (!this.renderer) {
      this.T = await import('three-legacy');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl', {
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      if (!context)
        throw new Error(
          'Your browser could not create a 3D canvas. Enable hardware acceleration and reload.'
        );
      this.renderer = new this.T.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
      this.backend = 'WebGL1';
      this.low = true;
    }
    const T = this.T;
    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        this.low ? 1 : quality === 'high' ? 2 : innerWidth < 700 ? 1.5 : 1.75
      )
    );
    this.renderer.shadowMap.enabled = !this.low;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.toneMapping = T.AgXToneMapping ?? T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.host.replaceChildren(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Battlefield. Drag to rotate. Use the camera buttons to zoom.'
    );
    this.scene = new T.Scene();
    this.camera = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 130);
    this.ray = new T.Raycaster();
    this.pointer = new T.Vector2();
    this.scene.add(new T.HemisphereLight(0xe9f4ee, 0x688879, 2.0));
    const sun = new T.DirectionalLight(0xffe4b3, 3.4);
    sun.position.set(-9, 16, 8);
    sun.castShadow = !this.low;
    const shadowSize = this.low
      ? 512
      : quality === 'high'
        ? innerWidth < 700
          ? 2048
          : 4096
        : innerWidth < 700
          ? 1024
          : 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    Object.assign(sun.shadow.camera, {
      left: -12,
      right: 12,
      top: 12,
      bottom: -12,
      near: 0.1,
      far: 45
    });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.035;
    this.scene.add(sun);
    const fill = new T.DirectionalLight(0xc4e6e3, 1);
    fill.position.set(8, 5, -6);
    this.scene.add(fill);
    this.board = new T.Group();
    this.unitsRoot = new T.Group();
    this.highlights = new T.Group();
    this.effectsRoot = new T.Group();
    this.scene.add(this.board, this.unitsRoot, this.highlights, this.effectsRoot);
    const shadow = this.mesh(
      new T.PlaneGeometry(200, 200),
      new T.ShadowMaterial({ color: '#4b5a3e', opacity: 0.16 }),
      this.scene
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.52;
    shadow.receiveShadow = true;
    shadow.castShadow = false;
    // Large softly shaded contact disc keeps the floating island grounded on low quality too.
    const contact = this.mesh(
      new T.CircleGeometry(7.5, 64),
      new T.MeshBasicMaterial({
        color: 0x728c7d,
        transparent: true,
        opacity: 0.12,
        depthWrite: false
      }),
      this.scene
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = -1.5;
    contact.scale.set(1, 0.72, 1);
    this.geometries.box = new T.BoxGeometry(1, 1, 1);
    this.geometries.cyl = new T.CylinderGeometry(1, 1, 1, 8);
    this.geometries.cone = new T.ConeGeometry(1, 1, 5);
    this.geometries.ball = new T.IcosahedronGeometry(1, 0);
    const points = [];
    for (let i = 0; i < 65; i++)
      points.push((Math.random() - 0.5) * 18, Math.random() * 7, (Math.random() - 0.5) * 15);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(points, 3));
    this.particles = new T.Points(
      geo,
      new T.PointsMaterial({
        color: 0xffe8ad,
        size: 0.045,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
      })
    );
    this.scene.add(this.particles);
    if (this.backend !== 'WebGL1') {
      const n = await import('three/tsl');
      this.water = new T.MeshStandardNodeMaterial({
        roughness: 0.25,
        metalness: 0.2,
        transparent: true,
        opacity: 0.92
      });
      const ripple = n.sin(
        n.positionLocal.x.mul(7).add(n.positionLocal.z.mul(4)).add(n.time.mul(1.6))
      );
      this.water.colorNode = n.mix(
        n.color('#4a9e9c'),
        n.color('#91cec1'),
        ripple.mul(0.16).add(0.42)
      );
      this.water.positionNode = n.positionLocal.add(n.vec3(0, ripple.mul(0.018), 0));
    }
    this.bind();
    this.resize();
    this.loadMap(0);
    this.renderer.setAnimationLoop((t: number) => this.animate(t));
    this.onReady();
    return this.backend;
  }
  mat(color: string, extra: Record<string, unknown> = {}) {
    const k = color + JSON.stringify(extra);
    if (!this.materials.has(k))
      this.materials.set(
        k,
        new this.T.MeshStandardMaterial({ color, roughness: 0.87, flatShading: true, ...extra })
      );
    return this.materials.get(k);
  }
  mesh(geo: Any3D, mat: Any3D, parent: Any3D = this.board) {
    const m = new this.T.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    parent = this.board
  ) {
    const m = this.mesh(this.geometries.box, this.mat(color), parent);
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    return m;
  }
  cyl(x: number, y: number, z: number, r: number, h: number, color: string, parent = this.board) {
    const m = this.mesh(this.geometries.cyl, this.mat(color), parent);
    m.position.set(x, y, z);
    m.scale.set(r, h, r);
    return m;
  }
  roof(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    parent = this.board
  ) {
    const T = this.T,
      shape = new T.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(0, h);
    shape.lineTo(w / 2, 0);
    shape.closePath();
    const geo = new T.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    geo.translate(0, 0, -d / 2);
    const m = this.mesh(geo, this.mat(color), parent);
    m.position.set(x, y, z);
    return m;
  }
  surface(t: Point) {
    return (this.tiles.find((tile) => tile.x === t.x && tile.z === t.z)?.h ?? 0) * 0.37 + 0.16;
  }
  position(p: Point) {
    return { x: p.x - 5.5, z: p.z - 4.5, y: this.surface(p) };
  }
  tree(x: number, y: number, z: number, seed: number) {
    this.cyl(x, y + 0.6, z, 0.12, 1.2, '#795d42');
    const colors = seed % 2 ? ['#76957b', '#91a675', '#aeb777'] : ['#c6aa62', '#d8b967', '#b89b58'];
    for (let i = 0; i < 3; i++) {
      const m = this.mesh(this.geometries.ball, this.mat(colors[i]));
      m.position.set(
        x + (i === 1 ? 0.3 : i === 2 ? -0.25 : 0),
        y + 1.25 + i * 0.25,
        z + (i === 1 ? 0.2 : 0)
      );
      m.scale.set(0.67, 0.68, 0.59);
      m.rotation.y = i * 2;
    }
  }
  house(x: number, y: number, z: number, tower = false) {
    const h = tower ? 2.7 : 1.85,
      w = tower ? 1.7 : 1.95,
      d = tower ? 1.65 : 1.9,
      c = tower ? '#d2c6a6' : '#e3d2aa';
    this.box(x + 0.5, y + h / 2, z + 0.5, w, h, d, c);
    this.box(x + 0.5, y + 0.16, z + 0.5, w + 0.1, 0.32, d + 0.1, '#a6a18c');
    this.box(x + 0.5, y + h * 0.55, z + 0.5, w + 0.04, 0.11, d + 0.04, '#897c63');
    for (const dx of [-w / 2 + 0.13, w / 2 - 0.13]) {
      this.box(x + 0.5 + dx, y + h / 2, z + 0.5 + d / 2 + 0.01, 0.1, h, 0.08, '#8d7b61');
      this.box(x + 0.5 + dx, y + h / 2, z + 0.5 - d / 2, 0.1, h, 0.08, '#8d7b61');
    }
    if (tower) {
      this.roof(x + 0.5, y + h, z + 0.5, w + 0.45, 1.35, d + 0.4, '#587e7d');
      const cap = this.mesh(this.geometries.cone, this.mat('#577979'));
      cap.scale.set(0.2, 0.6, 0.2);
      cap.position.set(x + 0.5, y + h + 1.6, z + 0.5);
      this.cyl(x + 0.5, y + h + 2, z + 0.5, 0.035, 0.45, '#947346');
      this.flag(x + 0.5, y + h + 2.1, z + 0.5, '#b96343');
    } else {
      this.roof(x + 0.5, y + h, z + 0.5, w + 0.3, 0.98, d + 0.3, '#a75f46');
      for (let i = 1; i < 5; i++) {
        const strip = this.box(
          x + 0.5,
          y + h + 0.98 - i * 0.195,
          z + 0.5,
          ((w + 0.3) * i) / 5 + 0.06,
          0.05,
          d + 0.36,
          '#b57151'
        );
        strip.castShadow = false;
      }
      this.box(x + 1, y + h + 0.6, z, 0.28, 0.95, 0.32, '#d3c4a8');
      this.box(x + 1, y + h + 1.1, z, 0.38, 0.1, 0.42, '#817c6c');
    }
    this.box(x + 0.5, y + 0.5, z + 0.5 + d / 2 + 0.015, 0.38, 0.95, 0.04, '#5b665a');
    this.box(x + 0.64, y + 0.47, z + 0.5 + d / 2 + 0.05, 0.045, 0.045, 0.03, '#d1ad61');
    for (const dx of [-0.5, 0.5]) {
      this.box(x + 0.5 + dx, y + h * 0.71, z + 0.5 + d / 2 + 0.023, 0.33, 0.45, 0.04, '#566b66');
      this.box(x + 0.5 + dx, y + h * 0.71, z + 0.5 + d / 2 + 0.048, 0.035, 0.45, 0.025, '#d8c79e');
      this.box(x + 0.5 + dx, y + h * 0.71, z + 0.5 + d / 2 + 0.05, 0.33, 0.035, 0.025, '#d8c79e');
    }
    this.box(x + 0.5 + w / 2 + 0.012, y + h * 0.67, z + 0.5, 0.03, 0.45, 0.36, '#536b63');
    if (!tower) {
      this.box(x + 0.5, y + 1.03, z + 1.78, 1.32, 0.1, 0.8, '#849574').rotation.x = 0.13;
      for (const dx of [-0.6, 0.6])
        this.cyl(x + 0.5 + dx, y + 0.47, z + 2.03, 0.035, 0.95, '#82745a');
      this.box(x + 0.5, y + 0.4, z + 1.7, 1.16, 0.54, 0.45, '#a58b5c');
      for (let i = 0; i < 5; i++)
        this.cyl(x + 0.08 + i * 0.2, y + 0.75, z + 1.65, 0.09, 0.1, i % 2 ? '#c19c43' : '#a8643d');
    }
  }
  flag(x: number, y: number, z: number, color: string) {
    const T = this.T,
      geo = new T.PlaneGeometry(0.65, 0.38, 5, 2);
    const flag = this.mesh(geo, this.mat(color, { side: T.DoubleSide }), this.board);
    flag.position.set(x + 0.3, y - 0.08, z);
    this.flags.push(flag);
  }
  loadMap(id: number) {
    this.board.traverse((m: Any3D) => {
      if (m.isMesh && !Object.values(this.geometries).includes(m.geometry)) m.geometry.dispose();
    });
    this.board.clear();
    this.pickTiles = [];
    this.flags = [];
    this.tiles = MISSIONS[id].tiles;
    const T = this.T;
    const theme = MISSIONS[id].theme;
    this.host.style.background = `radial-gradient(ellipse at 60% 35%, #f4f2e7 0%, ${MISSIONS[id].sky} 64%, #cdd9cc 100%)`;
    this.box(0, -0.66, 0, 12.15, 1.35, 10.15, '#9b9477');
    this.box(0, -1.1, 0, 11.8, 0.35, 9.8, '#858770');
    this.box(0, -0.08, 0, 12.2, 0.22, 10.2, '#a7ac80');
    // Layered earth and cut stone along the island edges.
    for (let i = 0; i < 12; i++) {
      this.box(
        i - 5.5,
        -0.48,
        5.065,
        0.85,
        0.19 + (i % 3) * 0.1,
        0.08,
        i % 2 ? '#b7ae8c' : '#8d8d70'
      );
      this.box(i - 5.5, -0.98, 5.07, 0.62, 0.14, 0.06, '#777e68');
    }
    for (let i = 0; i < 10; i++)
      this.box(6.07, -0.6, i - 4.5, 0.08, 0.2, 0.75, i % 2 ? '#b2a88a' : '#848870');
    for (const tile of this.tiles) {
      const { x, y, z } = this.position(tile),
        seed = (tile.x * 11 + tile.z * 17) % 7;
      const color =
        tile.terrain === 'stone'
          ? ['#c6bfa5', '#cfc7ab', '#bdbca4'][seed % 3]
          : tile.terrain === 'sand'
            ? ['#bdae81', '#c7b787', '#b6ac7d'][seed % 3]
            : tile.terrain === 'wood'
              ? '#aa8d62'
              : tile.terrain === 'water'
                ? '#73b4b1'
                : ['#8a9d76', '#96a681', '#a0ab84'][seed % 3];
      const block = this.box(x, (y - 0.17) / 2, z, 0.99, y + 0.17, 0.99, color);
      block.userData.tile = tile;
      this.pickTiles.push(block);
      if (tile.terrain === 'stone' && !tile.blocked) {
        for (let k = 0; k < 4; k++) {
          const xx = x + ((k % 2) - 0.5) * 0.45,
            zz = z + (Math.floor(k / 2) - 0.5) * 0.45;
          this.box(xx, y + 0.02, zz, 0.425, 0.025, 0.425, seed % 2 ? '#cbc5ae' : '#d1c9af');
        }
      }
      if ((theme === 'town' || theme === 'market') && tile.x >= 2 && tile.x <= 4 && tile.z === 0) {
        this.box(x, y + 0.17, z - 0.42, 0.98, 0.3, 0.12, '#bbb998');
        if (tile.x % 2 === 0) this.box(x, y + 0.39, z - 0.42, 0.38, 0.16, 0.17, '#ccc8a8');
      }
      if (tile.terrain === 'water') {
        const w = this.box(x, y + 0.04, z, 0.99, 0.05, 0.99, '#6ca8a8');
        w.material =
          this.water ??
          this.mat('#70b9b5', {
            metalness: 0.3,
            roughness: 0.25,
            transparent: true,
            opacity: 0.83
          });
        for (let k = 0; k < 2; k++)
          this.box(
            x - 0.25 + k * 0.42,
            y + 0.073,
            z + ((seed % 3) - 1) * 0.2,
            0.18 + seed * 0.04,
            0.008,
            0.018,
            '#a6d6c8'
          );
      }
      if (tile.terrain === 'wood')
        for (let k = 0; k < 5; k++)
          this.box(x, y + 0.05, z - 0.4 + k * 0.2, 0.98, 0.04, 0.17, k % 2 ? '#b49b6d' : '#a38c66');
      if (tile.decor === 'house') this.house(x, y, z);
      if (tile.decor === 'tower') this.house(x, y, z, true);
      if (tile.decor === 'tree') this.tree(x, y, z, seed);
      if (tile.decor === 'pillar') {
        this.box(x, y + 0.05, z, 0.7, 0.1, 0.7, '#b5b09b');
        this.cyl(x, y + 0.85, z, 0.25, 1.55, '#d3cdb6');
        this.box(x, y + 1.67, z, 0.7, 0.16, 0.7, '#bfbda8');
      }
      if (tile.decor === 'wall') {
        this.box(x, y + 0.55, z, 0.97, 1.1, 0.8, '#a8ad9b');
        this.box(x, y + 1.17, z, 1, 0.15, 0.95, '#c5c5ad');
        if (tile.x % 2 === 0) this.box(x, y + 1.42, z, 0.5, 0.38, 0.9, '#b3b8a5');
      }
      if (tile.decor === 'rock') {
        const m = this.mesh(this.geometries.ball, this.mat('#a49f8d'));
        m.position.set(x, y + 0.35, z);
        m.scale.set(0.55, 0.6, 0.65);
        m.rotation.set(0.3, seed, 0.1);
      }
      if (tile.decor === 'crates' || tile.decor === 'cart') {
        this.box(x, y + 0.25, z, 0.74, 0.5, 0.62, '#a78b5e');
        for (const dx of [-0.3, 0.3]) this.box(x + dx, y + 0.26, z, 0.055, 0.52, 0.65, '#76664c');
        this.box(x - 0.12, y + 0.67, z, 0.48, 0.34, 0.48, '#b89b6f');
        if (tile.decor === 'cart')
          for (const dx of [-0.42, 0.42]) {
            const m = this.cyl(x + dx, y + 0.17, z, 0.23, 0.08, '#645c47');
            m.rotation.z = Math.PI / 2;
          }
      }
      if (tile.decor === 'fountain') {
        this.cyl(x, y + 0.15, z, 0.65, 0.3, '#b7b6a0');
        this.cyl(x, y + 0.32, z, 0.52, 0.08, '#81b6ad');
        this.cyl(x, y + 0.7, z, 0.15, 0.8, '#c3c1a5');
        this.cyl(x, y + 1.1, z, 0.35, 0.14, '#cfccb0');
      }
      if (tile.decor === 'altar') {
        this.box(x, y + 0.25, z, 0.9, 0.5, 0.65, '#bbb6a3');
        this.box(x, y + 0.55, z, 1.05, 0.13, 0.8, '#d8cfb4');
        this.cyl(x, y + 0.8, z, 0.08, 0.35, '#efdaa5');
      }
      if (tile.terrain === 'grass' && !tile.blocked && seed === 0) {
        for (let i = 0; i < 3; i++) {
          this.box(x - 0.39 + i * 0.1, y + 0.05, z - 0.36, 0.04, 0.12, 0.025, '#6e8765');
          if (i === 1) this.cyl(x - 0.3, y + 0.14, z - 0.36, 0.06, 0.05, '#e0c878');
        }
      }
    }
    if (theme === 'river') {
      for (const z of [-1, 1]) {
        this.box(0, 0.64, z, 2.85, 0.11, 0.085, '#9c845e');
        for (const x of [-1.35, -0.45, 0.45, 1.35])
          this.box(x, 0.4, z, 0.075, 0.62, 0.075, '#ad9268');
      }
    }
    if (theme === 'abbey') {
      // Stone lintels rest on the two colonnades at their actual terrace heights.
      for (const x of [2, 9])
        for (const [start, end] of [
          [3, 4],
          [5, 7]
        ]) {
          const p = this.position({ x, z: start });
          this.box(
            p.x,
            p.y + 1.82,
            p.z + (end - start) / 2,
            0.65,
            0.16,
            end - start + 0.7,
            '#c5bfa7'
          );
        }
      this.cyl(0, 2.28, -4.2, 0.028, 1.5, '#a19367');
      this.box(0, 2.63, -4.2, 0.55, 0.07, 0.07, '#a19367');
    }
    // Pots, scattered stones, and watch standards give the play space a lived-in scale.
    for (const [x, z] of [
      [-4.3, 4.4],
      [5.2, -2.7],
      [-3.8, -2.9]
    ]) {
      this.cyl(x, 0.23, z, 0.16, 0.35, '#b98562');
      this.cyl(x, 0.4, z, 0.12, 0.04, '#667953');
    }
    this.cyl(4.9, 1.2, -3.7, 0.035, 2, '#887957');
    this.flag(4.9, 2.1, -3.7, '#b26549');
    this.bakeStatic();
    this.clearHighlights();
  }
  bakeStatic(root = this.board, keep = new Set(this.flags)) {
    // Merge by material: hundreds of handcrafted details become a few dozen draw calls.
    const T = this.T,
      batches = new Map<Any3D, { p: number[]; n: number[]; uv: number[] }>();
    root.updateMatrixWorld(true);
    const meshes: Any3D[] = [];
    root.traverse((m: Any3D) => {
      if (m.isMesh && !keep.has(m)) meshes.push(m);
    });
    for (const m of meshes) {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      g.applyMatrix4(m.matrixWorld);
      let b = batches.get(m.material);
      if (!b) {
        b = { p: [], n: [], uv: [] };
        batches.set(m.material, b);
      }
      const p = g.getAttribute('position'),
        n = g.getAttribute('normal'),
        uv = g.getAttribute('uv');
      for (let i = 0; i < p.count; i++) {
        b.p.push(p.getX(i), p.getY(i), p.getZ(i));
        b.n.push(n.getX(i), n.getY(i), n.getZ(i));
        b.uv.push(uv?.getX(i) ?? 0, uv?.getY(i) ?? 0);
      }
      g.dispose();
      root.remove(m);
    }
    // Keep invisible tile colliders separate from the visual merged meshes.
    for (const [mat, b] of batches) {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(b.p, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(b.n, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(b.uv, 2));
      this.mesh(g, mat, root);
    }
  }
  createUnit(u: Unit) {
    const T = this.T,
      g = new T.Group(),
      body = new T.Group();
    g.add(body);
    const ally = u.team === 'ally',
      color = ally ? JOBS[u.job].color : '#a8644e',
      skin = u.id === 'bram' ? '#a87c56' : '#dfb68c',
      metal = ally ? '#c4d1cc' : '#bcb29b';
    const ring = this.mesh(
      new T.CylinderGeometry(0.34, 0.34, 0.055, 24),
      this.mat(ally ? '#e0c276' : '#b76c52'),
      g
    );
    ring.position.y = 0.055;
    const boots = '#555a50';
    this.box(-0.12, 0.19, 0.025, 0.17, 0.29, 0.23, boots, body);
    this.box(0.12, 0.19, 0.025, 0.17, 0.29, 0.23, boots, body);
    this.box(0, 0.49, 0, 0.44, 0.44, 0.28, color, body);
    this.box(0, 0.39, 0.01, 0.46, 0.08, 0.32, '#8b7753', body);
    this.box(0, 0.77, 0, 0.33, 0.32, 0.32, skin, body);
    this.box(-0.09, 0.78, 0.166, 0.046, 0.045, 0.025, '#3d4540', body);
    this.box(0.09, 0.78, 0.166, 0.046, 0.045, 0.025, '#3d4540', body);
    this.box(-0.3, 0.51, 0, 0.14, 0.34, 0.18, color, body).rotation.z = -0.17;
    this.box(0.3, 0.51, 0, 0.14, 0.34, 0.18, color, body).rotation.z = 0.17;
    this.box(-0.3, 0.34, 0.035, 0.13, 0.14, 0.14, skin, body);
    this.box(0.3, 0.34, 0.035, 0.13, 0.14, 0.14, skin, body);
    // Capes are a single tapered polygon, readable even at phone scale.
    const capeGeo = new T.ConeGeometry(0.31, 0.55, 4, 1, true),
      cape = this.mesh(
        capeGeo,
        this.mat(ally ? '#456c69' : '#864d43', { side: T.DoubleSide }),
        body
      );
    cape.rotation.y = Math.PI / 4;
    cape.rotation.x = 0.15;
    cape.position.set(0, 0.46, -0.16);
    cape.scale.set(1, 1, 0.4);
    if (u.job === 'arcanist') {
      this.cyl(0, 0.94, 0, 0.32, 0.065, '#a79976', body);
      const hat = this.mesh(this.geometries.cone, this.mat('#a99b76'), body);
      hat.scale.set(0.26, 0.45, 0.26);
      hat.position.set(0, 1.15, 0);
      hat.rotation.z = -0.13;
      this.cyl(0.4, 0.61, 0.08, 0.035, 1, '#715c49', body);
      const orb = this.mesh(
        this.geometries.ball,
        this.mat('#c9bade', { emissive: 0x8a5cab, emissiveIntensity: 0.4 }),
        body
      );
      orb.position.set(0.4, 1.16, 0.08);
      orb.scale.setScalar(0.13);
    } else if (u.job === 'cleric') {
      this.box(0, 0.93, -0.05, 0.4, 0.19, 0.36, '#e5dcc0', body);
      this.box(-0.19, 0.8, -0.01, 0.08, 0.26, 0.34, '#e5dcc0', body);
      this.box(0.19, 0.8, -0.01, 0.08, 0.26, 0.34, '#e5dcc0', body);
      this.cyl(0.4, 0.6, 0.08, 0.035, 1.02, '#bba477', body);
      const halo = this.mesh(new T.TorusGeometry(0.13, 0.03, 5, 12), this.mat('#dbc184'), body);
      halo.position.set(0.4, 1.12, 0.08);
    } else if (u.job === 'ranger') {
      this.box(0, 0.92, -0.02, 0.4, 0.13, 0.37, '#667957', body);
      const feather = this.box(0.17, 1.03, -0.05, 0.06, 0.24, 0.04, '#daca99', body);
      feather.rotation.z = -0.4;
      const bow = this.mesh(
        new T.TorusGeometry(0.32, 0.035, 4, 12, Math.PI),
        this.mat('#ad8753'),
        body
      );
      bow.position.set(0.4, 0.57, 0.09);
      bow.rotation.z = -Math.PI / 2;
      this.box(0.4, 0.57, 0.09, 0.018, 0.6, 0.018, '#e0d6ac', body);
    } else if (u.job === 'monk') {
      this.box(0, 0.96, -0.04, 0.34, 0.1, 0.34, '#5d5444', body);
      this.box(0, 0.88, 0.04, 0.37, 0.055, 0.32, '#d9b878', body);
      this.box(-0.3, 0.36, 0.08, 0.17, 0.17, 0.18, '#c4b792', body);
      this.box(0.3, 0.36, 0.08, 0.17, 0.17, 0.18, '#c4b792', body);
    } else {
      this.box(0, 0.96, -0.025, 0.38, 0.14, 0.37, metal, body);
      this.box(-0.19, 0.84, -0.01, 0.06, 0.19, 0.32, metal, body);
      this.box(0.19, 0.84, -0.01, 0.06, 0.19, 0.32, metal, body);
      this.box(0, 1.08, -0.04, 0.08, 0.18, 0.24, ally ? '#497c81' : '#ad6248', body);
      this.box(0, 0.57, 0.17, 0.29, 0.27, 0.05, metal, body);
      this.box(-0.29, 0.64, 0, 0.21, 0.17, 0.3, metal, body);
      if (u.job === 'dragoon') {
        this.cyl(0.4, 0.75, 0.05, 0.035, 1.5, '#95846a', body);
        const blade = this.mesh(this.geometries.cone, this.mat('#d4e1d9'), body);
        blade.scale.set(0.105, 0.4, 0.07);
        blade.position.set(0.4, 1.65, 0.05);
      } else {
        this.box(0.4, 0.63, 0.13, 0.075, 0.59, 0.045, '#d4dfd6', body);
        this.box(0.4, 0.34, 0.13, 0.25, 0.04, 0.07, '#cbb075', body);
        this.box(0.4, 0.24, 0.13, 0.07, 0.16, 0.07, '#7a6a52', body);
        this.box(-0.37, 0.48, 0.08, 0.13, 0.43, 0.35, '#657d7d', body);
        this.box(-0.445, 0.48, 0.08, 0.025, 0.1, 0.22, '#d7bf82', body);
      }
    }
    this.bakeStatic(body, new Set());
    g.userData = { body, ring, id: u.id, phase: this.models.size * 1.4 };
    this.unitsRoot.add(g);
    this.models.set(u.id, g);
    return g;
  }
  syncUnits(units: Unit[]) {
    this.unitData = units;
    for (const [id, m] of this.models)
      if (
        !units.some((u) => u.id === id) ||
        m.userData.job !== units.find((u) => u.id === id)?.job
      ) {
        m.traverse((mesh: Any3D) => {
          if (mesh.isMesh && !Object.values(this.geometries).includes(mesh.geometry))
            mesh.geometry.dispose();
        });
        this.unitsRoot.remove(m);
        this.models.delete(id);
      }
    for (const u of units) {
      let m = this.models.get(u.id);
      if (!m) {
        m = this.createUnit(u);
        m.userData.job = u.job;
        const p = this.position(u);
        m.position.set(p.x, p.y, p.z);
      }
      m.visible = !u.removed;
      m.userData.target = this.position(u);
      m.userData.down = u.hp <= 0;
      m.userData.facing = { north: Math.PI, east: Math.PI / 2, south: 0, west: -Math.PI / 2 }[
        u.facing
      ];
    }
  }
  clearHighlights() {
    while (this.highlights.children.length) {
      const m = this.highlights.children[0];
      this.highlights.remove(m);
      m.geometry?.dispose();
      m.material?.dispose();
    }
  }
  highlight(points: Point[], color: string, opacity = 0.32) {
    if (!points.length) return;
    const T = this.T;
    const mesh = new T.InstancedMesh(
        new T.BoxGeometry(0.94, 0.035, 0.94),
        new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
        points.length
      ),
      matrix = new T.Matrix4();
    points.forEach((p, i) => {
      const pos = this.position(p);
      matrix.makeTranslation(pos.x, pos.y + 0.053, pos.z);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = false;
    this.highlights.add(mesh);
  }
  selection(p: Point, color = '#f6d477') {
    const pos = this.position(p),
      T = this.T;
    const r = this.mesh(
      new T.RingGeometry(0.36, 0.44, 4),
      new T.MeshBasicMaterial({ color, side: T.DoubleSide, depthWrite: false }),
      this.highlights
    );
    r.rotation.x = -Math.PI / 2;
    r.rotation.z = Math.PI / 4;
    r.position.set(pos.x, pos.y + 0.105, pos.z);
  }
  showGrid(enabled: boolean) {
    this.grid = enabled;
  }
  effect(e: Effect) {
    const m = this.models.get(e.target);
    if (!m) return;
    m.userData.hit = { until: performance.now() + 500, kind: e.kind };
    if (this.reduced) return;
    const T = this.T,
      color =
        e.kind === 'heal'
          ? '#bddb8f'
          : e.kind === 'cast'
            ? '#d7b0ec'
            : e.kind === 'buff'
              ? '#f3d389'
              : '#f1be74',
      group = new T.Group();
    group.position.copy(m.position);
    group.userData.born = performance.now();
    const ring = this.mesh(
      new T.RingGeometry(0.15, 0.2, 32),
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        side: T.DoubleSide,
        depthWrite: false
      }),
      group
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.13;
    ring.userData.ring = true;
    ring.castShadow = false;
    for (let i = 0; i < 10; i++) {
      const p = this.mesh(
        new T.IcosahedronGeometry(0.035, 0),
        new T.MeshBasicMaterial({ color, transparent: true, depthWrite: false }),
        group
      );
      p.position.set(Math.sin(i * 2.4) * 0.15, 0.5, Math.cos(i * 2.4) * 0.15);
      p.userData.velocity = new T.Vector3(
        Math.sin(i * 2.4) * 0.7,
        0.6 + (i % 3) * 0.4,
        Math.cos(i * 2.4) * 0.7
      );
      p.castShadow = false;
    }
    this.effectsRoot.add(group);
  }
  moveUnit(id: string, path: Point[]) {
    const m = this.models.get(id);
    if (m && !this.reduced) m.userData.path = path.map((p) => this.position(p));
  }
  project(p: Point) {
    const t = this.position(p),
      v = new this.T.Vector3(t.x, t.y + 0.12, t.z);
    v.project(this.camera);
    return {
      x: ((v.x + 1) * this.host.clientWidth) / 2,
      y: ((1 - v.y) * this.host.clientHeight) / 2
    };
  }
  rotate(d: number) {
    this.targetAngle += (d * Math.PI) / 2;
  }
  changeZoom(d: number) {
    this.zoom = Math.max(0.7, Math.min(1.6, this.zoom + d));
    this.resize();
  }
  resetCamera() {
    this.targetAngle = 0.76;
    this.zoom = 1;
    this.resize();
  }
  setCampaign(c: boolean) {
    if (this.campaign !== c) {
      this.campaign = c;
      this.resize();
    }
  }
  resize() {
    if (!this.renderer) return;
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    const size = (aspect < 0.85 ? 9 / aspect : this.campaign && h < 650 ? 12.4 : 10.7) / this.zoom;
    this.camera.left = -size * aspect;
    this.camera.right = size * aspect;
    this.camera.top = size;
    this.camera.bottom = -size;
    this.camera.setViewOffset(
      w,
      h,
      this.campaign && w > 850 ? -w * 0.115 : 0,
      w < 700 ? (this.campaign ? -h * 0.04 : h * 0.04) : this.campaign ? h * 0.04 : -h * 0.012,
      w,
      h
    );
    this.camera.updateProjectionMatrix();
  }
  pick(clientX: number, clientY: number): Point | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((clientX - r.left) / r.width) * 2 - 1,
      (-(clientY - r.top) / r.height) * 2 + 1
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    // The visual board has been batched. Raycast original colliders using their retained transforms.
    const hits = this.ray.intersectObjects(this.pickTiles, false);
    const t = hits[0]?.object.userData.tile;
    return t ? { x: t.x, z: t.z } : null;
  }
  bind() {
    const el = this.renderer.domElement,
      pointers = new Map<number, { x: number; y: number }>();
    let pinchDistance = 0,
      pinchZoom = 1;
    el.addEventListener('pointerdown', (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
        pinchZoom = this.zoom;
        this.dragging = true;
        this.drag = null;
      } else {
        this.drag = {
          x: e.clientX,
          y: e.clientY,
          angle: this.targetAngle,
          time: performance.now()
        };
        this.dragging = false;
      }
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e: PointerEvent) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        this.zoom = Math.max(
          0.7,
          Math.min(1.6, (pinchZoom * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, pinchDistance))
        );
        this.resize();
        return;
      }
      if (this.drag) {
        const dx = e.clientX - this.drag.x;
        if (Math.hypot(dx, e.clientY - this.drag.y) > 8) this.dragging = true;
        if (this.dragging) this.targetAngle = this.drag.angle - dx * 0.006;
      } else this.onHover(this.pick(e.clientX, e.clientY));
    });
    el.addEventListener('pointerup', (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (this.drag && !this.dragging) {
        const tile = this.pick(e.clientX, e.clientY);
        if (tile) this.onTile(tile);
      }
      this.drag = null;
      this.dragging = false;
    });
    el.addEventListener('pointercancel', (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      this.drag = null;
      this.dragging = false;
    });
    el.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        this.changeZoom(e.deltaY > 0 ? -0.08 : 0.08);
      },
      { passive: false }
    );
    window.addEventListener('resize', () => this.resize());
  }
  animate(time: number) {
    if (this.disposed) return;
    const dt = Math.min(0.05, (time - this.lastTime) / 1000 || 0.016);
    this.lastTime = time;
    if (document.hidden) return;
    this.angle += (this.targetAngle - this.angle) * (this.reduced ? 1 : Math.min(1, dt * 8));
    this.camera.position.set(Math.sin(this.angle) * 20, 17, Math.cos(this.angle) * 20);
    this.camera.lookAt(0, 0.4, 0);
    for (const [id, m] of this.models) {
      const path = m.userData.path;
      const target = path?.length ? path[0] : m.userData.target;
      if (!target) continue;
      const p = new this.T.Vector3(target.x, target.y, target.z),
        moving = m.position.distanceTo(p) > 0.03;
      m.position.lerp(p, this.reduced ? 1 : Math.min(1, dt * (path?.length ? 20 : 9)));
      if (path?.length && m.position.distanceTo(p) < 0.05) path.shift();
      const body = m.userData.body;
      body.rotation.y = m.userData.facing;
      body.rotation.z = m.userData.down ? Math.PI / 2 : 0;
      body.position.y = m.userData.down
        ? 0.02
        : !this.reduced
          ? Math.sin(time * (moving ? 0.018 : 0.002) + m.userData.phase) * (moving ? 0.1 : 0.022)
          : 0;
      const hit = m.userData.hit;
      if (hit && hit.until > time && hit.kind === 'damage' && !this.reduced)
        body.position.x = Math.sin(time * 0.065) * 0.07;
      else body.position.x = 0;
      void id;
    }
    if (!this.reduced) {
      for (const flag of this.flags) {
        const p = flag.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          p.setZ(i, Math.sin(time * 0.0025 + p.getX(i) * 5) * 0.06 * (p.getX(i) + 0.34));
        }
        p.needsUpdate = true;
        flag.geometry.computeVertexNormals();
      }
      this.particles.rotation.y = time * 0.000012;
    }
    for (const group of [...this.effectsRoot.children]) {
      const age = (time - group.userData.born) / 850;
      if (age >= 1) {
        group.traverse((m: Any3D) => {
          m.geometry?.dispose();
          m.material?.dispose();
        });
        this.effectsRoot.remove(group);
        continue;
      }
      for (const p of group.children) {
        p.material.opacity = 1 - age;
        if (p.userData.ring) {
          p.scale.setScalar(1 + age * 4);
          p.position.y = 0.13 + age * 0.7;
        } else {
          p.position.addScaledVector(p.userData.velocity, dt);
          p.rotation.x += dt * 3;
        }
      }
    }
    this.renderer.render(this.scene, this.camera);
    if (this.frame++ % 2 === 0) {
      const positions = new Map<string, { x: number; y: number; visible: boolean }>(),
        w = this.host.clientWidth,
        h = this.host.clientHeight;
      for (const [id, m] of this.models) {
        const v = m.position.clone();
        v.y += 1.48;
        v.project(this.camera);
        positions.set(id, {
          x: ((v.x + 1) * w) / 2,
          y: ((1 - v.y) * h) / 2,
          visible: m.visible && v.z < 1
        });
      }
      this.onFrame(positions);
    }
  }
}
