/* Login de administrador - MULTI-TENANT */

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("login-form");
  if (!form) return;

  const alertBox = document.getElementById("login-alert");
  const configBox = document.getElementById("config-alert");
  const btn = document.getElementById("login-btn");

  if (!API.ready()) {
    configBox.classList.remove("hidden");
    return;
  }

  const ownerId = await resolveStoreOwnerId();
  if (!ownerId) {
    showStoreNotConfiguredError();
    return;
  }

  // Si ya hay sesión activa y es del dueño de esta tienda, ir directo al panel
  const user = await API.getUser();
  if (user) location.replace("admin.html");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertBox.classList.add("hidden");

    btn.disabled = true;
    btn.textContent = "Verificando…";

    try {
      await API.signIn(
        document.getElementById("email").value.trim(),
        document.getElementById("password").value
      );
      location.href = "admin.html";
    } catch (err) {
      alertBox.textContent = "Error: credenciales inválidas";
      alertBox.classList.remove("hidden");
      btn.disabled = false;
      btn.textContent = "Iniciar sesión";
    }
  });
});
