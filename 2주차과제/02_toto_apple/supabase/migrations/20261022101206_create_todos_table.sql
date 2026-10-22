alter table public.todos
  add column if not exists note text not null default '',
  add column if not exists due date not null default current_date,
  add column if not exists priority text not null default 'none';

alter table public.todos
  drop constraint if exists todos_priority_check;

alter table public.todos
  add constraint todos_priority_check
  check (priority in ('none', 'important'));

alter table public.todos
  drop constraint if exists todos_text_check;

alter table public.todos
  add constraint todos_text_check
  check (char_length(text) between 1 and 300);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_todos_updated_at on public.todos;
create trigger set_todos_updated_at
before update on public.todos
for each row execute function public.set_updated_at();

alter table public.todos enable row level security;

create index if not exists todos_due_idx on public.todos (due);
