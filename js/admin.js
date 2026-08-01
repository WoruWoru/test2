// =========================================
// PANEL DE ADMINISTRACIÓN — MULTI-TENANT
// Usa API.* (js/api.js), que ya filtra todo
// por window.STORE_OWNER_ID. Nunca llama a
// supabaseClient directamente.
// =========================================

let currentEditId = null;
let adminProductsCache = [];

const CATEGORY_LABELS = {
  ramen: "Ramen",
  snack: "Snacks",
  dulce: "Dulces",
  bebida: "Bebidas",
};

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

// ---------- CARGA Y RENDER DE PRODUCTOS ----------

async function loadAdminProducts() {
  const list = document.getElementById("admin-products-list");
  list.innerHTML = '<p class="loading">Cargando productos...</p>';

  try {
    const data = await API.listAllProducts();

    if (!data || data.length === 0) {
      adminProductsCache = [];
      list.innerHTML = '<p class="empty">No hay productos. Agrega el primero.</p>';
      return;
    }

    adminProductsCache = data;
    renderAdminProducts(data);
  } catch (error) {
    list.innerHTML = `<p class="error">Error: ${escapeHtml(error.message)}</p>`;
  }
}

function renderAdminProducts(products) {
  const list = document.getElementById("admin-products-list");
  list.innerHTML = "";

  products.forEach((product) => {
    const row = document.createElement("div");
    row.className = "admin-product-row";
    row.innerHTML = `
      <img src="${product.image || "https://via.placeholder.com/60"}" alt="${escapeHtml(product.name)}" class="admin-product-thumb">
      <div class="admin-product-details">
        <strong>${escapeHtml(product.name)}</strong>
        <span class="admin-product-cat">${escapeHtml(CATEGORY_LABELS[product.category] || product.category)}</span>
        <span>$${Number(product.price).toFixed(2)}</span>
      </div>
      <div class="admin-product-actions">
        <button class="btn btn-secondary btn-edit" data-id="${product.id}">Editar</button>
        <button class="btn btn-danger btn-delete" data-id="${product.id}">Eliminar</button>
      </div>
    `;
    list.appendChild(row);
  });

  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      const product = adminProductsCache.find((p) => String(p.id) === String(id));
      if (product) fillFormForEdit(product);
    });
  });

  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      deleteProductRow(id);
    });
  });
}

// ---------- FORMULARIO: AGREGAR / EDITAR ----------

function fillFormForEdit(product) {
  currentEditId = product.id;
  document.getElementById("product-name").value = product.name;
  document.getElementById("product-description").value = product.description || "";
  document.getElementById("product-price").value = product.price;
  document.getElementById("product-category").value = product.category || "snack";
  document.getElementById("product-image").value = "";

  document.getElementById("form-title").textContent = "Editar producto";
  document.getElementById("submit-product-btn").textContent = "Guardar cambios";
  document.getElementById("cancel-edit-btn").style.display = "inline-block";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  currentEditId = null;
  document.getElementById("product-form").reset();
  document.getElementById("form-title").textContent = "Agregar producto";
  document.getElementById("submit-product-btn").textContent = "Agregar producto";
  document.getElementById("cancel-edit-btn").style.display = "none";
  document.getElementById("form-message").textContent = "";
}

// ---------- ELIMINAR PRODUCTO ----------

async function deleteProductRow(id) {
  const confirmDelete = confirm("¿Seguro que deseas eliminar este producto?");
  if (!confirmDelete) return;

  try {
    await API.deleteProduct(id);
    loadAdminProducts();
  } catch (error) {
    alert("Error al eliminar: " + error.message);
  }
}

// ---------- INICIALIZACIÓN ----------

document.addEventListener("DOMContentLoaded", async () => {
  if (!API.ready()) {
    document.getElementById("admin-products-list").innerHTML =
      '<p class="error">Supabase no está configurado todavía.</p>';
    return;
  }

  // Primero resolvemos a qué tienda pertenece este dominio...
  const ownerId = await resolveStoreOwnerId();
  if (!ownerId) {
    showStoreNotConfiguredError();
    return;
  }

  // ...y luego confirmamos que haya sesión activa del dueño de ESTA tienda.
  const user = await API.requireAuth("login.html");
  if (!user) return;

  loadAdminProducts();

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await API.signOut();
    window.location.href = "login.html";
  });

  const form = document.getElementById("product-form");
  const formMsg = document.getElementById("form-message");

  document.getElementById("cancel-edit-btn").addEventListener("click", resetForm);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formMsg.textContent = "";
    formMsg.className = "";

    const submitBtn = document.getElementById("submit-product-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando...";

    const name = document.getElementById("product-name").value.trim();
    const description = document.getElementById("product-description").value.trim();
    const price = parseFloat(document.getElementById("product-price").value);
    const category = document.getElementById("product-category").value;
    const imageFile = document.getElementById("product-image").files[0];

    try {
      let imageUrl = null;

      if (imageFile) {
        imageUrl = await API.uploadImage(imageFile);
      }

      if (currentEditId) {
        const updateData = { name, description, price, category };
        if (imageUrl) updateData.image = imageUrl;

        await API.updateProduct(currentEditId, updateData);

        formMsg.textContent = "Producto actualizado correctamente.";
        formMsg.className = "success";
      } else {
        if (!imageUrl) {
          throw new Error("Debes seleccionar una imagen para el nuevo producto.");
        }

        await API.createProduct({
          name,
          description,
          price,
          category,
          image: imageUrl,
          active: true,
        });

        formMsg.textContent = "Producto agregado correctamente.";
        formMsg.className = "success";
      }

      resetForm();
      loadAdminProducts();
    } catch (err) {
      formMsg.textContent = "Error: " + err.message;
      formMsg.className = "error";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = currentEditId ? "Guardar cambios" : "Agregar producto";
    }
  });
});
