(function () {
  const NOMBRE = "cookiesPaletas";
  const DIAS = 30;
  const RUTA = location.pathname.startsWith("/paletas/") ? "/paletas/" : "/";

  // FLUJOS: cosas a medias. Se recuerdan hasta que terminen (compra, reserva).
  // IMPORTANTE: cambia "reservas.html" por el nombre real de tu página de reservas.
  const FLUJOS = {
    "mi-carrito.html":    ["Dejaste una compra pendiente.", "¿Continuar con tu compra?"],
    "detalles-pago.html": ["Dejaste un pago sin terminar.", "¿Continuar con tu compra?"],
    "solicitud_cotizacion.html":      ["Dejaste una reserva sin terminar.", "¿Continuar con tu reserva?"]
  };
  // SECCIONES: navegación normal. Solo se recuerda la última.
  const SECCIONES = {
    "eventos.html":     ["Estabas viendo nuestros eventos.", "Volver a eventos"],
    "paletas.html":     ["Estabas explorando nuestras paletas.", "Seguir viendo paletas"],
    "contactanos.html": ["Estabas en la sección de contacto.", "Volver a contáctanos"]
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
  function archivoDe(destino) {
    return destino.split(/[?#]/)[0];
  }
  // Solo se aceptan destinos de la lista (evita enlaces manipulados)
  function destinoValido(d) {
    const a = archivoDe(d || "");
    return !!(FLUJOS[a] || SECCIONES[a]) && /^[\w\-]+\.html([?#][\w\-=&%.\/]*)?$/.test(d);
  }

  // ---- Borradores de formularios (reserva, pago, etc.) ----
  function esCampoSensible(el) {
    const t = (el.autocomplete || "") + (el.name || "") + (el.id || "");
    return ["password", "hidden", "file", "checkbox", "radio"].includes(el.type) ||
           /cc-|tarjeta|card|cvv|cvc|clave|pass/i.test(t);
  }
  function autoguardarFormularios() {
    const archivo = archivoActual();
    if (!FLUJOS[archivo]) return;
    const clave = "borrador_" + archivo;
    let datos = {};
    try { datos = JSON.parse(localStorage.getItem(clave) || "{}"); } catch (e) {}

    document.querySelectorAll("input, textarea, select").forEach(el => {
      if (esCampoSensible(el)) return;           // nunca guarda contraseñas ni tarjetas
      const k = el.id || el.name;
      if (!k) return;
      if (datos[k] !== undefined && !el.value) { // restaura lo que ya había escrito
        el.value = datos[k];
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      el.addEventListener("input", () => {
        datos[k] = el.value;
        try { localStorage.setItem(clave, JSON.stringify(datos)); } catch (e) {}
      });
    });
  }

  // Llamar cuando la compra o la reserva se confirmen
  function finalizarFlujo() {
    deleteCookie("flujoEnCurso");
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith("borrador_")) localStorage.removeItem(k);
    });
  }
  window.finalizarCompra = finalizarFlujo;
  window.finalizarReserva = finalizarFlujo;

  // ---- Experiencia para usuarios que aceptaron ----
  function experienciaUsuario() {
    setCookie(NOMBRE, "aceptadas", DIAS); // renueva el consentimiento

    const archivo = archivoActual();
    const destinoActual = archivo + location.search + location.hash;
    const yaNosConocia = getCookie("clienteFrecuente");
    const enCurso = getCookie("flujoEnCurso");
    const ultima = getCookie("ultimaSeccion");

    // Se guarda donde está AHORA (después de leer lo anterior)
    if (FLUJOS[archivo]) setCookie("flujoEnCurso", destinoActual, 7);
    else if (SECCIONES[archivo]) setCookie("ultimaSeccion", destinoActual, 7);
    setCookie("clienteFrecuente", "si", DIAS);

    autoguardarFormularios();

    const conSaludo = !sessionStorage.getItem("saludoMostrado");

    // 1) Prioridad: algo a medias (compra / reserva)
    if (destinoValido(enCurso) && archivoDe(enCurso) !== archivo &&
        !sessionStorage.getItem("avisoFlujoCerrado")) {
      mostrarAviso(enCurso, true, conSaludo);
      return;
    }
    // 2) Si no, la última sección vista (solo una vez por sesión)
    if (conSaludo && destinoValido(ultima) && archivoDe(ultima) !== archivo) {
      mostrarAviso(ultima, false, true);
      return;
    }
    // 3) Si no, solo el saludo
    if (yaNosConocia && conSaludo) mostrarAviso(null, false, true);
  }

  function mostrarAviso(destino, esFlujo, conSaludo) {
    sessionStorage.setItem("saludoMostrado", "1");
    const aviso = document.createElement("div");
    let html = "";
    if (conSaludo) html += "<strong>¡Qué bueno verte de nuevo!</strong><br>";
    if (destino) {
      const [contexto, texto] = FLUJOS[archivoDe(destino)] || SECCIONES[archivoDe(destino)];
      html += `<span style="font-size:.9rem;">${contexto}</span><br>
        <a href="${destino}" style="color:#f7b731; font-weight:700;">${texto}</a>`;
    }
    html += `<button aria-label="Cerrar" style="position:absolute; top:.3rem; right:.5rem; background:none; border:none; color:#fff; font-size:1.1rem; cursor:pointer;">✕</button>`;
    aviso.innerHTML = html;
    aviso.style.cssText = `
      position:fixed; bottom:1rem; right:1rem; max-width:330px;
      background:#222; color:#fff; padding:1rem 2rem 1rem 1.2rem; border-radius:12px;
      font-family:'Inter',sans-serif; font-size:1rem; z-index:9999;
      box-shadow:0 4px 20px rgba(0,0,0,.3);
    `;
    document.body.appendChild(aviso);

    aviso.querySelector("button").onclick = function () {
      aviso.remove();
      if (esFlujo) sessionStorage.setItem("avisoFlujoCerrado", "1");
    };
    // Un flujo a medias queda visible hasta que lo cierren; lo demás se quita solo
    if (!esFlujo) setTimeout(() => aviso.remove(), 12000);
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
      <h2 style="margin-top:0;">Antes de entrar</h2>
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