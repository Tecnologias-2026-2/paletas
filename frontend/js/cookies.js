(function () {
  // ---- Funciones de cookies ----
  function setCookie(nombre, valor, dias) {
    const f = new Date();
    f.setTime(f.getTime() + dias * 24 * 60 * 60 * 1000);
    document.cookie = `${nombre}=${encodeURIComponent(valor)}; expires=${f.toUTCString()}; path=/; SameSite=Lax`;
  }

  function getCookie(nombre) {
    const par = document.cookie.split("; ").find(c => c.startsWith(nombre + "="));
    return par ? decodeURIComponent(par.split("=")[1]) : null;
  }

  // Si ya eligió, no mostrar el banner
  if (getCookie("cookiesPaletas")) return;

  // ---- Banner ----
  const banner = document.createElement("div");
  banner.innerHTML = `
    <p style="margin:0 0 .5rem;">🍦 Usamos cookies para mejorar tu experiencia en Paletas de Hielo.</p>
    <button id="cookie-aceptar">Aceptar</button>
    <button id="cookie-rechazar">Rechazar</button>
  `;
  banner.style.cssText = `
    position:fixed; bottom:0; left:0; width:100%; box-sizing:border-box;
    background:#222; color:#fff; padding:1rem; text-align:center;
    font-family:sans-serif; z-index:9999;
  `;
  document.body.appendChild(banner);

  banner.querySelectorAll("button").forEach(b => {
    b.style.cssText = "margin:0 .3rem; padding:.5rem 1rem; border:none; border-radius:6px; cursor:pointer;";
  });

  document.getElementById("cookie-aceptar").onclick = function () {
    setCookie("cookiesPaletas", "aceptadas", 365);
    banner.remove();
  };
  document.getElementById("cookie-rechazar").onclick = function () {
    setCookie("cookiesPaletas", "rechazadas", 365);
    banner.remove();
  };
})();