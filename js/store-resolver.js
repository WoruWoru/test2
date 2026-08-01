// =========================================
// STORE RESOLVER
// Archivo genérico: NUNCA se edita, ni por cliente
// ni al agregar clientes nuevos.
//
// Detecta automáticamente de qué tienda se trata
// consultando la tabla "stores" en Supabase usando
// el dominio actual (window.location.hostname).
//
// Para agregar un cliente nuevo: solo se agrega una
// fila en la tabla "stores" (domain + owner_id).
// No se toca ningún archivo.
// =========================================

window.STORE_OWNER_ID = null;
window.STORE_INFO = null;

async function resolveStoreOwnerId() {
  if (window.STORE_OWNER_ID) return window.STORE_OWNER_ID;

  if (!window.SUPABASE_READY) {
    console.warn("Supabase no está configurado, no se puede resolver la tienda.");
    return null;
  }

  const hostname = window.location.hostname;

  const { data, error } = await window.supabaseClient
    .rpc("get_store_owner", { store_domain: hostname })
    .single();

  if (error || !data) {
    console.error("No se encontró configuración de tienda para el dominio:", hostname, error);
    return null;
  }

  window.STORE_OWNER_ID = data.owner_id;
  window.STORE_INFO = data;
  return window.STORE_OWNER_ID;
}

function showStoreNotConfiguredError() {
  document.body.style.visibility = "visible";
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;font-family:sans-serif;text-align:center;background:#0b0d12;color:#f2f2f2;">
      <div>
        <h1 style="margin-bottom:10px;">Tienda no configurada</h1>
        <p style="color:#9aa0ab;">Este dominio no está vinculado a ninguna tienda todavía.</p>
      </div>
    </div>
  `;
}
