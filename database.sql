-- =========================================
-- RAMEN OKASHI - Script de base de datos
-- MULTI-TENANT (varias tiendas / clientes)
-- Ejecutar en: Supabase > SQL Editor
-- =========================================

-- =========================================
-- 1. TABLA "products"
-- =========================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  category text not null default 'snack', -- ramen | snack | dulce | bebida
  image text,
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamp with time zone default now()
);

-- Si la tabla ya existía de una versión anterior sin estas columnas:
alter table public.products add column if not exists active boolean not null default true;
alter table public.products add column if not exists featured boolean not null default false;

alter table public.products enable row level security;

-- Limpiar políticas viejas (si existían de una versión anterior single-tenant)
drop policy if exists "Lectura pública de productos" on public.products;
drop policy if exists "Usuarios autenticados pueden insertar" on public.products;
drop policy if exists "Usuarios autenticados pueden actualizar" on public.products;
drop policy if exists "Usuarios autenticados pueden eliminar" on public.products;

-- Lectura pública: solo productos activos, o los propios si eres el dueño
-- (esto permite que el panel admin vea también sus productos inactivos)
create policy "Lectura de productos"
on public.products
for select
using (active = true or auth.uid() = user_id);

-- Insertar: solo puedes crear productos a tu propio nombre
create policy "Insertar productos propios"
on public.products
for insert
to authenticated
with check (auth.uid() = user_id);

-- Actualizar: solo tus propios productos
create policy "Actualizar productos propios"
on public.products
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Eliminar: solo tus propios productos
create policy "Eliminar productos propios"
on public.products
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================================
-- 2. TABLA "stores" (mapea dominio -> dueño)
-- =========================================
create table if not exists public.stores (
  domain text primary key,          -- ej: "tienda-cliente1.com" o "cliente1.vercel.app"
  owner_id uuid not null references auth.users(id) on delete cascade,
  store_name text,
  created_at timestamp with time zone default now()
);

alter table public.stores enable row level security;

-- Lectura pública: cualquiera puede consultar a qué tienda pertenece un dominio
-- (lo necesita store-resolver.js incluso sin sesión iniciada)
drop policy if exists "Lectura pública de stores" on public.stores;
create policy "Lectura pública de stores"
on public.stores
for select
using (true);

-- =========================================
-- 3. FUNCIÓN RPC "get_store_owner"
-- Usada por js/store-resolver.js para resolver
-- el owner_id según window.location.hostname
-- =========================================
create or replace function public.get_store_owner(store_domain text)
returns table (owner_id uuid, store_name text)
language sql
security definer
set search_path = public
as $$
  select owner_id, store_name
  from public.stores
  where domain = store_domain
  limit 1;
$$;

-- =========================================
-- 4. CÓMO AGREGAR UN CLIENTE NUEVO
-- =========================================
-- Paso A: crea el usuario admin de ese cliente en
--         Supabase > Authentication > Users > Add user
--         (o dile a auth.users que se registre)
--
-- Paso B: inserta una fila en "stores" vinculando su
--         dominio con el user_id que acabas de crear:
--
-- insert into public.stores (domain, owner_id, store_name)
-- values ('dominio-del-cliente.com', 'UUID-DEL-USUARIO', 'Nombre de la tienda');
--
-- No se toca ningún archivo de código para agregar clientes.

-- =========================================
-- NOTA SOBRE STORAGE (bucket "product-images")
-- =========================================
-- El bucket de Storage se crea manualmente desde el panel de Supabase
-- (Storage > New Bucket > "product-images", marcado como público).
-- Este nombre debe coincidir con "storageBucket" en js/supabase-config.js.
--
-- Luego, en Storage > Policies, agrega estas políticas para el bucket:
--
-- Lectura pública:
--   operación: SELECT
--   target roles: public
--   using: true
--
-- Subida de archivos (solo autenticados):
--   operación: INSERT
--   target roles: authenticated
--   with check: true
--
-- Estas políticas se pueden crear fácilmente desde la interfaz gráfica
-- de Supabase en Storage > product-images > Policies > New Policy,
-- usando las plantillas "Enable read access for all users" y
-- "Enable insert for authenticated users only".
