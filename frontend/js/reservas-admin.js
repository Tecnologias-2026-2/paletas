import { opcionesEstado, confirmarAvance, mensajeEstado } from "./estado-flujo.js";
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
    const tarjeta = crearElemento('article','reserva-resumen');
    const principal = crearElemento('a');
    principal.href = 'perfiladministrador-misreservas-info.html?id=' + encodeURIComponent(reserva.id);
    principal.style.cssText = 'display:block;color:inherit;text-decoration:none;';
    const cabecera = crearElemento('div','reserva-resumen__encabezado');
    const titulo = crearElemento('div');
    titulo.append(crearElemento('p','reserva-resumen__etiqueta','Información de la reserva'),crearElemento('h2','',reserva.nombreContacto));
    const badge = crearElemento('span','reserva-resumen__estado',reserva.estado);
    cabecera.append(titulo,badge);
    const datos = crearElemento('div','reserva-resumen__datos');
    [['Evento',reserva.tipoEvento],['Fecha',reserva.fechaEvento],['Invitados',reserva.numeroInvitados],['Ubicación',reserva.ubicacionEvento]].forEach(([etiqueta,valor])=>{
      const dato=crearElemento('div','reserva-resumen__dato'); dato.append(crearElemento('span','',etiqueta),crearElemento('strong','',valor));datos.append(dato);
    });
    principal.append(cabecera,datos);
    const correos=crearElemento('a','reserva-resumen__correos','Ver correos enviados');
    correos.href='perfiladministrador-correos.html?reserva='+encodeURIComponent(reserva.id);
    correos.style.cssText='display:inline-flex;text-decoration:none;margin-top:16px;';

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
    opcionesEstado(selector, reserva.estado || "pendiente", true);
    selector.setAttribute("aria-label", `Estado de la reserva de ${reserva.nombreContacto || reserva.id}`);
    const mensaje = crearElemento("p");
    mensaje.setAttribute("role", "status");
    selector.addEventListener("change", async () => {
      const anterior = reserva.estado || "pendiente";
      if (!confirmarAvance(anterior, selector.value)) { selector.value = anterior; return; }
      selector.disabled = true;
      mensaje.textContent = "Guardando...";
      try {
        const resultado = await guardarEstado(reserva.id, selector.value);
        reserva.estado = selector.value;
        badge.textContent = reserva.estado;
        mensaje.textContent = mensajeEstado(resultado);
        if (filtroEstado.value !== "todos" && filtroEstado.value !== reserva.estado) tarjeta.remove();
      } catch (error) {
        selector.value = anterior;
        mensaje.textContent = error.message;
      } finally {
        opcionesEstado(selector, reserva.estado, true);
      }
    });
    estadoContenedor.append(mensaje, selector);
    tarjeta.append(principal, estadoContenedor, correos);
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
