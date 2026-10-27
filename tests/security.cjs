const fs = require('node:fs');
const assert = require('node:assert/strict');

const edge = fs.readFileSync('supabase/functions/travel-assistant/index.ts', 'utf8');
const guards = [
  'auth.getUser(',
  ".from('family_members')",
  'declaredSize > 50000',
  'raw.length > 50000',
  'JSON.parse(raw)',
  'Number.isFinite(v)',
];
for (const guard of guards) {
  assert.ok(edge.includes(guard), guard);
}
assert.ok(!edge.includes('service_role'));

const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const tables = ['family_members', 'family_plans', 'activity_votes', 'change_log', 'guest_links'];
for (const table of tables) {
  const statement = 'alter table public.' + table;
  assert.ok(schema.includes(statement + ' enable row level security;'));
}
assert.ok(schema.includes('voter_id=(select auth.uid())'));

console.log('PASS: AI input guards and RLS declarations');
