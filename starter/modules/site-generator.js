import { validateSite } from '../admin/site-schema.js';
import { validateTrip } from './config.js';

// Feste öffentliche Vorlage. Konfigurationswerte dürfen niemals Dateipfade bestimmen.
export const TEMPLATE_FILES = Object.freeze([
  'index.html',
  'app.js',
  'style.css',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'manifest.webmanifest',
  'sw.js',
  'package.json',
  'modules/config.js',
  'modules/state.js',
  'modules/places.js',
  'modules/map.js',
  'modules/project-auth.js',
  'modules/shared-plan.js',
  'modules/site-generator.js',
  'modules/zip.js',
  'admin/site-schema.js',
  'admin/index.html',
  'admin/wizard.js',
  'admin/wizard.css',
  'scripts/create.mjs',
  'tests/project-modules.mjs',
  'README.md',
  'CLOUD_MODULES.md',
  'vendor/leaflet/leaflet.js',
  'vendor/leaflet/leaflet.css',
  'vendor/leaflet/LICENSE',
  'vendor/leaflet/images/layers.png',
  'vendor/leaflet/images/layers-2x.png',
  'vendor/leaflet/images/marker-icon.png',
  'vendor/leaflet/images/marker-icon-2x.png',
  'vendor/leaflet/images/marker-shadow.png',
]);
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const encode = (value) => encoder.encode(value);
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const escapeHtml = (value) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char],
  );

export function generateProject(input, templates) {
  const site = validateSite(input);
  const output = new Map();
  for (const path of TEMPLATE_FILES) {
    const bytes = templates.get(path);
    if (!(bytes instanceof Uint8Array) || bytes.length > 2000000)
      throw Error('Vorlagendatei fehlt oder ist ungültig: ' + path);
    output.set(path, bytes.slice());
  }
  const text = (path) => decoder.decode(output.get(path));
  const put = (path, content) => output.set(path, encode(content));
  const trip = validateTrip({ ...site, locale: 'de-CH', places: [] });
  put('site.json', json(site));
  put(
    'config.js',
    `export const trips = { ${site.category}: ${JSON.stringify(trip)} };\nexport const defaultTrip = '${site.category}';\n`,
  );
  const manifest = JSON.parse(text('manifest.webmanifest'));
  Object.assign(manifest, {
    name: site.title,
    short_name: site.title.slice(0, 24),
    theme_color: site.color,
  });
  put('manifest.webmanifest', json(manifest));
  put(
    'index.html',
    text('index.html')
      .replace(
        /(<meta\s+name="theme-color"\s+content=")[^"]*("\s*\/>)/,
        (_, a, b) => a + site.color + b,
      )
      .replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + escapeHtml(site.title) + '</title>')
      .replace(
        /(<meta\s+name="description"\s+content=")[^"]*("\s*\/>)/,
        (_, a, b) => a + escapeHtml(site.description) + b,
      ),
  );
  put('sw.js', text('sw.js').replace(/  '\.\/trips\/(city|walking)\.js',\n/g, ''));
  put(
    'README.md',
    '# Generierte Website\n\nsite.json ist die Konfigurationsquelle. Neu generieren: `node scripts/create.mjs site.json /neues/ziel`. Bestehende Ziele werden nicht überschrieben. Keine Beispieldaten oder Cloud-Autorisierung enthalten.\n\nNode 22+: `npm ci --ignore-scripts`, `npm test`. Lokal mit einem statischen HTTP-Server starten; für Veröffentlichung HTTPS verwenden. Der Wizard unter admin/ kann ebenfalls ein vollständiges ZIP exportieren. Keine Anmeldung erforderlich.\n',
  );
  put(
    'tests/generated.mjs',
    `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { trips, defaultTrip } from '../config.js';\nimport { validateTrip } from '../modules/config.js';\ntest('generated configuration', () => { assert.equal(validateTrip(trips[defaultTrip]).id, ${JSON.stringify(site.id)}); assert.deepEqual(trips[defaultTrip].places, []); });\n`,
  );
  const pkg = {
    name: 'web-kit-site',
    private: true,
    type: 'module',
    scripts: { test: 'node --test tests/*.mjs', create: 'node scripts/create.mjs' },
  };
  put('package.json', json(pkg));
  put(
    'package-lock.json',
    json({
      name: pkg.name,
      lockfileVersion: 3,
      requires: true,
      packages: { '': { name: pkg.name } },
    }),
  );
  return output;
}

export async function loadBrowserTemplates(base, fetchFile = globalThis.fetch) {
  const entries = await Promise.all(
    TEMPLATE_FILES.map(async (path) => {
      const response = await fetchFile(new URL(path, base), {
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
      });
      if (!response.ok) throw Error('Vorlage konnte nicht geladen werden: ' + path);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 2000000) throw Error('Vorlagendatei zu gross');
      return [path, bytes];
    }),
  );
  return new Map(entries);
}
