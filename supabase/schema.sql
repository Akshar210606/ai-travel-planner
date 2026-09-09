create table trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination text not null,
  days int not null,
  budget numeric not null,
  currency text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table trips enable row level security;

create policy "read own trips"
  on trips for select
  using (auth.uid() = user_id);

create policy "insert own trips"
  on trips for insert
  with check (auth.uid() = user_id);

create policy "delete own trips"
  on trips for delete
  using (auth.uid() = user_id);

create index trips_user_created on trips (user_id, created_at desc);