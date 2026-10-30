const { chromium } = require('playwright');
(async () => {
  const fs = require('fs'),
    path = require('path');
  const server = require('http').createServer((req, res) => {
    let p = path.join(process.cwd(), decodeURIComponent(req.url.split('?')[0]));
    if (p.endsWith('/')) p += 'index.html';
    try {
      res.setHeader(
        'Content-Type',
        p.endsWith('.js')
          ? 'application/javascript'
          : p.endsWith('.css')
            ? 'text/css'
            : p.endsWith('.html')
              ? 'text/html'
              : 'application/json',
      );
      res.end(fs.readFileSync(p));
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const engine = process.env.TEST_BROWSER === 'webkit' ? require('playwright').webkit : chromium;
  const browser = await engine.launch({
    headless: true,
    args: process.env.TEST_BROWSER === 'webkit' ? [] : ['--no-sandbox'],
  });
  const page = await browser.newPage({
    viewport:
      process.env.TEST_VIEWPORT === 'mobile'
        ? { width: 390, height: 844 }
        : process.env.TEST_VIEWPORT === 'se'
          ? { width: 375, height: 667 }
          : { width: 1280, height: 900 },
  });
  await page.route('https://**/*', async (route) => {
    const u = route.request().url();
    const names = u.includes('supabase-js')
      ? 'supabase.js'
      : u.endsWith('/leaflet.js')
        ? 'leaflet.js'
        : u.endsWith('/leaflet.css')
          ? 'leaflet.css'
          : null;
    if (names)
      return route.fulfill({
        body: require('fs').readFileSync('.qa-cache/' + names),
        headers: { 'access-control-allow-origin': '*' },
        contentType: names.endsWith('.css') ? 'text/css' : 'application/javascript',
      });
    if (u.includes('.supabase.co')) throw Error('Unexpected production request: ' + u);
    if (u.includes('fonts.googleapis.com'))
      return route.fulfill({ body: '', contentType: 'text/css' });
    return route.fulfill({
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=',
        'base64',
      ),
      contentType: 'image/png',
    });
  });
  async function until(predicate) {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await page.evaluate(predicate)) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw Error('Timed out waiting for browser state');
  }
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.cspViolations.push(e.violatedDirective + ': ' + e.blockedURI),
    );
  });
  let errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(origin + '/manifest.webmanifest');
  await page.evaluate(async () => {
    await caches.open('sommer2027-v17');
    await caches.open('unrelated-test-cache');
  });
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.locator('.activity').first().waitFor();
  await page.locator('[data-date="2027-07-08"]').click();
  await page.locator('[data-planner-show="clos-luce"]').waitFor();
  await page.locator('[data-empty="Morgen"]').click();
  await page.locator('#plannerSearch').fill('Aquarium');
  await page.locator('[data-picker-add="aquarium"]').click();
  if ((await page.locator('[data-remove="aquarium"]').getAttribute('data-slot')) !== 'Morgen')
    throw Error('planner activity picker');
  await page.locator('[data-remove="aquarium"]').click();
  await page.locator('[data-date="2027-07-07"]').click();
  if (!(await page.evaluate(() => !!window.L && !!window.supabase)))
    throw Error('Pinned libraries failed to load');
  const count = await page.locator('.activity').count();
  if (count !== 59) throw Error('activity count ' + count);
  await page.locator('#search').fill('Chenonceau');
  if ((await page.locator('.activity').count()) !== 1) throw Error('search');
  await page.locator('#search').fill('');
  await page.locator('[data-fav]').first().click();
  await page.locator('#favFilter').selectOption('favorites');
  if ((await page.locator('.activity').count()) !== 1) throw Error('favorites');
  await page.locator('#favFilter').selectOption('all');
  await page.locator('[data-add]').first().click();
  await page.locator('[data-slot-choice="Morgen"]').click();
  if ((await page.locator('[data-remove]').count()) !== 1) throw Error('add');
  await page.locator('[data-move]').click();
  await page.locator('#moveSlot').selectOption('Abend');
  await page.locator('[data-move-save]').click();
  if ((await page.locator('[data-remove]').getAttribute('data-slot')) !== 'Abend')
    throw Error('move');
  await page.locator('[data-remove]').click();
  await page.locator('#undo').click();
  if ((await page.locator('[data-remove]').count()) !== 1) throw Error('undo');
  await page.reload();
  await page.locator('[data-remove]').waitFor();
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadEvent;
  const exported = fs.readFileSync(await download.path(), 'utf8');
  const exportedPlan = JSON.parse(exported);
  if (exportedPlan.version !== 3 || Object.keys(exportedPlan.days).length !== 14)
    throw Error('export');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#importInput').setInputFiles({
    name: 'roundtrip.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exported),
  });
  await until(() => document.querySelector('#toast').textContent === 'Plan importiert');
  await page.locator('#importInput').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
  await until(() => document.querySelector('#toast').textContent.includes('Ungültige'));
  page.once('dialog', (dialog) => dialog.accept('Testidee nur lokal'));
  await page.locator('#custom').click();
  if (!(await page.locator('#slots').textContent()).includes('Testidee nur lokal'))
    throw Error('custom idea');
  await page.locator('#undo').click();
  await page.locator('[data-map-region="re"]').click();
  if ((await page.locator('.leaflet-interactive').count()) !== 36) throw Error('map region');
  await page.locator('.leaflet-interactive').first().dispatchEvent('click');
  await page.locator('[data-map-show]').click();
  if ((await page.locator('.activity').count()) !== 1) throw Error('map details');
  await page.locator('[data-photo-detail]').first().click();
  if (!(await page.locator('#photoDialog').isVisible())) throw Error('gallery dialog');
  await page.locator('.photo-close').click();
  if ((await page.evaluate(() => window.cspViolations)).length)
    throw Error(JSON.stringify(await page.evaluate(() => window.cspViolations)));
  for (const p of [
    'ile-de-re-guide.html',
    'ile-de-re-restaurants.html',
    'familien-login.html',
    'gemeinsamer-plan.html',
    'ai.html',
  ]) {
    await page.goto(origin + '/' + p);
    await page.locator('h1').waitFor();
    if ((await page.evaluate(() => window.cspViolations)).length)
      throw Error(JSON.stringify(await page.evaluate(() => window.cspViolations)));
    if (p === 'ai.html' && !(await page.locator('#aiSubmit').isDisabled()))
      throw Error('AI signed-out guard');
    if (p === 'familien-login.html') {
      await until(() => !document.querySelector('#signin').disabled);
    }
    if (p === 'ile-de-re-restaurants.html') {
      await page.locator('#place').selectOption('La Flotte');
      if ((await page.locator('.food-card:visible').count()) === 0)
        throw Error('restaurant filter');
    }
  }
  await page.goto(origin);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await until(() => !!navigator.serviceWorker.controller);
  const cacheState = await page.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open('sommer2027-v24');
    return { names, urls: (await cache.keys()).map((r) => r.url) };
  });
  if (
    cacheState.names.includes('sommer2027-v17') ||
    !cacheState.names.includes('sommer2027-v24') ||
    !cacheState.names.includes('unrelated-test-cache')
  )
    throw Error('SW upgrade/cache isolation');
  for (const file of [
    'ACTIVITY_PHOTOS.json',
    'index-inline-1.js',
    'familien-login-inline-1.js',
    'gemeinsamer-plan-page.css',
  ])
    if (!cacheState.urls.some((u) => u.endsWith('/' + file))) throw Error('SW missing ' + file);
  await page.evaluate(async () => {
    await fetch('/supabase/private-probe');
    await fetch('/private-probe', { headers: { Authorization: 'Bearer local-test-only' } });
  });
  const leaked = await page.evaluate(async () => {
    const c = await caches.open('sommer2027-v24');
    return (await c.keys()).some((r) => r.url.includes('private-probe'));
  });
  if (leaked) throw Error('Private request cached');
  if (process.env.TEST_BROWSER !== 'webkit') await page.unroute('https://**/*');
  const webkit = process.env.TEST_BROWSER === 'webkit';
  if (webkit) {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
    if (server.listening) throw Error('Origin still running');
    const control = await browser.newPage();
    let controlFailed = false;
    try {
      await control.goto(origin + '/index.html');
    } catch {
      controlFailed = true;
    }
    await control.close();
    if (!controlFailed) throw Error('No-worker outage control unexpectedly succeeded');
  } else {
    await page.context().setOffline(true);
  }
  const fallback = await page.goto(origin + '/index.html');
  if (!fallback?.fromServiceWorker()) throw Error('Fallback did not come from service worker');
  await page.locator('.activity').first().waitFor();
  if ((await page.locator('.activity').count()) !== 59) throw Error('Offline activity data');
  await page.goto(origin + '/ile-de-re-restaurants.html');
  await page.locator('#place').selectOption('La Flotte');
  if ((await page.locator('.food-card:visible').count()) === 0)
    throw Error('Offline restaurant scripts');
  await page.context().setOffline(false);
  await page.evaluate(() => {
    const s = document.createElement('script');
    s.textContent = 'window.inlineExecuted=true';
    document.body.append(s);
    const i = document.createElement('img');
    i.src = 'https://blocked.invalid/test.png';
    document.body.append(i);
  });
  await page.waitForTimeout(100);
  if (await page.evaluate(() => !!window.inlineExecuted)) throw Error('Inline script executed');
  if ((await page.evaluate(() => window.cspViolations)).length < 2)
    throw Error('CSP negative test');
  if (errors.length) throw Error(JSON.stringify(errors));
  console.log(
    `PASS: 59 activities, search, favorites, add, move, remove, undo, persistence, map with 36 island markers and popup, gallery, restaurant filter, import/export roundtrip, invalid import, custom idea, signed-out login/AI, 5 subpages; no unexpected JS page errors or CSP violations; negative CSP tests passed; SW v17→v24, unrelated cache preservation, private cache exclusion and cache fallback passed (${process.env.TEST_BROWSER === 'webkit' ? 'origin stopped; offline emulation remains blocked' : 'offline emulation'})`,
  );
  await browser.close();
  server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
