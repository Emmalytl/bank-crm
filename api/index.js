import {app} from '../server/src/app.mjs';
// The explicit rewrite transports the API path independently from Vercel's function URL.
export function normalizeApiUrl(raw){
 const url=new URL(raw,'http://internal.local');
 const endpoint=url.searchParams.get('endpoint');
 if(endpoint!==null){
  if(!/^[a-zA-Z0-9_/-]*$/.test(endpoint)||endpoint.includes('//')||endpoint.includes('..'))throw new Error('Invalid API path');
  url.pathname='/api/'+endpoint.replace(/^\/+|\/+$/g,'');
  url.searchParams.delete('endpoint');
 }
 if(!url.pathname.startsWith('/api/'))throw new Error('Invalid API path');
 return url.pathname+url.search;
}
// Do not start a listener inside a serverless function.
export default function handler(req,res){
 try{req.url=normalizeApiUrl(req.url);delete req.query?.endpoint;}catch{res.statusCode=400;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:'Invalid API path'}));}
 return app(req,res);
}
