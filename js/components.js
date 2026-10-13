async function cargarComponente(id, archivo) {
    const contenedor = document.getElementById(id);
    if (!contenedor) return;

    const respuesta = await fetch(archivo);

    if (!respuesta.ok) {
        throw new Error(`No se pudo cargar ${archivo}`);
    }

    contenedor.innerHTML = await respuesta.text();

    if (id === "header") marcarPaginaActual();
}

function marcarPaginaActual() {
    const archivo = location.pathname.split("/").pop() || "home.html";
    const actual = archivo.startsWith("paletas") ? "paletas.html" : archivo;

    document.querySelectorAll("#header a[href]").forEach((enlace) => {
        const esActual = enlace.getAttribute("href") === actual;

        enlace.classList.toggle(
            "navbar__link--active",
            esActual && enlace.classList.contains("navbar__link")
        );

        if (esActual) enlace.setAttribute("aria-current", "page");
        else enlace.removeAttribute("aria-current");
    });
}

cargarComponente("header", "components/header.html");
cargarComponente("footer", "components/footer.html");
cargarComponente("sidebar-admin", "components/sidebar.html");
