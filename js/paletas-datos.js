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

  // Los datos iniciales viven en data/paletas.json (se cargan una sola vez).
  const RUTA_JSON = "data/paletas.json";
  let inicialesCache = null;

  async function cargarIniciales() {
    if (!inicialesCache) {
      const respuesta = await fetch(RUTA_JSON);
      if (!respuesta.ok) throw new Error(`No se pudo cargar ${RUTA_JSON}`);
      inicialesCache = await respuesta.json();
    }
    return copiar(inicialesCache);
  }

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
    return leer() ? copiar(leer()) : cargarIniciales();
  }

  // null mientras el administrador no haya modificado el catálogo
  async function listarPersonalizado() {
    const guardado = leer();
    return guardado ? copiar(guardado) : null;
  }

  async function crear(datos) {
    const lista = leer() || (await cargarIniciales());
    const paleta = { ...datos, id: crearId(datos.nombre, lista) };
    lista.push(paleta);
    escribir(lista);
    return copiar(paleta);
  }

  async function actualizar(id, cambios) {
    const lista = leer() || (await cargarIniciales());
    const indice = lista.findIndex((p) => p.id === id);
    if (indice === -1) throw new Error(`No existe la paleta ${id}`);
    lista[indice] = { ...lista[indice], ...cambios, id };
    escribir(lista);
    return copiar(lista[indice]);
  }

  async function eliminar(id) {
    const lista = (leer() || (await cargarIniciales())).filter((p) => p.id !== id);
    escribir(lista);
  }

  // delta -1 sube en popularidad, +1 baja
  async function mover(id, delta) {
    const lista = leer() || (await cargarIniciales());
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