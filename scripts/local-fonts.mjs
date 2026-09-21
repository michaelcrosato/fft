import { readFile, writeFile, mkdir } from 'node:fs/promises';
const css = await readFile('artifacts/font-source.css', 'utf8');
await mkdir('public/fonts', { recursive: true });
const declarations = [];
for (const match of css.matchAll(/\/\* latin \*\/\s*(@font-face\s*\{[^}]*\})/g)) {
  const block = match[1],
    family = block.match(/font-family: '([^']+)'/)[1],
    style = block.match(/font-style: (\w+)/)[1],
    url = block.match(/url\(([^)]+)\)/)[1];
  const name = `${family.toLowerCase().replaceAll(' ', '-')}-${style}.woff2`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font download failed: ${response.status}`);
  await writeFile(`public/fonts/${name}`, Buffer.from(await response.arrayBuffer()));
  declarations.push(block.replace(url, `/fonts/${name}`));
}
await writeFile('src/fonts.css', declarations.join('\n'));
for (const name of ['cormorantgaramond', 'dmsans']) {
  const response = await fetch(
    `https://raw.githubusercontent.com/google/fonts/main/ofl/${name}/OFL.txt`
  );
  if (!response.ok) throw new Error('License download failed');
  await writeFile(`public/fonts/${name}-OFL.txt`, await response.text());
}
console.log('Downloaded three Latin variable font files and both OFL licenses.');
