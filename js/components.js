async function cargarComponente(id, archivo) {
    const contenedor = document.getElementById(id);

    if (!contenedor) return;

    try {
        const respuesta = await fetch(archivo);

        if (!respuesta.ok) {
            throw new Error(`No se pudo cargar ${archivo}`);
        }

        contenedor.innerHTML = await respuesta.text();

        if (id === "header") {
            marcarPaginaActual();
            configurarMenuMovil();
            configurarPuntoCarrito();
        }
    } catch (error) {
        console.error(error);
    }
}

function marcarPaginaActual() {
    const archivo =
        location.pathname.split("/").pop() || "index.html";

    const actual = archivo.startsWith("paletas")
        ? "paletas.html"
        : archivo;

    document
        .querySelectorAll("#header a[href]")
        .forEach((enlace) => {
            const esActual =
                enlace.getAttribute("href") === actual;

            enlace.classList.toggle(
                "navbar__link--active",
                esActual &&
                    enlace.classList.contains("navbar__link")
            );

            if (esActual) {
                enlace.setAttribute("aria-current", "page");
            } else {
                enlace.removeAttribute("aria-current");
            }
        });
}

function configurarMenuMovil() {
    const header = document.getElementById("header");
    const botonMenu = header?.querySelector(
        ".navbar__hamburguesa"
    );
    const menu = header?.querySelector(".navbar__menu");

    if (!botonMenu || !menu) return;

    function cerrarMenu() {
        menu.classList.remove("navbar__menu--abierto");
        botonMenu.setAttribute("aria-expanded", "false");
        botonMenu.setAttribute(
            "aria-label",
            "Abrir menú de navegación"
        );
    }

    botonMenu.addEventListener("click", () => {
        const estaAbierto =
            botonMenu.getAttribute("aria-expanded") === "true";

        menu.classList.toggle(
            "navbar__menu--abierto",
            !estaAbierto
        );

        botonMenu.setAttribute(
            "aria-expanded",
            String(!estaAbierto)
        );

        botonMenu.setAttribute(
            "aria-label",
            estaAbierto
                ? "Abrir menú de navegación"
                : "Cerrar menú de navegación"
        );
    });

    menu.querySelectorAll(".navbar__link").forEach((enlace) => {
        enlace.addEventListener("click", cerrarMenu);
    });

    document.addEventListener("click", (evento) => {
        if (!header.contains(evento.target)) {
            cerrarMenu();
        }
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") {
            cerrarMenu();
            botonMenu.focus();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) {
            cerrarMenu();
        }
    });
}

function configurarPuntoCarrito() {
    const enlace = document.querySelector('#header a[href="mi-carrito.html"].navbar__icono');
    const punto = enlace?.querySelector(".navbar__punto");

    if (!enlace || !punto) return;

    function actualizar() {
        let hay = false;

        try {
            const carrito = JSON.parse(localStorage.getItem("carrito-paletas")) || {};
            hay = Object.values(carrito).some((p) => p.cantidad > 0);
        } catch {
            hay = false;
        }

        punto.hidden = !hay;
        enlace.setAttribute(
            "aria-label",
            hay
                ? "Ver carrito de compras, tienes productos en el carrito"
                : "Ver carrito de compras"
        );
    }

    const actualizarDespues = () => setTimeout(actualizar, 0);

    actualizar();
    document.addEventListener("carrito-actualizado", actualizar);
    document.addEventListener("click", actualizarDespues);
    document.addEventListener("change", actualizarDespues);
    window.addEventListener("storage", actualizar);
    window.addEventListener("pageshow", actualizar);
}

cargarComponente("header", "components/header.html");
cargarComponente("footer", "components/footer.html");
cargarComponente(
    "sidebar-admin",
    "components/sidebar.html"
);