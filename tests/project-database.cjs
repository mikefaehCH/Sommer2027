// Real Postgres execution in ephemeral PGlite; Supabase auth helpers are test fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

(async () => {
  const db = new PGlite();
  const projects = [
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
  ];
  const [A, B, C] = projects;
  const users = [
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  ];
  const [editor, viewer, other, outsider] = users;
  let checks = 0;
  const equal = (actual, expected) => {
    assert.deepEqual(actual, expected);
    checks++;
  };
  const denied = async (operation, codes = ['42501']) => {
    await assert.rejects(operation, (error) => codes.includes(error.code));
    checks++;
  };
  async function actor(role, id, operation, anonymous = false) {
    await db.exec('begin');
    try {
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: id, is_anonymous: anonymous }),
      ]);
      // Only hard-coded fixture role names; identity values remain parameterized.
      assert.ok(['anon', 'authenticated'].includes(role));
      await db.exec('set local role ' + role);
      const result = await operation();
      await db.exec('commit');
      return result;
    } catch (error) {
      await db.exec('rollback');
      throw error;
    }
  }
  const as = (id, operation, anonymous) => actor('authenticated', id, operation, anonymous);
  const payload = (plan = [], tripId = 'demo-city') => ({ version: 1, tripId, plan });
  const insert = (project, value = payload(), revision = 1) =>
    db.query(
      'insert into public.travel_project_plans(project_id,revision,payload) values ($1,$2,$3) returning revision',
      [project, revision, JSON.stringify(value)],
    );
  const update = (project, expected, next, value = payload()) =>
    db.query(
      'update public.travel_project_plans set revision=$3,payload=$4 where project_id=$1 and revision=$2 returning revision',
      [project, expected, next, JSON.stringify(value)],
    );
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.jwt() returns jsonb language sql stable as
        $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(auth.jwt()->>'sub', '')::uuid $$;
      grant usage on schema auth to anon, authenticated;
      grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
      create table public.family_plans(sentinel text);
      insert into public.family_plans values ('untouched');
      alter default privileges grant all on tables to anon, authenticated;
      alter default privileges grant all on functions to anon, authenticated;
    `);
    const migrationDir = path.resolve('starter/backend/supabase/migrations');
    const migrations = fs
      .readdirSync(migrationDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    assert.equal(migrations.length, 1, 'Update database fixture when adding migrations');
    await db.exec(fs.readFileSync(path.join(migrationDir, migrations[0]), 'utf8'));
    equal((await db.query('select sentinel from public.family_plans')).rows, [
      { sentinel: 'untouched' },
    ]);
    equal(
      (
        await db.query(
          "select count(*)::int as n from pg_class where relname in ('travel_projects','travel_project_members','travel_project_places','travel_project_plans') and relrowsecurity",
        )
      ).rows[0].n,
      4,
    );
    equal(
      (
        await db.query(
          "select count(*)::int as n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='travel_private' and p.prosecdef",
        )
      ).rows[0].n,
      0,
    );
    for (const id of users) await db.query('insert into auth.users values ($1)', [id]);
    for (const project of projects) {
      await db.query(
        "insert into public.travel_projects values ($1,'demo-city','2028-05-12','2028-05-14')",
        [project],
      );
      await db.query("insert into public.travel_project_places values ($1,'museum')", [project]);
    }
    for (const [project, user, role] of [
      [A, editor, 'editor'],
      [A, viewer, 'viewer'],
      [B, other, 'editor'],
      [B, editor, 'editor'],
      [C, editor, 'editor'],
    ])
      await db.query('insert into public.travel_project_members values ($1,$2,$3)', [
        project,
        user,
        role,
      ]);

    // Direct SQL has no app-side project filters: RLS must do all isolation.
    equal((await as(viewer, () => db.query('select id from public.travel_projects'))).rows, [
      { id: A },
    ]);
    equal(
      (await as(viewer, () => db.query('select user_id from public.travel_project_members'))).rows,
      [{ user_id: viewer }],
    );
    equal((await as(outsider, () => db.query('select * from public.travel_projects'))).rows, []);
    await denied(() =>
      actor('anon', null, () => db.query('select * from public.travel_project_plans')),
    );
    await denied(() => as(viewer, () => insert(A)));
    await denied(() => as(outsider, () => insert(A)));
    await denied(() => as(editor, () => insert(A), true));
    await denied(() => as(editor, () => insert(A, payload(), 5)), ['23514']);
    equal(
      (await as(editor, () => insert(A, payload([{ placeId: 'museum', day: '2028-05-12' }])))).rows,
      [{ revision: 1 }],
    );
    await denied(() => as(editor, () => insert(A)), ['23505']);
    await as(other, () => insert(B));
    equal(
      (await as(other, () => db.query('select project_id from public.travel_project_plans'))).rows,
      [{ project_id: B }],
    );
    equal(
      (await as(outsider, () => db.query('select * from public.travel_project_plans'))).rows,
      [],
    );
    equal(
      (await as(editor, () => db.query('select * from public.travel_project_plans'), true)).rows,
      [],
    );
    equal(
      (await as(viewer, () => db.query('select project_id from public.travel_project_plans'))).rows,
      [{ project_id: A }],
    );
    equal((await as(viewer, () => update(A, 1, 2))).rows, []);
    equal((await as(other, () => update(A, 1, 2))).rows, []);
    equal((await as(editor, () => update(A, 1, 2))).rows, [{ revision: 2 }]);
    equal((await as(editor, () => update(A, 1, 2))).rows, [], 'stale writer must affect no row');
    await denied(() => as(editor, () => update(A, 2, 4)), ['23514']);
    await denied(() =>
      as(editor, () =>
        db.query('update public.travel_project_plans set project_id=$1 where project_id=$2', [
          C,
          A,
        ]),
      ),
    );
    await denied(() => as(editor, () => db.query('delete from public.travel_project_plans')));
    await denied(() => as(editor, () => db.query('truncate public.travel_project_plans')));
    await denied(() =>
      as(editor, () => db.query("update public.travel_project_members set role='editor'")),
    );
    await denied(() =>
      as(outsider, () =>
        db.query("insert into public.travel_project_members values ($1,$2,'editor')", [
          A,
          outsider,
        ]),
      ),
    );
    await denied(() =>
      as(editor, () =>
        db.query("insert into public.travel_projects values ($1,'bad','2028-05-12','2028-05-14')", [
          '44444444-4444-4444-8444-444444444444',
        ]),
      ),
    );
    await denied(() =>
      as(editor, () =>
        db.query("insert into public.travel_project_places values ($1,'unknown')", [A]),
      ),
    );
    await denied(() => as(editor, () => db.query('select travel_private.validate_project_plan()')));

    const entry = { placeId: 'museum', day: '2028-05-12' };
    const invalid = [
      [],
      null,
      {},
      { ...payload(), version: 2 },
      payload([], 'other-trip'),
      { ...payload(), favorites: ['private'] },
      { ...payload(), plan: {} },
      payload([null]),
      payload([{}]),
      payload([{ ...entry, private: true }]),
      payload([{ placeId: 'unknown', day: entry.day }]),
      payload([{ ...entry, day: '2028-05-15' }]),
      payload([{ ...entry, day: '2028-02-31' }]),
      payload([{ ...entry, day: '2028-5-12' }]),
      payload([entry, entry]),
      payload(Array.from({ length: 5001 }, () => entry)),
      { ...payload(), extra: 'x'.repeat(1000001) },
    ];
    for (const value of invalid)
      await denied(() => as(editor, () => update(A, 2, 3, value)), ['23514', '22008']);
    equal(
      (
        await as(editor, () =>
          db.query('select revision from public.travel_project_plans where project_id=$1', [A]),
        )
      ).rows,
      [{ revision: 2 }],
    );
    await db.query('delete from public.travel_project_members where project_id=$1 and user_id=$2', [
      A,
      editor,
    ]);
    equal(
      (
        await as(editor, () =>
          db.query('select * from public.travel_project_plans where project_id=$1', [A]),
        )
      ).rows,
      [],
    );
    equal((await as(editor, () => update(A, 2, 3))).rows, []);
    await denied(() => as(editor, () => insert(A)));
    equal((await db.query('select sentinel from public.family_plans')).rows, [
      { sentinel: 'untouched' },
    ]);
    console.log(
      `PASS: ${checks} isolated PostgreSQL checks: RLS, grants, membership, two projects, viewer/editor, anonymous accounts, revocation, CAS conflicts and payload constraints`,
    );
  } finally {
    await db.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
