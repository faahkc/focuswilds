-- Run in SQL Editor after the migration; all test writes are rolled back.
begin;

do $$
begin
  assert (select relrowsecurity from pg_class where oid = 'public.companion_preferences'::regclass);
  assert not has_table_privilege('anon', 'public.companion_preferences', 'SELECT');
  assert not has_table_privilege('anon', 'public.companion_preferences', 'INSERT');
  assert not has_table_privilege('anon', 'public.companion_preferences', 'UPDATE');
  assert not has_table_privilege('authenticated', 'public.companion_preferences', 'DELETE');
end $$;

select set_config('request.jwt.claim.sub', (
  select user_id::text from public.focus_sessions
  where session_type = 'focus' and status = 'completed'
  order by finished_at desc limit 1
), true);

set local role authenticated;

do $$
declare
  discovered text;
begin
  assert auth.uid() is not null, 'Test needs an account with a saved completed focus session';
  insert into public.companion_preferences (user_id, selected_companion)
    values (auth.uid(), 'moss')
    on conflict (user_id) do update set selected_companion = excluded.selected_companion;
  assert (select selected_companion = 'moss' from public.companion_preferences where user_id = auth.uid());

  select case (('x' || right(id::text, 8))::bit(32)::bigint % 3)
    when 0 then 'rabbit' when 1 then 'bird' when 2 then 'squirrel' end
    into discovered from public.focus_sessions
    where user_id = auth.uid() and session_type = 'focus' and status = 'completed' limit 1;
  assert discovered is not null, 'Test account cannot read a completed focus session';
  update public.companion_preferences set selected_companion = discovered where user_id = auth.uid();
  assert (select selected_companion = discovered from public.companion_preferences where user_id = auth.uid());

  begin
    insert into public.companion_preferences (user_id, selected_companion)
      values ('00000000-0000-4000-8000-000000000099', 'moss');
    raise exception 'Cross-account insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000099', true);

do $$
begin
  assert (select count(*) = 0 from public.companion_preferences), 'Another account can read the owner preference';
  update public.companion_preferences set selected_companion = 'moss';
  assert not found, 'Another account can update the owner preference';
  begin
    insert into public.companion_preferences (user_id, selected_companion) values (auth.uid(), 'rabbit');
    raise exception 'Undiscovered companion unexpectedly accepted';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
select 'Companion preference RLS checks passed; all test writes rolled back.' as result;
