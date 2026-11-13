export function opcionesEstado(selector, actual, reserva = false) {
  const flujo = reserva ? ['pendiente','confirmada','finalizada'] : ['pendiente de aprobación','confirmado','proceso','enviado','finalizado'];
  const indice = flujo.indexOf(actual);
  for (const opcion of selector.options) {
    opcion.disabled = opcion.value !== actual && !(
      indice >= 0 && (opcion.value === flujo[indice + 1] || (reserva && actual !== 'finalizada' && opcion.value === 'cancelada'))
    );
  }
  selector.disabled = actual === flujo.at(-1) || (reserva && actual === 'cancelada');
}
export function confirmarAvance(actual, siguiente) {
  if (actual === siguiente) return false;
  return window.confirm(`¿Cambiar de «${actual}» a «${siguiente}»?\n\nEste cambio es definitivo: no podrás volver a un estado anterior. Se enviará un correo automático al cliente.`);
}
export function mensajeEstado(resultado) {
  if(resultado.correo?.estado === 'fallido') return 'Estado actualizado. El correo no pudo enviarse; puedes reintentarlo desde Ver correos enviados.';
  if(resultado.cambiado === false) return 'El registro ya tenía ese estado. No se duplicó el correo.';
  return 'Estado actualizado y correo automático enviado.';
}
