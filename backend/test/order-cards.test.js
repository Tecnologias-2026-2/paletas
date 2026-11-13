const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
class Element {
  constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.style={};this.value='';}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(){}
  addEventListener(type,listener){this.listeners[type]=listener;}
  get options(){return this.children;}
}
test('order list shows location, items and packaging; confirmation cancellation sends no update',async()=>{
  const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
  get('filtro-estado').value='todos';
  const pedido={id:'real',numero:'PED-REAL',estado:'confirmado',cliente:{nombre:'Cliente',correo:'cliente@example.com',municipio:'Bogotá',direccion:'Calle real'},
    items:[{nombre:'Frutal',cantidad:2}],empaque:{nombre:'Caja Madera'},total:19000};
  const requests=[];
  const document={getElementById:get,createElement:tag=>new Element(tag)};
  const helpers=fs.readFileSync(path.join(__dirname,'../../frontend/js/estado-flujo.js'),'utf8').replace(/export /g,'');
  const source=fs.readFileSync(path.join(__dirname,'../../frontend/js/pedidos-admin.js'),'utf8').replace(/^import .*?;\r?\n/gm,'');
  const context=vm.createContext({document,window:{confirm:()=>false},localStorage:{getItem:()=>null},
    apiRequest:async(url,options)=>{requests.push({url,options});return options?.method?{estado:'proceso',correo:{estado:'enviado'}}:[pedido];}});
  vm.runInContext(helpers,context);
  await vm.runInContext('(async()=>{'+source+'})()',context);
  const card=get('lista-pedidos').children[0];assert.equal(card.className,'pedido-resumen');
  const texts=[];const walk=e=>{if(e.textContent)texts.push(e.textContent);e.children.forEach(walk);};walk(card);
  assert(texts.includes('Bogotá · Calle real'));assert(texts.includes('2 × Frutal'));assert(texts.includes('Caja Madera · 19.000 COP'));
  assert(!texts.includes('cliente@example.com'));
  assert.match(card.children[0].href,/informacion.html\?id=real/);
  const select=card.children[1].children.find(e=>e.tag==='select');
  assert(select.options.find(e=>e.value==='pendiente de aprobación').disabled);
  assert(select.options.find(e=>e.value==='enviado').disabled);
  assert(!select.options.find(e=>e.value==='proceso').disabled);
  select.value='proceso';await select.listeners.change();assert.equal(requests.length,1);assert.equal(select.value,'confirmado');
  context.window.confirm=()=>true;select.value='proceso';await select.listeners.change();assert.equal(requests.length,2);
  assert.equal(pedido.estado,'proceso');assert(select.options.find(e=>e.value==='confirmado').disabled);
});
