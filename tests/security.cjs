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

const frontendFiles = [
  'app.js',
  'ai.js',
  'familien-login-inline-1.js',
  'gemeinsamer-plan-inline-1.js',
  'scripts/photo-review.js',
  'supabase/public-config.js',
];
for (const file of frontendFiles) {
  const source = fs.readFileSync(file, 'utf8');
  assert.ok(
    !/sb_secret_|\bservice_role(?:["']\s*[:=]|\s*[:=])|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/.test(
      source,
    ),
    `${file}: possible privileged credential`,
  );
  assert.ok(!/\beval\s*\(|\bnew\s+Function\s*\(/.test(source), `${file}: dynamic code execution`);
}
const review = fs.readFileSync('scripts/photo-review.js', 'utf8');
assert.ok(review.includes('textContent'), 'scripts/photo-review.js: safe text rendering missing');
assert.ok(
  review.includes('noopener noreferrer'),
  'scripts/photo-review.js: link isolation missing',
);
const workflow = fs.readFileSync('.github/workflows/quality.yml', 'utf8');
assert.ok(workflow.includes('pull_request:'), 'quality.yml: PR trigger missing');
assert.ok(workflow.includes('verify:sri'), 'quality.yml: SRI gate missing');
console.log('PASS: frontend credential, dynamic execution and photo review security guards');
