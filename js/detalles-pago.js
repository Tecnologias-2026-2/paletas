(() => {
  const CLAVE_CARRITO = "carrito-paletas";
  const CLAVE_EMPAQUE = "empaque-paletas";
  const UMBRAL_ENVIO_GRATIS = 11500;
  const COSTO_ENVIO = 5000;

  const cop = (n) => `${n.toLocaleString("de-DE")} COP`;
  const $ = (id) => document.getElementById(id);

  const leerJSON = (clave, defecto) => {
    try {
      return JSON.parse(localStorage.getItem(clave)) ?? defecto;
    } catch {
      return defecto;
    }
  };

  const carrito = leerJSON(CLAVE_CARRITO, {});
  const items = Object.values(carrito);
  const empaque = leerJSON(CLAVE_EMPAQUE, null);

  // Solo se llega aquí con al menos un artículo y un empaque elegido
  if (!items.length || !empaque) {
    location.replace("mi-carrito.html");
    return;
  }

  /* ---------- Resumen ---------- */

  const productos = items.reduce((suma, p) => suma + p.precio * p.cantidad, 0);
  const subtotal = productos + empaque.costo;
  const gratis = subtotal >= UMBRAL_ENVIO_GRATIS;
  const envio = gratis ? 0 : COSTO_ENVIO;
  const total = subtotal + envio;

  $("pago-items").replaceChildren(
    ...items.map((p) => {
      const li = document.createElement("li");
      const nombre = document.createElement("span");
      nombre.textContent = `${p.cantidad}x ${p.nombre}`;
      const precio = document.createElement("span");
      precio.className = "pago-resumen__precio";
      precio.textContent = cop(p.precio * p.cantidad);
      li.append(nombre, precio);
      return li;
    })
  );
  $("pago-empaque").textContent = cop(empaque.costo);
  $("pago-subtotal").textContent = cop(subtotal);
  $("pago-envio").textContent = cop(envio);
  $("pago-total").textContent = cop(total);
  $("pago-gratis").textContent = gratis
    ? "¡Tienes envío gratis!"
    : `Te faltan ${cop(UMBRAL_ENVIO_GRATIS - subtotal)} para obtener envío gratis`;

  /* ---------- Formulario ---------- */

  const formulario = $("formulario-pago");
  const boton = $("pago-boton");
  const errorGeneral = $("pago-error-general");
  const campos = {
    nombre: $("pago-nombre"),
    direccion: $("pago-direccion"),
    correo: $("pago-correo"),
    telefono: $("pago-telefono"),
    municipio: $("pago-municipio"),
  };
  const radios = [...formulario.querySelectorAll('input[name="metodo"]')];

  function mostrarError(idError, mensaje, campo) {
    const error = $(idError);
    error.textContent = mensaje;
    error.hidden = false;
    campo?.setAttribute("aria-invalid", "true");
  }

  function limpiarError(idError, campos) {
    const error = $(idError);
    error.hidden = true;
    error.textContent = "";
    campos.forEach((c) => c.removeAttribute("aria-invalid"));
  }

  Object.entries(campos).forEach(([nombre, campo]) => {
    campo.addEventListener("input", () => limpiarError(`error-pago-${nombre}`, [campo]));
  });
  radios.forEach((r) => r.addEventListener("change", () => limpiarError("error-pago-metodo", radios)));

  function validar() {
    const errores = [];
    const valor = (c) => c.value.trim();

    if (valor(campos.nombre).length < 3) {
      errores.push([campos.nombre, "error-pago-nombre", "Escribe tu nombre completo."]);
    }
    if (valor(campos.direccion).length < 5) {
      errores.push([campos.direccion, "error-pago-direccion", "Escribe la dirección completa del envío."]);
    }
    if (!valor(campos.correo)) {
      errores.push([campos.correo, "error-pago-correo", "Escribe tu correo."]);
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor(campos.correo))) {
      errores.push([campos.correo, "error-pago-correo", "Escribe un correo válido, por ejemplo nombre@correo.com."]);
    }
    const digitos = valor(campos.telefono).replace(/[\s+()-]/g, "");
    if (!valor(campos.telefono)) {
      errores.push([campos.telefono, "error-pago-telefono", "Escribe tu teléfono."]);
    } else if (!/^\d{7,15}$/.test(digitos)) {
      errores.push([campos.telefono, "error-pago-telefono", "Escribe un teléfono válido, solo números (7 a 15 dígitos)."]);
    }
    if (!valor(campos.municipio)) {
      errores.push([campos.municipio, "error-pago-municipio", "Escribe tu municipio."]);
    }
    if (!radios.some((r) => r.checked)) {
      errores.push([radios[0], "error-pago-metodo", "Elige un método de pago."]);
    }

    errores.forEach(([campo, idError, mensaje]) => {
      mostrarError(idError, mensaje, campo.type === "radio" ? null : campo);
    });
    if (errores.length && errores.some(([c]) => c.type === "radio")) {
      radios.forEach((r) => r.setAttribute("aria-invalid", "true"));
    }
    errores[0]?.[0].focus();
    return errores.length === 0;
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    errorGeneral.hidden = true;
    if (!validar()) return;

    boton.disabled = true;
    const pedido = {
      cliente: {
        nombre: campos.nombre.value.trim(),
        direccion: campos.direccion.value.trim(),
        correo: campos.correo.value.trim(),
        telefono: campos.telefono.value.trim(),
        municipio: campos.municipio.value.trim(),
      },
      metodoPago: radios.find((r) => r.checked).value,
      items: items.map(({ nombre, peso, precio, cantidad }) => ({ nombre, peso, precio, cantidad })),
      empaque: { nombre: empaque.nombre, costo: empaque.costo },
      subtotal,
      envio,
      total,
    };

    try {
      const creado = await window.PedidosDatos.crear(pedido);
      localStorage.removeItem(CLAVE_CARRITO);
      localStorage.removeItem(CLAVE_EMPAQUE);
      document.dispatchEvent(new Event("carrito-actualizado"));

      $("confirmacion-texto").textContent =
        `Te escribiremos a ${pedido.cliente.correo} para aprobar tu pedido y enviarte el recibo en un máximo de 5 días.`;
      $("confirmacion-numero").textContent = creado.id;
      $("pago-contenido").hidden = true;
      $("pago-confirmacion").hidden = false;
      $("titulo-confirmacion").focus();
      window.scrollTo(0, 0);
    } catch {
      boton.disabled = false;
      errorGeneral.textContent = "No pudimos registrar tu pedido. Inténtalo de nuevo.";
      errorGeneral.hidden = false;
    }
  });
})();