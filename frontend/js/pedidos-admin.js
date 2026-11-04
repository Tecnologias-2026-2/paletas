import { apiRequest } from "./firebase-api.js";

const lista = document.getElementById("lista-pedidos");
const filtroEstado = document.getElementById("filtro-estado");
const estados = [
  ["pendiente de aprobación", "Pendiente de aprobación"],
  ["confirmado", "Confirmado"],
  ["proceso", "En proceso"],
  ["enviado", "Enviado"],
  ["finalizado", "Finalizado"],
];
let pedidos = [];
let avisoMigracion = "";

function nodo(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function renderizar() {
  const estadoFiltro = filtroEstado.value;
  const filtrados = pedidos.filter(pedido =>
    estadoFiltro === "todos" || pedido.estado === estadoFiltro
  );
  lista.replaceChildren();
  if (avisoMigracion) {
    const aviso = nodo("p", "", avisoMigracion);
    aviso.setAttribute("role", "status");
    lista.append(aviso);
  }
  if (!filtrados.length) {
    lista.append(nodo("p", "", "No hay pedidos para mostrar."));
    return;
  }

  filtrados.forEach(pedido => {
    const tarjeta = nodo("article", "pedido-card");
    const principal = nodo("div", "pedido-card__principal");
    const icono = nodo("div", "pedido-card__icono");
    const imagen = document.createElement("img");
    imagen.src = "assets/iconos/pedidos.svg";
    imagen.alt = "";
    icono.append(imagen);

    const informacion = nodo("div", "pedido-card__informacion");
    const cabecera = nodo("div", "pedido-card__cabecera");
    const titulo = nodo("h2");
    const enlace = nodo("a", "", pedido.cliente.nombre);
    enlace.href = `perfiladministrador-mispedidos-informacion.html?id=${encodeURIComponent(pedido.id)}`;
    enlace.setAttribute("aria-label", `Ver pedido ${pedido.numero} de ${pedido.cliente.nombre}`);
    titulo.append(enlace);
    cabecera.append(titulo, nodo("span", "pedido-card__prioridad", pedido.numero));
    const correo = nodo("a", "pedido-card__correo", pedido.cliente.correo);
    correo.href = `mailto:${pedido.cliente.correo}`;
    informacion.append(
      cabecera,
      correo,
      nodo("p", "pedido-card__cantidad", `Total: ${pedido.total.toLocaleString("de-DE")} COP`)
    );
    principal.append(icono, informacion);

    const estadoContenedor = nodo("div", "pedido-card__estado");
    estadoContenedor.append(nodo("label", "", "Estado"));
    const select = document.createElement("select");
    select.className = "pedido-card__select";
    select.setAttribute("aria-label", `Estado de ${pedido.numero}`);
    estados.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    });
    select.value = pedido.estado;
    const mensaje = nodo("p");
    mensaje.setAttribute("role", "status");
    select.addEventListener("change", async () => {
      const anterior = pedido.estado;
      select.disabled = true;
      mensaje.textContent = "Guardando...";
      try {
        await apiRequest(`/api/orders/${encodeURIComponent(pedido.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ estado: select.value }),
        }, true);
        pedido.estado = select.value;
        mensaje.textContent = "Estado actualizado.";
      } catch (error) {
        select.value = anterior;
        mensaje.textContent = error.message;
      } finally {
        select.disabled = false;
      }
    });
    estadoContenedor.append(mensaje, select);
    tarjeta.append(principal, estadoContenedor);
    lista.append(tarjeta);
  });
}

filtroEstado.addEventListener("change", renderizar);

try {
  lista.textContent = "Cargando pedidos...";
  const legacy = localStorage.getItem("pedidos-paletas");
  if (legacy) {
    const pedidosLocales = JSON.parse(legacy);
    if (!Array.isArray(pedidosLocales)) {
      throw new Error("Los pedidos locales no tienen un formato válido; se conservaron en este navegador.");
    }
    if (pedidosLocales.length) {
      const resultado = await apiRequest("/api/orders/import", {
        method: "POST",
        body: JSON.stringify({ pedidos: pedidosLocales }),
      }, true);
      localStorage.removeItem("pedidos-paletas");
      avisoMigracion = `Migración local: ${resultado.imported} importados; ${resultado.skipped} ya existentes.`;
    } else {
      localStorage.removeItem("pedidos-paletas");
    }
  }
  pedidos = await apiRequest("/api/orders", {}, true);
  renderizar();
} catch (error) {
  avisoMigracion = error.message;
  try {
    pedidos = await apiRequest("/api/orders", {}, true);
    renderizar();
  } catch (loadError) {
    lista.textContent = loadError.message;
  }
}
