-- Fitness OS: in the Supabase SQL Editor ausführen.
create table if not exists public.fitness_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.fitness_states enable row level security;
revoke all on public.fitness_states from anon, authenticated;
grant select on public.fitness_states to authenticated;
drop policy if exists "read own state" on public.fitness_states;
create policy "read own state" on public.fitness_states for select to authenticated using ((select auth.uid())=user_id);
create or replace function public.save_fitness_state(expected_revision bigint, new_payload jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_revision bigint;
begin
 if v_uid is null then raise exception 'Not authenticated'; end if;
 if expected_revision = 0 then
   insert into public.fitness_states(user_id,payload,revision) values(v_uid,new_payload,1)
   on conflict do nothing returning revision into v_revision;
 else
   update public.fitness_states set payload=new_payload,revision=revision+1,updated_at=now()
   where user_id=v_uid and revision=expected_revision returning revision into v_revision;
 end if;
 if v_revision is null then raise exception 'SYNC_CONFLICT'; end if;
 return v_revision;
end $$;
revoke all on function public.save_fitness_state(bigint,jsonb) from public, anon;
grant execute on function public.save_fitness_state(bigint,jsonb) to authenticated;
