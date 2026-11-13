const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const flow=require('../services/state-flow');
function setup({type='pedido',state='pendiente de aprobación',fail=false}={}) {
  const store=new Map();const sent=[];let serial=Promise.resolve(),sequence=0;
  const base=(type==='pedido'?'pedidos':'reservas')+'/real';
  store.set(base,{estado:state,cliente:{nombre:'Cliente',correo:'cliente@example.com'},nombreContacto:'Cliente',correoContacto:'cliente@example.com'});
  function ref(key){return{id:key.split('/').at(-1),get:async()=>snapshot(key),update:async value=>store.set(key,{...store.get(key),...value}),
    set:async value=>store.set(key,value),collection:name=>({doc:id=>ref(key+'/'+name+'/'+(id||'mail'+(++sequence)))})};}
  function snapshot(key){return{exists:store.has(key),data:()=>store.get(key)?structuredClone(store.get(key)):undefined};}
  const db={collection:name=>({doc:id=>ref(name+'/'+id)}),runTransaction(callback){
    const promise=serial.then(async()=>{
      const writes=[];const tx={get:async r=>snapshot(keyOf(r)),update:(r,d)=>writes.push(()=>store.set(keyOf(r),{...store.get(keyOf(r)),...d})),
        create:(r,d)=>writes.push(()=>store.set(keyOf(r),d))};
      const result=await callback(tx);writes.forEach(write=>write());return result;
    });serial=promise.catch(()=>{});return promise;
  }};
  // Keep document paths on the references used by the fake Firestore.
  const oldRef=ref;ref=function(key){return{...oldRef(key),key};};
  const keyOf=r=>r.key;
  const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../services/state-mail.service.js'),'utf8'),{
    module,process:{env:{FIREBASE_ADMIN_UID:'admin'}},require:name=>{
      if(name==='../database/connection')return{db,FieldValue:{serverTimestamp:()=> 'SERVER_TIME'}};
      if(name==='./state-flow')return flow;
      if(name==='./email.service')return{validateEmailContent:t=>t&&['asunto','titulo','mensaje'].every(k=>typeof t[k]==='string')&&Object.keys(t).length===3,
        sendCustomerEmail:async(...args)=>{if(fail)throw Error('SMTP down');sent.push(args);return{messageId:'smtp-id'};}};
      throw Error(name);
    }
  });
  return{service:module.exports,store,sent,base};
}
test('orders only advance one step; all backward and skipped transitions are blocked',()=>{
  const states=flow.flows.pedido;
  states.forEach((from,i)=>states.forEach((to,j)=>assert.equal(flow.canAdvance('pedido',from,to),j===i+1)));
  assert(!flow.canAdvance('reserva','cancelada','confirmada'));
  assert(!flow.canAdvance('reserva','finalizada','cancelada'));
  assert(flow.canAdvance('reserva','confirmada','cancelada'));
});
test('state change and automatic history are saved together; retries and repeated requests do not duplicate mail',async()=>{
  const t=setup();
  await Promise.all([t.service.advance('pedido','real','confirmado'),t.service.advance('pedido','real','confirmado')]);
  assert.equal(t.store.get(t.base).estado,'confirmado');assert.equal(t.sent.length,1);
  const email=[...t.store.entries()].find(([key])=>key.includes('/correos/'));
  assert.equal(email[1].estado,'enviado');assert.equal(email[1].automatico,true);
  assert.equal(email[1].titulo,'Tu pedido fue confirmado');assert.equal(email[1].destinatario,'cliente@example.com');
  await assert.rejects(t.service.advance('pedido','real','pendiente de aprobación'));
  await assert.rejects(t.service.advance('pedido','real','enviado'));
  await assert.rejects(t.service.retry('pedido','real',email[0].split('/').at(-1)));
  assert.equal(t.sent.length,1);
});
test('SMTP failure preserves new state and shows failed history without claiming delivery',async()=>{
  const t=setup({fail:true});const result=await t.service.advance('pedido','real','confirmado');
  assert.equal(result.correo.estado,'fallido');assert.equal(t.store.get(t.base).estado,'confirmado');
  assert([...t.store.values()].some(value=>value.automatico&&value.estado==='fallido'));
});
test('editable templates persist and are rendered for future state changes',async()=>{
  const t=setup();
  await t.service.saveTemplate('pedido',{asunto:'Novedad: {estado}',titulo:'Tu pedido fue {estado}',mensaje:'Gracias. Estado: {estado}.'});
  await t.service.advance('pedido','real','confirmado');
  assert.equal(t.sent[0][2].mensaje,'Gracias. Estado: confirmado.');
  await assert.rejects(t.service.saveTemplate('pedido',{asunto:'Sin estado',titulo:'Sin estado',mensaje:'Texto'}));
  assert.equal(flow.render(flow.defaults('pedido'),'proceso').titulo,'Tu pedido fue puesto en proceso');
});
test('cancelled reservation is terminal and cannot be reopened',async()=>{
  const t=setup({type:'reserva',state:'confirmada'});
  await t.service.advance('reserva','real','cancelada');
  await assert.rejects(t.service.advance('reserva','real','confirmada'));
  assert.equal(t.sent.length,1);assert.equal(t.sent[0][2].titulo,'Tu reserva fue cancelada');
});
