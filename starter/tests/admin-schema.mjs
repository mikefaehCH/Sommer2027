import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSite, validateSite } from '../admin/site-schema.js';
test('wizard creates a deterministic site.json schema', () => {
  const site = makeSite({ id: 'test-site', title: '  Testseite  ', category: 'walking' });
  assert.equal(site.title, 'Testseite');
  assert.equal(validateSite(JSON.parse(JSON.stringify(site))).id, 'test-site');
  assert.equal(site.modules.offline, true);
});
test('invalid categories, keys and module dependencies are rejected', () => {
  const base = makeSite();
  for (const change of [
    { category: 'admin' },
    { id: '../evil' },
    { title: ' ' },
    { description: '' },
    { color: 'red' },
    { modules: { ...base.modules, map: true, places: false } },
    { extra: 'secret' },
  ]) {
    assert.throws(() => validateSite({ ...base, ...change }));
  }
});
test('HTML injection stays plain text and unknown fields are rejected', () => {
  const site = makeSite({ title: '<img src=x onerror=alert(1)>' });
  assert.equal(site.title, '<img src=x onerror=alert(1)>');
  assert.throws(() => validateSite({ ...site, token: 'private' }));
});
