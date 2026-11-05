import {
  enviarCorreo,
  enviarCorreoPedido,
  observarAdministrador,
  obtenerCorreos,
  obtenerCorreosPedido,
  obtenerPedido,
  obtenerReserva
} from "./reservas-firebase.js";

const elemento = id => document.getElementById(id);
const lista = elemento("lista-correos");
const contador = elemento("contador-correos");
const mensaje = elemento("mensaje-correo");
const formulario = elemento("formulario-correo");
const botonEnviar = elemento("enviar-correo-cliente");
const params = new URLSearchParams(location.search);
const reservaId = params.get("reserva");
const pedidoId = params.get("pedido");
const id = pedidoId || reservaId;
const esPedido = Boolean(pedidoId);

botonEnviar.disabled = true;
formulario.addEventListener("submit", async evento => {
  evento.preventDefault();
  if (!id || botonEnviar.disabled) return;

  botonEnviar.disabled = true;
  mensaje.textContent = "Enviando correo...";
  try {
    const contenido = {
      asunto: elemento("plantilla-asunto").value,
      titulo: elemento("plantilla-titulo").value,
      mensaje: elemento("plantilla-mensaje").value
    };
    if (esPedido) await enviarCorreoPedido(id, contenido);
    else await enviarCorreo(id, contenido);
    mensaje.textContent = "Correo enviado correctamente.";
    try {
      await cargarHistorial();
    } catch {
      mensaje.textContent = "Correo enviado, pero no se pudo actualizar el historial. Recarga la página.";
    }
  } catch (error) {
    mensaje.textContent = error.message || "No se pudo enviar el correo.";
    try {
      await cargarHistorial();
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

async function cargarHistorial() {
  const correos = esPedido ? await obtenerCorreosPedido(id) : await obtenerCorreos(id);
  contador.textContent = `${correos.length} ${correos.length === 1 ? "correo" : "correos"}`;
  lista.replaceChildren(...(correos.length
    ? correos.map(tarjeta)
    : [nodo("p", "", "No hay correos registrados para este pedido o reserva.")]));
}

observarAdministrador(async () => {
  if (pedidoId && reservaId) {
    limpiar("Abre el historial desde un pedido o una reserva, no ambos.");
    return;
  }
  if (!id || !id.trim() || id.includes("/") || id === "." || id === "..") {
    limpiar("Selecciona un pedido o reserva desde su pantalla de administración.");
    return;
  }
  try {
    limpiar(`Cargando ${esPedido ? "pedido" : "reserva"}...`);
    const registro = esPedido ? await obtenerPedido(id) : await obtenerReserva(id);
    const nombre = esPedido ? registro.cliente.nombre : registro.nombreContacto;
    const correo = esPedido ? registro.cliente.correo : registro.correoContacto;
    const referencia = esPedido ? registro.numero : `Reserva #${id}`;
    elemento("correo-cliente-nombre").textContent = texto(nombre);
    elemento("correo-cliente-email").textContent = texto(correo);
    elemento("correo-cliente-referencia").textContent = referencia;
    elemento("titulo-correos").textContent = `Correos del ${esPedido ? "pedido" : "reserva"}`;
    document.querySelector(".correos-admin__breadcrumb a[href='perfiladministrador-mispedidos.html']").textContent =
      esPedido ? "Mis pedidos" : "Mis reservas";
    document.querySelector(".correos-admin__breadcrumb a[href='perfiladministrador-mispedidos.html']").href =
      esPedido ? "perfiladministrador-mispedidos.html" : "perfiladministrador-misreservas.html";
    elemento("plantilla-asunto").value = esPedido
      ? "Actualización sobre tu pedido"
      : "Tu pedido ha sido confirmado";
    elemento("plantilla-titulo").value = esPedido
      ? "Tenemos una actualización para ti"
      : "¡Tu pedido fue confirmado!";
    elemento("plantilla-mensaje").value = esPedido
      ? "Queremos contarte que hay una actualización sobre tu pedido. Si tienes alguna duda, responde a este correo."
      : "Hemos recibido correctamente tu pedido. Nuestro equipo comenzará a prepararlo y te mantendremos informada sobre su estado.";
    lista.replaceChildren(nodo("p", "", "Cargando historial..."));
    botonEnviar.disabled = false;
    await cargarHistorial();
  } catch (error) {
    limpiar(error.message);
  }
}, limpiar);
