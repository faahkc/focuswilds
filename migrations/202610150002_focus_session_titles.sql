begin;

alter table public.focus_sessions
  add column title text not null default 'Focus session'
  constraint focus_sessions_title_check check (
    char_length(title) between 1 and 120 and title !~ '^[[:space:]]*$'
  );

commit;
