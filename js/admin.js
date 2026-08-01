// =========================================
// PANEL DE ADMINISTRACIÓN
// Archivo genérico: NO se edita nunca, ni por
// cliente ni al agregar clientes nuevos.
// =========================================

let currentEditId = null;
let adminProductsCache = [];

// ---------- AUTENTICACIÓN ----------

async function checkAuth() {
  const { data } = await supabaseClient.auth.getSession();

  if (!data.session) {
    window.location.href = "login.html";
    return null;
  }

  // Verifica que quien inició sesión sea el DUEÑO de esta tienda
  // (según el dominio actual, resuelto por store-resolver.js).
  // Evita que el admin del cliente A entre al panel del cliente B.
  if (data.session.user.id !== STORE_OWNER_ID) {
    await supabaseClient.auth.signOut();
    alert("No tienes permiso para administrar esta tienda.");
    window.location.href = "login.html";
    return null;
  }

  return data.session;
}

// ---------- CARGA Y RENDER DE PRODUCTOS ----------

async function loadAdminProducts() {
  const list = document.getElementById("admin-products-list");
  list.innerHTML = '<p class="loading">Cargando productos...</p>';

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("user_id", STORE_OWNER_ID)
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    adminProductsCache = [];
    list.innerHTML = '<p class="empty">No hay productos. Agrega el primero.</p>';
    return;
  }

  adminProductsCache = data;
  renderAdminProducts(data);
}

function renderAdminProducts(products) {
  const list = document.getElementById("admin-products-list");
  list.innerHTML = "";

  products.forEach((product) => {
    const row = document.createElement("div");
    row.className = "admin-product-row";
    row.innerHTML = `
      <img src="${escapeHtml(product.image) || "https://via.placeholder.com/60"}" alt="${escapeHtml(product.name)}" class="admin-product-thumb">
      <div class="admin-product-details">
        <strong>${escapeHtml(product.name)}</strong>
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
      deleteProduct(id);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

// ---------- FORMULARIO: AGREGAR / EDITAR ----------

function fillFormForEdit(product) {
  currentEditId = product.id;
  document.getElementById("product-name").value = product.name;
  document.getElementById("product-description").value = product.description || "";
  document.getElementById("product-price").value = product.price;
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

// ---------- SUBIDA DE IMÁGENES A SUPABASE STORAGE ----------

async function uploadImage(file) {
  const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif"];
  const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

  if (file.size > maxSizeBytes) {
    throw new Error("La imagen no puede pesar más de 5 MB.");
  }

  const rawExt = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!allowedExtensions.includes(rawExt)) {
    throw new Error("Formato de imagen no permitido. Usa JPG, PNG, WEBP o GIF.");
  }

  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${rawExt}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("products")
    .upload(fileName, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabaseClient.storage.from("products").getPublicUrl(fileName);

  return data.publicUrl;
}

// ---------- ELIMINAR PRODUCTO ----------

async function deleteProduct(id) {
  const confirmDelete = confirm("¿Seguro que deseas eliminar este producto?");
  if (!confirmDelete) return;

  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", id)
    .eq("user_id", STORE_OWNER_ID);

  if (error) {
    alert("Error al eliminar: " + error.message);
    return;
  }

  loadAdminProducts();
}

// ---------- INICIALIZACIÓN ----------

document.addEventListener("DOMContentLoaded", async () => {
  const ownerId = await resolveStoreOwnerId();
  if (!ownerId) {
    showStoreNotConfiguredError();
    return;
  }

  const session = await checkAuth();
  if (!session) return;

  // Acceso confirmado: muestra el panel y quita el mensaje de verificación.
  document.body.style.visibility = "visible";
  const checkingScreen = document.getElementById("auth-checking");
  if (checkingScreen) checkingScreen.remove();

  loadAdminProducts();

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
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
    const imageFile = document.getElementById("product-image").files[0];

    try {
      let imageUrl = null;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      if (currentEditId) {
        const updateData = { name, description, price };
        if (imageUrl) updateData.image = imageUrl;

        const { error } = await supabaseClient
          .from("products")
          .update(updateData)
          .eq("id", currentEditId)
          .eq("user_id", STORE_OWNER_ID);

        if (error) throw error;

        formMsg.textContent = "Producto actualizado correctamente.";
        formMsg.className = "success";
      } else {
        if (!imageUrl) {
          throw new Error("Debes seleccionar una imagen para el nuevo producto.");
        }

        const { error } = await supabaseClient
          .from("products")
          .insert([{ name, description, price, image: imageUrl, user_id: STORE_OWNER_ID }]);

        if (error) throw error;

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
