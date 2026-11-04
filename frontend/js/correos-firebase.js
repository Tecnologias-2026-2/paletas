import { enviarCorreo, observarAdministrador, obtenerCorreos, obtenerReserva } from "./reservas-firebase.js";

const elemento = id => document.getElementById(id);
const lista = elemento("lista-correos");
const contador = elemento("contador-correos");
const mensaje = elemento("mensaje-correo");
const formulario = elemento("formulario-correo");
const botonEnviar = elemento("enviar-correo-cliente");
const id = new URLSearchParams(location.search).get("reserva");

botonEnviar.disabled = true;
formulario.addEventListener("submit", async evento => {
  evento.preventDefault();
  if (!id || botonEnviar.disabled) return;

  botonEnviar.disabled = true;
  mensaje.textContent = "Enviando correo...";
  try {
    await enviarCorreo(id, {
      asunto: elemento("plantilla-asunto").value,
      titulo: elemento("plantilla-titulo").value,
      mensaje: elemento("plantilla-mensaje").value
    });
    mensaje.textContent = "Correo enviado correctamente.";
    try {
      await cargarHistorial(id);
    } catch {
      mensaje.textContent = "Correo enviado, pero no se pudo actualizar el historial. Recarga la página.";
    }
  } catch (error) {
    mensaje.textContent = error.message || "No se pudo enviar el correo.";
    try {
      await cargarHistorial(id);
    } catch {
      mensaje.textContent += " Tampoco se pudo actualizar el historial.";
    }
  } finally {
    botonEnviar.disabled = false;
  }
});

function texto(valor, defecto = "No registrado") {
  return typeof valor === "string" && valor.trim() ? valor : defecto;
}

function nodo(etiqueta, clase, contenido) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (contenido !== undefined) el.textContent = contenido;
  return el;
}

function limpiar(motivo) {
  botonEnviar.disabled = true;
  for (const campo of ["nombre", "email", "referencia"]) {
    elemento(`correo-cliente-${campo}`).textContent = "—";
  }
  contador.textContent = "0 correos";
  lista.replaceChildren(nodo("p", "", motivo));
}

function fecha(valor) {
  const date = typeof valor === "string" ? new Date(valor) : null;
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
}

function tarjeta(datos) {
  const card = nodo("details", "correo-card");
  const resumen = nodo("summary", "correo-card__resumen");
  const info = nodo("div", "correo-card__informacion");
  info.append(
    nodo("strong", "", texto(datos.titulo, texto(datos.asunto, "Correo"))),
    nodo("span", "", `Para: ${texto(datos.destinatario)}`)
  );
  const meta = nodo("div", "correo-card__meta");
  const date = fecha(datos.fechaEnvio);
  const time = nodo("time", "", date ? date.toLocaleString("es-CO") : "Fecha no registrada");
  if (date) time.dateTime = date.toISOString();
  meta.append(time, nodo("span", "correo-card__estado", texto(datos.estado, "Sin estado registrado")));
  resumen.append(nodo("div", "correo-card__icono", "✉"), info, meta);
  const contenido = nodo("div", "correo-card__contenido");
  const cuerpo = nodo("p", "correo-card__mensaje", texto(datos.mensaje));
  cuerpo.style.whiteSpace = "pre-wrap";
  contenido.append(nodo("p", "correo-card__asunto", `Asunto: ${texto(datos.asunto)}`), cuerpo);
  card.append(resumen, contenido);
  return card;
}

async function cargarHistorial(reservaId) {
  const correos = await obtenerCorreos(reservaId);
  contador.textContent = `${correos.length} ${correos.length === 1 ? "correo" : "correos"}`;
  lista.replaceChildren(...(correos.length
    ? correos.map(tarjeta)
    : [nodo("p", "", "No hay correos registrados para esta reserva.")]));
}

observarAdministrador(async () => {
  if (!id || !id.trim() || id.includes("/") || id === "." || id === "..") {
    limpiar("Selecciona una reserva válida mediante ?reserva=...");
    return;
  }
  try {
    limpiar("Cargando reserva...");
    const reserva = await obtenerReserva(id);
    elemento("correo-cliente-nombre").textContent = texto(reserva.nombreContacto);
    elemento("correo-cliente-email").textContent = texto(reserva.correoContacto);
    elemento("correo-cliente-referencia").textContent = `Reserva #${id}`;
    lista.replaceChildren(nodo("p", "", "Cargando historial..."));
    botonEnviar.disabled = false;
    await cargarHistorial(id);
  } catch (error) {
    limpiar(error.message);
  }
}, limpiar);
