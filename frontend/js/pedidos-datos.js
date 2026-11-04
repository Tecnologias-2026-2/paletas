import { apiRequest } from "./firebase-api.js";

window.PedidosDatos = {
  async crear(pedido) {
    return apiRequest("/api/orders", {
      method: "POST",
      body: JSON.stringify(pedido),
    });
  },
  async listar() {
    return apiRequest("/api/orders", {}, true);
  },
};
