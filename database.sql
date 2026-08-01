-- =========================================
-- SNEAKERS JHON (multi-tenant genérico)
-- Un solo código para TODOS los clientes.
-- La tienda se identifica automáticamente
-- por el dominio (tabla stores).
-- Ejecutar en: Supabase > SQL Editor
-- =========================================

-- 1. Tabla de productos (esquema "sneakers": marca, tallas, stock, etc.)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  category text,
  price numeric(10,2) not null default 0,
  stock integer not null default 0,
  sizes text[],
  description text,
  image_url text,
  images text[],
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamp with time zone default now()
);

alter table public.products enable row level security;

drop policy if exists "Lectura pública de productos" on public.products;
create policy "Lectura pública de productos"
on public.products
for select
using (true);

drop policy if exists "Insertar solo productos propios" on public.products;
create policy "Insertar solo productos propios"
on public.products
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Actualizar solo productos propios" on public.products;
create policy "Actualizar solo productos propios"
on public.products
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Eliminar solo productos propios" on public.products;
create policy "Eliminar solo productos propios"
on public.products
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================================
-- 2. Tabla stores: mapeo dominio -> dueño
-- =========================================
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,          -- ej: 'sneakersjhon.com'
  owner_id uuid not null references auth.users(id) on delete cascade,
  store_name text,
  created_at timestamp with time zone default now()
);

alter table public.stores enable row level security;

-- No se expone la tabla completa (sin política de SELECT).
-- Solo se accede vía la función get_store_owner() de abajo.
drop policy if exists "Lectura pública de stores" on public.stores;

create or replace function public.get_store_owner(store_domain text)
returns table (owner_id uuid, store_name text)
language sql
security definer
set search_path = public
stable
as $$
  select owner_id, store_name
  from public.stores
  where domain = store_domain
  limit 1;
$$;

grant execute on function public.get_store_owner(text) to anon, authenticated;

-- =========================================
-- CÓMO AGREGAR UN CLIENTE NUEVO
-- =========================================
-- 1. Authentication > Users > Add user
-- 2. Copia el UUID del usuario creado
-- 3. Corre:
--
--    insert into public.stores (domain, owner_id, store_name)
--    values ('sneakersjhon.com', 'uuid-copiado-aqui', 'Sneakers Jhon');
--
-- 4. Sube la MISMA carpeta de siempre al hosting de ese dominio.

-- =========================================
-- STORAGE (bucket "product-images")
-- =========================================
-- Storage > New Bucket > "product-images" (público).
-- Storage > product-images > Policies:
--   SELECT  -> target roles: public       -> using: true
--   INSERT  -> target roles: authenticated -> with check: true
