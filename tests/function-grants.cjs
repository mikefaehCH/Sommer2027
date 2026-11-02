const assert = require('node:assert/strict');
const fs = require('node:fs');
const { familyDatabase, userId } = require('./helpers/family-db.cjs');
(async () => {
  for (const mode of ['fresh schema', 'upgrade migration']) {
    const db = await familyDatabase();
    try {
      if (mode === 'upgrade migration') {
        // Reproduce a pre-hardening installation with broad Supabase-style grants.
        await db.exec(
          'grant execute on all functions in schema public to public, anon, authenticated, service_role',
        );
        const name = fs.readdirSync('supabase/migrations').find((file) => file.includes('execute'));
        await db.exec(fs.readFileSync('supabase/migrations/' + name, 'utf8'));
      }
      for (const fn of [
        'audit_plan_change',
        'audit_vote_change',
        'is_family_admin',
        'is_family_editor',
      ]) {
        for (const role of ['anon', 'authenticated', 'service_role']) {
          const expected =
            role === 'service_role' || (role === 'authenticated' && fn.startsWith('is_family_'));
          const result = await db.query(
            "select has_function_privilege($1,$2,'EXECUTE') as allowed",
            [role, 'public.' + fn + '()'],
          );
          assert.equal(result.rows[0].allowed, expected, mode + ': ' + role + '/' + fn);
        }
      }
      await db.exec('set role authenticated');
      await db.exec(
        "update public.family_plans set data='{\"synthetic\":true}' where id='summer2027'",
      );
      await db.query(
        "insert into public.activity_votes(activity_id,voter_id,vote) values ('synthetic-place',$1,'yes')",
        [userId],
      );
      await db.exec(
        "update public.activity_votes set vote='maybe' where activity_id='synthetic-place'",
      );
      await db.exec("delete from public.activity_votes where activity_id='synthetic-place'");
      assert.deepEqual(
        (await db.query('select action from public.change_log order by id')).rows.map(
          (r) => r.action,
        ),
        ['plan_updated', 'vote_insert', 'vote_update', 'vote_delete'],
      );
      await assert.rejects(
        db.exec('select public.audit_plan_change()'),
        (error) => error.code === '42501',
      );
      await db.exec('reset role; set role anon');
      await assert.rejects(
        db.exec('select public.is_family_editor()'),
        (error) => error.code === '42501',
      );
      await db.exec(
        'reset role; begin; revoke execute on function public.is_family_editor() from authenticated; set local role authenticated',
      );
      await assert.rejects(
        db.exec('select * from public.family_plans'),
        (error) => error.code === '42501',
      );
      await db.exec('rollback');
    } finally {
      await db.close();
    }
  }
  console.log(
    'PASS: fresh/upgrade function ACLs, real authenticated audit writes, denied direct calls; removing RLS-helper EXECUTE demonstrably breaks access',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
