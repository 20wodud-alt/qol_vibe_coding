drop policy if exists "Users can read own todos" on public.todos;
drop policy if exists "Users can insert own todos" on public.todos;
drop policy if exists "Users can update own todos" on public.todos;
drop policy if exists "Users can delete own todos" on public.todos;
create policy "Authenticated users can read all todos"
  on public.todos for select
  to authenticated
  using (true);
create policy "Authenticated users can insert todos"
  on public.todos for insert
  to authenticated
  with check (true);
create policy "Authenticated users can update all todos"
  on public.todos for update
  to authenticated
  using (true)
  with check (true);
create policy "Authenticated users can delete all todos"
  on public.todos for delete
  to authenticated
  using (true);
