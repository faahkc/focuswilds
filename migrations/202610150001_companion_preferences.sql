begin;

create table public.companion_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_companion text not null check (selected_companion in ('moss', 'rabbit', 'bird', 'squirrel'))
);

alter table public.companion_preferences enable row level security;
revoke all on public.companion_preferences from anon, authenticated;
grant select, insert, update on public.companion_preferences to authenticated;

create policy "Own discovered companion" on public.companion_preferences
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      selected_companion = 'moss'
      or exists (
        select 1 from public.focus_sessions as focus
        where focus.user_id = (select auth.uid())
          and focus.session_type = 'focus' and focus.status = 'completed'
          and (('x' || right(focus.id::text, 8))::bit(32)::bigint % 3) =
            case selected_companion when 'rabbit' then 0 when 'bird' then 1 when 'squirrel' then 2 end
      )
    )
  );

-- Verify parity with the browser's unsigned hexadecimal encounter mapping.
do $$
begin
  assert ('x00000000'::bit(32)::bigint % 3) = 0;
  assert ('x00000001'::bit(32)::bigint % 3) = 1;
  assert ('x00000002'::bit(32)::bigint % 3) = 2;
  assert ('xffffffff'::bit(32)::bigint % 3) = 0;
end $$;

commit;
