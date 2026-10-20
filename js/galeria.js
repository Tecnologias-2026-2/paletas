const carrusel = document.querySelector(".galeria-contenedor");

if (carrusel) {
    let arrastrando = false;
    let seDesplazo = false;
    let inicioX = 0;
    let scrollInicial = 0;
    let punteroActivo = null;

    carrusel.addEventListener("pointerdown", (evento) => {
        // En celular usamos el desplazamiento nativo del navegador.
        if (evento.pointerType === "touch") return;

        // Solo permitir el botón izquierdo del mouse.
        if (evento.pointerType === "mouse" && evento.button !== 0) {
            return;
        }

        arrastrando = true;
        seDesplazo = false;
        punteroActivo = evento.pointerId;
        inicioX = evento.clientX;
        scrollInicial = carrusel.scrollLeft;

        carrusel.setPointerCapture(evento.pointerId);
        carrusel.classList.add("galeria-contenedor--arrastrando");
    });

    carrusel.addEventListener("pointermove", (evento) => {
        if (
            !arrastrando ||
            evento.pointerId !== punteroActivo
        ) {
            return;
        }

        const distancia = evento.clientX - inicioX;

        if (Math.abs(distancia) > 6) {
            seDesplazo = true;
        }

        if (seDesplazo) {
            evento.preventDefault();
            carrusel.scrollLeft = scrollInicial - distancia;
        }
    });

    function detenerArrastre(evento) {
        if (
            !arrastrando ||
            evento.pointerId !== punteroActivo
        ) {
            return;
        }

        arrastrando = false;
        punteroActivo = null;

        carrusel.classList.remove(
            "galeria-contenedor--arrastrando"
        );

        if (carrusel.hasPointerCapture(evento.pointerId)) {
            carrusel.releasePointerCapture(evento.pointerId);
        }
    }

    carrusel.addEventListener("pointerup", detenerArrastre);
    carrusel.addEventListener("pointercancel", detenerArrastre);
    carrusel.addEventListener(
        "lostpointercapture",
        () => {
            arrastrando = false;
            punteroActivo = null;

            carrusel.classList.remove(
                "galeria-contenedor--arrastrando"
            );
        }
    );

    // Evita que las imágenes se arrastren separadamente.
    carrusel.addEventListener("dragstart", (evento) => {
        evento.preventDefault();
    });

    // Evita activar un enlace o girar una imagen después
    // de haber arrastrado el carrusel.
    carrusel.addEventListener(
        "click",
        (evento) => {
            if (!seDesplazo) return;

            evento.preventDefault();
            evento.stopPropagation();
            seDesplazo = false;
        },
        true
    );
}
