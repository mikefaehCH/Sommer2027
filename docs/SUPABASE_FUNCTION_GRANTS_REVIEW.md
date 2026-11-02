# Supabase function-grant hardening: release checklist

Refs #39. Prepared on `fix/supabase-function-execute-grants`. **Not applied to any live database.**

## Why

The Sommer2027 Supabase security advisor reports `anon` and `authenticated` EXECUTE on four `SECURITY DEFINER` functions:

- `public.audit_plan_change()`, `public.audit_vote_change()`: trigger-returning audit helpers; direct Data API invocation is unnecessary.
- `public.is_family_admin()`, `public.is_family_editor()`: membership checks used by existing RLS policies; authenticated access must remain available.

The migration removes public and anonymous execution, additionally removes authenticated execution on trigger helpers, and explicitly preserves authenticated/service-role execution on membership helpers. It does not modify tables, policies, family data or triggers.

## Before applying

1. Use a **separate, explicitly identified disposable Supabase test project**. The existing Camino and Sommer2027 projects are not disposable test environments.
2. Capture current function ACLs and RLS policies; review all four function definitions and trigger dependencies.
3. Apply `supabase/migrations/20261101120000_restrict_family_function_execute.sql` only in the test project.
4. Verify with `has_function_privilege` for `anon`, `authenticated`, and `service_role`:
   - both audit functions: anon=false, authenticated=false;
   - both membership functions: anon=false, authenticated=true.
5. Exercise **real PostgREST requests with separate test identities**: anonymous, non-member, viewer, editor, admin. Assert both permitted and forbidden SELECT/INSERT/UPDATE/DELETE, trigger audit-log writes, session changes and project isolation. Never reuse actual family records.
6. Re-run Supabase security advisors and the full repository quality matrix. Request independent review before merge and **separate approval before any production database migration**.

## Limitations

Static SQL and local simulated Postgres tests are not substitutes for hosted Supabase Auth/PostgREST integration tests. `SECURITY DEFINER` trigger functions may still run with owner privileges when invoked by their trigger, so trigger and RLS behavior must be verified. Existing warnings about callable authenticated membership helpers may remain by design; do not silence the advisor by breaking RLS.
