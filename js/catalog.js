/* Render de tarjetas de producto + páginas públicas (home / catálogo) - MULTI-TENANT */

function productCard(p) {
  const img = p.image_url || SJ.PLACEHOLDER;
  return `
    <article class="card">
      <a class="card-media" href="producto.html?id=${encodeURIComponent(p.id)}">
        <img src="${SJ.esc(img)}" alt="${SJ.esc(p.name)}" loading="lazy"
             onerror="this.src='${SJ.PLACEHOLDER}'">
        ${p.featured ? '<span class="badge">Destacado</span>' : ""}
      </a>
      <div class="card-body">
        <h3 class="card-title">${SJ.esc(p.name)}</h3>
        <p class="muted" style="font-size:.88rem">${SJ.esc(p.category || "")}</p>
        <div class="card-foot">
          <span class="price">${SJ.money(p.price)}</span>
          <a class="btn btn-ghost btn-sm" href="producto.html?id=${encodeURIComponent(p.id)}">Ver</a>
        </div>
      </div>
    </article>`;
}

function notConfiguredState() {
  return `<div class="state" style="grid-column:1/-1">
      <h3>Catálogo pendiente de conexión</h3>
      <p>Conecta tu proyecto de Supabase en <code>js/supabase-config.js</code>
         para cargar los productos automáticamente.</p>
    </div>`;
}

/* Resuelve la tienda (por dominio) una sola vez para toda la página */
async function ensureStoreReady() {
  if (!API.ready()) return false;
  const ownerId = await resolveStoreOwnerId();
  if (!ownerId) {
    showStoreNotConfiguredError();
    return false;
  }
  return true;
}

/* ---------------- Home: destacados ---------------- */
async function initHome() {
  const grid = document.getElementById("featured-grid");
  if (!grid) return;
  if (!API.ready()) { grid.innerHTML = notConfiguredState(); return; }

  const okStore = await ensureStoreReady();
  if (!okStore) return;

  SJ.skeletons(grid, 4);
  try {
    let items = await API.listFeatured(4);
    if (!items.length) items = (await API.listProducts({})).slice(0, 4);
    grid.innerHTML = items.length
      ? items.map(productCard).join("")
      : SJ.emptyState("Sin productos", "Aún no hay productos publicados.");
  } catch (e) {
    grid.innerHTML = SJ.emptyState("Error al cargar", e.message);
  }
}

/* ---------------- Catálogo ---------------- */
async function initCatalog() {
  const grid = document.getElementById("catalog-grid");
  if (!grid) return;

  const search = document.getElementById("f-search");
  const category = document.getElementById("f-category");
  const sort = document.getElementById("f-sort");
  const count = document.getElementById("catalog-count");

  if (!API.ready()) { grid.innerHTML = notConfiguredState(); return; }

  const okStore = await ensureStoreReady();
  if (!okStore) return;

  try {
    const cats = await API.listCategories();
    category.innerHTML =
      '<option value="">Todas las categorías</option>' +
      cats.map((c) => `<option value="${SJ.esc(c)}">${SJ.esc(c)}</option>`).join("");
  } catch { /* sin categorías */ }

  async function load() {
    SJ.skeletons(grid, 8);
    try {
      const items = await API.listProducts({
        search: search.value.trim(),
        category: category.value,
        sort: sort.value,
      });
      count.textContent = `${items.length} producto${items.length === 1 ? "" : "s"}`;
      grid.innerHTML = items.length
        ? items.map(productCard).join("")
        : SJ.emptyState("Sin resultados", "Prueba con otros filtros o búsqueda.");
    } catch (e) {
      grid.innerHTML = SJ.emptyState("Error al cargar", e.message);
    }
  }

  let t;
  search.addEventListener("input", () => { clearTimeout(t); t = setTimeout(load, 300); });
  category.addEventListener("change", load);
  sort.addEventListener("change", load);
  load();
}

/* ---------------- Detalle ---------------- */
async function initDetail() {
  const root = document.getElementById("detail-root");
  if (!root) return;

  const id = SJ.qs("id");
  if (!id) { root.innerHTML = SJ.emptyState("Producto no encontrado", "Falta el identificador."); return; }
  if (!API.ready()) { root.innerHTML = notConfiguredState(); return; }

  const okStore = await ensureStoreReady();
  if (!okStore) return;

  root.innerHTML = '<div class="state"><div class="spinner"></div>Cargando producto…</div>';

  let p;
  try { p = await API.getProduct(id); }
  catch (e) { root.innerHTML = SJ.emptyState("Error al cargar", e.message); return; }

  if (!p) { root.innerHTML = SJ.emptyState("Producto no encontrado", "Puede que haya sido eliminado."); return; }

  document.title = `${p.name} — Seoul Snacks`;

  const main = p.image_url || SJ.PLACEHOLDER;

  root.innerHTML = `
    <div class="detail-grid">
      <div>
        <div class="gallery-main">
          <img id="main-img" src="${SJ.esc(main)}" alt="${SJ.esc(p.name)}"
               onerror="this.src='${SJ.PLACEHOLDER}'">
        </div>
      </div>

      <div class="detail">
        <p class="breadcrumb"><a href="index.html">Inicio</a> / <a href="catalogo.html">Catálogo</a> / ${SJ.esc(p.name)}</p>
        <span class="eyebrow">${SJ.esc(p.category || "Snack")}</span>
        <h1>${SJ.esc(p.name)}</h1>
        <div class="price">${SJ.money(p.price)}</div>
        <p class="detail-desc">${SJ.esc(p.description || "Sin descripción disponible.")}</p>

        <a class="btn btn-primary btn-block" id="btn-wsp" href="#" target="_blank" rel="noopener">
          Consultar por WhatsApp
        </a>

        <div class="meta-list">
          <div class="meta-row"><span>Categoría</span><strong>${SJ.esc(p.category || "—")}</strong></div>
          <div class="meta-row"><span>Referencia</span><strong>${SJ.esc(String(p.id).slice(0, 8))}</strong></div>
        </div>
      </div>
    </div>`;

  const wsp = document.getElementById("btn-wsp");
  wsp.href =
    "https://wa.me/?text=" +
    encodeURIComponent(`Hola Seoul Snacks, me interesa: ${p.name} (${SJ.money(p.price)})`);
}

document.addEventListener("DOMContentLoaded", () => {
  initHome();
  initCatalog();
  initDetail();
});
