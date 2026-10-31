import { cp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, isAbsolute } from 'node:path';
import { trips } from '../config.js';

const [example, destination, projectId] = process.argv.slice(2);
if (!Object.hasOwn(trips, example || '') || !destination || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(projectId || '')) {
  console.error('Aufruf: node scripts/create.mjs city|walking /neuer/ordner eindeutige-projekt-id');
  process.exit(1);
}
const source = fileURLToPath(new URL('../', import.meta.url));
const target = resolve(destination);
const rel = relative(source, target);
if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw new Error('Ziel darf nicht in der Vorlage liegen');
try { await access(target); throw new Error('Ziel existiert bereits; es wird nichts überschrieben'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(target, { recursive: true });
const files = ['index.html', 'app.js', 'style.css', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'manifest.webmanifest', 'sw.js', 'modules', 'trips', 'vendor', 'package.json', 'tests', 'scripts', 'README.md'];
for (const file of files) await cp(resolve(source, file), resolve(target, file), { recursive: true, force: false, errorOnExist: true });
const config = `import example from './trips/${example}.js';\nexport const trips = { ${example}: { ...example, id: ${JSON.stringify(projectId)} } };\nexport const defaultTrip = '${example}';\n`;
await writeFile(resolve(target, 'config.js'), config);
const manifest = JSON.parse(await readFile(resolve(target, 'manifest.webmanifest'), 'utf8'));
manifest.name = trips[example].title;
manifest.short_name = 'Meine Reise';
manifest.theme_color = trips[example].color;
await writeFile(resolve(target, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Vorlage erstellt: ${target}\nNächster Schritt: trips/${example}.js bearbeiten; Beispieldaten ausdrücklich ersetzen.\nPrüfen: cd ${target} und npm test. Bereitstellung über HTTPS oder localhost.`);
