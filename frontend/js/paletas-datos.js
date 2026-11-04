import { apiRequest } from "./firebase-api.js";

const api = "/api/products";

async function listar() {
  return apiRequest(api);
}

async function importarCatalogoLocal() {
  const legacy = localStorage.getItem("paletas-catalogo");
  if (!legacy) return 0;
  const productos = JSON.parse(legacy);
  if (!Array.isArray(productos) || !productos.length) {
    throw new Error("El catálogo guardado en este navegador no tiene un formato válido.");
  }
  const resultado = await apiRequest(`${api}/import`, {
    method: "POST",
    body: JSON.stringify({ productos }),
  }, true);
  localStorage.removeItem("paletas-catalogo");
  return resultado.imported;
}

async function listarPersonalizado() {
  return listar();
}

async function crear(datos) {
  return apiRequest(api, { method: "POST", body: JSON.stringify(datos) }, true);
}

async function actualizar(id, cambios) {
  return apiRequest(`${api}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(cambios),
  }, true);
}

async function eliminar(id) {
  await apiRequest(`${api}/${encodeURIComponent(id)}`, { method: "DELETE" }, true);
}

async function mover(id, delta) {
  await apiRequest(`${api}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ delta }),
  }, true);
}

async function restaurar() {
  await apiRequest(`${api}/restore`, { method: "POST", body: "{}" }, true);
}

export const PaletasDatos = {
  listar,
  listarPersonalizado,
  importarCatalogoLocal,
  crear,
  actualizar,
  eliminar,
  mover,
  restaurar,
};
