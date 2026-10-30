const fs = require('node:fs'),
  assert = require('node:assert/strict'),
  vm = require('node:vm');
const a = vm.runInNewContext(fs.readFileSync('data.js', 'utf8') + ';JSON.stringify(ACTIVITIES)');
assert.equal(
  require('node:crypto').createHash('sha256').update(a).digest('hex'),
  '1a66fb1230ce1c236c209b01d9439df79cd062c9c3dc04f916fa492fad1184ff',
  'Activity data must remain unchanged from cba8785',
);
const activities = JSON.parse(a);
assert.equal(activities.length, 59);
assert.equal(new Set(activities.map((a) => a.id)).size, 59);
const photos = JSON.parse(fs.readFileSync('ACTIVITY_PHOTOS.json'));
assert.equal(photos.length, 59);
assert.deepEqual(photos.map((p) => p.id).sort(), activities.map((a) => a.id).sort());
for (const e of photos) {
  if (e.photo) {
    if (e.photo.provider === 'Pexels' || e.photo.provider === 'Pixabay') {
      const domain = e.photo.provider === 'Pexels' ? 'www.pexels.com' : 'pixabay.com';
      assert.equal(new URL(e.photo.source).hostname, domain);
      assert.equal(e.photo.license, e.photo.provider + ' License');
      assert.ok(/^assets\/activity-photos\/[a-z0-9-]+\.jpg$/.test(e.photo.url));
      assert.ok(fs.existsSync(e.photo.url));
    } else {
      assert.match(e.photo.license, /^(CC BY(?:-SA)? \d\.\d|CC0(?: 1\.0)?|Public domain)$/i);
    }
    for (const k of ['title', 'author', 'source', 'url']) assert.ok(e.photo[k]);
    assert.ok(!/[<>]/.test(e.photo.author));
    if (e.photo.provider !== undefined)
      assert.ok(['Unsplash', 'Pexels', 'Pixabay'].includes(e.photo.provider));
    if (e.photo.motif !== undefined) assert.ok(['Ort', 'Symbolbild'].includes(e.photo.motif));
  }
  if (e.status === 'approved') assert.ok(e.checkedAt && e.reviewer && e.reviewNotes);
  if (e.status === 'unreviewed') {
    assert.ok(e.checkedAt == null);
    assert.ok(e.reviewer == null);
  }
}
const deps = JSON.parse(fs.readFileSync('DEPENDENCIES.json'));
const policy = JSON.parse(fs.readFileSync('CSP.json')).policy;
assert.ok(
  !policy.includes('unsafe-inline') && !policy.includes('unsafe-eval') && !policy.includes('*'),
);
for (const p of fs.readdirSync('.').filter((p) => p.endsWith('.html'))) {
  const text = fs.readFileSync(p, 'utf8');
  assert.ok(text.includes(policy), p);
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>\s*\S/.test(text), p);
  assert.ok(!/\son\w+=|\sstyle=|<style\b/i.test(text), p);
  for (const entry of deps) {
    if (text.includes('src="' + entry.url + '"') || text.includes('href="' + entry.url + '"'))
      assert.ok(
        text.includes('integrity="' + entry.integrity + '"') &&
          text.includes('crossorigin="anonymous"'),
        p,
      );
  }
  for (const m of text.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
    if (!m[1].includes(':') && !m[1].startsWith('//'))
      assert.ok(fs.existsSync(m[1]), p + ': ' + m[1]);
  }
}
assert.ok(!fs.readFileSync('app.js', 'utf8').includes('w/api.php'));
console.log(
  'PASS: 59 activities and photo records; licenses, approval metadata, CSP, local assets, SRI attributes; no runtime image search',
);
