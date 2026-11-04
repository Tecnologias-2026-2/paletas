import { PaletasDatos } from "./paletas-datos.js";

function crear(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function boton(accion, idCampo, etiqueta, texto) {
  const control = crear("button", "cantidad__boton", texto);
  control.type = "button";
  control.dataset.accion = accion;
  control.setAttribute("aria-controls", idCampo);
  control.setAttribute("aria-label", etiqueta);
  return control;
}

function tarjeta(producto, posicion) {
  const idCampo = `cantidad-${producto.id}`;
  const item = document.createElement("li");
  item.dataset.id = producto.id;
  item.dataset.categorias = (producto.categorias || []).join(" ");

  const articulo = crear("article", "paleta");
  const imagen = crear("img", "paleta__imagen");
  imagen.src = producto.imagen;
  imagen.alt = producto.alt;
  if (posicion > 1) imagen.loading = "lazy";

  const texto = crear("div", "paleta__texto");
  const titulo = crear("h3", "paleta__titulo");
  const enlace = crear("a", "paleta__nombre", producto.nombre);
  enlace.href = "mi-carrito.html";
  titulo.append(enlace);
  texto.append(
    titulo,
    crear("p", "paleta__precio", `${producto.precio.toLocaleString("de-DE")} COP`),
    crear("p", "paleta__peso", producto.peso)
  );

  const cantidad = crear("div", "cantidad");
  const etiqueta = crear("label", "visually-hidden", `Cantidad de ${producto.nombre}`);
  etiqueta.htmlFor = idCampo;
  const campo = crear("input", "cantidad__campo");
  campo.id = idCampo;
  campo.type = "number";
  campo.inputMode = "numeric";
  campo.min = "0";
  campo.max = "99";
  campo.value = "0";
  cantidad.append(
    boton("aumentar", idCampo, `Aumentar cantidad de ${producto.nombre}`, "+"),
    etiqueta,
    campo,
    boton("disminuir", idCampo, `Disminuir cantidad de ${producto.nombre}`, "−")
  );
  articulo.append(imagen, texto, cantidad);
  item.append(articulo);
  return item;
}

window.catalogoListo = (async () => {
  const lista = document.querySelector(".catalogo-paletas__grid");
  if (!lista) return;
  try {
    const productos = await PaletasDatos.listar();
    lista.replaceChildren(...productos.map(tarjeta));
    const aviso = document.getElementById("paletas-vacio");
    if (aviso) aviso.hidden = productos.length > 0;
  } catch (error) {
    lista.replaceChildren(crear("li", "catalogo-paletas__error", "No se pudo cargar el catálogo. Inténtalo nuevamente."));
    console.error("Error al cargar catálogo:", error);
  }
})();
