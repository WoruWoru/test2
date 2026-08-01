// =========================================
// LOGIN - Autenticación con Supabase Auth
// Archivo genérico: NO se edita nunca.
// =========================================

document.addEventListener("DOMContentLoaded", async () => {
  await resolveStoreOwnerId();

  checkExistingSession();

  const loginForm = document.getElementById("login-form");
  const errorMsg = document.getElementById("login-error");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Iniciando sesión...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    submitBtn.disabled = false;
    submitBtn.textContent = "Iniciar sesión";

    if (error) {
      errorMsg.textContent = "Error: Invalid login credentials";
      return;
    }

    // Las credenciales son válidas en Supabase, pero puede que
    // ese usuario no sea el dueño de ESTA tienda (dominio actual).
    // En ese caso mostramos el mismo mensaje genérico, para no
    // revelar que la cuenta existe pero pertenece a otra tienda.
    if (!STORE_OWNER_ID || data.session.user.id !== STORE_OWNER_ID) {
      await supabaseClient.auth.signOut();
      errorMsg.textContent = "Error: Invalid login credentials";
      return;
    }

    if (data.session) {
      window.location.href = "admin.html";
    }
  });
});

async function checkExistingSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session && STORE_OWNER_ID && data.session.user.id === STORE_OWNER_ID) {
    window.location.href = "admin.html";
  }
}
