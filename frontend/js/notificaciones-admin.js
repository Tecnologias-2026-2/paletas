import { apiRequest, auth } from "./firebase-api.js";
import { ADMIN_UID } from "./reservas-firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
const form = document.querySelector(".notificaciones-form");
const mensaje = document.getElementById("mensaje-notificaciones");
const categorias = ["compras", "contacto", "correos", "eventos"];
const controles = () => form.querySelectorAll("input, button");
let cargado = false;
let ocupado = false;
function bloquear(valor) { controles().forEach(el => { el.disabled = valor; }); }
onAuthStateChanged(auth, async usuario => {
    cargado = false; bloquear(true);
    if (usuario?.uid !== ADMIN_UID) { mensaje.textContent = "Inicia sesión como administradora."; return; }
    mensaje.textContent = "Cargando preferencias...";
    try {
        const datos = await apiRequest("/api/admin/notifications", {}, true);
        if (auth.currentUser !== usuario) return;
        categorias.forEach(c => { document.getElementById("notificacion-" + c).checked = datos.preferencias[c]; });
        cargado = true; bloquear(false);
        mensaje.textContent = `Las alertas se enviarán a ${datos.correo}.`;
    } catch { mensaje.textContent = "No se pudieron cargar las preferencias. Recarga para volver a intentarlo."; }
});
form.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!cargado || ocupado) return;
    ocupado = true; bloquear(true); mensaje.textContent = "Guardando...";
    const preferencias = Object.fromEntries(categorias.map(c => [c, document.getElementById("notificacion-" + c).checked]));
    try {
        const datos = await apiRequest("/api/admin/notifications", {method:"PUT", body:JSON.stringify(preferencias)}, true);
        mensaje.textContent = `Preferencias guardadas. Las alertas activadas se enviarán a ${datos.correo}.`;
    } catch { mensaje.textContent = "No se pudieron guardar los cambios. Inténtalo nuevamente."; }
    finally { ocupado = false; bloquear(auth.currentUser?.uid !== ADMIN_UID); }
});
document.getElementById("probar-notificaciones").addEventListener("click", async () => {
    if (!cargado || ocupado) return;
    ocupado = true; bloquear(true); mensaje.textContent = "Enviando correo de prueba...";
    try {
        const datos = await apiRequest("/api/admin/notifications/test", {method:"POST"}, true);
        mensaje.textContent = `El servicio de correo aceptó la prueba para ${datos.correo}. Revisa también la carpeta de spam.`;
    } catch (error) { mensaje.textContent = error.message || "No se pudo enviar el correo. Revisa la configuración del servidor."; }
    finally { ocupado = false; bloquear(auth.currentUser?.uid !== ADMIN_UID); }
});
