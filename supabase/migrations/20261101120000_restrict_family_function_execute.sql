-- Restrict direct RPC execution without changing trigger ownership or family RLS.
-- This migration must be tested against an isolated Supabase project before production.
-- Trigger functions run via their owning triggers; clients do not need EXECUTE grants.
REVOKE EXECUTE ON FUNCTION public.audit_plan_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_vote_change() FROM PUBLIC, anon, authenticated;

-- RLS policies call these helpers for signed-in members. Preserve authenticated
-- and service_role access, but do not expose the membership probes anonymously.
REVOKE EXECUTE ON FUNCTION public.is_family_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_family_editor() FROM PUBLIC, anon;

-- Reassert explicit access for the roles that need the helpers.
GRANT EXECUTE ON FUNCTION public.is_family_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_family_editor() TO authenticated, service_role;
