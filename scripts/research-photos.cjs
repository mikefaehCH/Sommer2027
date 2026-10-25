// One-off editorial tool. Never loaded by the website. Existing approvals are preserved.
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const activities = vm.runInNewContext(fs.readFileSync('data.js', 'utf8') + '; ACTIVITIES');
const queries = JSON.parse(fs.readFileSync('scripts/photo-queries.json', 'utf8'));
const plain = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
const allowed = (value) => /^(CC BY(?:-SA)? \d\.\d|CC0(?: 1\.0)?|Public domain)$/i.test(value);
const previous = fs.existsSync('ACTIVITY_PHOTOS.json')
  ? JSON.parse(fs.readFileSync('ACTIVITY_PHOTOS.json', 'utf8'))
  : [];
const result = [];
for (const a of activities) {
  const existing = previous.find((p) => p.id === a.id);
  if (existing?.checkedAt && ['approved', 'rejected'].includes(existing.status)) {
    result.push(existing);
    continue;
  }
  const query = queries[a.id] || a.name;
  const entry = {
    id: a.id,
    name: a.name,
    query,
    status: 'unreviewed',
    photo: null,
    checkedAt: null,
  };
  try {
    const url =
      'https://commons.wikimedia.org/w/api.php?' +
      new URLSearchParams({
        action: 'query',
        generator: 'search',
        gsrsearch: 'filetype:bitmap ' + query,
        gsrnamespace: '6',
        gsrlimit: '5',
        prop: 'imageinfo',
        iiprop: 'url|extmetadata',
        iiurlwidth: '760',
        format: 'json',
      });
    const data = JSON.parse(
      execFileSync('curl', ['-fsSL', '--max-time', '25', url], { maxBuffer: 8 * 1024 * 1024 }),
    );
    if (data.error) throw Error(data.error.info);
    for (const p of Object.values(data.query?.pages || {}).sort(
      (a, b) => (a.index || 0) - (b.index || 0),
    )) {
      const i = p.imageinfo?.[0],
        m = i?.extmetadata || {};
      const license = plain(m.LicenseShortName?.value),
        author = plain(m.Artist?.value);
      if (!i?.thumburl || !allowed(license) || !author) continue;
      entry.photo = {
        url: i.thumburl,
        source: i.descriptionurl,
        title: plain(p.title),
        author,
        license,
        licenseUrl: m.LicenseUrl?.value || null,
      };
      break;
    }
    if (!entry.photo) entry.status = 'missing';
  } catch (e) {
    entry.status = 'research-error';
    entry.error = String(e.message).slice(0, 200);
  }
  result.push(entry);
  fs.writeFileSync('ACTIVITY_PHOTOS.json', JSON.stringify(result, null, 2) + '\n');
  console.log(a.id, entry.status);
}
