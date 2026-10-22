create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 120),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.todos enable row level security;
revoke all on table public.todos from anon;
grant select, insert, update, delete on table public.todos to authenticated;
create index if not exists todos_user_id_created_at_idx
  on public.todos (user_id, created_at desc);
create policy "Users can read own todos"
  on public.todos for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own todos"
  on public.todos for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own todos"
  on public.todos for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own todos"
  on public.todos for delete to authenticated
  using ((select auth.uid()) = user_id);
