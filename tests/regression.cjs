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
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.cspViolations.push(e.violatedDirective + ': ' + e.blockedURI),
    );
  });
  let errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.locator('.activity').first().waitFor();
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
  await page.waitForFunction(
    () => document.querySelector('#toast').textContent === 'Plan importiert',
  );
  await page.locator('#importInput').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
  await page.waitForFunction(() =>
    document.querySelector('#toast').textContent.includes('Ungültige'),
  );
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
      await page.waitForFunction(() => !document.querySelector('#signin').disabled);
    }
    if (p === 'ile-de-re-restaurants.html') {
      await page.locator('#place').selectOption('La Flotte');
      if ((await page.locator('.food-card:visible').count()) === 0)
        throw Error('restaurant filter');
    }
  }
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
    'PASS: 59 activities, search, favorites, add, move, remove, undo, persistence, map with 36 island markers and popup, gallery, restaurant filter, import/export roundtrip, invalid import, custom idea, signed-out login/AI, 5 subpages; no unexpected JS page errors or CSP violations; negative CSP tests passed',
  );
  await browser.close();
  server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
