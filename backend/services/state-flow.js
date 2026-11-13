const flows = {
  pedido: ['pendiente de aprobación', 'confirmado', 'proceso', 'enviado', 'finalizado'],
  reserva: ['pendiente', 'confirmada', 'finalizada']
};
function canAdvance(type, from, to) {
  const flow = flows[type];
  if (!flow || !flow.includes(from)) return false;
  if (type === 'reserva' && to === 'cancelada') return from !== 'finalizada';
  return flow.indexOf(to) === flow.indexOf(from) + 1;
}
function defaults(type) {
  const label = type === 'pedido' ? 'pedido' : 'reserva';
  return {asunto:`Tu ${label} fue {estado}`, titulo:`Tu ${label} fue {estado}`,
    mensaje:`Te informamos que tu ${label} fue {estado}. Gracias por elegir Paletas de Hielo.`};
}
function render(template, state) {
  const label = state === 'proceso' ? 'puesto en proceso' : state;
  return Object.fromEntries(Object.entries(template).map(([key,value])=>[key,value.replaceAll('{estado}',label)]));
}
module.exports = { flows, canAdvance, defaults, render };
