// =========================================
// LOGIN - Autenticación con Supabase Auth
// =========================================

document.addEventListener("DOMContentLoaded", () => {
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
      errorMsg.textContent = "Error: " + error.message;
      return;
    }

    if (data.session) {
      window.location.href = "admin.html";
    }
  });
});

async function checkExistingSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    window.location.href = "admin.html";
  }
}
