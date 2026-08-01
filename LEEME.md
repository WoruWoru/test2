# Ramen Okashi — puesta en marcha

## Qué se corrigió en este paquete
- `admin.js` y `script.js` ya no llaman a `supabaseClient` directo: ahora usan
  `API.*` (js/api.js), que filtra todo por tienda. Antes, un admin podía ver
  o borrar productos de OTRAS tiendas — eso quedó cerrado.
- Las políticas RLS en `database.sql` ahora exigen `auth.uid() = user_id`
  para insertar/editar/borrar (antes cualquier usuario autenticado podía
  tocar productos de cualquiera).
- Los `<script src="...">` de los `.html` apuntaban a archivos que no
  existían (`js/supabase.js`, `js/login.js`). Ya apuntan a los reales.
- Se agregó la tabla `stores` y la función `get_store_owner` que
  `store-resolver.js` necesita y que no estaban en el `.sql` original.
- `auth.js` redirigía a `admin/index.html` (carpeta que no existe); ahora
  redirige a `admin.html`.

## Pasos en Supabase

1. Ve a **SQL Editor** y ejecuta todo `database.sql`. Esto crea las tablas
   `products` y `stores`, la función `get_store_owner`, y las políticas RLS.

2. Ve a **Storage** → crea un bucket llamado exactamente `product-images`,
   márcalo como público. Luego en **Storage > Policies** agrega:
   - Lectura pública (SELECT, target roles: public, using: true)
   - Subida solo autenticados (INSERT, target roles: authenticated)

3. Ve a **Authentication > Users** → crea un usuario (el admin de tu
   primera tienda), con su email y contraseña.

4. Copia el UUID de ese usuario y ejecuta en el SQL Editor:
   ```sql
   insert into public.stores (domain, owner_id, store_name)
   values ('tu-dominio.com', 'PEGA-AQUI-EL-UUID', 'Ramen Okashi');
   ```
   Usa el dominio real donde vayas a publicar el sitio (o `localhost` si
   estás probando en local).

5. Para agregar una tienda/cliente nueva más adelante: repite los pasos
   3 y 4 con un usuario y dominio distintos. No se toca ningún archivo.

## Imágenes de ejemplo
En `images/products/` dejé las fotos que subiste (candy1, drink1, ramen1,
ramen2, snack1-4). No están conectadas al código — súbelas desde el
panel `/admin.html` al crear cada producto, ahí es donde se guardan en
Supabase Storage y se enlazan a la base de datos.

## Publicar
Sube esta carpeta completa (tal cual) a Netlify, Vercel, GitHub Pages,
o donde prefieras. No hace falta build ni Node — es HTML/CSS/JS plano.
