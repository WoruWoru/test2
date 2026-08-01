/* ==========================================================
   Utilidades generales de UI
   ========================================================== */

const SJ = (function () {
  const PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450">
        <rect width="100%" height="100%" fill="#14171e"/>
        <text x="50%" y="50%" fill="#3a4150" font-family="sans-serif"
          font-size="26" text-anchor="middle">SNEAKERS JHON</text>
      </svg>`
    );

  function money(value, currency = "USD") {
    const n = Number(value || 0);
    try {
      return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return "$" + n.toFixed(2);
    }
  }

  function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function toast(message, type = "info") {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const el = document.createElement("div");
    el.className = "toast" + (type === "ok" ? " ok" : "");
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }

  function skeletons(container, count = 8) {
    container.innerHTML = Array.from({ length: count })
      .map(
        () => `<div class="skeleton-card">
            <div class="sk-media skeleton"></div>
            <div class="sk-line skeleton short"></div>
            <div class="sk-line skeleton"></div>
          </div>`
      )
      .join("");
  }

  function emptyState(title, text) {
    return `<div class="state" style="grid-column:1/-1">
        <h3>${esc(title)}</h3><p>${esc(text)}</p>
      </div>`;
  }

  function initNav() {
    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", () => links.classList.toggle("open"));
    }
    const path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a[href]").forEach((a) => {
      if (a.getAttribute("href") === path) a.classList.add("active");
    });
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", initNav);

  return { PLACEHOLDER, money, esc, qs, toast, skeletons, emptyState };
})();
