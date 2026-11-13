const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function setup({status=201,result={messageId:'provider-id'},env={}}={}) {
  const calls=[];const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../services/email.service.js'),'utf8'),{
    module,process:{env:{RENDER:'true',BREVO_API_KEY:'private-test-key',MAIL_FROM_EMAIL:'verified@example.com',MAIL_REPLY_TO:'julianasalazarmendez@gmail.com',...env}},
    require:()=>({createTransport:()=>{throw Error('SMTP must not be used');}}),AbortSignal,
    fetch:async(url,options)=>{calls.push({url,options});return{ok:status<300,status,json:async()=>result};}
  });
  return{service:module.exports,calls};
}
const customer={name:'Cliente',email:'client@example.com'};
const content={asunto:'Tu pedido fue enviado',titulo:'Tu pedido fue enviado',mensaje:'Gracias.'};
test('Render sends through HTTPS and preserves customer, reply address and template',async()=>{
  const {service,calls}=setup();const result=await service.sendCustomerEmail(customer,'PED-REAL',content);
  assert.equal(result.messageId,'provider-id');assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://api.brevo.com/v3/smtp/email');
  const body=JSON.parse(calls[0].options.body);
  assert.equal(body.to[0].email,customer.email);assert.equal(body.sender.email,'verified@example.com');
  assert.equal(body.replyTo.email,'julianasalazarmendez@gmail.com');assert.match(body.htmlContent,/Tu pedido fue enviado/);
});
test('missing configuration, invalid credentials, quota and unconfirmed responses never report success or expose secrets',async()=>{
  for (const config of [{env:{BREVO_API_KEY:''}},{env:{MAIL_FROM_EMAIL:''}},{status:401},{status:403},{status:400},{status:429},{result:{}}]) {
    const {service}=setup(config);
    await assert.rejects(service.sendCustomerEmail(customer,'REAL',content),error=>!error.message.includes('private-test-key'));
  }
});
