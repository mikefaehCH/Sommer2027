// Adapter contract against the existing, SRI-verified SDK; all HTTP is in memory.
const assert = require('node:assert/strict');
// The pinned browser UMD bundle names its global `self` even in Node.
globalThis.self = globalThis;
const { createClient } = require('../.qa-cache/supabase.js');

(async () => {
  const { createProjectAuth } = await import('../starter/modules/project-auth.js');
  const { createSharedPlan } = await import('../starter/modules/shared-plan.js');
  const { default: trip } = await import('../starter/trips/city.js');
  const projectId = '11111111-1111-4111-8111-111111111111';
  const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const requests = [];
  let row = null;
  let client;
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const storage = new Map();
  const makeAuth = () =>
    createProjectAuth({
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_test',
      projectId,
      siteUrl: 'https://example.test/trip/',
      providers: ['google'],
      clientFactory: (url, key, options) => {
        client = createClient(url, key, {
          ...options,
          auth: {
            ...options.auth,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storage: {
              getItem: (key) => storage.get(key) ?? null,
              setItem: (key, value) => storage.set(key, value),
              removeItem: (key) => storage.delete(key),
            },
          },
          global: {
            fetch: async (input, init) => {
              const request = new Request(input, init);
              const endpoint = new URL(request.url);
              requests.push({
                method: request.method,
                path: endpoint.pathname,
                query: endpoint.searchParams,
              });
              if (endpoint.pathname === '/auth/v1/token') {
                assert.equal(endpoint.searchParams.get('grant_type'), 'refresh_token');
                return json({
                  access_token: token,
                  refresh_token: 'synthetic-refresh-token',
                  expires_in: 3600,
                  token_type: 'bearer',
                  user: { id: userId, is_anonymous: false },
                });
              }
              if (endpoint.pathname === '/auth/v1/user')
                return json({
                  id: userId,
                  aud: 'authenticated',
                  role: 'authenticated',
                  email: 'test@example.test',
                  is_anonymous: false,
                });
              assert.ok(request.headers.get('authorization')?.startsWith('Bearer '));
              if (endpoint.pathname === '/rest/v1/travel_project_members') {
                assert.equal(endpoint.searchParams.get('project_id'), 'eq.' + projectId);
                assert.equal(endpoint.searchParams.get('user_id'), 'eq.' + userId);
                return json({ project_id: projectId, user_id: userId, role: 'editor' });
              }
              assert.equal(endpoint.pathname, '/rest/v1/travel_project_plans');
              if (request.method === 'GET') {
                assert.equal(endpoint.searchParams.get('project_id'), 'eq.' + projectId);
                return json(row ? [row] : []);
              }
              const values = await request.json();
              if (request.method === 'POST') {
                assert.equal(values.project_id, projectId);
                row = values;
              } else {
                assert.equal(request.method, 'PATCH');
                assert.equal(endpoint.searchParams.get('project_id'), 'eq.' + projectId);
                if (endpoint.searchParams.get('revision') !== 'eq.' + row.revision)
                  return json(
                    { code: 'PGRST116', details: 'The result contains 0 rows', message: 'No row' },
                    406,
                  );
                row = { ...row, ...values };
              }
              assert.ok(request.headers.get('prefer').includes('return=representation'));
              return json(row);
            },
          },
        });
        return client;
      },
    });
  const auth = makeAuth();
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token =
    encode({ alg: 'HS256', typ: 'JWT' }) +
    '.' +
    encode({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 }) +
    '.synthetic-test-signature';
  const result = await client.auth.setSession({
    access_token: token,
    refresh_token: 'synthetic-refresh-token',
  });
  assert.equal(result.error, null);
  const shared = createSharedPlan({ auth, trip });
  const first = await shared.load();
  assert.equal(first.revision, null);
  const saved = await shared.save(first, [{ placeId: 'museum', day: trip.start }]);
  assert.equal(saved.revision, 1);
  const latest = await shared.load();
  assert.deepEqual(latest.plan, saved.plan);
  const cleared = await shared.save(latest, []);
  assert.equal(cleared.revision, 2);
  await assert.rejects(shared.save(saved, saved.plan), (error) => error.code === 'conflict');
  assert.equal(requests.filter((request) => request.method === 'POST').length, 1);
  auth.dispose();
  // Existing browser storage emits INITIAL_SESSION asynchronously during the first load.
  const restored = makeAuth();
  const restoredPlan = createSharedPlan({ auth: restored, trip });
  const restoredSnapshot = await restoredPlan.load();
  assert.equal(restoredSnapshot.revision, 2);
  const refreshed = await client.auth.refreshSession();
  assert.equal(refreshed.error, null);
  const afterRefresh = await restoredPlan.save(restoredSnapshot, saved.plan);
  assert.equal(
    afterRefresh.revision,
    3,
    'Same-account token refresh must preserve the loaded plan',
  );
  restored.dispose();
  console.log(
    'PASS: project adapters with pinned Supabase SDK and mocked HTTP: verified user, membership, project filters, insert, revision update and conflict',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
