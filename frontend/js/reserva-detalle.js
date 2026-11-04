import {
  estados,
  guardarEstado,
  observarAdministrador,
  obtenerReserva
} from "./reservas-firebase.js";

const contenido = document.getElementById("contenido-reserva");
const mensaje = document.getElementById("mensaje-detalle");
const formulario = document.getElementById("form-estado");
const selector = document.getElementById("reserva-estado");
const boton = document.getElementById("guardar-estado");
const feedback = document.getElementById("mensaje-estado");
const id = new URLSearchParams(location.search).get("id");
let reserva = null;
let guardando = false;

function texto(valor) {
  if (valor === undefined || valor === null || valor === "") return "No registrado";
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

function bloquear(motivo) {
  reserva = null;
  contenido.hidden = true;
  selector.disabled = boton.disabled = true;
  mensaje.textContent = motivo;
}

function mostrar(datos) {
  reserva = datos;
  document.getElementById("titulo-reserva").textContent = `Reserva de ${texto(datos.nombreContacto)}`;
  document.querySelector('[aria-current="page"]').textContent = texto(datos.nombreContacto);
  document.getElementById("estado-actual").textContent = texto(datos.estado || "pendiente");
  document.querySelectorAll("[data-campo]").forEach(elemento => {
    elemento.textContent = texto(datos[elemento.dataset.campo]);
  });
  const campos = {
    "reserva-nombre": "nombreContacto",
    "reserva-direccion": "ubicacionEvento",
    "reserva-correo": "correoContacto",
    "reserva-ciudad": "codigoPostal"
  };
  Object.entries(campos).forEach(([elemento, campo]) => {
    document.getElementById(elemento).value = texto(datos[campo]);
  });
  const paginaCorreos = `perfiladministrador-correos.html?reserva=${encodeURIComponent(id)}`;
  document.getElementById("enviar-correo").href = `${paginaCorreos}#plantilla-correo`;
  document.getElementById("ver-correos").href = paginaCorreos;
  selector.value = estados.includes(datos.estado) ? datos.estado : "pendiente";
  contenido.hidden = false;
  mensaje.textContent = "";
  selector.disabled = boton.disabled = guardando;
}

if (!id || id.includes("/")) {
  bloquear("No se indicó una reserva válida. Vuelve a Mis reservas y selecciona una.");
} else {
  observarAdministrador(async () => {
    try {
      mostrar(await obtenerReserva(id));
    } catch (error) {
      bloquear(error.message);
    }
  }, bloquear);
}

formulario.addEventListener("submit", async evento => {
  evento.preventDefault();
  if (!reserva || guardando) return;
  const anterior = reserva.estado || "pendiente";
  const siguiente = selector.value;
  if (anterior === siguiente) {
    feedback.textContent = "La reserva ya tiene ese estado.";
    return;
  }
  guardando = true;
  selector.disabled = boton.disabled = true;
  feedback.textContent = "Guardando...";
  try {
    await guardarEstado(id, siguiente);
    reserva.estado = siguiente;
    document.getElementById("estado-actual").textContent = siguiente;
    feedback.textContent = "Estado guardado correctamente.";
  } catch (error) {
    selector.value = reserva.estado || anterior;
    feedback.textContent = error.message;
  } finally {
    guardando = false;
    selector.disabled = boton.disabled = !reserva;
  }
});
