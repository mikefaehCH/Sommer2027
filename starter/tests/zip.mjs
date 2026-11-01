import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  generateProject,
  TEMPLATE_FILES,
  loadBrowserTemplates,
} from '../modules/site-generator.js';
import { createZip } from '../modules/zip.js';
import { makeSite } from '../admin/site-schema.js';
const source = fileURLToPath(new URL('../', import.meta.url));
const site = makeSite({
  start: '2027-06-01',
  end: '2027-06-03',
  title: '</title><script>alert(1)</script>',
});
const load = async () =>
  new Map(
    await Promise.all(
      TEMPLATE_FILES.map(async (path) => [
        path,
        new Uint8Array(await readFile(resolve(source, path))),
      ]),
    ),
  );
test('ZIP is repeatable, extracts with CRC checks, installs, tests and regenerates', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'web-kit-zip-'));
  try {
    const templates = await load();
    const output = generateProject(site, templates);
    const zip = createZip(output);
    assert.deepEqual(zip, createZip(generateProject(site, templates)));
    assert.deepEqual(zip, createZip(new Map([...output].reverse())));
    const html = new TextDecoder().decode(output.get('index.html'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.throws(() => generateProject(site, new Map()));
    await writeFile(join(dir, 'input.json'), JSON.stringify(site));
    execFileSync(process.execPath, [
      join(source, 'scripts/create.mjs'),
      join(dir, 'input.json'),
      join(dir, 'cli'),
    ]);
    for (const [path, bytes] of output)
      assert.deepEqual(new Uint8Array(await readFile(join(dir, 'cli', path))), bytes);
    await writeFile(join(dir, 'website.zip'), zip);
    execFileSync('python3', [
      '-c',
      'import zipfile,sys\nz=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; z.extractall(sys.argv[2])',
      join(dir, 'website.zip'),
      join(dir, 'website'),
    ]);
    execFileSync('npm', ['ci', '--ignore-scripts'], { cwd: join(dir, 'website'), stdio: 'pipe' });
    execFileSync('npm', ['test'], { cwd: join(dir, 'website'), stdio: 'pipe' });
    execFileSync(process.execPath, [
      join(dir, 'website/scripts/create.mjs'),
      join(dir, 'website/site.json'),
      join(dir, 'again'),
    ]);
    assert.equal(
      await readFile(join(dir, 'again/site.json'), 'utf8'),
      await readFile(join(dir, 'website/site.json'), 'utf8'),
    );
    // Every generated import/asset needed by subsequent generation is retained.
    for (const path of TEMPLATE_FILES) await readFile(join(dir, 'again', path));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('ZIP rejects path traversal, absolute paths, separators, reserved segments and excess size', () => {
  for (const path of [
    '../secret',
    '/tmp/a',
    'C:/tmp/a',
    'a\\b',
    'a//b',
    'a/../b',
    './x',
    'a\u0000b',
    'a\nb',
  ])
    assert.throws(() => createZip(new Map([[path, new Uint8Array()]])), path);
  assert.throws(() => createZip(new Map([['a', new Uint8Array(10000001)]])));
});
test('browser loader rejects failed files and uses only the fixed template paths', async () => {
  let seen = [];
  const fake = async (url, options) => {
    seen.push(url.pathname);
    assert.equal(options.credentials, 'omit');
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
  };
  await loadBrowserTemplates(new URL('https://example.test/starter/'), fake);
  assert.deepEqual(seen.sort(), TEMPLATE_FILES.map((path) => '/starter/' + path).sort());
  await assert.rejects(
    loadBrowserTemplates(new URL('https://example.test/'), async () => ({ ok: false })),
  );
});
