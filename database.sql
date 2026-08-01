-- =========================================
-- TIENDA - Script de base de datos
-- Multi-tenant escalable: un solo código para
-- TODOS los clientes. La tienda se identifica
-- automáticamente por el dominio (tabla stores).
-- Ejecutar en: Supabase > SQL Editor
-- =========================================

-- 1. Tabla de productos
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  image text,
  created_at timestamp with time zone default now()
);

alter table public.products enable row level security;

drop policy if exists "Lectura pública de productos" on public.products;
create policy "Lectura pública de productos"
on public.products
for select
using (true);

drop policy if exists "Usuarios autenticados pueden insertar" on public.products;
drop policy if exists "Insertar solo productos propios" on public.products;
create policy "Insertar solo productos propios"
on public.products
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Usuarios autenticados pueden actualizar" on public.products;
drop policy if exists "Actualizar solo productos propios" on public.products;
create policy "Actualizar solo productos propios"
on public.products
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Usuarios autenticados pueden eliminar" on public.products;
drop policy if exists "Eliminar solo productos propios" on public.products;
create policy "Eliminar solo productos propios"
on public.products
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================================
-- 2. Tabla stores: mapeo dominio -> dueño
-- =========================================
-- Esta tabla es la clave de la escalabilidad:
-- el frontend consulta "¿de quién es el dominio
-- donde estoy cargando?" y así sabe qué productos
-- mostrar, SIN que tengas que editar ni un archivo
-- de código por cliente.

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,          -- ej: 'clientea.com' o 'clientea.com.mx'
  owner_id uuid not null references auth.users(id) on delete cascade,
  store_name text,                       -- opcional, para tus propios registros
  created_at timestamp with time zone default now()
);

alter table public.stores enable row level security;

-- Lectura de "stores": NO se expone la tabla completa.
-- Se accede únicamente mediante la función get_store_owner()
-- de más abajo, que solo devuelve la fila del dominio pedido
-- (evita que cualquiera pueda listar todos tus clientes).
drop policy if exists "Lectura pública de stores" on public.stores;
-- (con RLS activo y sin políticas de SELECT, la tabla queda
-- bloqueada por completo a consultas directas)

-- Función segura: dado un dominio, devuelve SOLO esa fila.
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
-- CÓMO AGREGAR UN CLIENTE NUEVO (con esta versión
-- ya NO hace falta tocar ningún archivo de código)
-- =========================================
-- 1. Authentication > Users > Add user
--    (correo + contraseña del cliente)
-- 2. Copia el UUID del usuario creado
-- 3. Corre este INSERT (cambia los valores):
--
--    insert into public.stores (domain, owner_id, store_name)
--    values ('clientea.com', 'uuid-copiado-aqui', 'Tienda Cliente A');
--
-- 4. Sube la MISMA carpeta de siempre al hosting de
--    ese dominio. Ya no editas config.js ni nada.
--
-- Nota sobre "domain": debe ser exactamente igual a
-- window.location.hostname en producción. Si usas
-- www.clientea.com, agrega también esa variante como
-- otra fila (mismo owner_id, otro domain), o redirige
-- www -> raíz (o viceversa) desde tu hosting/DNS.

-- =========================================
-- STORAGE (bucket "products")
-- =========================================
-- Un solo bucket compartido por todos los clientes.
-- Storage > New Bucket > "products" (público).
-- Storage > products > Policies:
--   SELECT  -> target roles: public       -> using: true
--   INSERT  -> target roles: authenticated -> with check: true
-- (usa las plantillas "Enable read access for all users"
-- y "Enable insert for authenticated users only")
