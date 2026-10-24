import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

// Debe coincidir con isAdmin() en firestore.rules. Vacío deniega el acceso.
export const ADMIN_UID = "P4AYQuUQEoVmveHWvyfWKLcUTT53";
const app = getApps().length ? getApp() : initializeApp({
    apiKey: "AIzaSyBrAVOQr7TQ-YMZidGw15__afkNMK5DJMc",
    authDomain: "paleteria-60039.firebaseapp.com",
    projectId: "paleteria-60039",
    appId: "1:344009417792:web:f5ff100da14b35e5e1eba5"
});
export const db = getFirestore(app);
export const auth = getAuth(app);
export const estados = ["pendiente", "confirmada", "finalizada", "cancelada"];
export function observarAdministrador(permitido, denegado) {
    let cancelar = () => {};
    return onAuthStateChanged(auth, usuario => {
        cancelar();
        cancelar = () => {};
        if (!ADMIN_UID || usuario?.uid !== ADMIN_UID) {
            denegado(!ADMIN_UID ? "Falta configurar el UID administrador." : "Debes iniciar sesión con la cuenta administradora.");
            return;
        }
        cancelar = permitido(usuario) || (() => {});
    });
}
export async function guardarEstado(id, estado) {
    if (!ADMIN_UID || auth.currentUser?.uid !== ADMIN_UID) throw new Error("Acceso no autorizado.");
    if (!estados.includes(estado)) throw new Error("Estado inválido.");
    await updateDoc(doc(db, "reservas", id), {
        estado,
        fechaActualizacion: serverTimestamp(),
        actualizadoPor: auth.currentUser.uid
    });
}
