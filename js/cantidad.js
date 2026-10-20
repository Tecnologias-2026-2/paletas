const CLAVE = "carrito-paletas";

const leerCarrito = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || {};
  } catch {
    return {};
  }
};

function guardar(campo) {
  const tarjeta = campo.closest(".paleta");
  const carrito = leerCarrito();
  const cantidad = Math.min(99, Math.max(0, parseInt(campo.value, 10) || 0));

  if (cantidad === 0) {
    delete carrito[campo.id];
  } else {
    const imagen = tarjeta.querySelector(".paleta__imagen");
    carrito[campo.id] = {
      nombre: tarjeta.querySelector(".paleta__nombre").textContent.trim(),
      precio: parseInt(tarjeta.querySelector(".paleta__precio").textContent.replace(/\D/g, ""), 10),
      peso: tarjeta.querySelector(".paleta__peso").textContent.trim(),
      imagen: imagen.getAttribute("src"),
      alt: imagen.getAttribute("alt"),
      cantidad,
    };
  }
  localStorage.setItem(CLAVE, JSON.stringify(carrito));
}

function restaurar() {
  const carrito = leerCarrito();
  document.querySelectorAll(".cantidad__campo").forEach((campo) => {
    campo.value = carrito[campo.id]?.cantidad ?? 0;
  });
}

document.addEventListener("click", (evento) => {
  const boton = evento.target.closest(".cantidad__boton");
  if (boton) {
    const campo = document.getElementById(boton.getAttribute("aria-controls"));
    if (boton.dataset.accion === "aumentar") campo.stepUp();
    else campo.stepDown();
    guardar(campo);
    return;
  }

  const enlace = evento.target.closest(".paleta__nombre");
  if (enlace) {
    const campo = enlace.closest(".paleta").querySelector(".cantidad__campo");
    if (!parseInt(campo.value, 10)) {
      campo.value = 1;
      guardar(campo);
    }
  }
});

document.addEventListener("change", (evento) => {
  if (evento.target.matches(".cantidad__campo")) guardar(evento.target);
});

window.addEventListener("pageshow", restaurar);
window.catalogoListo?.then(restaurar);