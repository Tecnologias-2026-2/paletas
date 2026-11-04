
import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { apiRequest, auth } from "./firebase-api.js";

const formulario = document.getElementById("admin-login-form");
const correoInput = document.getElementById("admin-correo");
const passwordInput = document.getElementById("admin-password");
const mensajeError = document.getElementById("admin-login-error");
const botonEntrar = document.getElementById("admin-entrar");
const botonRecuperacion = document.getElementById("enviar-recuperacion");
const tituloRecuperacion = document.getElementById("recuperacion-titulo");
const mensajeRecuperacion = document.getElementById("recuperacion-mensaje");


const CLAVE_BLOQUEO = "admin-login-bloqueo";
const DURACION_BLOQUEO = 60 * 1000;

function leerBloqueo() {
    return JSON.parse(localStorage.getItem(CLAVE_BLOQUEO) || '{"intentos":0,"hasta":0}');
}

function guardarBloqueo(datos) {
    localStorage.setItem(CLAVE_BLOQUEO, JSON.stringify(datos));
}

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const bloqueo = leerBloqueo();

    if (Date.now() < bloqueo.hasta) {
        const segundos = Math.ceil((bloqueo.hasta - Date.now()) / 1000);
        mensajeError.textContent =
            `Demasiados intentos. Espera ${segundos} segundos.`;
        return;
    }

    if (bloqueo.hasta && Date.now() >= bloqueo.hasta) {
        bloqueo.intentos = 0;
        bloqueo.hasta = 0;
    }

    mensajeError.textContent = "";
    botonEntrar.disabled = true;

    try {
        await signInWithEmailAndPassword(
            auth,
            correoInput.value.trim(),
            passwordInput.value
        );

        try {
            await apiRequest("/api/admin", {}, true);
        } catch (error) {
            await signOut(auth);
            mensajeError.textContent =
                `Firebase inició sesión, pero el backend rechazó el acceso: ${error.message}`;
            return;
        }

        localStorage.removeItem(CLAVE_BLOQUEO);
        mensajeError.textContent = "Cuenta de Firebase y acceso a la API verificados.";
        window.location.href = "perfiladministrador.html";

    } catch (error) {
        // Contamos únicamente errores de credenciales.
        if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(error.code)) {
            bloqueo.intentos++;

            if (bloqueo.intentos >= 3) {
                bloqueo.hasta = Date.now() + DURACION_BLOQUEO;
                mensajeError.textContent =
                    "Has alcanzado 3 intentos incorrectos. Espera 1 minuto.";
            } else {
                mensajeError.textContent =
                    `Credenciales incorrectas. Intentos restantes: ${3 - bloqueo.intentos}`;
            }

            guardarBloqueo(bloqueo);
        } else {
            console.error("Error de autenticación:", error.code);
            mensajeError.textContent =
                "No se pudo iniciar sesión. Revisa la consola.";
        }
    } finally {
        botonEntrar.disabled = false;
    }
});

botonRecuperacion.addEventListener("click", async () => {
    const correo = correoInput.value.trim();

    if (!correo || !correoInput.checkValidity()) {
        mensajeRecuperacion.textContent =
            "Primero escribe un correo electrónico válido.";
        return;
    }

    botonRecuperacion.disabled = true;

    try {
        await sendPasswordResetEmail(auth, correo);

        tituloRecuperacion.textContent = "Solicitud recibida";
        mensajeRecuperacion.textContent =
            "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.";

        botonRecuperacion.hidden = true;

    } catch (error) {
        tituloRecuperacion.textContent = "No se pudo enviar";
        mensajeRecuperacion.textContent =
            "No pudimos procesar la solicitud. Intenta nuevamente.";
    } finally {
        botonRecuperacion.disabled = false;
    }
});
const botonOjo = document.getElementById("mostrar-password");

botonOjo.addEventListener("click", () => {
    const visible = passwordInput.type === "password";

    passwordInput.type = visible ? "text" : "password";

    botonOjo.setAttribute(
        "aria-label",
        visible ? "Ocultar contraseña" : "Mostrar contraseña"
    );

    botonOjo.setAttribute("aria-pressed", String(visible));
});