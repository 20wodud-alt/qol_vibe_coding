create table public.apple_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 300),
  note text not null default '',
  due date not null default current_date,
  completed boolean not null default false,
  priority text not null default 'none' check (priority in ('none', 'important')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index apple_todos_user_id_created_at_idx
  on public.apple_todos (user_id, created_at desc);

create index apple_todos_due_idx
  on public.apple_todos (due);

create trigger set_apple_todos_updated_at
before update on public.apple_todos
for each row execute function public.set_updated_at();

alter table public.apple_todos enable row level security;

grant select, insert, update, delete on table public.apple_todos to authenticated;

create policy "Users can read own apple todos"
  on public.apple_todos for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own apple todos"
  on public.apple_todos for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own apple todos"
  on public.apple_todos for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own apple todos"
  on public.apple_todos for delete to authenticated
  using ((select auth.uid()) = user_id);
