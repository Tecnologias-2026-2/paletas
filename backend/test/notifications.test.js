const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function load(relative, dependencies) {
  const module = {exports:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', relative),'utf8'), {
    require:name=>{if (!(name in dependencies)) throw Error('Unexpected dependency '+name); return dependencies[name];},
    module, exports:module.exports, process:{env:{FIREBASE_ADMIN_UID:'admin'}}, console:{error(){}}
  });
  return module.exports;
}
function setup() {
  let preferences; const mails=[]; const logs=[];
  const doc = {get:async()=>({data:()=>preferences}),set:async value=>{preferences=value;}};
  const log = {set:async value=>logs.push(value),update:async value=>logs.push(value)};
  let fail=false;
  const service=load('services/notification.service.js',{
    '../database/connection':{db:{collection:name=>({doc:()=>name==='preferenciasAdmin'?doc:log})},
      auth:{getUser:async uid=>{assert.equal(uid,'admin');return{email:'cuenta-actual@example.com',displayName:'Juliana'};}},
      FieldValue:{serverTimestamp:()=> 'SERVER_TIME'}},
    './email.service':{sendCustomerEmail:async(...args)=>{if(fail)throw Error('SMTP failed');mails.push(args);return{messageId:'id'};}}
  });
  return {service,mails,logs,fail:()=>{fail=true;}};
}
const content={asunto:'Alerta',titulo:'Aviso',mensaje:'Mensaje'};
test('persists and respects all four preferences; only sends to current admin email',async()=>{
  const {service,mails}=setup();
  await service.savePreferences({compras:false,contacto:true,correos:false,eventos:true});
  assert.equal((await service.getPreferences()).compras,false);
  for(const category of service.CATEGORIES) await service.notifyAdmin(category,'real',content);
  assert.equal(mails.length,2);
  assert(mails.every(mail=>mail[0].email==='cuenta-actual@example.com'));
  await assert.rejects(service.savePreferences({compras:true}));
  await assert.rejects(service.savePreferences({compras:true,contacto:true,correos:true,eventos:true,email:'attacker@example.com'}));
});
test('manual test works with notifications disabled and records failure honestly',async()=>{
  const t=setup();await t.service.savePreferences({compras:false,contacto:false,correos:false,eventos:false});
  await t.service.notifyAdmin('correos','test',content,{test:true});assert.equal(t.mails.length,1);
  t.fail();await assert.rejects(t.service.notifyAdmin('correos','test',content,{test:true}));
  assert.equal(t.logs.at(-1).estado,'fallido');
  await assert.doesNotReject(t.service.notifySafely('contacto','real',content));
});
test('notification routes require administrator before accessing settings or SMTP',async()=>{
  let called=false;
  const route=load('routes/notification.routes.js',{
    '../middleware/admin-auth':{requireAdmin:async()=>{throw Error('unauthorized');}},
    '../utils/http':{},'../services/notification.service':{notifyAdmin:()=>{called=true;}}
  });
  await assert.rejects(route({method:'POST'},{},'/api/admin/notifications/test'));
  assert.equal(called,false);
});
test('new orders and event requests notify only after being saved',async()=>{
  for(const [file,modelPath,category] of [
    ['order','../models/order.model','compras'],['reservation','../models/reservation.model','eventos']]) {
    const actions=[];
    const deps={
      '../services/notification.service':{notifySafely:async c=>actions.push(c)},
      '../domain':{validateOrder:()=>true,validateReservation:()=>true},
      '../utils/http':{readBody:async()=>({cliente:{nombre:'Cliente'},nombreContacto:'Cliente'}),sendJson:(_,status)=>actions.push(status)},
      '../services/email.service':{},[modelPath]:{create:async()=>{actions.push('saved');return{id:'real',numero:'PED-real'};}}
    };
    await load('controllers/'+file+'.controller.js',deps).create({},{});
    assert.deepEqual(actions,['saved',category,201]);
    actions.length=0;deps[modelPath].create=async()=>{throw Error('DB failure');};
    await assert.rejects(load('controllers/'+file+'.controller.js',deps).create({},{}));assert.equal(actions.length,0);
  }
});
