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
    assert.match(e.photo.license, /^(CC BY(?:-SA)? \d\.\d|CC0(?: 1\.0)?|Public domain)$/i);
    for (const k of ['title', 'author', 'source', 'url']) assert.ok(e.photo[k]);
    assert.ok(!/[<>]/.test(e.photo.author));
    if (e.photo.provider !== undefined) assert.equal(e.photo.provider, 'Unsplash');
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
const edge = fs.readFileSync('supabase/functions/travel-assistant/index.ts', 'utf8');
for (const check of [
  "auth.getUser(",
  ".from('family_members')",
  "declaredSize > 50000",
  "raw.length > 50000",
  "JSON.parse(raw)",
  "Number.isFinite(v)",
]) {
  assert.ok(
    edge.includes(check),
    'AI Edge Function security guard missing: ' + check,
  );
}
assert.ok(
  !edge.includes('service_role'),
  'AI Edge Function must not use a privileged service role',
);
const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
for (const table of [
  'family_members',
  'family_plans',
  'activity_votes',
  'change_log',
  'guest_links',
]) {
  assert.ok(
    schema.includes('alter table public.' + table + ' enable row level security;'),
    'RLS missing: ' + table,
  );
}
assert.ok(
  schema.includes('voter_id=(select auth.uid())'),
  'Vote ownership policy missing',
);
console.log('PASS: AI request guards, membership authorization and family RLS declarations');

console.log(
  'PASS: 59 activities and photo records; licenses, approval metadata, CSP, local assets, SRI attributes; no runtime image search',
);
