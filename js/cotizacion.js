import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBrAVOQr7TQ-YMZidGw15__afkNMK5DJMc",
    authDomain: "paleteria-60039.firebaseapp.com",
    projectId: "paleteria-60039",
    storageBucket: "paleteria-60039.firebasestorage.app",
    messagingSenderId: "344009417792",
    appId: "1:344009417792:web:f5ff100da14b35e5e1eba5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const formulario = document.getElementById(
    "formulario-cotizacion"
);

if (formulario) {
    const fechaEvento = document.getElementById(
        "fecha-evento"
    );

    const requerimientos = document.getElementById(
        "requerimientos"
    );

    const contador = document.getElementById(
        "contador-requerimientos"
    );

    const estadoFormulario = document.getElementById(
        "estado-formulario"
    );

    const controles = formulario.querySelectorAll(
        "input:not([type='radio']), textarea"
    );

    establecerFechaMinima();

    controles.forEach((control) => {
        control.addEventListener("input", () => {
            limpiarError(control);
            estadoFormulario.textContent = "";
        });

        control.addEventListener("blur", () => {
            validarCampo(control);
        });
    });

    formulario
        .querySelectorAll('input[name="tipoEvento"]')
        .forEach((radio) => {
            radio.addEventListener("change", () => {
                document.getElementById(
                    "error-tipo-evento"
                ).textContent = "";
            });
        });

    requerimientos.addEventListener("input", () => {
        contador.textContent = requerimientos.value.length;
    });

   formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        estadoFormulario.textContent = "";

        const tipoEventoSeleccionado =
            formulario.querySelector(
                'input[name="tipoEvento"]:checked'
            );

        const errorTipoEvento = document.getElementById(
            "error-tipo-evento"
        );

        if (!tipoEventoSeleccionado) {
            errorTipoEvento.textContent =
                "Selecciona un tipo de evento.";
        } else {
            errorTipoEvento.textContent = "";
        }

        let formularioValido = Boolean(
            tipoEventoSeleccionado
        );

        controles.forEach((control) => {
            if (!validarCampo(control)) {
                formularioValido = false;
            }
        });

        if (!formularioValido) {
            const primerCampoInvalido =
                formulario.querySelector(
                    ".campo--invalido input, " +
                    ".campo--invalido textarea"
                );

            if (primerCampoInvalido) {
                primerCampoInvalido.focus();
            } else {
                formulario
                    .querySelector(
                        'input[name="tipoEvento"]'
                    )
                    ?.focus();
            }

            return;
        }

        const datos = new FormData(formulario);
        const solicitud = Object.fromEntries(
            datos.entries()
        );

      const botonEnviar = formulario.querySelector('button[type="submit"]');

botonEnviar.disabled = true;
estadoFormulario.textContent = "Enviando solicitud...";

try {
    await addDoc(collection(db, "reservas"), {
        ...solicitud,
        numeroInvitados: Number(solicitud.numeroInvitados),
        estado: "pendiente",
        prioridad: "media",
        fechaSolicitud: serverTimestamp()
    });

    estadoFormulario.textContent =
        "¡Tu solicitud fue enviada correctamente!";

} catch (error) {
    console.error("Error al guardar reserva:", error);
    estadoFormulario.textContent =
        "No se pudo enviar tu solicitud. Inténtalo nuevamente.";
    botonEnviar.disabled = false;
    return;
}

botonEnviar.disabled = false;
        formulario.reset();
        contador.textContent = "0";

        establecerFechaMinima();

        formulario
            .querySelectorAll(".campo--invalido")
            .forEach((campo) => {
                campo.classList.remove("campo--invalido");
            });
    });

    function establecerFechaMinima() {
        const hoy = new Date();
        const anio = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(
            2,
            "0"
        );
        const dia = String(hoy.getDate()).padStart(
            2,
            "0"
        );

        fechaEvento.min = `${anio}-${mes}-${dia}`;
    }

    function validarCampo(control) {
        const campo = control.closest(".campo");
        const error = campo?.querySelector(".campo__error");

        if (!campo || !error) return true;

        let mensaje = "";

        if (control.validity.valueMissing) {
            mensaje = "Este campo es obligatorio.";
        } else if (control.validity.typeMismatch) {
            mensaje =
                "Ingresa un correo electrónico válido.";
        } else if (control.validity.patternMismatch) {
            mensaje =
                "El código postal debe tener 6 números.";
        } else if (control.validity.rangeUnderflow) {
            mensaje =
                "El número de invitados debe ser mayor a 0.";
        } else if (control.validity.rangeOverflow) {
            mensaje =
                "El número de invitados es demasiado alto.";
        } else if (control.validity.tooShort) {
            mensaje =
                `Escribe al menos ${control.minLength} caracteres.`;
        }

        if (
            control === fechaEvento &&
            control.value &&
            control.value < fechaEvento.min
        ) {
            mensaje =
                "La fecha del evento no puede ser anterior a hoy.";
        }

        campo.classList.toggle(
            "campo--invalido",
            Boolean(mensaje)
        );

        error.textContent = mensaje;

        return !mensaje;
    }

    function limpiarError(control) {
        const campo = control.closest(".campo");
        const error = campo?.querySelector(".campo__error");

        campo?.classList.remove("campo--invalido");

        if (error) {
            error.textContent = "";
        }
    }
}