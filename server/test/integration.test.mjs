import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
process.env.NODE_ENV='test';
const {useDatabaseForTests}=await import('../src/db.mjs');
const {app}=await import('../src/app.mjs');
test('PostgreSQL WASM API integration: bank isolation, management scopes and CRM workflows',async t=>{
 const f=await fixture();useDatabaseForTests(f.adapter);
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await f.close();});
 const base='http://127.0.0.1:'+server.address().port+'/api';
 async function login(key,bankCode='DEMO'){const r=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bankCode,email:key+'@example.test',password:f.password})});assert.equal(r.status,200,await r.clone().text());return {...await r.json(),cookie:r.headers.get('set-cookie').split(';')[0]};}
 async function request(s,path,method='GET',body,csrf=true,extra={}){const r=await fetch(base+path,{method,headers:{cookie:s.cookie,'content-type':'application/json',...(csrf?{'x-csrf-token':s.csrfToken}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json()};}
 const sessions={};for(const key of ['admin','head','regional','manager','leader','marketer','marketer2','outside','executive'])sessions[key]=await login(key);const second=await login('admin','SECOND');const s=sessions;
 assert.equal((await request(s.marketer,'/leads/2147483648')).status,400);
 assert.equal((await fetch(base+'/health')).status,200);
 assert.equal((await request(s.marketer,'/leads','POST',{name:'Blocked'},false)).status,403);
 assert.equal((await request(s.marketer,'/leads','POST',{name:'Blocked'},true,{origin:'https://evil.test'})).status,403);
 assert.equal((await request(s.executive,'/leads','POST',{name:'Blocked'})).status,403);
 assert.equal((await request(s.marketer,'/users','POST',{})).status,403);
 assert.equal((await request(s.admin,'/leads','POST',{name:'Cross bank',owner_id:second.user.id})).status,400);
 const lead=await request(s.marketer,'/leads','POST',{name:'Test Business',company:'Keep Company',next_follow_up:'2027-01-15'});assert.equal(lead.status,201);const id=lead.data.lead.id;
 const outside=await request(s.outside,'/leads','POST',{name:'Outside team'});assert.equal(outside.status,201);
 for(const viewer of [s.leader,s.manager,s.regional,s.head,s.executive])assert.equal((await request(viewer,'/leads/'+id)).status,200);
 for(const viewer of [s.marketer2,second])assert.equal((await request(viewer,'/leads/'+id)).status,404);
 for(const viewer of [s.leader,s.manager,s.regional])assert.equal((await request(viewer,'/leads/'+outside.data.lead.id)).status,404);
 assert.equal((await request(s.marketer,'/leads/'+id,'PATCH',{name:'Edited'})).status,200);
 const detail=await request(s.marketer,'/leads/'+id);assert.equal(detail.data.lead.company,'Keep Company');const reminder=detail.data.activities.find(a=>a.is_lead_reminder);assert.ok(reminder);
 assert.equal((await request(second,'/activities/'+reminder.id+'/complete','POST',{})).status,404);
 assert.equal((await request(s.marketer,'/activities/'+reminder.id+'/complete','POST',{})).status,200);assert.equal((await request(s.marketer,'/leads/'+id)).data.lead.next_follow_up,null);
 const converted=await request(s.marketer,'/leads/'+id+'/convert','POST',{});assert.equal(converted.status,200);const customer=converted.data.customer;assert.equal((await request(s.leader,'/leads/'+id,'PATCH',{owner_id:s.marketer2.user.id})).status,409);
 const again=await request(s.marketer,'/leads/'+id+'/convert','POST',{});assert.ok([200,201].includes(again.status));assert.equal(again.data.customer.id,customer.id);
 assert.equal((await request(second,'/customers')).data.customers.some(c=>c.id===customer.id),false);
 const direct=await request(s.marketer2,'/customers','POST',{name:'Other Customer'});assert.equal(direct.status,201);
 assert.equal((await request(s.marketer,'/opportunities','POST',{customer_id:direct.data.customer.id,title:'Forbidden opportunity',currency:'USD'})).status,404);
 const opportunity=await request(s.marketer,'/opportunities','POST',{customer_id:customer.id,title:'Payroll',amount:'1250.50',currency:'USD'});assert.equal(opportunity.status,201);const oid=opportunity.data.opportunity.id;assert.equal(opportunity.data.opportunity.amount,'1250.50');
 assert.equal((await request(s.executive,'/opportunities/'+oid,'PATCH',{stage:'won'})).status,403);
 assert.equal((await request(second,'/opportunities/'+oid,'PATCH',{stage:'won'})).status,404);
 assert.equal((await request(s.marketer,'/opportunities/'+oid,'PATCH',{stage:'won'})).status,200);
 assert.equal((await request(s.marketer,'/products','POST',{name:'Payroll'})).status,403);assert.equal((await request(s.head,'/products','POST',{name:'Payroll'})).status,201);assert.equal((await request(second,'/products')).data.products.length,0);
 const target={user_id:s.marketer.user.id,metric:'opportunities_won',goal:5,period_start:'2020-01-01',period_end:'2099-12-31'};
 assert.equal((await request(s.marketer,'/targets','POST',target)).status,403);assert.equal((await request(s.executive,'/targets','POST',target)).status,403);assert.equal((await request(s.leader,'/targets','POST',target)).status,201);
 assert.equal((await request(s.leader,'/targets','POST',{...target,user_id:s.outside.user.id})).status,400);const targets=await request(s.marketer,'/targets');assert.equal(Number(targets.data.targets[0].actual),1);assert.equal((await request(second,'/targets')).data.targets.length,0);
 await assert.rejects(f.db.query('INSERT INTO customers(bank_id,owner_id,name) VALUES ($1,$2,$3)',[s.marketer.user.bank_id,second.user.id,'Cross bank FK']),e=>e.code==='23503');
 assert.equal((await request(s.marketer,'/audit')).status,403);const audit=await request(s.admin,'/audit');assert.ok(audit.data.events.some(e=>e.action==='lead.create'&&e.entity_id===String(id)));
 assert.equal((await request(s.marketer,'/auth/logout','POST',{})).status,200);assert.equal((await request(s.marketer,'/auth/me')).status,401);
 for(let i=0;i<20;i++){const r=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bankCode:'DEMO',email:'missing@example.test',password:'wrong'})});assert.equal(r.status,401);}
 const blocked=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bankCode:'DEMO',email:'missing@example.test',password:'wrong'})});assert.equal(blocked.status,429);
});
