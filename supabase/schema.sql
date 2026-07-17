-- Ejecutar una vez en el SQL Editor del proyecto Supabase.
-- Un row por usuario con todo el estado de la app en JSON.

create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

create policy "Users manage own state"
  on public.app_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Necesario para recibir cambios en tiempo real en los demás dispositivos.
alter publication supabase_realtime add table public.app_state;
