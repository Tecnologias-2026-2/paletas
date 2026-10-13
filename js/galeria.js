const carrusel = document.querySelector(".galeria-contenedor");

if (carrusel) {
    let arrastrando = false;
    let inicioX = 0;
    let scrollInicial = 0;
    let seDesplazo = false;

    // Detectar posición X para mouse y pantallas táctiles
    const obtenerX = (e) => e.type.includes('touch') ? e.touches[0].clientX : e.clientX;

    const iniciarArrastre = (e) => {
        if (e.type === 'mousedown' && e.button !== 0) return;

        arrastrando = true;
        seDesplazo = false;
        inicioX = obtenerX(e);
        scrollInicial = carrusel.scrollLeft;
    };

    const moverArrastre = (e) => {
        if (!arrastrando) return;

        const distancia = obtenerX(e) - inicioX;

        if (Math.abs(distancia) > 5) {
            seDesplazo = true;
        }

        if (seDesplazo) {
            carrusel.scrollLeft = scrollInicial - distancia;
        }
    };

    const detenerArrastre = () => {
        arrastrando = false;
    };

    // Eventos de Escritorio (Mouse)
    carrusel.addEventListener("mousedown", iniciarArrastre);
    window.addEventListener("mousemove", moverArrastre);
    window.addEventListener("mouseup", detenerArrastre);

    // Eventos Táctiles (Celulares y Tablets)
    carrusel.addEventListener("touchstart", iniciarArrastre, { passive: true });
    window.addEventListener("touchmove", moverArrastre, { passive: true });
    window.addEventListener("touchend", detenerArrastre);

    // Evitar clics accidentales al arrastrar el carrusel
    carrusel.addEventListener("click", (e) => {
        if (seDesplazo) {
            e.preventDefault();
            e.stopPropagation();
            seDesplazo = false;
        }
    }, true);
}