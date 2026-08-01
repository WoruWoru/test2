/* ==========================================================
   Capa de acceso a datos (Supabase) - MULTI-TENANT
   ----------------------------------------------------------
   Todas las consultas se filtran por window.STORE_OWNER_ID,
   que resuelve store-resolver.js según el dominio actual.
   Por eso SIEMPRE hay que llamar a resolveStoreOwnerId()
   antes de usar cualquier función de este archivo.
   ========================================================== */

const API = (function () {
  const cfg = window.SUPABASE_CONFIG;
  const db = () => window.supabaseClient;
  const ready = () => Boolean(window.SUPABASE_READY && db());

  class NotConfigured extends Error {
    constructor() {
      super("Supabase aún no está conectado. Configura js/supabase-config.js.");
      this.name = "NotConfigured";
    }
  }

  class StoreNotResolved extends Error {
    constructor() {
      super("No se ha resuelto la tienda para este dominio todavía.");
      this.name = "StoreNotResolved";
    }
  }

  function ensure() {
    if (!ready()) throw new NotConfigured();
  }

  function ensureStore() {
    ensure();
    if (!window.STORE_OWNER_ID) throw new StoreNotResolved();
  }

  /* ---------------- Productos (público) ---------------- */

  async function listProducts({ search = "", category = "", sort = "recent" } = {}) {
    ensureStore();
    let q = db()
      .from(cfg.productsTable)
      .select("*")
      .eq("active", true)
      .eq("user_id", window.STORE_OWNER_ID);

    if (search) q = q.ilike("name", `%${search}%`);
    if (category) q = q.eq("category", category);

    if (sort === "price_asc") q = q.order("price", { ascending: true });
    else if (sort === "price_desc") q = q.order("price", { ascending: false });
    else if (sort === "name") q = q.order("name", { ascending: true });
    else q = q.order("created_at", { ascending: false });

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function listFeatured(limit = 4) {
    ensureStore();
    const { data, error } = await db()
      .from(cfg.productsTable)
      .select("*")
      .eq("active", true)
      .eq("featured", true)
      .eq("user_id", window.STORE_OWNER_ID)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async function getProduct(id) {
    ensureStore();
    const { data, error } = await db()
      .from(cfg.productsTable)
      .select("*")
      .eq("id", id)
      .eq("user_id", window.STORE_OWNER_ID)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function listCategories() {
    ensureStore();
    const { data, error } = await db()
      .from(cfg.productsTable)
      .select("category")
      .eq("active", true)
      .eq("user_id", window.STORE_OWNER_ID);
    if (error) throw error;
    return [...new Set((data || []).map((r) => r.category).filter(Boolean))].sort();
  }

  /* ---------------- Productos (admin) ---------------- */

  async function listAllProducts() {
    ensureStore();
    const { data, error } = await db()
      .from(cfg.productsTable)
      .select("*")
      .eq("user_id", window.STORE_OWNER_ID)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function createProduct(payload) {
    ensureStore();
    const { data, error } = await db()
      .from(cfg.productsTable)
      .insert({ ...payload, user_id: window.STORE_OWNER_ID })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function updateProduct(id, payload) {
    ensureStore();
    const { data, error } = await db()
      .from(cfg.productsTable)
      .update(payload)
      .eq("id", id)
      .eq("user_id", window.STORE_OWNER_ID)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteProduct(id) {
    ensureStore();
    const { error } = await db()
      .from(cfg.productsTable)
      .delete()
      .eq("id", id)
      .eq("user_id", window.STORE_OWNER_ID);
    if (error) throw error;
    return true;
  }

  /* ---------------- Storage (imágenes) ---------------- */

  async function uploadImage(file) {
    ensure();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await db()
      .storage.from(cfg.storageBucket)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = db().storage.from(cfg.storageBucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /* ---------------- Autenticación ---------------- */

  async function signIn(email, password) {
    ensureStore();
    const { data, error } = await db().auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Las credenciales son válidas en Supabase, pero puede que
    // ese usuario no sea el dueño de ESTA tienda (dominio actual).
    if (data.session.user.id !== window.STORE_OWNER_ID) {
      await db().auth.signOut();
      throw new Error("Invalid login credentials");
    }

    return data;
  }

  async function signOut() {
    if (!ready()) return;
    await db().auth.signOut();
  }

  async function getUser() {
    if (!ready()) return null;
    const { data } = await db().auth.getUser();
    const user = data?.user || null;
    // Doble chequeo: si hay sesión pero es de otra tienda, no es válida aquí.
    if (user && window.STORE_OWNER_ID && user.id !== window.STORE_OWNER_ID) {
      await db().auth.signOut();
      return null;
    }
    return user;
  }

  /** Redirige a login si no hay sesión activa (o es de otra tienda). */
  async function requireAuth(redirect = "login.html") {
    if (!ready()) return null;
    const user = await getUser();
    if (!user) {
      location.replace(redirect);
      return null;
    }
    return user;
  }

  return {
    ready, NotConfigured, StoreNotResolved,
    listProducts, listFeatured, getProduct, listCategories,
    listAllProducts, createProduct, updateProduct, deleteProduct,
    uploadImage, signIn, signOut, getUser, requireAuth,
  };
})();
