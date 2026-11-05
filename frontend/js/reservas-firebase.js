import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { apiRequest, auth } from "./firebase-api.js";

export const ADMIN_UID = "P4AYQuUQEoVmveHWvyfWKLcUTT53";
export { auth };
export const estados = ["pendiente", "confirmada", "finalizada", "cancelada"];

export function observarAdministrador(permitido, denegado) {
  return onAuthStateChanged(auth, usuario => {
    if (usuario?.uid !== ADMIN_UID) {
      denegado("Debes iniciar sesión con la cuenta administradora.");
      return;
    }
    Promise.resolve(permitido(usuario)).catch(error => {
      console.error("Error al consultar el backend:", error);
      denegado(error.message || "No se pudo completar la solicitud.");
    });
  });
}

export async function listarReservas() {
  return apiRequest("/api/reservation", {}, true);
}

export async function obtenerReserva(id) {
  return apiRequest(`/api/reservation/${encodeURIComponent(id)}`, {}, true);
}

export async function obtenerCorreos(id) {
  return apiRequest(`/api/reservation/${encodeURIComponent(id)}/emails`, {}, true);
}

export async function enviarCorreo(id, contenido) {
  return apiRequest(`/api/reservation/${encodeURIComponent(id)}/emails`, {
    method: "POST",
    body: JSON.stringify(contenido),
  }, true);
}

export async function obtenerPedido(id) {
  return apiRequest(`/api/orders/${encodeURIComponent(id)}`, {}, true);
}

export async function obtenerCorreosPedido(id) {
  return apiRequest(`/api/orders/${encodeURIComponent(id)}/emails`, {}, true);
}

export async function enviarCorreoPedido(id, contenido) {
  return apiRequest(`/api/orders/${encodeURIComponent(id)}/emails`, {
    method: "POST",
    body: JSON.stringify(contenido),
  }, true);
}

export async function guardarEstado(id, estado) {
  if (!estados.includes(estado)) throw new Error("Estado inválido.");
  return apiRequest(`/api/reservation/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  }, true);
}
