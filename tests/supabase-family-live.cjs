// Isolated local Supabase only. No production configuration or credentials.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const api = process.env.API_URL;
const anon = process.env.ANON_KEY;
const service = process.env.SERVICE_ROLE_KEY;
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(api || '')) throw Error('Refusing non-local API');
assert.ok(anon && service, 'Local keys required');
const container = execFileSync('docker', ['ps', '--filter', 'name=supabase_db_', '--format', '{{.Names}}'], { encoding: 'utf8' }).trim().split('\n');
assert.equal(container.length, 1);
const sql = (input) => execFileSync('docker', ['exec', '-i', container[0], 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], { input, encoding: 'utf8' });
async function call(path, key, options = {}) {
  const res = await fetch(api + path, { ...options, headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', ...options.headers } });
  const body = await res.text();
  return { status: res.status, body };
}
async function main() {
  sql(readFileSync('supabase/schema.sql', 'utf8'));
  // Simulate broad pre-migration function grants, then apply the exact upgrade.
  sql('grant execute on all functions in schema public to public, anon, authenticated, service_role;');
  sql(readFileSync('supabase/migrations/20261101120000_restrict_family_function_execute.sql', 'utf8'));
  const password = 'Local-test-only-12345!';
  async function user(email) {
    let r = await call('/auth/v1/admin/users', service, { method:'POST', body:JSON.stringify({email,password,email_confirm:true}) });
    assert.equal(r.status, 200, r.body);
    const id = JSON.parse(r.body).id;
    assert.match(id, /^[0-9a-f-]{36}$/);
    r = await call('/auth/v1/token?grant_type=password', anon, {method:'POST',body:JSON.stringify({email,password})});
    assert.equal(r.status, 200, r.body);
    return {id,token:JSON.parse(r.body).access_token};
  }
  const editor = await user('editor@example.test');
  const outsider = await user('outsider@example.test');
  sql("insert into public.family_members(user_id,display_name,role) values ('" + editor.id + "','Test editor','editor');");
  const rest = (path, token, options={}) => call('/rest/v1/' + path, anon, {...options,headers:{Authorization:'Bearer '+token,...options.headers}});
  let r = await rest('family_plans?select=id', anon);
  assert.ok(r.status === 401 || r.status === 403 || (r.status === 200 && JSON.parse(r.body).length === 0), 'Anonymous plan read');
  r = await rest('family_plans?select=id', outsider.token);
  assert.equal(r.status, 200); assert.deepEqual(JSON.parse(r.body), []);
  r = await rest('family_plans?select=id', editor.token);
  assert.equal(r.status, 200); assert.equal(JSON.parse(r.body).length, 1);
  r = await rest('family_plans?id=eq.summer2027', outsider.token, {method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({data:{synthetic:'blocked'}})});
  assert.equal(r.status, 200); assert.deepEqual(JSON.parse(r.body), []);
  r = await rest('family_plans?id=eq.summer2027', editor.token, {method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({data:{synthetic:'allowed'}})});
  assert.equal(r.status, 200, r.body); assert.equal(JSON.parse(r.body).length, 1);
  r = await rest('change_log?select=action', editor.token);
  assert.equal(r.status, 200); assert.ok(JSON.parse(r.body).some(x=>x.action==='plan_updated'));
  r = await rest('rpc/is_family_editor', anon, {method:'POST',body:'{}'});
  assert.ok(r.status >= 400, 'Anonymous helper RPC must fail');
  console.log('PASS: local Auth, PostgREST, anonymous and outsider isolation, editor write and audit trigger after migration');
}
main().catch(e => { console.error(e); process.exitCode=1; });
