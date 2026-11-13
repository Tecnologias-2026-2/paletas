import { opcionesEstado, confirmarAvance, mensajeEstado } from "./estado-flujo.js";
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
    const tarjeta = nodo("article", "pedido-resumen");
    const principal = nodo("a");
    principal.href = 'perfiladministrador-mispedidos-informacion.html?id=' + encodeURIComponent(pedido.id);
    principal.style.cssText = 'display:block;color:inherit;text-decoration:none;';
    principal.setAttribute('aria-label', 'Ver detalles de envío y pago de ' + pedido.numero);
    const cabecera = nodo("div", "pedido-resumen__encabezado");
    const titulo = nodo("div");
    titulo.append(nodo("p", "pedido-resumen__etiqueta", "Información pedido"), nodo("h2", "", pedido.cliente.nombre + ' · ' + pedido.numero));
    const badge = nodo("span", "pedido-resumen__estado", pedido.estado);
    cabecera.append(titulo, badge);
    const datos = nodo("div", "pedido-resumen__datos");
    const valores = [
      ['Ubicación', pedido.cliente.municipio + ' · ' + pedido.cliente.direccion],
      ['Pedido', pedido.items.map(item => item.cantidad + ' × ' + item.nombre).join(', ')],
      ['Presentación', pedido.empaque.nombre + ' · ' + pedido.total.toLocaleString('de-DE') + ' COP']
    ];
    valores.forEach(([etiqueta,valor]) => {
      const dato = nodo('div','pedido-resumen__dato');
      dato.append(nodo('span','',etiqueta),nodo('strong','',valor)); datos.append(dato);
    });
    principal.append(cabecera, datos);
    const correos = nodo('a','pedido-resumen__correos','Ver correos enviados');
    correos.href = 'perfiladministrador-correos.html?pedido=' + encodeURIComponent(pedido.id);
    correos.style.cssText = 'display:inline-flex;text-decoration:none;margin-top:16px;';

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
    opcionesEstado(select, pedido.estado);
    const mensaje = nodo("p");
    mensaje.setAttribute("role", "status");
    select.addEventListener("change", async () => {
      const anterior = pedido.estado;
      if (!confirmarAvance(anterior, select.value)) { select.value = anterior; return; }
      select.disabled = true;
      mensaje.textContent = "Guardando...";
      try {
        const resultado = await apiRequest(`/api/orders/${encodeURIComponent(pedido.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ estado: select.value }),
        }, true);
        pedido.estado = select.value;
        badge.textContent = pedido.estado;
        mensaje.textContent = mensajeEstado(resultado);
        if (filtroEstado.value !== "todos" && filtroEstado.value !== pedido.estado) tarjeta.remove();
      } catch (error) {
        select.value = anterior;
        mensaje.textContent = error.message;
      } finally {
        opcionesEstado(select, pedido.estado);
      }
    });
    estadoContenedor.append(mensaje, select);
    tarjeta.append(principal, estadoContenedor, correos);
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
