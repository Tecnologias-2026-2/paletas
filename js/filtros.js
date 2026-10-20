(() => {
  const panel = document.getElementById("filtros");
  const lista = document.querySelector(".catalogo-paletas__grid");
  if (!panel || !lista) return;

  const tarjetas = [...lista.children].map((item, posicion) => ({
    item,
    posicion,
    categorias: (item.dataset.categorias || "").split(/\s+/).filter(Boolean),
    precio: parseInt(item.querySelector(".paleta__precio").textContent.replace(/\D/g, ""), 10) || 0,
  }));

  const chips = [...panel.querySelectorAll(".filtros__chip")];
  const selectOrden = document.getElementById("orden-paletas");
  const estado = document.getElementById("filtros-estado");
  const vacio = document.getElementById("paletas-vacio");

  const ORDENES = {
    popularidad: (a, b) => a.posicion - b.posicion,
    "menor-precio": (a, b) => a.precio - b.precio || a.posicion - b.posicion,
    "mayor-precio": (a, b) => b.precio - a.precio || a.posicion - b.posicion,
  };

  const coincide = (tarjeta, categoria) =>
    categoria === "todas" || tarjeta.categorias.includes(categoria);

  let categoria = "todas";
  let orden = "popularidad";

  chips.forEach((chip) => {
    const conteo = chip.querySelector(".filtros__conteo");
    if (conteo) {
      const total = tarjetas.filter((t) => coincide(t, chip.dataset.categoria)).length;
      conteo.textContent = `(${total})`;
    }
  });

  function aplicar({ anunciar }) {
    const visibles = tarjetas.filter((t) => coincide(t, categoria)).sort(ORDENES[orden]);

    tarjetas.forEach((t) => { t.item.hidden = !visibles.includes(t); });
    visibles.forEach((t) => lista.appendChild(t.item));
    tarjetas.filter((t) => !visibles.includes(t)).forEach((t) => lista.appendChild(t.item));

    chips.forEach((chip) => {
      chip.setAttribute("aria-pressed", String(chip.dataset.categoria === categoria));
    });
    selectOrden.value = orden;
    vacio.hidden = visibles.length > 0;

    if (anunciar) {
      estado.textContent = visibles.length === 1
        ? "Mostrando 1 paleta."
        : `Mostrando ${visibles.length} paletas.`;
    }

    const parametros = new URLSearchParams();
    if (categoria !== "todas") parametros.set("categoria", categoria);
    if (orden !== "popularidad") parametros.set("orden", orden);
    const consulta = parametros.toString();
    history.replaceState(null, "", consulta ? `?${consulta}` : location.pathname);
  }

  panel.addEventListener("click", (evento) => {
    const chip = evento.target.closest(".filtros__chip");
    if (!chip) return;
    categoria = chip.dataset.categoria;
    aplicar({ anunciar: true });
  });

  selectOrden.addEventListener("change", () => {
    orden = selectOrden.value;
    aplicar({ anunciar: true });
  });

  const inicial = new URLSearchParams(location.search);
  const categoriaUrl = inicial.get("categoria");
  const ordenUrl = inicial.get("orden");
  if (chips.some((c) => c.dataset.categoria === categoriaUrl)) categoria = categoriaUrl;
  if (ordenUrl in ORDENES) orden = ordenUrl;

  panel.hidden = false;
  aplicar({ anunciar: false });
})();