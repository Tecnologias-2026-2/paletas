const { requireAdmin } = require('../middleware/admin-auth');
const { readBody,sendJson } = require('../utils/http');
const service = require('../services/state-mail.service');
module.exports=async function stateTemplateRoutes(req,res,pathname) {
  await requireAdmin(req);
  const parts=pathname.split('/').filter(Boolean);
  const type=parts[3];
  if(parts.length===4 && ['GET','PUT'].includes(req.method)) {
    if(req.method==='PUT') await service.saveTemplate(type,await readBody(req));
    return sendJson(res,200,await service.getTemplate(type));
  }
  if(parts.length===6 && req.method==='POST') {
    const result=await service.retry(type,decodeURIComponent(parts[4]),decodeURIComponent(parts[5]));
    return sendJson(res,200,result);
  }
  return sendJson(res,404,{error:'Ruta no encontrada.'});
};
