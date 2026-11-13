const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function setup(failure=false){
  const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',disabled:false});return nodes.get(id);};
  let submit;const calls=[];
  const user={uid:'admin',email:'admin@example.com',getIdToken:async()=>{calls.push('token');}};
  const auth={currentUser:user};
  const source=fs.readFileSync(path.join(__dirname,'../../frontend/js/seguridad-admin.js'),'utf8').replace(/^import .*?;\r?\n/gm,'');
  vm.runInNewContext(source,{auth,ADMIN_UID:'admin',document:{getElementById:node,querySelector:()=>({querySelectorAll:()=>[],addEventListener:(_,cb)=>submit=cb})},
    onAuthStateChanged:(_,cb)=>cb(),EmailAuthProvider:{credential:()=>({})},
    reauthenticateWithCredential:async()=>{calls.push('reauth');if(failure)throw{code:'auth/invalid-credential'};},
    updatePassword:async()=>calls.push('update')});
  node('contrasena-actual').value='old-password';node('nueva-contrasena').value=node('confirmar-contrasena').value='new-password';
  return{node,calls,auth,submit:()=>submit({preventDefault(){}})};
}
test('password change reauthenticates first and clears secrets',async()=>{
  const t=setup();await t.submit();assert.deepEqual(t.calls,['reauth','update','token']);
  assert.equal(t.node('nueva-contrasena').value,'');assert.match(t.node('mensaje-seguridad').textContent,/actualizada/);
});
test('incorrect current password, mismatch and unauthenticated requests never update password',async()=>{
  let t=setup(true);await t.submit();assert.deepEqual(t.calls,['reauth']);
  t=setup();t.node('confirmar-contrasena').value='different';await t.submit();assert.equal(t.calls.length,0);
  t=setup();t.auth.currentUser=null;await t.submit();assert.equal(t.calls.length,0);
});
