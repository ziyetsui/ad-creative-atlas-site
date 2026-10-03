const { randomUUID } = require('node:crypto');
const catalog = require('../data/favorite-catalog.json');
const PREFIX = 'favorites/v1/';
// Immutable events preserve history; writes for distinct materials never overwrite one another.
function reduceEvents(blobs) {
  const latest = new Map();
  for (const b of blobs) {
    const m = b.pathname.match(/^favorites\/v1\/(\d{13})-([a-f0-9-]{36})-([a-zA-Z0-9]+)-(0|1)\.json$/);
    if (!m || !catalog[m[3]]) continue;
    const prev = latest.get(m[3]);
    if (!prev || b.pathname > prev.key) latest.set(m[3], {key:b.pathname,id:m[3],active:m[4]==='1',savedAt:new Date(+m[1]).toISOString()});
  }
  return [...latest.values()].filter(x=>x.active).sort((a,b)=>b.key.localeCompare(a.key)).map(({id,savedAt})=>({id,savedAt}));
}
function createHandler(storage) {
 return async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  if (!['GET','POST'].includes(req.method)) {res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed'});}
  try {
   if(req.method==='GET') {
    let cursor, blobs=[];
    do {const page=await storage.list({prefix:PREFIX,limit:1000,cursor});blobs.push(...page.blobs);cursor=page.hasMore?page.cursor:undefined;} while(cursor);
    return res.status(200).json({favorites:reduceEvents(blobs)});
   }
   // Accept only same-site JSON writes; no client-controlled file path or content.
   const origin=req.headers.origin;
   if(origin && new URL(origin).host!==req.headers.host) return res.status(403).json({error:'请从本网站操作收藏'});
   if(!String(req.headers['content-type']||'').startsWith('application/json')) return res.status(415).json({error:'Expected JSON'});
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!body || !catalog[body.id] || typeof body.active!=='boolean') return res.status(400).json({error:'无效素材或收藏状态'});
   const timestamp=Date.now();const id=body.id;
   await storage.put(`${PREFIX}${timestamp}-${randomUUID()}-${id}-${body.active?1:0}.json`,JSON.stringify({id,active:body.active,savedAt:new Date(timestamp).toISOString()}),{access:'public',addRandomSuffix:false,contentType:'application/json'});
   return res.status(200).json({id,active:body.active,savedAt:new Date(timestamp).toISOString()});
  } catch(error) {console.error('Favorites storage operation failed',error.name);return res.status(503).json({error:'云端收藏暂时不可用，请重试；已保存记录仍保留在云端。'});}
 };
}
const handler=createHandler({list:async options=>(await import('@vercel/blob')).list(options),put:async (...args)=>(await import('@vercel/blob')).put(...args)});
module.exports=handler;
module.exports.createHandler=createHandler;
module.exports.reduceEvents=reduceEvents;
