-- Sommer 2027: private collaborative family planner
-- Run once in Supabase SQL Editor. Review before executing.
create extension if not exists pgcrypto;

create table if not exists public.family_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (length(display_name) between 1 and 80),
 role text not null default 'editor' check (role in ('admin','editor')),
 created_at timestamptz not null default now()
);
create table if not exists public.family_plans (
 id text primary key default 'summer2027' check (id='summer2027'),
 data jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
create table if not exists public.activity_votes (
 activity_id text not null,
 voter_id uuid not null references auth.users(id) on delete cascade,
 vote text not null check (vote in ('yes','maybe','no')),
 updated_at timestamptz not null default now(),
 primary key(activity_id,voter_id)
);
create table if not exists public.change_log (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id),
 action text not null,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
-- Only hashes of guest tokens are stored, never the actual token.
create table if not exists public.guest_links (
 id uuid primary key default gen_random_uuid(),
 token_hash text unique not null,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 expires_at timestamptz,
 revoked_at timestamptz
);
insert into public.family_plans(id) values ('summer2027') on conflict do nothing;

create or replace function public.is_family_editor()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.family_members where user_id=(select auth.uid())); $$;
create or replace function public.is_family_admin()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.family_members where user_id=(select auth.uid()) and role='admin'); $$;
revoke all on function public.is_family_editor() from public;
revoke all on function public.is_family_admin() from public;
grant execute on function public.is_family_editor() to authenticated;
grant execute on function public.is_family_admin() to authenticated;

alter table public.family_members enable row level security;
alter table public.family_plans enable row level security;
alter table public.activity_votes enable row level security;
alter table public.change_log enable row level security;
alter table public.guest_links enable row level security;

create policy "family members read each other" on public.family_members for select to authenticated using (public.is_family_editor());
create policy "family members read plan" on public.family_plans for select to authenticated using (public.is_family_editor());
create policy "family members update plan" on public.family_plans for update to authenticated using (public.is_family_editor()) with check (public.is_family_editor());
create policy "family members read votes" on public.activity_votes for select to authenticated using (public.is_family_editor());
create policy "family members vote for self" on public.activity_votes for insert to authenticated with check (public.is_family_editor() and voter_id=(select auth.uid()));
create policy "family members change own vote" on public.activity_votes for update to authenticated using (public.is_family_editor() and voter_id=(select auth.uid())) with check (public.is_family_editor() and voter_id=(select auth.uid()));
create policy "family members remove own vote" on public.activity_votes for delete to authenticated using (public.is_family_editor() and voter_id=(select auth.uid()));
create policy "family members read history" on public.change_log for select to authenticated using (public.is_family_editor());
-- Audit records are created by trusted database triggers, never inserted directly by browsers.
create or replace function public.audit_plan_change()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  d text;
  s text;
  item text;
  old_arr jsonb;
  new_arr jsonb;
  removed jsonb := '[]'::jsonb;
  added jsonb := '[]'::jsonb;
  old_item text;
  new_item text;
  found_move boolean;
begin
  new.updated_at := now();
  new.updated_by := auth.uid();

  -- Avoid an unbounded audit trail for unusually large or malformed plan documents.
  if pg_catalog.length(new.data::text) > 250000 then
    raise exception 'Plan exceeds audit size limit';
  end if;

  for d in select key from pg_catalog.jsonb_object_keys(coalesce(new.data->'days','{}'::jsonb)) as t(key) loop
    foreach s in array array['Morgen','Mittag','Nachmittag','Abend'] loop
      old_arr := case when pg_catalog.jsonb_typeof(old.data#>array['days',d,s])='array' then old.data#>array['days',d,s] else '[]'::jsonb end;
      new_arr := case when pg_catalog.jsonb_typeof(new.data#>array['days',d,s])='array' then new.data#>array['days',d,s] else '[]'::jsonb end;
      if old_arr is distinct from new_arr then
        for old_item in select value from pg_catalog.jsonb_array_elements_text(old_arr) loop
          if not (new_arr ? old_item) then
            removed := removed || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('activity_id',old_item,'day',d,'slot',s));
          end if;
        end loop;
        for new_item in select value from pg_catalog.jsonb_array_elements_text(new_arr) loop
          if not (old_arr ? new_item) then
            added := added || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('activity_id',new_item,'day',d,'slot',s));
          end if;
        end loop;
      end if;
    end loop;
  end loop;

  -- Match one removed activity with its corresponding addition as a move.
  for item in select distinct value->>'activity_id' from pg_catalog.jsonb_array_elements(removed) loop
    if exists(select 1 from pg_catalog.jsonb_array_elements(added) a where a.value->>'activity_id'=item) then
      insert into public.change_log(actor_id,action,details)
      select auth.uid(),'plan_move',
        pg_catalog.jsonb_build_object('activity_id',item,'day',r.value->>'day','slot',r.value->>'slot','to_day',a.value->>'day','to_slot',a.value->>'slot')
      from pg_catalog.jsonb_array_elements(removed) r cross join pg_catalog.jsonb_array_elements(added) a
      where r.value->>'activity_id'=item and a.value->>'activity_id'=item
      limit 1;
      removed := (select coalesce(pg_catalog.jsonb_agg(value),'[]'::jsonb) from pg_catalog.jsonb_array_elements(removed) where value->>'activity_id'<>item);
      added := (select coalesce(pg_catalog.jsonb_agg(value),'[]'::jsonb) from pg_catalog.jsonb_array_elements(added) where value->>'activity_id'<>item);
    end if;
  end loop;

  insert into public.change_log(actor_id,action,details)
    select auth.uid(),'plan_remove',value from pg_catalog.jsonb_array_elements(removed);
  insert into public.change_log(actor_id,action,details)
    select auth.uid(),'plan_add',value from pg_catalog.jsonb_array_elements(added);
  if old.data->'favorites' is distinct from new.data->'favorites' then
    insert into public.change_log(actor_id,action,details)
    values(auth.uid(),'plan_favorite','{}'::jsonb);
  end if;
  if removed='[]'::jsonb and added='[]'::jsonb
     and old.data->'favorites' is not distinct from new.data->'favorites'
     and old.data is distinct from new.data then
    insert into public.change_log(actor_id,action,details)
    values(auth.uid(),'plan_updated',pg_catalog.jsonb_build_object('plan_id',new.id));
  end if;
  return new;
end;
$$;
create trigger audit_plan_update before update on public.family_plans
for each row execute function public.audit_plan_change();

create or replace function public.audit_vote_change()
returns trigger language plpgsql security definer set search_path=''
as $$ begin
  if tg_op='DELETE' then
    insert into public.change_log(actor_id,action,details)
    values (auth.uid(),'vote_delete',jsonb_build_object('activity_id',old.activity_id,'vote',old.vote));
    return old;
  end if;
  insert into public.change_log(actor_id,action,details)
  values (auth.uid(),'vote_'||lower(tg_op),jsonb_build_object('activity_id',new.activity_id,'vote',new.vote));
  return new;
end $$;
create trigger audit_vote after insert or update or delete on public.activity_votes
for each row execute function public.audit_vote_change();

-- No guest SELECT policies: an anonymous browser cannot read tables.
-- Guest links must be checked by a separate server-side Edge Function.
-- No policies permit client-side management of family_members or guest_links.
