const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const listeners = {};
vm.runInNewContext(fs.readFileSync('sw.js', 'utf8'), {
  self: {
    location: { origin: 'https://local.test' },
    addEventListener: (name, handler) => (listeners[name] = handler),
  },
  URL,
  Response,
  Request,
  fetch: () => new Promise(() => {}),
});
for (const [url, method, headers] of [
  ['https://local.test/supabase/private', 'GET', {}],
  ['https://local.test/index.html', 'GET', { Authorization: 'Bearer test-only' }],
  ['https://outside.test/data', 'GET', {}],
  ['https://local.test/data', 'POST', {}],
]) {
  let intercepted = false;
  listeners.fetch({
    request: new Request(url, { method, headers }),
    respondWith: () => (intercepted = true),
  });
  assert.equal(intercepted, false, url);
}
let intercepted = false;
listeners.fetch({
  request: new Request('https://local.test/app.js'),
  respondWith: () => (intercepted = true),
});
assert.equal(intercepted, true);
console.log(
  'PASS: SW bypasses Supabase paths, authorized requests, other origins and mutations; handles public assets',
);
