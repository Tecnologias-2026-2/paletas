const CLAVE = "carrito-paletas";
const CLAVE_EMPAQUE = "empaque-paletas";
const UMBRAL_ENVIO_GRATIS = 11500;

// "de-DE" agrupa miles también en 4 cifras (8.500); "es-CO" no lo hace
const cop = (n) => `${n.toLocaleString("de-DE")} COP`;

const lista = document.getElementById("carrito-lista");
const plantilla = document.getElementById("plantilla-item");
const vacio = document.getElementById("carrito-vacio");
const total = document.getElementById("resumen-total");
const envio = document.getElementById("resumen-envio");
const aviso = document.getElementById("resumen-aviso");
const continuar = document.getElementById("resumen-continuar");

let carrito;
try {
  carrito = JSON.parse(localStorage.getItem(CLAVE)) || {};
} catch {
  carrito = {};
}

const guardar = () => localStorage.setItem(CLAVE, JSON.stringify(carrito));

function actualizarResumen() {
  const items = Object.values(carrito);
  const empaque = document.querySelector('input[name="empaque"]:checked');
  const productos = items.reduce((suma, p) => suma + p.precio * p.cantidad, 0);
  const subtotal = productos + (items.length && empaque ? Number(empaque.dataset.costo) : 0);
  const falta = UMBRAL_ENVIO_GRATIS - subtotal;

  total.textContent = cop(subtotal);
  envio.textContent = falta > 0 ? `Te faltan ${cop(falta)} para envío gratis` : "¡Tienes envío gratis!";
  vacio.hidden = items.length > 0;
}

function pintar() {
  for (const [id, p] of Object.entries(carrito)) {
    const fila = plantilla.content.cloneNode(true);
    fila.querySelector(".carrito-item").dataset.id = id;

    const imagen = fila.querySelector(".carrito-item__imagen");
    imagen.src = p.imagen;
    imagen.alt = p.alt;

    fila.querySelector(".carrito-item__nombre").textContent = p.nombre;
    fila.querySelector(".carrito-item__peso").textContent = p.peso;

    const campo = fila.querySelector(".carrito-item__campo");
    campo.id = `cantidad-carrito-${id}`;
    campo.value = p.cantidad;
    fila.querySelector(".carrito-item__etiqueta").htmlFor = campo.id;

    fila.querySelector(".carrito-item__precio").textContent = cop(p.precio * p.cantidad);
    fila.querySelector(".carrito-item__quitar").setAttribute("aria-label", `Quitar ${p.nombre} del carrito`);

    lista.append(fila);
  }
  actualizarResumen();
}

lista.addEventListener("change", (evento) => {
  if (!evento.target.matches(".carrito-item__campo")) return;
  const fila = evento.target.closest(".carrito-item");
  const producto = carrito[fila.dataset.id];

  producto.cantidad = Math.min(99, Math.max(1, parseInt(evento.target.value, 10) || 1));
  evento.target.value = producto.cantidad;
  fila.querySelector(".carrito-item__precio").textContent = cop(producto.precio * producto.cantidad);

  guardar();
  actualizarResumen();
});

lista.addEventListener("click", (evento) => {
  const boton = evento.target.closest(".carrito-item__quitar");
  if (!boton) return;
  const fila = boton.closest(".carrito-item");

  delete carrito[fila.dataset.id];
  fila.remove();
  guardar();
  actualizarResumen();
  document.getElementById("titulo-carrito").focus();
});

function mostrarAviso(mensaje) {
  aviso.hidden = true;
  aviso.textContent = "";
  setTimeout(() => {
    aviso.textContent = mensaje;
    aviso.hidden = false;
  }, 50);
}

function restaurarEmpaque() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_EMPAQUE));
    const radio = guardado && document.querySelector(`input[name="empaque"][value="${CSS.escape(guardado.valor)}"]`);
    if (radio) radio.checked = true;
  } catch {}
}

document.querySelectorAll('input[name="empaque"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    localStorage.setItem(
      CLAVE_EMPAQUE,
      JSON.stringify({
        valor: radio.value,
        nombre: radio.closest(".empaque__opcion").querySelector(".empaque__nombre").textContent.trim(),
        costo: Number(radio.dataset.costo),
      })
    );
    aviso.hidden = true;
    actualizarResumen();
  });
});

continuar.addEventListener("click", (evento) => {
  if (!Object.keys(carrito).length) {
    evento.preventDefault();
    mostrarAviso("Agrega al menos una paleta a tu carrito para continuar.");
    return;
  }
  const empaque = document.querySelector('input[name="empaque"]:checked');
  if (!empaque) {
    evento.preventDefault();
    mostrarAviso("Elige cómo quieres que empaquemos tus productos para continuar.");
    document.querySelector('input[name="empaque"]').focus();
  }
});

restaurarEmpaque();
pintar();