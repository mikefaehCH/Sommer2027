const fs = require('node:fs');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
fs.mkdirSync('.qa-cache', { recursive: true });
for (const entry of JSON.parse(fs.readFileSync('DEPENDENCIES.json', 'utf8'))) {
  const data = execFileSync(
    'curl',
    ['--fail', '--silent', '--show-error', '--location', '--max-time', '45', entry.url],
    { maxBuffer: 4 * 1024 * 1024 },
  );
  const sri = 'sha384-' + crypto.createHash('sha384').update(data).digest('base64');
  if (sri !== entry.integrity || data.length !== entry.bytes)
    throw Error('SRI mismatch: ' + entry.url);
  const name = entry.url.includes('supabase-js')
    ? 'supabase.js'
    : entry.url.endsWith('.css')
      ? 'leaflet.css'
      : 'leaflet.js';
  fs.writeFileSync('.qa-cache/' + name, data);
  console.log('PASS', sri, entry.url);
}
