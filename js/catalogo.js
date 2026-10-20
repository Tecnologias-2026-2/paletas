/*
 * Si el administrador modificó el catálogo, reemplaza las paletas escritas en
 * paletas.html por las guardadas. Si no, deja el HTML original intacto.
 */
window.catalogoListo = (async () => {
  const lista = document.querySelector(".catalogo-paletas__grid");
  if (!lista || !window.PaletasDatos) return;

  let paletas;
  try {
    paletas = await window.PaletasDatos.listarPersonalizado();
  } catch {
    return;
  }
  if (!paletas) return;

  const crear = (etiqueta, clase, texto) => {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
  };

  const boton = (accion, idCampo, etiqueta, texto) => {
    const b = crear("button", "cantidad__boton", texto);
    b.type = "button";
    b.dataset.accion = accion;
    b.setAttribute("aria-controls", idCampo);
    b.setAttribute("aria-label", etiqueta);
    return b;
  };

  const tarjeta = (p, posicion) => {
    const idCampo = `cantidad-${p.id}`;
    const item = document.createElement("li");
    item.dataset.categorias = (p.categorias || []).join(" ");

    const articulo = crear("article", "paleta");

    const imagen = crear("img", "paleta__imagen");
    imagen.src = p.imagen;
    imagen.alt = p.alt;
    if (posicion > 1) imagen.loading = "lazy";

    const texto = crear("div", "paleta__texto");
    const titulo = crear("h3", "paleta__titulo");
    const enlace = crear("a", "paleta__nombre", p.nombre);
    enlace.href = "mi-carrito.html";
    titulo.append(enlace);
    texto.append(
      titulo,
      crear("p", "paleta__precio", `${p.precio.toLocaleString("de-DE")} COP`),
      crear("p", "paleta__peso", p.peso)
    );

    const cantidad = crear("div", "cantidad");
    const etiqueta = crear("label", "visually-hidden", `Cantidad de ${p.nombre}`);
    etiqueta.htmlFor = idCampo;
    const campo = crear("input", "cantidad__campo");
    campo.id = idCampo;
    campo.type = "number";
    campo.inputMode = "numeric";
    campo.min = "0";
    campo.max = "99";
    campo.value = "0";
    cantidad.append(
      boton("aumentar", idCampo, `Aumentar cantidad de ${p.nombre}`, "+"),
      etiqueta,
      campo,
      boton("disminuir", idCampo, `Disminuir cantidad de ${p.nombre}`, "−")
    );

    articulo.append(imagen, texto, cantidad);
    item.append(articulo);
    return item;
  };

  lista.replaceChildren(...paletas.map(tarjeta));
})();