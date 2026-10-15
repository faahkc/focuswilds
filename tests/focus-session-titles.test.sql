-- Run after the title migration; all test writes are rolled back.
begin;

do $$
declare
  account_id uuid;
  session_id uuid := gen_random_uuid();
  invalid_title text;
begin
  select user_id into account_id from public.focus_sessions limit 1;
  assert account_id is not null, 'Test needs an existing focus session';
  insert into public.focus_sessions (id, user_id, session_type, status, duration_seconds, remaining_seconds, started_at, ends_at, finished_at)
    values (session_id, account_id, 'focus', 'completed', 1500, 0, now() - interval '25 minutes', now(), now());
  assert (select title = 'Focus session' from public.focus_sessions where id = session_id);
  update public.focus_sessions set title = 'อ่านหนังสือ' where id = session_id;
  assert (select title = 'อ่านหนังสือ' from public.focus_sessions where id = session_id);
  update public.focus_sessions set title = repeat('🌱', 120) where id = session_id;
  assert (select char_length(title) = 120 from public.focus_sessions where id = session_id);

  foreach invalid_title in array array['', E' \t\n ', repeat('a', 121)] loop
    begin
      update public.focus_sessions set title = invalid_title where id = session_id;
      raise exception 'Invalid title unexpectedly accepted';
    exception when check_violation then null;
    end;
  end loop;
  begin
    update public.focus_sessions set title = null where id = session_id;
    raise exception 'Null title unexpectedly accepted';
  exception when not_null_violation then null;
  end;
end $$;

rollback;
select 'Focus session title checks passed; all test writes rolled back.' as result;
