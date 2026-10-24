import { db, observarAdministrador, guardarEstado } from "./reservas-firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

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

    const filtradas = reservas.filter(r =>
        (filtroPrioridad.value === "todas" || r.prioridad === filtroPrioridad.value) &&
        (filtroEstado.value === "todos" || r.estado === filtroEstado.value)
    );

    if (!filtradas.length) {
        lista.append(crearElemento("p", "", "No hay reservas para mostrar."));
        return;
    }

    filtradas.forEach(r => {
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
        const enlace = crearElemento("a", "", r.nombreContacto || "Sin nombre");
        enlace.href = "perfiladministrador-misreservas-info.html?id=" + encodeURIComponent(r.id);
        titulo.append(enlace);
        const prioridad = crearElemento(
            "span",
            `pedido-card__prioridad pedido-card__prioridad--${r.prioridad || "media"}`,
            `Prioridad ${r.prioridad || "media"}`
        );

        cabecera.append(titulo, prioridad);

        const correo = crearElemento("a", "pedido-card__correo", r.correoContacto || "");
        correo.href = `mailto:${r.correoContacto || ""}`;

        const detalles = crearElemento("div", "reserva-card__detalles");
        detalles.append(
            crearElemento("span", "", `${r.numeroInvitados || 0} personas`),
            crearElemento("span", "", " • "),
            crearElemento("span", "", r.fechaEvento || "Sin fecha")
        );

        informacion.append(cabecera, correo, detalles);
        principal.append(icono, informacion);

        const estadoContenedor = crearElemento("div", "pedido-card__estado");
        estadoContenedor.append(crearElemento("label", "", "Estado"));

        const estado = crearElemento("select", "pedido-card__select");
        ["pendiente", "confirmada", "finalizada", "cancelada"].forEach(valor => {
            const opcion = document.createElement("option");
            opcion.value = valor;
            opcion.textContent = valor.charAt(0).toUpperCase() + valor.slice(1);
            estado.append(opcion);
        });

        estado.value = r.estado || "pendiente";
        estado.setAttribute("aria-label", "Estado de la reserva de " + (r.nombreContacto || r.id));
        const mensaje = crearElemento("p");
        mensaje.setAttribute("role", "status");
        estado.addEventListener("change", async () => {
            const anterior = r.estado || "pendiente";
            const siguiente = estado.value;
            estado.disabled = true;
            mensaje.textContent = "Guardando...";
            try {
                await guardarEstado(r.id, siguiente);
                r.estado = siguiente;
                mostrarReservas();
            } catch (error) {
                estado.value = anterior;
                mensaje.textContent = "No se pudo guardar el estado. Revisa tu sesión y los permisos de Firestore.";
            } finally {
                estado.disabled = false;
            }
        });
        estadoContenedor.append(mensaje);
        estadoContenedor.append(estado);

        tarjeta.append(principal, estadoContenedor);
        lista.append(tarjeta);
    });
}

filtroPrioridad.addEventListener("change", mostrarReservas);
filtroEstado.addEventListener("change", mostrarReservas);

observarAdministrador(() => onSnapshot(
    collection(db, "reservas"),
    resultado => {
        reservas = resultado.docs.map(documento => ({ ...documento.data(), id: documento.id }));
        mostrarReservas();
    },
    () => { reservas = []; lista.textContent = "No se pudieron cargar las reservas. Revisa los permisos de Firestore."; }
), mensaje => { reservas = []; lista.textContent = mensaje; });
