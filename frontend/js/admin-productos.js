import { apiRequest, waitForAuth } from "./firebase-api.js";
import { PaletasDatos as datos } from "./paletas-datos.js";

(() => {
  const CATEGORIAS = {
    frutales: "Frutales",
    temporada: "Temporada",
    cremosas: "Cremosas",
    exclusivas: "Exclusivas",
  };

  const IMAGENES = [
    "chamoy", "chispas", "ciruela", "coco-chocolate", "coco", "de-pais",
    "durazno", "fresa-cremosa", "frutas-frescas", "halloween", "limon",
    "mango-dulce", "napolitana", "navidad", "ninos-dulce", "nuez", "patita",
    "sandia-festiva", "tres-leches", "uva-dulce",
  ].map((archivo) => ({
    ruta: `assets/imagenes/paletas/${archivo}.png`,
    nombre: archivo.charAt(0).toUpperCase() + archivo.slice(1).replace(/-/g, " "),
  }));

  const $ = (id) => document.getElementById(id);
  const lista = $("productos-lista");
  const vacio = $("productos-vacio");
  const estado = $("productos-estado");
  const botonAgregar = $("boton-agregar");
  const botonRestaurar = $("boton-restaurar");

  const dialogo = $("dialogo-producto");
  const formulario = $("formulario-producto");
  const tituloDialogo = $("dialogo-producto-titulo");
  const campos = {
    nombre: $("campo-nombre"),
    precio: $("campo-precio"),
    peso: $("campo-peso"),
    imagen: $("campo-imagen"),
    alt: $("campo-alt"),
  };
  const vistaImagen = $("vista-imagen");
  const campoArchivo = $("campo-archivo");
  const errorFormulario = $("error-formulario");
  const contenido = $("productos-contenido");
  const sesion = $("productos-sesion");

  // Imagen subida: se redimensiona en el navegador y se sube al guardar la paleta.
  const TIPOS_IMAGEN = ["image/png", "image/jpeg", "image/webp"];
  const MAX_ARCHIVO = 15 * 1024 * 1024;
  const MAX_LADO = 800;
  const MAX_BYTES = 600 * 1024;
  const VALOR_NUEVA = "__subida__";
  let archivoPreparado = null;
  let urlVistaPrevia = null;
  const opcionSubida = document.createElement("option");

  const confirmar = $("dialogo-confirmar");

  let paletas = [];
  let editandoId = null;

  const cop = (n) => `${n.toLocaleString("de-DE")} COP`;

  const anunciar = (mensaje) => {
    estado.textContent = "";
    requestAnimationFrame(() => { estado.textContent = mensaje; });
  };

  const crear = (etiqueta, clase, texto) => {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
  };

  const botonAccion = (accion, texto, etiqueta, extra = "") => {
    const b = crear("button", `boton-admin boton-admin--secundario ${extra}`.trim(), texto);
    b.type = "button";
    b.dataset.accion = accion;
    b.setAttribute("aria-label", etiqueta);
    return b;
  };

  function fila(p, indice) {
    const item = crear("li", "producto-admin");
    item.dataset.id = p.id;

    const imagen = crear("img", "producto-admin__imagen");
    imagen.src = datos.urlImagen(p.imagen);
    imagen.alt = "";
    imagen.width = 72;
    imagen.height = 72;
    imagen.loading = "lazy";

    const info = crear("div", "producto-admin__info");
    info.append(
      crear("h2", "producto-admin__nombre", p.nombre),
      crear("p", "producto-admin__meta", `${cop(p.precio)} · ${p.peso} · Posición ${indice + 1}`)
    );

    const categorias = crear("ul", "producto-admin__categorias");
    categorias.setAttribute("aria-label", "Categorías");
    const nombres = (p.categorias || []).map((c) => CATEGORIAS[c]).filter(Boolean);
    if (nombres.length) {
      nombres.forEach((n) => categorias.append(crear("li", "", n)));
    } else {
      categorias.append(crear("li", "producto-admin__sin-categoria", "Sin categoría"));
    }
    info.append(categorias);

    const acciones = crear("div", "producto-admin__acciones");
    const subir = botonAccion("subir", "↑", `Subir ${p.nombre} en popularidad`, "boton-admin--icono");
    const bajar = botonAccion("bajar", "↓", `Bajar ${p.nombre} en popularidad`, "boton-admin--icono");
    subir.disabled = indice === 0;
    bajar.disabled = indice === paletas.length - 1;
    acciones.append(
      subir,
      bajar,
      botonAccion("editar", "Editar", `Editar ${p.nombre}`),
      botonAccion("quitar", "Quitar", `Quitar ${p.nombre}`, "boton-admin--quitar")
    );

    item.append(imagen, info, acciones);
    return item;
  }

  function pintar() {
    lista.replaceChildren(...paletas.map(fila));
    vacio.hidden = paletas.length > 0;
  }

  async function cargar() {
    try {
      paletas = await datos.listar();
      pintar();
    } catch (error) {
      anunciar(error.message);
      throw error;
    }
  }

  function enfocar(id, accion) {
    const alternativa = accion === "subir" ? "bajar" : accion === "bajar" ? "subir" : "editar";
    const fila = lista.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!fila) return;
    const objetivo =
      fila.querySelector(`[data-accion="${accion}"]:not(:disabled)`) ||
      fila.querySelector(`[data-accion="${alternativa}"]:not(:disabled)`) ||
      fila.querySelector('[data-accion="editar"]');
    objetivo?.focus();
  }

  /* ---------- Confirmación ---------- */

  function pedirConfirmacion({ titulo, texto, aceptar }) {
    $("confirmar-titulo").textContent = titulo;
    $("confirmar-texto").textContent = texto;
    $("confirmar-aceptar").textContent = aceptar;
    confirmar.returnValue = "";
    return new Promise((resolver) => {
      confirmar.addEventListener(
        "close",
        () => resolver(confirmar.returnValue === "confirmar"),
        { once: true }
      );
      confirmar.showModal();
    });
  }

  /* ---------- Formulario ---------- */

  campos.imagen.append(
    ...IMAGENES.map((img) => {
      const opcion = document.createElement("option");
      opcion.value = img.ruta;
      opcion.textContent = img.nombre;
      return opcion;
    })
  );

  const actualizarVista = () => {
    vistaImagen.src = archivoPreparado && urlVistaPrevia
      ? urlVistaPrevia
      : datos.urlImagen(campos.imagen.value);
  };

  function soltarVistaPrevia() {
    if (urlVistaPrevia) URL.revokeObjectURL(urlVistaPrevia);
    urlVistaPrevia = null;
  }

  function mostrarOpcionSubida(valor, texto) {
    opcionSubida.value = valor;
    opcionSubida.textContent = texto;
    campos.imagen.prepend(opcionSubida);
    campos.imagen.value = valor;
  }

  function ocultarOpcionSubida() {
    opcionSubida.remove();
  }

  function descartarArchivo() {
    archivoPreparado = null;
    campoArchivo.value = "";
    soltarVistaPrevia();
  }

  // Reduce el lado mayor y recodifica en WebP hasta que pese poco; conserva la transparencia.
  async function prepararImagen(archivo) {
    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      throw new Error("El archivo debe ser una imagen PNG, JPG o WebP.");
    }
    if (archivo.size > MAX_ARCHIVO) {
      throw new Error("La imagen pesa más de 15 MB. Elige una más pequeña.");
    }
    let mapa;
    try {
      mapa = await createImageBitmap(archivo);
    } catch {
      throw new Error("No se pudo leer la imagen. Prueba con otro archivo.");
    }
    let escala = Math.min(1, MAX_LADO / Math.max(mapa.width, mapa.height));
    try {
      for (let intento = 0; intento < 6; intento += 1) {
        const lienzo = document.createElement("canvas");
        lienzo.width = Math.max(1, Math.round(mapa.width * escala));
        lienzo.height = Math.max(1, Math.round(mapa.height * escala));
        lienzo.getContext("2d").drawImage(mapa, 0, 0, lienzo.width, lienzo.height);
        const blob = await new Promise((resolver) => lienzo.toBlob(resolver, "image/webp", 0.85));
        if (blob && blob.size <= MAX_BYTES) return blob;
        escala *= 0.75;
      }
    } finally {
      mapa.close?.();
    }
    throw new Error("No se pudo reducir la imagen al tamaño permitido.");
  }

  campoArchivo.addEventListener("change", async () => {
    limpiarErrorImagen();
    const archivo = campoArchivo.files[0];
    if (!archivo) return;
    try {
      const blob = await prepararImagen(archivo);
      soltarVistaPrevia();
      archivoPreparado = blob;
      urlVistaPrevia = URL.createObjectURL(blob);
      mostrarOpcionSubida(VALOR_NUEVA, `Imagen nueva: ${archivo.name}`);
      actualizarVista();
    } catch (error) {
      campoArchivo.value = "";
      campoArchivo.setAttribute("aria-invalid", "true");
      mostrarError(campos.imagen, error.message);
      campoArchivo.focus();
    }
  });

  campos.imagen.addEventListener("change", () => {
    // Elegir una imagen del sitio descarta el archivo que se había seleccionado.
    if (campos.imagen.value !== VALOR_NUEVA) {
      if (archivoPreparado) ocultarOpcionSubida();
      descartarArchivo();
    }
    limpiarErrorImagen();
    actualizarVista();
  });

  function limpiarErrorImagen() {
    const error = $("error-imagen");
    error.hidden = true;
    error.textContent = "";
    campos.imagen.removeAttribute("aria-invalid");
    campoArchivo.removeAttribute("aria-invalid");
  }

  function mostrarError(campo, mensaje) {
    const error = $(`error-${campo.name}`);
    error.textContent = mensaje;
    error.hidden = false;
    campo.setAttribute("aria-invalid", "true");
  }

  function limpiarErrores() {
    formulario.querySelectorAll(".campo-admin__error").forEach((e) => {
      e.hidden = true;
      e.textContent = "";
    });
    Object.values(campos).forEach((c) => c.removeAttribute("aria-invalid"));
    campoArchivo.removeAttribute("aria-invalid");
    errorFormulario.hidden = true;
    errorFormulario.textContent = "";
  }

  Object.values(campos).forEach((campo) => {
    campo.addEventListener("input", () => {
      campo.removeAttribute("aria-invalid");
      const error = $(`error-${campo.name}`);
      error.hidden = true;
      error.textContent = "";
    });
  });

  function abrirFormulario(paleta) {
    editandoId = paleta ? paleta.id : null;
    tituloDialogo.textContent = paleta ? "Editar paleta" : "Agregar paleta";
    limpiarErrores();
    formulario.reset();

    campos.nombre.value = paleta ? paleta.nombre : "";
    campos.precio.value = paleta ? paleta.precio : "";
    campos.peso.value = paleta ? paleta.peso : "90gr";
    descartarArchivo();
    ocultarOpcionSubida();
    if (paleta && paleta.imagen.startsWith("/api/")) {
      mostrarOpcionSubida(paleta.imagen, "Imagen subida actual");
    } else {
      campos.imagen.value = paleta ? paleta.imagen : IMAGENES[0].ruta;
    }
    campos.alt.value = paleta ? paleta.alt : "";
    formulario
      .querySelectorAll('input[name="categorias"]')
      .forEach((c) => { c.checked = !!paleta && (paleta.categorias || []).includes(c.value); });

    actualizarVista();
    dialogo.showModal();
    campos.nombre.focus();
  }

  function validar() {
    limpiarErrores();
    const errores = [];

    const nombre = campos.nombre.value.trim();
    if (!nombre) {
      errores.push([campos.nombre, "Escribe el nombre de la paleta."]);
    } else if (
      paletas.some(
        (p) => p.id !== editandoId && p.nombre.toLowerCase() === nombre.toLowerCase()
      )
    ) {
      errores.push([campos.nombre, "Ya existe una paleta con ese nombre."]);
    }

    const precio = Number(campos.precio.value);
    if (campos.precio.value.trim() === "") {
      errores.push([campos.precio, "Escribe el precio."]);
    } else if (!Number.isInteger(precio) || precio < 1 || precio > 999999) {
      errores.push([campos.precio, "El precio debe ser un número entero entre 1 y 999.999."]);
    }

    if (!campos.peso.value.trim()) {
      errores.push([campos.peso, "Escribe el peso, por ejemplo 90gr."]);
    }

    if (!campos.imagen.value) {
      errores.push([campos.imagen, "Elige una imagen."]);
    }

    if (!campos.alt.value.trim()) {
      errores.push([campos.alt, "Describe la imagen en una frase corta."]);
    }

    errores.forEach(([campo, mensaje]) => mostrarError(campo, mensaje));
    errores[0]?.[0].focus();
    return errores.length === 0;
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!validar()) return;

    const botonGuardar = formulario.querySelector('button[type="submit"]');
    const textoGuardar = botonGuardar.textContent;
    botonGuardar.disabled = true;
    botonGuardar.textContent = "Guardando...";
    let imagenSubida = null;

    try {
      const nuevos = {
        nombre: campos.nombre.value.trim(),
        precio: Number(campos.precio.value),
        peso: campos.peso.value.trim(),
        imagen: campos.imagen.value,
        alt: campos.alt.value.trim(),
        categorias: [...formulario.querySelectorAll('input[name="categorias"]:checked')].map((c) => c.value),
      };

      if (archivoPreparado) {
        imagenSubida = await datos.subirImagen(archivoPreparado);
        nuevos.imagen = imagenSubida;
      }

      let idFinal = editandoId;
      if (editandoId) {
        await datos.actualizar(editandoId, nuevos);
        anunciar(`Se guardaron los cambios de ${nuevos.nombre}.`);
      } else {
        idFinal = (await datos.crear(nuevos)).id;
        anunciar(`Se agregó ${nuevos.nombre} al final del catálogo.`);
      }

      descartarArchivo();
      dialogo.close();
      await cargar();
      enfocar(idFinal, "editar");
    } catch (error) {
      // Si la paleta no se guardó, no dejamos la imagen subida huérfana.
      if (imagenSubida) await datos.eliminarImagenSubida(imagenSubida).catch(() => {});
      errorFormulario.textContent = error.message;
      errorFormulario.hidden = false;
    } finally {
      botonGuardar.disabled = false;
      botonGuardar.textContent = textoGuardar;
    }
  });

  $("cancelar-producto").addEventListener("click", () => dialogo.close());
  dialogo.addEventListener("close", () => {
    descartarArchivo();
  });

  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });

  /* ---------- Acciones de la lista ---------- */

  botonAgregar.addEventListener("click", () => abrirFormulario(null));

  lista.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("button[data-accion]");
    if (!boton) return;

    const id = boton.closest(".producto-admin").dataset.id;
    const indice = paletas.findIndex((p) => p.id === id);
    const paleta = paletas[indice];
    const accion = boton.dataset.accion;

    if (accion === "editar") {
      abrirFormulario(paleta);
      return;
    }

    try {
      if (accion === "subir" || accion === "bajar") {
        await datos.mover(id, accion === "subir" ? -1 : 1);
        await cargar();
        const nueva = paletas.findIndex((p) => p.id === id) + 1;
        anunciar(`${paleta.nombre} quedó en la posición ${nueva} de ${paletas.length}.`);
        enfocar(id, accion);
        return;
      }

      if (accion === "quitar") {
        const acepto = await pedirConfirmacion({
          titulo: "¿Quitar esta paleta?",
          texto: `Se quitará "${paleta.nombre}" del catálogo.`,
          aceptar: "Quitar",
        });

        if (!acepto) {
          boton.focus();
          return;
        }

        await datos.eliminar(id);
        await cargar();
        anunciar(`Se quitó ${paleta.nombre} del catálogo.`);
        const vecino = paletas[Math.min(indice, paletas.length - 1)];
        if (vecino) enfocar(vecino.id, "editar");
        else botonAgregar.focus();
      }
    } catch (error) {
      anunciar(error.message);
    }
  });

  botonRestaurar.addEventListener("click", async () => {
    const acepto = await pedirConfirmacion({
      titulo: "¿Restaurar el catálogo original?",
      texto: "Se perderán los cambios hechos en las paletas, incluidas las imágenes subidas.",
      aceptar: "Restaurar",
    });
    if (!acepto) {
      botonRestaurar.focus();
      return;
    }
    try {
      await datos.restaurar();
      await cargar();
      anunciar("Se restauró el catálogo original.");
      botonAgregar.focus();
    } catch (error) {
      anunciar(error.message);
    }
  });

  /* ---------- Sesión ---------- */

  function mostrarSesionRequerida(mensaje) {
    contenido.hidden = true;
    sesion.hidden = false;
    estado.textContent = "";
    if (mensaje) $("productos-sesion-mensaje").textContent = mensaje;
  }

  // Igual que pedidos y reservas: el panel solo se muestra con la sesión de administrador.
  async function iniciar() {
    try {
      const usuario = await waitForAuth();
      if (!usuario) {
        mostrarSesionRequerida();
        return;
      }
      await apiRequest("/api/admin", {}, true);
    } catch (error) {
      mostrarSesionRequerida(error.message);
      return;
    }

    contenido.hidden = false;
    estado.textContent = "";
    try {
      const importados = await datos.importarCatalogoLocal();
      if (importados) anunciar(`Se migraron ${importados} productos guardados en este navegador.`);
    } catch (error) {
      anunciar(`El catálogo local no se pudo migrar: ${error.message}`);
    }
    cargar().catch(() => {});
  }

  iniciar();
})();