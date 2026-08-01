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

let STORE_OWNER_ID = null;
let STORE_INFO = null;

async function resolveStoreOwnerId() {
  if (STORE_OWNER_ID) return STORE_OWNER_ID;

  const hostname = window.location.hostname;

  const { data, error } = await supabaseClient
    .rpc("get_store_owner", { store_domain: hostname })
    .single();

  if (error || !data) {
    console.error("No se encontró configuración de tienda para el dominio:", hostname, error);
    return null;
  }

  STORE_OWNER_ID = data.owner_id;
  STORE_INFO = data;
  return STORE_OWNER_ID;
}

function showStoreNotConfiguredError() {
  document.body.style.visibility = "visible";
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;font-family:sans-serif;text-align:center;">
      <div>
        <h1 style="margin-bottom:10px;">Tienda no configurada</h1>
        <p style="color:#6b6b6b;">Este dominio no está vinculado a ninguna tienda todavía.</p>
      </div>
    </div>
  `;
}
