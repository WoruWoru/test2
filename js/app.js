// =========================================
// PÁGINA PRINCIPAL - Listado de productos
// Archivo genérico: NO se edita nunca, ni por
// cliente ni al agregar clientes nuevos.
// =========================================

let productsCache = [];

async function loadProducts() {
  const grid = document.getElementById("products-grid");
  grid.innerHTML = '<p class="loading">Cargando productos...</p>';

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("user_id", STORE_OWNER_ID)
    .order("created_at", { ascending: false });

  if (error) {
    grid.innerHTML = `<p class="error">Error al cargar productos: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = '<p class="empty">No hay productos disponibles todavía.</p>';
    return;
  }

  productsCache = data;
  renderProducts(data);
}

function renderProducts(products) {
  const grid = document.getElementById("products-grid");
  grid.innerHTML = "";

  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-image">
        <img src="${escapeHtml(product.image) || "https://via.placeholder.com/300x225?text=Sin+imagen"}" alt="${escapeHtml(product.name)}">
      </div>
      <div class="product-info">
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        <p class="product-price">$${Number(product.price).toFixed(2)}</p>
        <button class="btn btn-primary btn-view" data-id="${product.id}">Ver</button>
      </div>
    `;
    grid.appendChild(card);
  });

  document.querySelectorAll(".btn-view").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      const product = productsCache.find((p) => String(p.id) === String(id));
      if (product) openProductModal(product);
    });
  });
}

function openProductModal(product) {
  document.getElementById("modal-image").src =
    product.image || "https://via.placeholder.com/400x300?text=Sin+imagen";
  document.getElementById("modal-name").textContent = product.name;
  document.getElementById("modal-description").textContent =
    product.description || "Sin descripción disponible.";
  document.getElementById("modal-price").textContent =
    "$" + Number(product.price).toFixed(2);

  document.getElementById("product-modal").classList.remove("hidden");
}

function closeProductModal() {
  document.getElementById("product-modal").classList.add("hidden");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", async () => {
  const ownerId = await resolveStoreOwnerId();
  if (!ownerId) {
    showStoreNotConfiguredError();
    return;
  }

  loadProducts();

  document
    .getElementById("modal-close-btn")
    .addEventListener("click", closeProductModal);

  document.getElementById("product-modal").addEventListener("click", (e) => {
    if (e.target.id === "product-modal") closeProductModal();
  });
});
