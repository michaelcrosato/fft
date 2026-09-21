const paths: Record<string, string> = {
  crown: '<path d="m3 7 5 4 4-7 4 7 5-4-2 12H5L3 7Zm3 15h12"/>',
  sword: '<path d="m14 3 7-1-1 7-9 9-5-5 8-10ZM4 14l6 6M3 21l4-4"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  bow: '<path d="M5 3c14 1 15 14 16 16L5 3Zm0 0L4 20l17-1M3 21 19 5m-5 0h5v5"/>',
  spark: '<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
  flag: '<path d="M5 22V3c5-4 9 4 15 0v11c-6 4-10-4-15 0"/>',
  fist: '<path d="M7 12V5a2 2 0 0 1 4 0v5-6a2 2 0 0 1 4 0v6-4a2 2 0 0 1 4 0v8c0 5-3 7-7 7s-6-2-7-6l-2-5c2-2 4 0 4 2Z"/>',
  spear: '<path d="m18 2 4 0v4l-5 5-4-4 5-5ZM15 9 3 21M9 12l3 3"/>',
  flame: '<path d="M12 2c2 7 8 7 8 13a8 8 0 0 1-16 0c0-4 4-7 4-7s0 5 3 4c3-1 1-10 1-10Z"/>',
  snow: '<path d="M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3M9 20l3-3 3 3"/>',
  feather: '<path d="M5 17C-1 5 12 0 21 3c0 11-5 17-16 14ZM2 22 17 7M9 15h7"/>',
  leaf: '<path d="M4 19C-2 6 11 7 21 2c2 12-3 20-17 17Zm0 0 12-9"/>',
  wind: '<path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 17h5a2 2 0 1 1-2 2"/>',
  mountain: '<path d="m2 20 8-16 5 10 3-5 5 11H2ZM7 10l3 2 3-2"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3l-5-9V3M8 14h8"/>',
  boot: '<path d="M5 3h9v11l7 3v4H3v-7l2-2V3Zm4 3h5M9 10h5"/>',
  map: '<path d="m3 5 6-2 6 3 6-2v16l-6 2-6-3-6 2V5Zm6-2v16m6-13v16"/>',
  people:
    '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M16 4a3 3 0 0 1 0 6m1 4c4 0 4 3 4 7"/>',
  book: '<path d="M12 5C8 2 4 3 2 4v16c3-2 7-1 10 1 3-2 7-3 10-1V4c-2-1-6-2-10 1Zm0 0v16"/>',
  bag: '<path d="M5 7h14l2 14H3L5 7Zm3 0V5a4 4 0 0 1 8 0v2"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="m12 7 4 5-4 5-4-5 4-5Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 5 5L20 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  sound: '<path d="m3 9 5 0 5-5v16l-5-5H3V9Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/>',
  mute: '<path d="m3 9 5 0 5-5v16l-5-5H3V9Zm14 0 5 6m-5 0 5-6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 1 1 4 3c-1 1-1 1-1 3m0 3h.01"/>',
  rotate: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  move: '<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
  hourglass: '<path d="M5 3h14M5 21h14M7 3v4l10 10v4M17 3v4L7 17v4"/>',
  heart: '<path d="M12 21 3 12C-3 4 8 0 12 7c4-7 15-3 9 5l-9 9Z"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18m6-18v18M3 9h18M3 15h18"/>',
  save: '<path d="M4 3h14l3 3v15H3V3Zm3 0v7h10V3M7 21v-7h10v7"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 17V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  home: '<path d="m2 11 10-9 10 9M5 9v12h14V9M10 21v-7h4v7"/>',
  star: '<path d="m12 2 3 6.5 7 .8-5 5 .9 7-5.9-3.5L6 21l1-6.7-5-5 7-.8L12 2Z"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  skip: '<path d="m4 5 10 7-10 7V5Zm15 0v14"/>',
  log: '<path d="M5 5h14M5 10h14M5 15h8M5 20h11"/>',
  tent: '<path d="m2 21 10-18 10 18H2Zm6 0 4-8 4 8M9 2l6 4"/>'
};
export function icon(id: string, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id] ?? paths.spark}</svg>`;
}
export const esc = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
