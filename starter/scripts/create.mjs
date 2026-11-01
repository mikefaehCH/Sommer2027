import { cp, mkdir, readFile, writeFile, access, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, isAbsolute } from 'node:path';
import { trips } from '../config.js';
import { validateSite } from '../admin/site-schema.js';
import { validateTrip } from '../modules/config.js';

const [example, destination, projectId] = process.argv.slice(2);
const site = example?.endsWith('.json') ? validateSite(JSON.parse(await readFile(example, 'utf8'))) : null;
if (site && (!site.start || !site.end)) throw Error('Beginn und Ende in site.json fehlen. Keine Daten werden erfunden.');
if ((!site && (!Object.hasOwn(trips, example || '') || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(projectId || ''))) || !destination) {
  console.error('Aufruf: node scripts/create.mjs site.json /neuer/ordner (oder city|walking /neuer/ordner projekt-id)');
  process.exit(1);
}
const source = fileURLToPath(new URL('../', import.meta.url));
const target = resolve(destination);
const rel = relative(source, target);
if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw new Error('Ziel darf nicht in der Vorlage liegen');
try { await access(target); throw new Error('Ziel existiert bereits; es wird nichts überschrieben'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(target);
const files = ['admin', 'index.html', 'app.js', 'style.css', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'manifest.webmanifest', 'sw.js', 'modules', 'trips', 'vendor', 'package.json', 'tests', 'scripts', 'README.md', 'CLOUD_MODULES.md'];
for (const file of files.filter((file) => !site || file !== 'trips')) await cp(resolve(source, file), resolve(target, file), { recursive: true, force: false, errorOnExist: true });
const generatedTrip = site ? validateTrip({ ...site, locale: 'de-CH', places: [] }) : null;
const config = site ? `export const trips = { ${site.category}: ${JSON.stringify(generatedTrip)} };\nexport const defaultTrip = '${site.category}';\n` : `import example from './trips/${example}.js';\nexport const trips = { ${example}: { ...example, id: ${JSON.stringify(projectId)} } };\nexport const defaultTrip = '${example}';\n`;
await writeFile(resolve(target, 'config.js'), config);
const manifest = JSON.parse(await readFile(resolve(target, 'manifest.webmanifest'), 'utf8'));
if (site) await writeFile(resolve(target, 'site.json'), JSON.stringify(site, null, 2) + '\n');
manifest.name = site ? site.title : trips[example].title;
manifest.short_name = site ? site.title.slice(0, 24) : 'Meine Reise';
manifest.theme_color = site ? site.color : trips[example].color;
await writeFile(resolve(target, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
if (site) {
  await rm(resolve(target, 'trips'), { recursive: true, force: true });
  await rm(resolve(target, 'tests'), { recursive: true });
  await mkdir(resolve(target, 'tests'));
  await writeFile(resolve(target, 'README.md'), '# Generierte Website\n\nsite.json ist die Konfigurationsquelle. Neu generieren: `node scripts/create.mjs site.json /neues/ziel`. Das Ziel darf nicht existieren. Keine Beispieldaten oder Cloud-Autorisierung enthalten.\n\nPrüfen: `npm test`. Lokal mit einem statischen HTTP-Server starten. Für Veröffentlichung HTTPS verwenden.\n');
  const worker = await readFile(resolve(target, 'sw.js'), 'utf8');
  await writeFile(resolve(target, 'sw.js'), worker.replace(/  '\.\/trips\/(city|walking)\.js',\n/g, ''));
  const escapeHtml = (value) => value.replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const html = await readFile(resolve(target, 'index.html'), 'utf8');
  await writeFile(resolve(target, 'index.html'), html.replace(/(<meta\s+name="theme-color"\s+content=")[^"]*("\s*\/>)/, (_, before, after) => before + site.color + after).replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + escapeHtml(site.title) + '</title>').replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/>)/, (_, before, after) => before + escapeHtml(site.description) + after));
  await writeFile(resolve(target, 'tests/generated.mjs'), `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { trips, defaultTrip } from '../config.js';\nimport { validateTrip } from '../modules/config.js';\ntest('generated configuration', () => { assert.equal(validateTrip(trips[defaultTrip]).id, ${JSON.stringify(site.id)}); assert.deepEqual(trips[defaultTrip].places, []); });\n`);
  const pkg = JSON.parse(await readFile(resolve(target, 'package.json'), 'utf8'));
  await cp(resolve(source, 'tests/project-modules.mjs'), resolve(target, 'tests/project-modules.mjs'));
  pkg.scripts.test = 'node --test tests/*.mjs';
  await writeFile(resolve(target, 'package-lock.json'), JSON.stringify({ name: pkg.name, lockfileVersion: 3, requires: true, packages: { '': { name: pkg.name } } }, null, 2) + '\n');
  await writeFile(resolve(target, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}
console.log(site ? `Website erstellt: ${target}\nKeine Beispielorte übernommen. Prüfen: npm test. Lokal starten: npx http-server .` : `Vorlage erstellt: ${target}\nNächster Schritt: trips/${example}.js bearbeiten; Beispieldaten ausdrücklich ersetzen.\nPrüfen: cd ${target} und npm test. Bereitstellung über HTTPS oder localhost.`);
