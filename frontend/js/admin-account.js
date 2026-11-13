import { auth } from "./firebase-api.js";
import { ADMIN_UID } from "./reservas-firebase.js";
import {
    onAuthStateChanged, signOut, updateProfile, EmailAuthProvider,
    reauthenticateWithCredential, verifyBeforeUpdateEmail, reload
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const NOMBRE = "Juliana Salazar";
const CORREO = "julianasalazarmendez@gmail.com";
const paginaPrivada = location.pathname.split("/").pop().startsWith("perfiladministrador");
let usuarioActual = null;
let cerrando = false;
let guardando = false;

function nombrePerfil(usuario) {
    const nombre = usuario?.displayName?.trim();
    return !nombre || /^(admin|administrador|fernanda(?: saldivar)?)$/i.test(nombre) ? NOMBRE : nombre;
}

function mostrarCuenta() {
    const admin = usuarioActual?.uid === ADMIN_UID;
    const nombre = nombrePerfil(usuarioActual);
    const primero = nombre.split(/\s+/)[0];
    document.querySelectorAll(".admin-sidebar__titulo, .admin-sidebar__nombre").forEach(el => {
        el.textContent = primero;
    });
    const correo = document.querySelector(".admin-sidebar__correo");
    if (correo) correo.textContent = admin ? usuarioActual.email : CORREO;
    const saludo = document.getElementById("admin-bienvenida");
    if (saludo) saludo.textContent = `Hola, ${primero}!`;
    const acceso = document.querySelector('[data-cuenta-header]');
    if (acceso) {
        acceso.href = admin ? "#cerrar-sesion" : "entradaadministrador.html";
        acceso.dataset.cerrarSesion = admin ? "true" : "false";
        acceso.setAttribute("aria-label", admin ? "Cerrar sesión" : "Acceder al administrador");
        acceso.title = admin ? "Cerrar sesión" : "Acceder al administrador";
    }
}

function rellenarPerfil() {
    const nombre = document.getElementById("nombre-admin");
    const correo = document.getElementById("correo-admin");
    const boton = document.querySelector(".info-personal-form__guardar");
    if (!nombre || !correo || !boton) return;
    const admin = usuarioActual?.uid === ADMIN_UID;
    nombre.disabled = correo.disabled = boton.disabled = !admin || guardando;
    if (!admin) return;
    nombre.value = nombrePerfil(usuarioActual);
    correo.value = usuarioActual.email || CORREO;
}

document.addEventListener("componente-cargado", mostrarCuenta);
document.addEventListener("click", async evento => {
    const enlace = evento.target.closest?.('[data-cerrar-sesion="true"]');
    if (!enlace) return;
    evento.preventDefault();
    if (cerrando) return;
    cerrando = true;
    enlace.setAttribute("aria-disabled", "true");
    try {
        await signOut(auth);
        location.replace("entradaadministrador.html");
    } catch {
        const mensaje = document.getElementById("mensaje-cuenta") || document.createElement("p");
        mensaje.id = "mensaje-cuenta";
        mensaje.setAttribute("role", "alert");
        mensaje.textContent = "No se pudo cerrar la sesión. Inténtalo nuevamente.";
        enlace.parentElement.append(mensaje);
    } finally {
        cerrando = false;
        enlace.removeAttribute("aria-disabled");
    }
});

onAuthStateChanged(auth, usuario => {
    usuarioActual = usuario;
    if (paginaPrivada && usuario?.uid !== ADMIN_UID) {
        location.replace("entradaadministrador.html");
        return;
    }
    mostrarCuenta();
    rellenarPerfil();
});

// También revisa la sesión al regresar con el botón Atrás del navegador.
window.addEventListener("pageshow", evento => {
    if (evento.persisted && paginaPrivada) location.reload();
});
window.addEventListener("focus", async () => {
    if (guardando || usuarioActual?.uid !== ADMIN_UID) return;
    const usuario = usuarioActual;
    const anterior = usuario.email;
    try {
        await reload(usuario);
        if (usuarioActual !== usuario) return;
        if (anterior !== usuario.email) rellenarPerfil();
        mostrarCuenta();
    } catch { /* El siguiente guardado informará si es necesario iniciar sesión. */ }
});

const formulario = document.querySelector(".info-personal-form");
formulario?.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (guardando) return;
    const usuario = auth.currentUser;
    const mensaje = document.getElementById("mensaje-perfil");
    if (usuario?.uid !== ADMIN_UID) {
        mensaje.textContent = "Inicia sesión con tu cuenta administradora.";
        return;
    }
    const nombre = document.getElementById("nombre-admin").value.trim();
    const correo = document.getElementById("correo-admin").value.trim();
    const password = document.getElementById("password-actual");
    const cambiaCorreo = correo.toLowerCase() !== usuario.email?.toLowerCase();
    if (!nombre || nombre.length > 80) {
        mensaje.textContent = "Escribe un nombre de hasta 80 caracteres.";
        return;
    }
    if (cambiaCorreo && !password.value) {
        mensaje.textContent = "Escribe tu contraseña actual para cambiar el correo.";
        password.focus();
        return;
    }
    guardando = true;
    formulario.querySelectorAll("input, button").forEach(el => { el.disabled = true; });
    mensaje.textContent = "Guardando...";
    let nombreGuardado = false;
    try {
        if (cambiaCorreo) {
            const credencial = EmailAuthProvider.credential(usuario.email, password.value);
            await reauthenticateWithCredential(usuario, credencial);
        }
        if (nombre !== usuario.displayName) {
            await updateProfile(usuario, { displayName: nombre });
            nombreGuardado = true;
            mostrarCuenta();
        }
        if (cambiaCorreo) {
            auth.languageCode = "es";
            await verifyBeforeUpdateEmail(usuario, correo);
            mensaje.textContent = `Te enviamos un enlace a ${correo}. Confírmalo para completar el cambio de correo. Tu correo actual sigue siendo ${usuario.email}.`;
        } else {
            mensaje.textContent = "Tus datos quedaron guardados.";
        }
    } catch (error) {
        const mensajes = {
            "auth/invalid-credential": "La contraseña actual no es correcta.",
            "auth/wrong-password": "La contraseña actual no es correcta.",
            "auth/too-many-requests": "Hubo demasiados intentos. Espera un momento y vuelve a intentarlo.",
            "auth/email-already-in-use": "Ese correo ya está asociado a otra cuenta.",
            "auth/invalid-email": "Revisa el nuevo correo electrónico.",
            "auth/requires-recent-login": "Vuelve a iniciar sesión e intenta el cambio nuevamente.",
            "auth/network-request-failed": "No se pudo conectar. Revisa tu conexión e inténtalo nuevamente."
        };
        mensaje.textContent = (nombreGuardado ? "El nombre se guardó. " : "") +
            (mensajes[error.code] || "No se pudo completar el cambio. Inténtalo nuevamente.");
    } finally {
        password.value = "";
        guardando = false;
        formulario.querySelectorAll("input, button").forEach(el => { el.disabled = auth.currentUser?.uid !== ADMIN_UID; });
    }
});
