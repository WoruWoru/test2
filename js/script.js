// =========================================
// RAMEN OKASHI — Catálogo conectado a Supabase (MULTI-TENANT)
// Misma lógica de carrito, filtros y búsqueda
// del diseño original, solo que los productos
// ahora vienen de la base de datos, filtrados
// por la tienda del dominio actual.
// =========================================

// ========= STATE =========
let PRODUCTS = [];
let activeCat = "all";
let query = "";
const cart = new Map(); // id -> { product, qty }

// ========= ELEMENTS =========
const grid = document.getElementById("productGrid");
const emptyMsg = document.getElementById("emptyMsg");
const searchInput = document.getElementById("searchInput");
const filters = document.querySelectorAll(".filter");
const cartBtn = document.getElementById("cartBtn");
const cartDrawer = document.getElementById("cartDrawer");
const closeCart = document.getElementById("closeCart");
const overlay = document.getElementById("overlay");
const cartItemsEl = document.getElementById("cartItems");
const cartCountEl = document.getElementById("cartCount");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");

// ========= INIT (resuelve tienda antes de cargar productos) =========
async function init() {
  if (!API.ready()) {
    grid.innerHTML = '<p class="empty">Supabase no está configurado todavía.</p>';
    return;
  }

  const ownerId = await resolveStoreOwnerId();
  if (!ownerId) {
    showStoreNotConfiguredError();
    return;
  }

  await loadProducts();
  renderCart();
}

// ========= CARGA DE PRODUCTOS (filtrados por tienda) =========
async function loadProducts() {
  grid.innerHTML = '<p class="loading">Cargando productos...</p>';

  try {
    const data = await API.listProducts({ sort: "recent" });

    PRODUCTS = (data || []).map(p => ({
      id: p.id,
      name: p.name,
      cat: p.category,
      img: p.image || "https://via.placeholder.com/400x400?text=Sin+imagen",
      desc: p.description || "",
      price: Number(p.price) || 0,
    }));

    renderProducts();
  } catch (error) {
    grid.innerHTML = `<p class="empty">Error al cargar productos: ${escapeHtml(error.message)}</p>`;
  }
}

// ========= RENDER PRODUCTS =========
function renderProducts() {
  const q = query.trim().toLowerCase();
  const list = PRODUCTS.filter(p => {
    const matchCat = activeCat === "all" || p.cat === activeCat;
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  grid.innerHTML = list.map(p => `
    <article class="card">
      <div class="card-img"><img src="${p.img}" alt="${escapeHtml(p.name)}" loading="lazy" /></div>
      <div class="card-body">
        <span class="card-tag">${escapeHtml(p.cat)}</span>
        <h3 class="card-title">${escapeHtml(p.name)}</h3>
        <p class="card-desc">${escapeHtml(p.desc)}</p>
        <p class="card-price">$${p.price.toFixed(2)}</p>
        <button class="add-btn" data-id="${p.id}">Agregar al carrito</button>
      </div>
    </article>
  `).join("");

  emptyMsg.hidden = list.length > 0 || PRODUCTS.length === 0;
  if (PRODUCTS.length === 0) {
    emptyMsg.hidden = false;
    emptyMsg.textContent = "Todavía no hay productos disponibles.";
  } else {
    emptyMsg.textContent = "No se encontraron productos.";
  }

  grid.querySelectorAll(".add-btn").forEach(btn => {
    btn.addEventListener("click", () => addToCart(btn.dataset.id));
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

// ========= CART =========
function addToCart(id) {
  const product = PRODUCTS.find(p => String(p.id) === String(id));
  if (!product) return;
  if (cart.has(id)) cart.get(id).qty += 1;
  else cart.set(id, { product, qty: 1 });
  renderCart();
  openCart();
}

function changeQty(id, delta) {
  const item = cart.get(id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart.delete(id);
  renderCart();
}

function removeItem(id) {
  cart.delete(id);
  renderCart();
}

function renderCart() {
  if (cart.size === 0) {
    cartItemsEl.innerHTML = `<p style="color:var(--muted);text-align:center;padding:30px 0">Tu carrito está vacío 🛒</p>`;
  } else {
    cartItemsEl.innerHTML = [...cart.values()].map(({ product, qty }) => `
      <div class="cart-item">
        <img src="${product.img}" alt="${escapeHtml(product.name)}" />
        <div class="cart-item-info">
          <h4>${escapeHtml(product.name)}</h4>
          <p>${escapeHtml(product.cat)} · $${product.price.toFixed(2)}</p>
          <div class="qty-ctrl">
            <button data-act="dec" data-id="${product.id}">−</button>
            <span class="qty-val">${qty}</span>
            <button data-act="inc" data-id="${product.id}">+</button>
          </div>
        </div>
        <button class="remove-btn" data-act="rm" data-id="${product.id}" aria-label="Eliminar">🗑</button>
      </div>
    `).join("");

    cartItemsEl.querySelectorAll("button[data-act]").forEach(btn => {
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      btn.addEventListener("click", () => {
        if (act === "inc") changeQty(id, 1);
        else if (act === "dec") changeQty(id, -1);
        else if (act === "rm") removeItem(id);
      });
    });
  }
  const total = [...cart.values()].reduce((s, i) => s + i.qty, 0);
  cartCountEl.textContent = total;
  cartTotalEl.textContent = total;
}

// ========= DRAWER =========
function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
}
function closeCartDrawer() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
}

cartBtn.addEventListener("click", openCart);
closeCart.addEventListener("click", closeCartDrawer);
overlay.addEventListener("click", closeCartDrawer);

checkoutBtn.addEventListener("click", () => {
  if (cart.size === 0) { alert("Tu carrito está vacío."); return; }
  const lines = [...cart.values()].map(i => `• ${i.product.name} × ${i.qty}`).join("\n");
  alert(`¡Gracias por tu pedido! 🎉\n\n${lines}\n\nTe contactaremos por WhatsApp para confirmar.`);
  cart.clear(); renderCart(); closeCartDrawer();
});

// ========= FILTERS + SEARCH =========
filters.forEach(f => {
  f.addEventListener("click", () => {
    filters.forEach(b => b.classList.remove("active"));
    f.classList.add("active");
    activeCat = f.dataset.cat;
    renderProducts();
  });
});

searchInput.addEventListener("input", e => {
  query = e.target.value;
  renderProducts();
});

// ========= INIT =========
init();
