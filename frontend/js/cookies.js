(function () {
  const NOMBRE = "cookiesPaletas";
  const DIAS = 30;
  // Limita las cookies a tu carpeta en GitHub Pages (en local usa "/")
  const RUTA = location.pathname.startsWith("/paletas/") ? "/paletas/" : "/";

  // Secciones que se recuerdan: [lo que estaba haciendo, texto del enlace]
  const SECCIONES = {
    "mi-carrito.html":    ["Dejaste una compra pendiente.", "¿Continuar con tu compra?"],
    "detalles-pago.html": ["Dejaste un pago sin terminar.", "¿Continuar con tu compra?"],
    "eventos.html":       ["Estabas viendo nuestros eventos.", "Volver a eventos"],
    "paletas.html":       ["Estabas explorando nuestras paletas.", "Seguir viendo paletas"],
    "contactanos.html":   ["Estabas en la sección de contacto.", "Volver a contáctanos"]
  };

  // ---- Funciones de cookies ----
  function setCookie(nombre, valor, dias) {
    const f = new Date();
    f.setTime(f.getTime() + dias * 24 * 60 * 60 * 1000);
    document.cookie = `${nombre}=${encodeURIComponent(valor)}; expires=${f.toUTCString()}; path=${RUTA}; SameSite=Lax`;
  }
  function getCookie(nombre) {
    const par = document.cookie.split("; ").find(c => c.startsWith(nombre + "="));
    return par ? decodeURIComponent(par.split("=")[1]) : null;
  }
  function deleteCookie(nombre) {
    document.cookie = `${nombre}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${RUTA}`;
  }

  function archivoActual() {
    return location.pathname.split("/").pop() || "index.html";
  }

  // ---- Experiencia para usuarios que aceptaron ----
  function experienciaUsuario() {
    setCookie(NOMBRE, "aceptadas", DIAS); // renueva el consentimiento

    const actual = archivoActual();
    const yaNosConocia = getCookie("clienteFrecuente");
    const anterior = getCookie("ultimaSeccion"); // se lee antes de actualizarla

    // Solo se recuerdan las secciones de la lista (7 días)
    if (SECCIONES[actual]) setCookie("ultimaSeccion", actual, 7);
    setCookie("clienteFrecuente", "si", DIAS);

    // Saludo solo para quien ya había visitado antes, una vez por sesión
    if (yaNosConocia && !sessionStorage.getItem("saludoMostrado")) {
      sessionStorage.setItem("saludoMostrado", "1");
      mostrarSaludo(anterior && anterior !== actual ? anterior : null);
    }
  }

  // Llamar cuando el pedido se confirme: window.finalizarCompra()
  window.finalizarCompra = function () {
    const s = getCookie("ultimaSeccion");
    if (s === "mi-carrito.html" || s === "detalles-pago.html") deleteCookie("ultimaSeccion");
  };

  function mostrarSaludo(seccion) {
    const aviso = document.createElement("div");
    let html = "¡Qué bueno verte de nuevo!";

    // Solo se aceptan nombres de la lista (evita enlaces manipulados)
    if (seccion && SECCIONES[seccion]) {
      const [contexto, texto] = SECCIONES[seccion];
      html += `<br><span style="font-size:.9rem;">${contexto}</span>
        <br><a href="${seccion}" style="color:#f7b731; font-weight:700;">${texto}</a>`;
    }
    aviso.innerHTML = html;
    aviso.style.cssText = `
      position:fixed; bottom:1rem; right:1rem; max-width:320px;
      background:#222; color:#fff; padding:1rem 1.2rem; border-radius:12px;
      font-family:'Inter',sans-serif; font-size:1rem; z-index:9999;
      box-shadow:0 4px 20px rgba(0,0,0,.3);
    `;
    document.body.appendChild(aviso);
    setTimeout(() => aviso.remove(), seccion ? 10000 : 5000);
  }

  // ---- Capa que bloquea toda la página ----
  const capa = document.createElement("div");
  capa.style.cssText = `
    position:fixed; inset:0; z-index:99999;
    background:rgba(0,0,0,.85); display:flex;
    align-items:center; justify-content:center;
    font-family:'Inter',sans-serif; padding:1rem;
  `;
  const caja = document.createElement("div");
  caja.style.cssText = `
    background:#fff; color:#222; max-width:460px; width:100%;
    border-radius:16px; padding:2rem; text-align:center;
    box-shadow:0 10px 40px rgba(0,0,0,.4);
  `;
  capa.appendChild(caja);

  function estilizarBotones() {
    caja.querySelectorAll("button").forEach(b => {
      b.style.cssText = "margin:.4rem; padding:.7rem 1.4rem; border:none; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:700;";
    });
    const ok = caja.querySelector(".btn-ok");
    const no = caja.querySelector(".btn-no");
    if (ok) { ok.style.background = "#f7b731"; ok.style.color = "#222"; }
    if (no) { no.style.background = "#e5e5e5"; no.style.color = "#222"; }
  }

  function mostrarPregunta() {
    caja.innerHTML = `
      <h2 style="margin-top:0;"> Antes de entrar</h2>
      <p>En Paletas de Hielo usamos cookies para recordar tus preferencias y mejorar tu experiencia.</p>
      <button class="btn-ok" id="c-aceptar">Aceptar</button>
      <button class="btn-no" id="c-rechazar">Rechazar</button>
    `;
    estilizarBotones();
    document.getElementById("c-aceptar").onclick = aceptar;
    document.getElementById("c-rechazar").onclick = rechazar;
  }

  function mostrarBloqueo() {
    caja.innerHTML = `
      <h2 style="margin-top:0;">🚫 Acceso restringido</h2>
      <p>Rechazaste las cookies, por lo que no puedes navegar por Paletas de Hielo.</p>
      <p>Si cambias de opinión, puedes aceptarlas para entrar.</p>
      <button class="btn-ok" id="c-reconsiderar">Revisar mi decisión</button>
    `;
    estilizarBotones();
    document.getElementById("c-reconsiderar").onclick = function () {
      deleteCookie(NOMBRE);
      mostrarPregunta();
    };
  }

  function aceptar() {
    capa.remove();
    document.body.style.overflow = "";
    experienciaUsuario();
  }
  function rechazar() {
    setCookie(NOMBRE, "rechazadas", DIAS);
    mostrarBloqueo();
  }

  // ---- Lógica al cargar cualquier página ----
  const estado = getCookie(NOMBRE);

  if (estado === "aceptadas") {
    experienciaUsuario();
    return;
  }

  document.body.style.overflow = "hidden";
  document.body.appendChild(capa);
  if (estado === "rechazadas") mostrarBloqueo();
  else mostrarPregunta();
})();