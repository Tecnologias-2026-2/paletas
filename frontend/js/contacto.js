import { apiRequest } from "./firebase-api.js";
const formulario = document.getElementById("formulario-contacto");
formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    const boton = formulario.querySelector("button");
    if (boton.disabled) return;
    const mensaje = document.getElementById("mensaje-contacto");
    const datos = Object.fromEntries(new FormData(formulario));
    boton.disabled = true; mensaje.textContent = "Enviando mensaje...";
    try {
        await apiRequest("/api/contact", {method:"POST", body:JSON.stringify(datos)});
        formulario.reset(); mensaje.textContent = "Recibimos tu mensaje. Gracias por contactarnos.";
    } catch { mensaje.textContent = "No se pudo enviar tu mensaje. Inténtalo nuevamente."; }
    finally { boton.disabled = false; }
});
