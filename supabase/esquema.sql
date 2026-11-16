-- =====================================================================
-- Cierre Cignetti — esquema de la base (Supabase). Sin datos: los datos viven solo en Supabase.
-- 1) Reemplazá TU_MAIL@ejemplo.com por el mail con el que vas a ingresar.
-- 2) Pegá todo en SQL Editor → New query y tocá Run.
-- =====================================================================

-- Quién puede CARGAR y MODIFICAR datos (el resto de los usuarios solo consulta).
create table if not exists public.editores (email text primary key);
insert into public.editores (email) values (lower('TU_MAIL@ejemplo.com')) on conflict do nothing;

-- Datos de la app: maestros, plan de cuentas y una fila por campaña.
create table if not exists public.docs (
  path        text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text default (auth.jwt() ->> 'email')
);

alter table public.docs     enable row level security;
alter table public.editores enable row level security;

drop policy if exists "docs: leer usuarios logueados" on public.docs;
drop policy if exists "docs: escribir editores"        on public.docs;
drop policy if exists "editores: leer"                 on public.editores;

create policy "docs: leer usuarios logueados" on public.docs
  for select to authenticated using (true);

create policy "docs: escribir editores" on public.docs
  for all to authenticated
  using      (exists (select 1 from public.editores e where e.email = lower(auth.jwt() ->> 'email')))
  with check (exists (select 1 from public.editores e where e.email = lower(auth.jwt() ->> 'email')));

create policy "editores: leer" on public.editores
  for select to authenticated using (true);

-- Actualización en vivo entre usuarios.
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when others then null; end $$;

