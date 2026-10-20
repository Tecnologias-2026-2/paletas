/*
 * Capa de datos del catálogo de paletas.
 *
 * Hoy guarda en localStorage (solo en este navegador). Para conectar la base
 * de datos, reemplaza el cuerpo de estas funciones por llamadas fetch() a la
 * API; paletas.html y la página de administración no necesitan cambios porque
 * todas las funciones ya devuelven Promesas.
 */
(() => {
  const CLAVE = "paletas-catalogo";

  const INICIALES = [
    { id: "frutas-frescas", nombre: "Paleta de Frutas Frescas", precio: 8500, peso: "90gr", imagen: "assets/imagenes/paletas/frutas-frescas.png", alt: "Paleta con trozos de kiwi, fresa y mango", categorias: ["frutales"] },
    { id: "fresa-cremosa", nombre: "Paleta de Fresa Cremosa", precio: 9500, peso: "90gr", imagen: "assets/imagenes/paletas/fresa-cremosa.png", alt: "Paleta cremosa de fresa con trozos de fruta", categorias: ["frutales", "cremosas"] },
    { id: "uva-dulce", nombre: "Paleta de Uva Dulce", precio: 10000, peso: "90gr", imagen: "assets/imagenes/paletas/uva-dulce.png", alt: "Paleta morada de uva junto a un racimo de uvas", categorias: ["frutales"] },
    { id: "chamoy", nombre: "Paleta Chamoy", precio: 12000, peso: "90gr", imagen: "assets/imagenes/paletas/chamoy.png", alt: "Paleta de chamoy en capas rojas y naranjas", categorias: ["exclusivas"] },
    { id: "limon", nombre: "Paleta de Limón", precio: 6000, peso: "90gr", imagen: "assets/imagenes/paletas/limon.png", alt: "Paleta verde de limón", categorias: ["frutales"] },
    { id: "sandia-festiva", nombre: "Paleta Sandía Festiva", precio: 9000, peso: "90gr", imagen: "assets/imagenes/paletas/sandia-festiva.png", alt: "Paleta con forma de rodaja de sandía", categorias: ["frutales", "temporada", "exclusivas"] },
    { id: "coco", nombre: "Paleta de Coco", precio: 9000, peso: "90gr", imagen: "assets/imagenes/paletas/coco.png", alt: "Paleta de coco cubierta de coco rallado", categorias: ["cremosas"] },
    { id: "mango-dulce", nombre: "Paleta de Mango Dulce", precio: 8500, peso: "90gr", imagen: "assets/imagenes/paletas/mango-dulce.png", alt: "Paleta amarilla de mango con trozos de fruta", categorias: ["frutales", "temporada"] },
    { id: "chispas", nombre: "Paleta de Chispas", precio: 10000, peso: "90gr", imagen: "assets/imagenes/paletas/chispas.png", alt: "Paleta cremosa rosada y blanca cubierta de chispitas de colores", categorias: ["cremosas"] },
    { id: "ciruela", nombre: "Paleta de Ciruela", precio: 7000, peso: "90gr", imagen: "assets/imagenes/paletas/ciruela.png", alt: "Paleta rosada intensa de ciruela", categorias: ["frutales"] },
    { id: "coco-chocolate", nombre: "Paleta Coco Chocolate", precio: 12000, peso: "90gr", imagen: "assets/imagenes/paletas/coco-chocolate.png", alt: "Paleta cubierta de chocolate con coco rallado", categorias: ["cremosas", "exclusivas"] },
    { id: "de-pais", nombre: "Paleta De País", precio: 9500, peso: "90gr", imagen: "assets/imagenes/paletas/de-pais.png", alt: "Tres paletas con los colores de la bandera, azul, blanco y rojo", categorias: ["temporada", "exclusivas"] },
    { id: "durazno", nombre: "Paleta de Durazno", precio: 7000, peso: "90gr", imagen: "assets/imagenes/paletas/durazno.png", alt: "Paleta anaranjada de durazno", categorias: ["frutales"] },
    { id: "halloween", nombre: "Paleta Halloween", precio: 13000, peso: "90gr", imagen: "assets/imagenes/paletas/halloween.png", alt: "Paletas bañadas en chocolate naranja y negro decoradas para Halloween", categorias: ["temporada", "exclusivas"] },
    { id: "napolitana", nombre: "Paleta Napolitana", precio: 9000, peso: "90gr", imagen: "assets/imagenes/paletas/napolitana.png", alt: "Paleta en capas de fresa, vainilla y mango", categorias: ["cremosas"] },
    { id: "navidad", nombre: "Paleta Navidad", precio: 13000, peso: "90gr", imagen: "assets/imagenes/paletas/navidad.png", alt: "Paleta con forma de árbol de Navidad verde con una estrella roja", categorias: ["temporada", "exclusivas"] },
    { id: "ninos-dulce", nombre: "Paleta Niños Dulce", precio: 8000, peso: "90gr", imagen: "assets/imagenes/paletas/ninos-dulce.png", alt: "Paleta de caramelo en espiral multicolor", categorias: ["exclusivas"] },
    { id: "nuez", nombre: "Paleta de Nuez", precio: 12500, peso: "90gr", imagen: "assets/imagenes/paletas/nuez.png", alt: "Paleta de helado cubierta de chocolate con trozos de nuez", categorias: ["cremosas"] },
    { id: "patita", nombre: "Paleta Patita", precio: 12500, peso: "90gr", imagen: "assets/imagenes/paletas/patita.png", alt: "Paleta de chocolate con forma de huella de patita", categorias: ["exclusivas"] },
    { id: "tres-leches", nombre: "Paleta Tres Leches", precio: 10500, peso: "90gr", imagen: "assets/imagenes/paletas/tres-leches.png", alt: "Dos paletas cremosas de tres leches con chispitas de colores", categorias: ["cremosas"] },
  ];

  const copiar = (lista) => JSON.parse(JSON.stringify(lista));

  function leer() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE));
      return Array.isArray(guardado) ? guardado : null;
    } catch {
      return null;
    }
  }

  const escribir = (lista) => localStorage.setItem(CLAVE, JSON.stringify(lista));

  const crearId = (nombre, lista) => {
    const base =
      nombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "paleta";
    let id = base;
    let n = 2;
    while (lista.some((p) => p.id === id)) id = `${base}-${n++}`;
    return id;
  };

  async function listar() {
    return copiar(leer() || INICIALES);
  }

  // null mientras el administrador no haya modificado el catálogo
  async function listarPersonalizado() {
    const guardado = leer();
    return guardado ? copiar(guardado) : null;
  }

  async function crear(datos) {
    const lista = leer() || copiar(INICIALES);
    const paleta = { ...datos, id: crearId(datos.nombre, lista) };
    lista.push(paleta);
    escribir(lista);
    return copiar(paleta);
  }

  async function actualizar(id, cambios) {
    const lista = leer() || copiar(INICIALES);
    const indice = lista.findIndex((p) => p.id === id);
    if (indice === -1) throw new Error(`No existe la paleta ${id}`);
    lista[indice] = { ...lista[indice], ...cambios, id };
    escribir(lista);
    return copiar(lista[indice]);
  }

  async function eliminar(id) {
    const lista = (leer() || copiar(INICIALES)).filter((p) => p.id !== id);
    escribir(lista);
  }

  // delta -1 sube en popularidad, +1 baja
  async function mover(id, delta) {
    const lista = leer() || copiar(INICIALES);
    const desde = lista.findIndex((p) => p.id === id);
    const hasta = desde + delta;
    if (desde === -1 || hasta < 0 || hasta >= lista.length) return;
    [lista[desde], lista[hasta]] = [lista[hasta], lista[desde]];
    escribir(lista);
  }

  async function restaurar() {
    localStorage.removeItem(CLAVE);
  }

  window.PaletasDatos = {
    listar,
    listarPersonalizado,
    crear,
    actualizar,
    eliminar,
    mover,
    restaurar,
  };
})();