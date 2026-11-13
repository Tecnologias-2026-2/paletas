const { db, FieldValue } = require('../database/connection');
const { sendCustomerEmail, validateEmailContent } = require('./email.service');
const { canAdvance, defaults, render } = require('./state-flow');

const collection = type => type === 'pedido' ? 'pedidos' : 'reservas';
const templateRef = type => db.collection('plantillasEstado').doc(type);
function validType(type) {
  if (!['pedido','reserva'].includes(type)) throw Object.assign(new Error('Tipo de plantilla inválido.'),{status:400});
}
async function getTemplate(type) {
  validType(type);
  return (await templateRef(type).get()).data()?.plantilla || defaults(type);
}
async function saveTemplate(type, template) {
  validType(type);
  if (!validateEmailContent(template) || !template.titulo.includes('{estado}') || !template.asunto.includes('{estado}')) {
    throw Object.assign(new Error('Completa los tres campos. Conserva {estado} en el asunto y en el título para indicar cada cambio.'),{status:400});
  }
  await templateRef(type).set({plantilla:template,fechaActualizacion:FieldValue.serverTimestamp()});
}

async function deliver(ref, emailId, record) {
  const emailRef = ref.collection('correos').doc(emailId);
  // Solo un proceso puede enviar este correo, incluso si se repite la petición.
  const claimed = await db.runTransaction(async tx => {
    const snapshot = await tx.get(emailRef);
    if (snapshot.data()?.estado !== 'pendiente') return false;
    tx.update(emailRef,{estado:'enviando'});
    return true;
  });
  if (!claimed) return {estado:'registrado'};
  try {
    const result = await sendCustomerEmail({email:record.destinatario,name:record.nombre},record.referencia,
      {asunto:record.asunto,titulo:record.titulo,mensaje:record.mensaje});
    await emailRef.update({estado:'enviado',messageId:result.messageId,fechaEnvio:FieldValue.serverTimestamp()});
    return {estado:'enviado'};
  } catch {
    await emailRef.update({estado:'fallido'});
    return {estado:'fallido'};
  }
}

async function advance(type, id, state) {
  validType(type);
  const ref = db.collection(collection(type)).doc(id);
  const emailRef = ref.collection('correos').doc();
  // El estado y el correo quedan registrados juntos. La transacción también
  // impide retrocesos y duplicados cuando se usan dos pestañas a la vez.
  const result = await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw Object.assign(new Error('El registro no existe.'),{status:404});
    const data = snapshot.data();
    if (data.estado === state) return {cambiado:false};
    if (!canAdvance(type,data.estado,state)) {
      throw Object.assign(new Error('Este cambio no está permitido. Solo puedes avanzar al siguiente estado; no puedes volver atrás. Recarga para ver el estado actual.'),{status:409});
    }
    const template = (await tx.get(templateRef(type))).data()?.plantilla || defaults(type);
    const content = render(template,state);
    const record = {...content, automatico:true, estadoPedido:state, estado:'pendiente',
      destinatario:type === 'pedido' ? data.cliente.correo : data.correoContacto,
      nombre:type === 'pedido' ? data.cliente.nombre : data.nombreContacto,
      referencia:type === 'pedido' ? (data.idOriginal || `PED-${id.slice(0,8).toUpperCase()}`) : `Reserva #${id}`,
      fechaEnvio:FieldValue.serverTimestamp()};
    tx.update(ref,{estado:state,fechaActualizacion:FieldValue.serverTimestamp(),actualizadoPor:process.env.FIREBASE_ADMIN_UID});
    tx.create(emailRef,record);
    return {cambiado:true,record};
  });
  if (!result.cambiado) return {id,estado:state,cambiado:false,correo:{estado:'sin-cambio'}};
  const correo = await deliver(ref,emailRef.id,result.record);
  return {id,estado:state,cambiado:true,correo};
}

async function retry(type,id,emailId) {
  validType(type);
  const ref=db.collection(collection(type)).doc(id);
  const emailRef=ref.collection('correos').doc(emailId);
  const record=await db.runTransaction(async tx=>{
    const snapshot=await tx.get(emailRef);
    const data=snapshot.data();
    if(!data?.automatico || !['fallido','pendiente'].includes(data.estado)) {
      throw Object.assign(new Error('Este correo no está disponible para reintentar.'),{status:409});
    }
    tx.update(emailRef,{estado:'pendiente'});
    return data;
  });
  return deliver(ref,emailId,record);
}
module.exports = {getTemplate,saveTemplate,advance,retry};
