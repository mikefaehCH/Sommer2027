-- Sommer 2027: detailed server-side audit of family calendar changes.
-- Execute once in Supabase SQL Editor. Existing plans, votes and history are preserved.
-- Replaces only the plan audit trigger function. The existing trigger remains attached.
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

  for d in select value from pg_catalog.jsonb_array_elements_text(
    (select pg_catalog.coalesce(pg_catalog.jsonb_agg(key), '[]'::jsonb)
     from pg_catalog.jsonb_object_keys(pg_catalog.coalesce(new.data->'days','{}'::jsonb)) as key)
  ) loop
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
      removed := (select pg_catalog.coalesce(pg_catalog.jsonb_agg(value),'[]'::jsonb) from pg_catalog.jsonb_array_elements(removed) where value->>'activity_id'<>item);
      added := (select pg_catalog.coalesce(pg_catalog.jsonb_agg(value),'[]'::jsonb) from pg_catalog.jsonb_array_elements(added) where value->>'activity_id'<>item);
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
