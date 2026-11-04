import { listarReservas, observarAdministrador, guardarEstado } from "./reservas-firebase.js";

const lista = document.getElementById("lista-reservas");
const filtroPrioridad = document.getElementById("filtro-prioridad-reserva");
const filtroEstado = document.getElementById("filtro-estado-reserva");
let reservas = [];

function crearElemento(etiqueta, clase, contenido) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (contenido !== undefined) elemento.textContent = contenido;
  return elemento;
}

function mostrarReservas() {
  lista.replaceChildren();
  const filtradas = reservas.filter(reserva =>
    (filtroPrioridad.value === "todas" || reserva.prioridad === filtroPrioridad.value) &&
    (filtroEstado.value === "todos" || reserva.estado === filtroEstado.value)
  );
  if (!filtradas.length) {
    lista.append(crearElemento("p", "", "No hay reservas para mostrar."));
    return;
  }

  filtradas.forEach(reserva => {
    const tarjeta = crearElemento("article", "pedido-card reserva-card");
    const principal = crearElemento("div", "pedido-card__principal");
    const icono = crearElemento("div", "pedido-card__icono");
    const imagen = document.createElement("img");
    imagen.src = "assets/iconos/reservas.svg";
    imagen.alt = "";
    icono.append(imagen);

    const informacion = crearElemento("div", "pedido-card__informacion");
    const cabecera = crearElemento("div", "pedido-card__cabecera");
    const titulo = crearElemento("h2");
    const enlace = crearElemento("a", "", reserva.nombreContacto || "Sin nombre");
    enlace.href = `perfiladministrador-misreservas-info.html?id=${encodeURIComponent(reserva.id)}`;
    titulo.append(enlace);
    cabecera.append(titulo, crearElemento(
      "span",
      `pedido-card__prioridad pedido-card__prioridad--${reserva.prioridad || "media"}`,
      `Prioridad ${reserva.prioridad || "media"}`
    ));

    const correo = crearElemento("a", "pedido-card__correo", reserva.correoContacto || "");
    correo.href = `mailto:${reserva.correoContacto || ""}`;
    const detalles = crearElemento("div", "reserva-card__detalles");
    detalles.append(
      crearElemento("span", "", `${reserva.numeroInvitados || 0} personas`),
      crearElemento("span", "", " • "),
      crearElemento("span", "", reserva.fechaEvento || "Sin fecha")
    );
    informacion.append(cabecera, correo, detalles);
    principal.append(icono, informacion);

    const estadoContenedor = crearElemento("div", "pedido-card__estado");
    estadoContenedor.append(crearElemento("label", "", "Estado"));
    const selector = document.createElement("select");
    selector.className = "pedido-card__select";
    ["pendiente", "confirmada", "finalizada", "cancelada"].forEach(estado => {
      const opcion = document.createElement("option");
      opcion.value = estado;
      opcion.textContent = estado.charAt(0).toUpperCase() + estado.slice(1);
      selector.append(opcion);
    });
    selector.value = reserva.estado || "pendiente";
    selector.setAttribute("aria-label", `Estado de la reserva de ${reserva.nombreContacto || reserva.id}`);
    const mensaje = crearElemento("p");
    mensaje.setAttribute("role", "status");
    selector.addEventListener("change", async () => {
      const anterior = reserva.estado || "pendiente";
      selector.disabled = true;
      mensaje.textContent = "Guardando...";
      try {
        await guardarEstado(reserva.id, selector.value);
        reserva.estado = selector.value;
        mensaje.textContent = "Estado actualizado.";
      } catch (error) {
        selector.value = anterior;
        mensaje.textContent = error.message;
      } finally {
        selector.disabled = false;
      }
    });
    estadoContenedor.append(mensaje, selector);
    tarjeta.append(principal, estadoContenedor);
    lista.append(tarjeta);
  });
}

filtroPrioridad.addEventListener("change", mostrarReservas);
filtroEstado.addEventListener("change", mostrarReservas);

observarAdministrador(async () => {
  lista.textContent = "Cargando reservas...";
  reservas = await listarReservas();
  mostrarReservas();
}, motivo => {
  reservas = [];
  lista.textContent = motivo;
});
