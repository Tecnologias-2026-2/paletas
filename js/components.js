async function cargarComponente(id, archivo) {
    const respuesta = await fetch(archivo);

    if (!respuesta.ok) {
        throw new Error(`No se pudo cargar ${archivo}`);
    }

    const contenido = await respuesta.text();

    document.getElementById(id).innerHTML = contenido;
}
cargarComponente("header", "components/header.html");
cargarComponente("footer", "components/footer.html");
cargarComponente("sidebar-admin","components/sidebar.html");