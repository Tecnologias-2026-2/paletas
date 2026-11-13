import { apiRequest } from "./firebase-api.js";
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
let estadoActual = '';
const tipo = esPedido ? 'pedido' : 'reserva';
const rutaPlantilla = '/api/admin/state-template/' + tipo;
const guardarPlantilla = elemento('guardar-plantilla-automatica');
guardarPlantilla.addEventListener('click', async () => {
  if (guardarPlantilla.disabled) return;
  guardarPlantilla.disabled = true;
  try {
    await apiRequest(rutaPlantilla,{method:'PUT',body:JSON.stringify({asunto:elemento('plantilla-asunto').value,titulo:elemento('plantilla-titulo').value,mensaje:elemento('plantilla-mensaje').value})},true);
    mensaje.textContent = 'Plantilla automática guardada para los próximos cambios de estado.';
  } catch(error) { mensaje.textContent = error.message; }
  finally { guardarPlantilla.disabled = false; }
});

botonEnviar.disabled = true;
formulario.addEventListener("submit", async evento => {
  evento.preventDefault();
  if (!id || botonEnviar.disabled) return;

  botonEnviar.disabled = true;
  mensaje.textContent = "Enviando correo...";
  try {
    const contenido = {
      asunto: elemento("plantilla-asunto").value.replaceAll("{estado}", estadoActual),
      titulo: elemento("plantilla-titulo").value.replaceAll("{estado}", estadoActual),
      mensaje: elemento("plantilla-mensaje").value.replaceAll("{estado}", estadoActual)
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
  guardarPlantilla.disabled=true;
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
  if (datos.automatico) info.append(nodo('span','','Correo automático de cambio de estado'));
  if (datos.automatico && ['fallido','pendiente'].includes(datos.estado)) {
    const reintentar=nodo('button','plantilla-correo__guardar','Reintentar envío');
    reintentar.type='button';
    reintentar.addEventListener('click',async()=>{
      reintentar.disabled=true;
      try {
        const resultado=await apiRequest(rutaPlantilla+'/'+encodeURIComponent(id)+'/'+encodeURIComponent(datos.id),{method:'POST'},true);
        mensaje.textContent=resultado.estado==='enviado'?'Correo enviado.':'No se pudo enviar el correo. Revisa el servicio de correo e inténtalo nuevamente.';
        await cargarHistorial();
      } catch(error) { mensaje.textContent=error.message; reintentar.disabled=false; }
    });
    contenido.append(reintentar);
  }
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
    estadoActual = registro.estado === 'proceso' ? 'puesto en proceso' : registro.estado;
    const plantilla = await apiRequest(rutaPlantilla,{},true);
    for (const campo of ['asunto','titulo','mensaje']) elemento('plantilla-'+campo).value=plantilla[campo];
    guardarPlantilla.disabled=false;
    lista.replaceChildren(nodo("p", "", "Cargando historial..."));
    botonEnviar.disabled = false;
    await cargarHistorial();
  } catch (error) {
    limpiar(error.message);
  }
}, limpiar);
