// Mobile Qualität: Seitenlänge, Touch-Ziele, keine Emojis, App-Symbole. Läuft mit `npm test`.
const playwright = require('playwright');
const assert = require('node:assert/strict');
const fs = require('fs'),
  path = require('path');
(async () => {
  const server = require('http').createServer((req, res) => {
    let p = path.join(process.cwd(), decodeURIComponent(req.url.split('?')[0]));
    if (p.endsWith('/')) p += 'index.html';
    try {
      const type = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html' };
      res.setHeader('Content-Type', type[path.extname(p)] || 'application/octet-stream');
      res.end(fs.readFileSync(p));
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const webkit = process.env.TEST_BROWSER === 'webkit';
  const browser = await (webkit ? playwright.webkit : playwright.chromium).launch({
    headless: true,
    executablePath: webkit ? undefined : process.env.CHROMIUM_EXECUTABLE,
    args: webkit ? [] : ['--no-sandbox'],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await page.route('https://**/*', (route) => route.abort());
  const errors = [];
  const pages = [
    'index.html',
    'ile-de-re-guide.html',
    'ile-de-re-restaurants.html',
    'familien-login.html',
    'gemeinsamer-plan.html',
    'ai.html',
    'entdecker.html',
  ];
  for (const p of pages) {
    await page.goto(origin + '/' + p);
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const small = [...document.querySelectorAll('a,button,summary,select,input,[role=button]')]
        .filter((e) => {
          const b = e.getBoundingClientRect();
          if (!e.offsetParent || !b.width || getComputedStyle(e).display === 'inline') return false;
          const credit = e.matches('.photo-credit,.photo-commons-credit,.hero-credit');
          return b.height < (credit ? 24 : 44);
        })
        .map((e) => e.className + ' "' + e.textContent.trim().slice(0, 20) + '"');
      const emoji = (document.body.innerText.match(/[\u{1F300}-\u{1FAFF}✨]/gu) || []).length;
      return {
        h: document.documentElement.scrollHeight,
        overflow: document.documentElement.scrollWidth - innerWidth,
        small,
        emoji,
        icon: !!document.querySelector('link[rel="apple-touch-icon"]'),
      };
    });
    if (r.overflow > 0) errors.push(`${p}: horizontaler Überlauf ${r.overflow}px`);
    if (r.small.length)
      errors.push(`${p}: Touch-Ziele zu klein: ${r.small.slice(0, 5).join(' | ')}`);
    if (r.emoji) errors.push(`${p}: ${r.emoji} Emojis`);
    if (!r.icon) errors.push(`${p}: apple-touch-icon fehlt`);
    if (p === 'index.html' && r.h > 20000) errors.push(`${p}: Seite zu lang (${r.h}px > 20000px)`);
  }
  const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
  for (const size of ['192x192', '512x512'])
    if (!manifest.icons?.some((i) => i.sizes === size && fs.existsSync(i.src)))
      errors.push('Manifest-Symbol fehlt: ' + size);
  try {
    const tablet = await browser.newContext({
      ...playwright.devices['iPad Mini'],
      acceptDownloads: true,
    });
    const adventure = await tablet.newPage();
    const problems = [];
    adventure.on('pageerror', (error) => problems.push(error.message));
    await adventure.goto(origin + '/entdecker.html');
    const stamp = adventure.getByRole('button', { name: /Schlossdetektiv/ });
    await stamp.click();
    assert.equal(await stamp.getAttribute('aria-pressed'), 'true');
    await adventure.getByText('1 von 3 Stempeln', { exact: true }).waitFor();
    await adventure.getByRole('radio', { name: 'Knifflige Missionen' }).check();
    assert.equal(await stamp.getAttribute('aria-pressed'), 'false');
    await adventure.locator('#region').selectOption('sea');
    await adventure
      .locator('#two-hours')
      .getByText(/Spuren im Sand/)
      .waitFor();
    await adventure.locator('#greeting').fill('Ein Gruss von der Küste');
    await adventure.locator('#card-photo').setInputFiles('assets/icons/icon-192.png');
    await adventure.getByText('Foto eingefügt. Es bleibt auf diesem Gerät.').waitFor();
    const download = adventure.waitForEvent('download');
    await adventure.getByRole('button', { name: 'Postkarte speichern' }).click();
    assert.equal((await download).suggestedFilename(), 'meine-ferienpost.png');
    await adventure.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await adventure.getByRole('button', { name: 'Offline-Paket prüfen' }).click();
    await adventure.getByText('Dein Entdeckerpass ist offline bereit.').waitFor();
    for (const viewport of [
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
    ]) {
      await adventure.setViewportSize(viewport);
      assert.ok(await adventure.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    if (webkit) {
      await new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      });
    } else {
      await tablet.setOffline(true);
    }
    const fallback = await adventure.goto(origin + '/entdecker.html');
    assert.ok(fallback?.fromServiceWorker());
    assert.equal(await stamp.getAttribute('aria-pressed'), 'true');
    await adventure.locator('#recap').getByText('Loire · Schlossdetektiv').waitFor();
    assert.deepEqual(problems, []);
    await tablet.close();
  } finally {
    await browser.close();
    server.close();
  }
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('PASS: mobile quality – page length, touch targets >= 44px, no emoji, app icons');
})();
