const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
class Elemento {
    constructor() { this.style = {}; this.children = []; this.listeners = {}; this.value = ''; this.textContent = ''; this.dataset = {}; }
    append(...hijos) { this.children.push(...hijos); }
    replaceChildren(...hijos) { this.children = hijos; }
    setAttribute(nombre, valor) { this[nombre] = valor; }
    addEventListener(nombre, accion) { this.listeners[nombre] = accion; }
}
function cargar(archivo, extras = {}) {
    const elementos = new Map();
    const obtener = id => { if (!elementos.has(id)) elementos.set(id, new Elemento()); return elementos.get(id); };
    const document = { getElementById: obtener, createElement: () => new Elemento(), querySelector: obtener, querySelectorAll: () => [] };
    let authCallback, snapshot, snapshotError;
    const writes = [];
    const contexto = vm.createContext({ document, URLSearchParams, location: { search: '?id=reserva-real' },
        console, db: {}, collection: (_, nombre) => nombre, doc: (_, coleccion, id) => ({coleccion,id}),
        estados: ['pendiente','confirmada','finalizada','cancelada'],
        observarAdministrador: (ok, no) => { authCallback = {ok,no}; },
        onSnapshot: (_, ok, no) => { snapshot = ok; snapshotError = no; return () => {}; },
        guardarEstado: async (...args) => writes.push(args), ...extras });
    const codigo = fs.readFileSync(path.join(__dirname, 'js', archivo), 'utf8').replace(/^import .*?;\r?\n/gm, '');
    vm.runInContext(codigo, contexto);
    return { contexto, obtener, writes, autenticar: () => authCallback.ok(), denegar: () => authCallback.no('Acceso denegado'),
        emitir: dato => snapshot(dato), error: () => snapshotError() };
}
async function main() {
    const lista = cargar('reservas-admin.js');
    lista.obtener('filtro-prioridad-reserva').value = 'todas';
    lista.obtener('filtro-estado-reserva').value = 'todos';
    lista.autenticar();
    const real = {nombreContacto:'<script>cliente</script>', estado:'pendiente', prioridad:'media', numeroInvitados:40};
    lista.emitir({docs:[{id:'real /?',data:()=>({...real,id:'id-falso'})}]});
    const tarjeta = lista.obtener('lista-reservas').children[0];
    const enlace = tarjeta.children[0].children[1].children[0].children[0].children[0];
    assert.equal(enlace.href, 'perfiladministrador-misreservas-info.html?id=real%20%2F%3F');
    assert.equal(enlace.textContent, real.nombreContacto);
    const estado = tarjeta.children[1].children.find(e=>e.className==='pedido-card__select');
    estado.value='confirmada'; await estado.listeners.change();
    assert.deepEqual(lista.writes, [['real /?','confirmada']]);
    lista.obtener('filtro-estado-reserva').value='cancelada';
    lista.obtener('filtro-estado-reserva').listeners.change();
    assert.equal(lista.obtener('lista-reservas').children[0].textContent,'No hay reservas para mostrar.');
    lista.denegar(); assert.equal(lista.obtener('lista-reservas').textContent,'Acceso denegado');

    const detalle = cargar('reserva-detalle.js'); detalle.autenticar();
    detalle.emitir({exists:()=>true,data:()=>({...real,requerimientos:'Sin azúcar',direccionResidencia:'Dirección real'})});
    assert.equal(detalle.obtener('contenido-reserva').hidden,false);
    assert.equal(detalle.obtener('reserva-nombre').value,real.nombreContacto);
    assert.equal(detalle.obtener('reserva-telefono').value,'No registrado');
    assert(detalle.obtener('datos-adicionales').children.some(e=>e.children[1].textContent==='Sin azúcar'));
    for (const siguiente of ['confirmada','finalizada','cancelada','pendiente']) {
        detalle.obtener('reserva-estado').value=siguiente;
        await detalle.obtener('form-estado').listeners.submit({preventDefault(){}});
        detalle.emitir({exists:()=>true,data:()=>({...real,estado:siguiente})});
    }
    assert.equal(detalle.writes.length,4);
    detalle.emitir({exists:()=>false}); assert.equal(detalle.obtener('contenido-reserva').hidden,true);
    const fallo = cargar('reserva-detalle.js',{guardarEstado:async()=>{throw Error('permission-denied');}});
    fallo.autenticar(); fallo.emitir({exists:()=>true,data:()=>real});
    fallo.obtener('reserva-estado').value='confirmada';
    await fallo.obtener('form-estado').listeners.submit({preventDefault(){}});
    assert.equal(fallo.obtener('reserva-estado').value,'pendiente');
    assert.equal(fallo.obtener('guardar-estado').disabled,false);
    assert.match(fallo.obtener('mensaje-estado').textContent,/No se pudo guardar/);
    const invalido = cargar('reserva-detalle.js',{location:{search:''}});
    assert.match(invalido.obtener('mensaje-detalle').textContent,/reserva válida/);
    // Ejecuta el módulo de acceso con Firebase simulado, sin tocar producción.
    let observar, suscripciones = 0, canceladas = 0;
    const escrituras=[];
    const contexto = vm.createContext({getApps:()=>[],initializeApp:()=>({}),getAuth:()=>({currentUser:{uid:'P4AYQuUQEoVmveHWvyfWKLcUTT53'}}),
        getFirestore:()=>({}),onAuthStateChanged:(_,cb)=>{observar=cb;},doc:(_,c,id)=>({c,id}),
        updateDoc:async(ref,datos)=>escrituras.push({ref,datos}),serverTimestamp:()=> 'SERVER_TIMESTAMP'});
    const fuente=fs.readFileSync(path.join(__dirname,'js/reservas-firebase.js'),'utf8').replace(/^import .*?;\r?\n/gm,'').replace(/\bexport /g,'');
    vm.runInContext(fuente+'\nthis.api={guardarEstado,observarAdministrador,auth};',contexto);
    contexto.api.observarAdministrador(()=>{suscripciones++;return ()=>canceladas++;},()=>{});
    observar(null); observar({uid:'otro'}); assert.equal(suscripciones,0);
    observar({uid:'P4AYQuUQEoVmveHWvyfWKLcUTT53'}); observar(null);
    assert.equal(suscripciones,1); assert.equal(canceladas,1);
    await contexto.api.guardarEstado('real','confirmada');
    assert.deepEqual(Object.keys(escrituras[0].datos),['estado','fechaActualizacion','actualizadoPor']);
    await assert.rejects(contexto.api.guardarEstado('real','desconocido'));
    contexto.api.auth.currentUser=null;
    await assert.rejects(contexto.api.guardarEstado('real','confirmada'));
    console.log('OK: navegación, datos completos, filtros, 4 estados, errores, sesión y campos permitidos (Firebase simulado).');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
