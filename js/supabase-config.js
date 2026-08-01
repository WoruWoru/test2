/* ==========================================================
   Configuración de Supabase
   ----------------------------------------------------------
   1. Crea tu proyecto en https://supabase.com
   2. Copia la URL y la clave pública (anon / publishable)
   3. Pégalas abajo. NO pongas aquí la service_role key.
   ========================================================== */

window.SUPABASE_CONFIG = {
  url: "https://wrihvbryodnyxxotbnol.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyaWh2YnJ5b2RueXh4b3Ribm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNjM1MDEsImV4cCI6MjEwMDgzOTUwMX0.CYaPu0_KT8-_MrsB6cpOe2mnQOY3EbrFtZzFCj5ocQo",

  // Nombres de recursos esperados en Supabase
  productsTable: "products",
  storageBucket: "product-images",
};

/* Cliente global de Supabase (null si aún no está configurado) */
window.supabaseClient = (function () {
  const c = window.SUPABASE_CONFIG;
  const configured =
    c.url && c.anonKey && !c.url.startsWith("TU_") && !c.anonKey.startsWith("TU_");

  window.SUPABASE_READY = Boolean(configured && window.supabase);

  if (!window.SUPABASE_READY) {
    console.warn(
      "[Ramen Okashi] Supabase no está configurado todavía. " +
        "Edita js/supabase-config.js con tu URL y anon key."
    );
    return null;
  }
  return window.supabase.createClient(c.url, c.anonKey);
})();
