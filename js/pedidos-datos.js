/*
 * Capa de datos de los pedidos.
 *
 * Hoy guarda en localStorage (solo en este navegador). Para conectar la base
 * de datos, reemplaza el cuerpo de crear() por un fetch() POST a la API que
 * devuelva el pedido creado; detalles-pago.js no necesita cambios.
 */
(() => {
  const CLAVE = "pedidos-paletas";

  function leer() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE));
      return Array.isArray(guardado) ? guardado : [];
    } catch {
      return [];
    }
  }

  async function crear(pedido) {
    const lista = leer();
    const numero = String(lista.length + 1).padStart(4, "0");
    const creado = {
      ...pedido,
      id: `PED-${numero}`,
      fecha: new Date().toISOString(),
      estado: "pendiente de aprobación",
    };
    lista.push(creado);
    localStorage.setItem(CLAVE, JSON.stringify(lista));
    return JSON.parse(JSON.stringify(creado));
  }

  async function listar() {
    return leer();
  }

  window.PedidosDatos = { crear, listar };
})();