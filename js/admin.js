/* Panel de administración: CRUD de productos - MULTI-TENANT */

document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.getElementById("products-tbody");
  if (!tbody) return;

  const modal = document.getElementById("product-modal");
  const form = document.getElementById("product-form");
  const formAlert = document.getElementById("form-alert");
  const searchInput = document.getElementById("a-search");
  const statusSelect = document.getElementById("a-status");

  let items = [];

  /* ---------- Tienda + sesión ---------- */
  if (!API.ready()) {
    document.getElementById("config-alert").classList.remove("hidden");
    tbody.innerHTML = row(`<div class="state"><h3>Sin conexión</h3>
      <p>Conecta Supabase para ver y gestionar los productos.</p></div>`);
    return;
  }

  const ownerId = await resolveStoreOwnerId();
  if (!ownerId) {
    showStoreNotConfiguredError();
    return;
  }

  const user = await API.requireAuth("../login.html");
  if (!user) return;
  document.getElementById("admin-user").textContent = user.email;
  await load();

  function row(html) { return `<tr><td colspan="7">${html}</td></tr>`; }

  /* ---------- Carga y render ---------- */
  async function load() {
    tbody.innerHTML = row('<div class="state"><div class="spinner"></div>Cargando…</div>');
    try {
      items = await API.listAllProducts();
      render();
    } catch (e) {
      tbody.innerHTML = row(`<div class="state"><h3>Error</h3><p>${SJ.esc(e.message)}</p></div>`);
    }
  }

  function render() {
    const term = searchInput.value.trim().toLowerCase();
    const status = statusSelect.value;

    const filtered = items.filter((p) => {
      const matches =
        !term ||
        (p.name || "").toLowerCase().includes(term) ||
        (p.brand || "").toLowerCase().includes(term);
      const st =
        !status ||
        (status === "active" && p.active !== false) ||
        (status === "inactive" && p.active === false);
      return matches && st;
    });

    document.getElementById("stat-total").textContent = items.length;
    document.getElementById("stat-active").textContent = items.filter((p) => p.active !== false).length;
    document.getElementById("stat-featured").textContent = items.filter((p) => p.featured).length;
    document.getElementById("stat-stock").textContent = items.reduce((a, p) => a + Number(p.stock || 0), 0);

    if (!filtered.length) {
      tbody.innerHTML = row(`<div class="state"><h3>Sin productos</h3>
        <p>Crea tu primer producto con el botón “Nuevo producto”.</p></div>`);
      return;
    }

    tbody.innerHTML = filtered
      .map(
        (p) => `<tr>
          <td><img class="thumb-cell" src="${SJ.esc(p.image_url || SJ.PLACEHOLDER)}"
                   alt="" onerror="this.src='${SJ.PLACEHOLDER}'"></td>
          <td><strong>${SJ.esc(p.name)}</strong><br><span class="muted" style="font-size:.85rem">${SJ.esc(p.brand || "—")}</span></td>
          <td>${SJ.esc(p.category || "—")}</td>
          <td>${SJ.money(p.price)}</td>
          <td>${Number(p.stock || 0)}</td>
          <td>${p.active === false ? '<span class="badge gray">Inactivo</span>' : '<span class="badge">Activo</span>'}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-dark btn-sm" data-edit="${SJ.esc(p.id)}">Editar</button>
              <button class="btn btn-danger btn-sm" data-del="${SJ.esc(p.id)}">Eliminar</button>
            </div>
          </td>
        </tr>`
      )
      .join("");
  }

  /* ---------- Modal ---------- */
  function openModal(product) {
    formAlert.classList.add("hidden");
    form.reset();
    document.getElementById("modal-title").textContent = product ? "Editar producto" : "Nuevo producto";
    document.getElementById("p-id").value = product?.id ?? "";
    document.getElementById("p-name").value = product?.name ?? "";
    document.getElementById("p-brand").value = product?.brand ?? "";
    document.getElementById("p-category").value = product?.category ?? "";
    document.getElementById("p-price").value = product?.price ?? "";
    document.getElementById("p-stock").value = product?.stock ?? 0;
    document.getElementById("p-sizes").value = Array.isArray(product?.sizes)
      ? product.sizes.join(", ")
      : product?.sizes ?? "";
    document.getElementById("p-image").value = product?.image_url ?? "";
    document.getElementById("p-description").value = product?.description ?? "";
    document.getElementById("p-active").checked = product ? product.active !== false : true;
    document.getElementById("p-featured").checked = Boolean(product?.featured);
    modal.classList.remove("hidden");
  }

  function closeModal() { modal.classList.add("hidden"); }

  document.getElementById("btn-new").addEventListener("click", () => {
    if (!API.ready()) return SJ.toast("Conecta Supabase primero.");
    openModal(null);
  });
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  /* ---------- Guardar ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formAlert.classList.add("hidden");
    const saveBtn = document.getElementById("modal-save");
    saveBtn.disabled = true;
    saveBtn.textContent = "Guardando…";

    try {
      let imageUrl = document.getElementById("p-image").value.trim();
      const file = document.getElementById("p-file").files[0];
      if (file) imageUrl = await API.uploadImage(file);

      const sizes = document.getElementById("p-sizes").value
        .split(",").map((s) => s.trim()).filter(Boolean);

      const payload = {
        name: document.getElementById("p-name").value.trim(),
        brand: document.getElementById("p-brand").value.trim() || null,
        category: document.getElementById("p-category").value.trim() || null,
        price: Number(document.getElementById("p-price").value || 0),
        stock: Number(document.getElementById("p-stock").value || 0),
        sizes,
        description: document.getElementById("p-description").value.trim() || null,
        image_url: imageUrl || null,
        active: document.getElementById("p-active").checked,
        featured: document.getElementById("p-featured").checked,
      };

      const id = document.getElementById("p-id").value;
      if (id) await API.updateProduct(id, payload);
      else await API.createProduct(payload);

      closeModal();
      SJ.toast(id ? "Producto actualizado" : "Producto creado", "ok");
      await load();
    } catch (err) {
      formAlert.textContent = err.message || "No se pudo guardar el producto.";
      formAlert.classList.remove("hidden");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Guardar";
    }
  });

  /* ---------- Editar / eliminar ---------- */
  tbody.addEventListener("click", async (e) => {
    const editId = e.target.dataset?.edit;
    const delId = e.target.dataset?.del;

    if (editId) {
      openModal(items.find((p) => String(p.id) === String(editId)));
    }

    if (delId) {
      const product = items.find((p) => String(p.id) === String(delId));
      if (!confirm(`¿Eliminar “${product?.name}”? Esta acción no se puede deshacer.`)) return;
      try {
        await API.deleteProduct(delId);
        SJ.toast("Producto eliminado", "ok");
        await load();
      } catch (err) {
        SJ.toast(err.message || "No se pudo eliminar");
      }
    }
  });

  /* ---------- Filtros y sesión ---------- */
  let t;
  searchInput.addEventListener("input", () => { clearTimeout(t); t = setTimeout(render, 200); });
  statusSelect.addEventListener("change", render);
  document.getElementById("btn-reload").addEventListener("click", load);

  async function logout(e) {
    e.preventDefault();
    await API.signOut();
    location.href = "../login.html";
  }
  document.getElementById("logout-top").addEventListener("click", logout);
  document.getElementById("logout-side").addEventListener("click", logout);
});
