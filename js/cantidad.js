document.addEventListener("click", (evento) => {
  const boton = evento.target.closest(".cantidad__boton");
  if (!boton) return;
  const campo = document.getElementById(boton.getAttribute("aria-controls"));
  if (boton.dataset.accion === "aumentar") campo.stepUp();
  else campo.stepDown();
});