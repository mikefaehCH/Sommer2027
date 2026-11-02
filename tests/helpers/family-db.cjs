// Ephemeral PostgreSQL only. Auth helpers and identities are synthetic fixtures.
const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function familyDatabase() {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  `);
  // gen_random_uuid is built into PostgreSQL; PGlite does not bundle pgcrypto.
  await db.exec(
    fs
      .readFileSync('supabase/schema.sql', 'utf8')
      .replace('create extension if not exists pgcrypto;', ''),
  );
  await db.query('insert into auth.users values ($1)', [userId]);
  await db.query(
    "insert into public.family_members(user_id,display_name) values ($1,'Synthetic editor')",
    [userId],
  );
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  return db;
}
module.exports = { familyDatabase, userId };
