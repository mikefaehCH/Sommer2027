const assert = require('node:assert/strict');
const fs = require('node:fs');
const { familyDatabase, userId } = require('./helpers/family-db.cjs');

(async () => {
  const db = await familyDatabase();
  const update = (data) =>
    db.query("update public.family_plans set data=$1 where id='summer2027'", [
      JSON.stringify(data),
    ]);
  const state = (morning, evening = []) => ({
    days: { '2027-07-10': { Morgen: morning, Abend: evening } },
  });
  const history = () =>
    db.query('select action,details,actor_id from public.change_log order by id');
  try {
    await db.exec(
      fs.readFileSync('supabase/migrations/20261025_detailed_plan_history.sql', 'utf8'),
    );
    await assert.rejects(update(state(['museum'])), (error) => error.code === '42883');
    assert.equal((await history()).rows.length, 0, 'Failed update is atomic');
    const before = (
      await db.query(
        "select prosecdef,proconfig,proacl::text from pg_proc where oid='public.audit_plan_change()'::regprocedure",
      )
    ).rows;
    const migration = fs
      .readdirSync('supabase/migrations')
      .find((name) => name.endsWith('_fix_plan_history_coalesce.sql'));
    assert.ok(migration);
    await db.exec(fs.readFileSync('supabase/migrations/' + migration, 'utf8'));
    assert.deepEqual(
      (
        await db.query(
          "select prosecdef,proconfig,proacl::text from pg_proc where oid='public.audit_plan_change()'::regprocedure",
        )
      ).rows,
      before,
      'Security mode, search_path and existing ACL stay unchanged',
    );
    await db.exec('set role authenticated');
    await update(state(['museum', 'harbor']));
    await update(state(['museum', 'park']));
    await update(state(['park'], ['museum']));
    const rows = (await history()).rows;
    assert.ok(rows.every((row) => row.actor_id === userId));
    assert.deepEqual(
      rows
        .filter((row) => row.action === 'plan_add')
        .map((row) => row.details.activity_id)
        .sort(),
      ['harbor', 'museum', 'park'],
    );
    assert.deepEqual(
      rows.filter((row) => row.action === 'plan_remove').map((row) => row.details.activity_id),
      ['harbor'],
    );
    const move = rows.find((row) => row.action === 'plan_move');
    assert.deepEqual(move.details, {
      activity_id: 'museum',
      day: '2027-07-10',
      slot: 'Morgen',
      to_day: '2027-07-10',
      to_slot: 'Abend',
    });
    await update({ favorites: ['museum'] }); // missing days exercises coalesce's empty-object branch
    assert.equal(
      (await db.query("select data,updated_by from public.family_plans where id='summer2027'"))
        .rows[0].updated_by,
      userId,
    );
    assert.ok((await history()).rows.some((row) => row.action === 'plan_favorite'));
  } finally {
    await db.close();
  }
  const fresh = await familyDatabase();
  try {
    await fresh.exec('set role authenticated');
    await fresh.query("update public.family_plans set data=$1 where id='summer2027'", [
      JSON.stringify(state(['museum'])),
    ]);
    assert.equal(
      (
        await fresh.query(
          "select count(*)::int as n from public.change_log where action='plan_add'",
        )
      ).rows[0].n,
      1,
      'Fresh schema installs the corrected detailed audit',
    );
  } finally {
    await fresh.close();
  }
  console.log(
    'PASS: historical 42883 reproduced; upgrade and fresh schema audit add/remove/move/favorites with unchanged security',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
