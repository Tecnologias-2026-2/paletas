import { apiRequest } from "./firebase-api.js";

const id = new URLSearchParams(location.search).get("id");
const titulo = document.getElementById("titulo-detalle-pedido");

function escribir(idCampo, valor) {
  const campo = document.getElementById(idCampo);
  if (campo) campo.value = valor ?? "";
}

try {
  if (!id) throw new Error("Selecciona un pedido desde la lista.");
  const pedido = await apiRequest(`/api/orders/${encodeURIComponent(id)}`, {}, true);
  const cliente = pedido.cliente;
  titulo.textContent = `${cliente.nombre} · ${pedido.numero}`;
  document.querySelector(".pedido-resumen__estado").textContent = pedido.estado;
  document.querySelector('[aria-current="page"]').textContent = pedido.numero;
  document.querySelectorAll(".pedido-resumen__dato strong")[0].textContent =
    `${cliente.municipio} · ${cliente.direccion}`;
  document.querySelectorAll(".pedido-resumen__dato strong")[1].textContent =
    pedido.items.map(item => `${item.cantidad} × ${item.nombre}`).join(", ");
  document.querySelectorAll(".pedido-resumen__dato strong")[2].textContent =
    `${pedido.empaque.nombre} · ${pedido.total.toLocaleString("de-DE")} COP`;
  escribir("pedido-nombre", cliente.nombre);
  escribir("pedido-direccion", cliente.direccion);
  escribir("pedido-correo", cliente.correo);
  escribir("pedido-telefono", cliente.telefono);
  escribir("pedido-ciudad", cliente.municipio);
} catch (error) {
  titulo.textContent = error.message;
}
