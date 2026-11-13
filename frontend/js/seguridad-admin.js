import { auth } from "./firebase-api.js";
import { ADMIN_UID } from "./reservas-firebase.js";
import { onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const formulario = document.querySelector(".seguridad-form");
const mensaje = document.getElementById("mensaje-seguridad");
const actual = document.getElementById("contrasena-actual");
const nueva = document.getElementById("nueva-contrasena");
const confirmar = document.getElementById("confirmar-contrasena");
let guardando = false;
const habilitar = () => formulario.querySelectorAll("input, button").forEach(el => {
    el.disabled = guardando || auth.currentUser?.uid !== ADMIN_UID;
});
onAuthStateChanged(auth, habilitar);
formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (guardando) return;
    const usuario = auth.currentUser;
    if (usuario?.uid !== ADMIN_UID) { mensaje.textContent = "Inicia sesión como administradora."; return; }
    if (nueva.value !== confirmar.value) { mensaje.textContent = "Las contraseñas nuevas no coinciden."; return; }
    if (nueva.value === actual.value) { mensaje.textContent = "Elige una contraseña diferente a la actual."; return; }
    if (!actual.value || nueva.value.length < 6) { mensaje.textContent = "Completa la contraseña actual y escribe una nueva de al menos 6 caracteres."; return; }
    guardando = true; habilitar(); mensaje.textContent = "Actualizando contraseña...";
    try {
        await reauthenticateWithCredential(usuario, EmailAuthProvider.credential(usuario.email, actual.value));
        await updatePassword(usuario, nueva.value);
        // La contraseña ya se guardó aunque una reconexión retrase el nuevo token.
        await usuario.getIdToken(true).catch(() => {});
        mensaje.textContent = "Tu contraseña quedó actualizada. Úsala la próxima vez que inicies sesión.";
    } catch (error) {
        const errores = {
            "auth/invalid-credential": "La contraseña actual no es correcta.",
            "auth/wrong-password": "La contraseña actual no es correcta.",
            "auth/weak-password": "La nueva contraseña no cumple los requisitos de seguridad de Firebase.",
            "auth/password-does-not-meet-requirements": "La nueva contraseña no cumple los requisitos de seguridad de Firebase.",
            "auth/too-many-requests": "Espera un momento antes de volver a intentarlo.",
            "auth/requires-recent-login": "Vuelve a iniciar sesión e inténtalo nuevamente."
        };
        mensaje.textContent = errores[error.code] || "No se pudo completar el cambio. Revisa tu conexión e inténtalo nuevamente.";
    } finally {
        actual.value = nueva.value = confirmar.value = "";
        guardando = false; habilitar();
    }
});
