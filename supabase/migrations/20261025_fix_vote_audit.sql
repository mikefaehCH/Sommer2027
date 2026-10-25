-- Apply once in Supabase SQL Editor. Safe additive function replacement; no data deletion.
-- Fix vote DELETE auditing by explicitly using OLD rather than NEW.
create or replace function public.audit_vote_change()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if tg_op='DELETE' then
    insert into public.change_log(actor_id,action,details)
    values (auth.uid(),'vote_delete',jsonb_build_object('activity_id',old.activity_id,'vote',old.vote));
    return old;
  end if;
  insert into public.change_log(actor_id,action,details)
  values (auth.uid(),'vote_'||lower(tg_op),jsonb_build_object('activity_id',new.activity_id,'vote',new.vote));
  return new;
end;
$$;
