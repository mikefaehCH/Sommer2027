const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');

(async () => {
  const root = path.resolve('starter');
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    let pathname = url.pathname.replace(/^\/(one|two)\//, '/');
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      response.setHeader(
        'Content-Type',
        {
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.html': 'text/html',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.webmanifest': 'application/manifest+json',
        }[path.extname(file)] || 'application/octet-stream',
      );
      response.end(fs.readFileSync(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const webkit = process.env.TEST_BROWSER === 'webkit';
  let browser;
  try {
    browser = await (webkit ? playwright.webkit : playwright.chromium).launch({
      headless: true,
      args: webkit ? [] : ['--no-sandbox'],
    });
    const context = await browser.newContext({
      viewport:
        process.env.TEST_VIEWPORT === 'desktop'
          ? { width: 1280, height: 900 }
          : { width: process.env.TEST_VIEWPORT === 'se' ? 375 : 390, height: 844 },
    });
    // Only deterministic map tiles; the app shell and service worker use the real local server.
    await context.route('https://tile.openstreetmap.org/**', (route) =>
      route.fulfill({
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=',
          'base64',
        ),
        contentType: 'image/png',
      }),
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(origin + '/one/');
    await page.locator('.card').first().waitFor();
    assert.equal(await page.locator('.card').count(), 3);
    await page.locator('.leaflet-marker-icon').first().waitFor();
    assert.equal(await page.locator('.leaflet-marker-icon').count(), 3);
    await page.locator('#search').fill('Museum');
    assert.equal(await page.locator('.card').count(), 1);
    await page.locator('[data-favorite="museum"]').click();
    await page.locator('#search').fill('');
    await page.locator('#favorites-only').check();
    assert.equal(await page.locator('.card').count(), 1);
    await page.locator('.card').getByRole('button', { name: 'Einplanen', exact: true }).click();
    assert.equal(await page.locator('.plan-row').count(), 1);
    await page.reload();
    await page.locator('.plan-row').waitFor();
    assert.equal(
      await page.locator('[data-favorite="museum"]').getAttribute('aria-pressed'),
      'true',
    );
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export').click();
    const download = await downloadPromise;
    const exported = fs.readFileSync(await download.path(), 'utf8');
    assert.equal(JSON.parse(exported).tripId, 'demo-city');
    await page.locator('.plan-row button').click();
    assert.equal(await page.locator('.plan-row').count(), 0);
    await page.locator('#import').setInputFiles({
      name: 'plan.json',
      mimeType: 'application/json',
      buffer: Buffer.from(exported),
    });
    await page.locator('#confirm-import').waitFor({ state: 'visible' });
    assert.equal(
      await page.locator('.plan-row').count(),
      0,
      'Import requires explicit confirmation',
    );
    await page.locator('#confirm-import').click();
    assert.equal(await page.locator('.plan-row').count(), 1);
    await page.locator('#trip-select').selectOption('walking');
    await page.waitForURL('**/?trip=walking');
    await page.locator('.card').first().waitFor();
    assert.equal(
      await page.locator('[data-favorite]').count(),
      0,
      'Disabled favorites have no controls',
    );
    assert.equal(await page.locator('.plan-row').count(), 0, 'Trips do not share plan state');
    assert.equal(await page.locator('#favorites-filter').isVisible(), false);
    await page
      .locator('.card')
      .first()
      .getByRole('button', { name: 'Einplanen', exact: true })
      .click();
    await page.locator('#trip-select').selectOption('city');
    await page.waitForURL('**/?trip=city');
    await page.locator('.plan-row').waitFor();
    assert.equal(await page.locator('.plan-row').count(), 1);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      'No horizontal overflow',
    );
    assert.equal(
      await page
        .locator('.actions button')
        .first()
        .evaluate((el) => el.getBoundingClientRect().height >= 44),
      true,
    );
    await page.goto(origin + '/two/');
    await page.locator('.card').first().waitFor();
    assert.equal(
      await page.locator('.plan-row').count(),
      0,
      'Deployment paths do not share plan state',
    );
    if (!webkit) {
      await page.goto(origin + '/one/');
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
      await page.evaluate(async () => {
        const foreign = await caches.open('sommer2027-test-preserve');
        await foreign.put('/unrelated', new Response('keep'));
      });
      await context.setOffline(true);
      await page.goto(origin + '/one/?trip=walking');
      await page.locator('.card').first().waitFor();
      assert.equal(await page.locator('#title').textContent(), 'Drei Tage zu Fuss');
      assert.equal(await page.locator('.plan-row').count(), 1, 'Offline plan remains available');
      const body = await page.evaluate(async () =>
        (await (await caches.open('sommer2027-test-preserve')).match('/unrelated')).text(),
      );
      assert.equal(body, 'keep');
      await context.setOffline(false);
    }
    assert.deepEqual(errors, []);
    console.log(
      'PASS: starter: both trips, map, search, favorites, plan, persistence, export/import, module switch, path isolation, mobile layout' +
        (webkit ? '' : ', offline navigation'),
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
