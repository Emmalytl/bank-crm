// Real PostgreSQL engine in WASM, not Neon: validates SQL and constraints locally.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {hashPassword} from '../src/security.mjs';
export async function fixture(){
 const db=new PGlite();await db.exec(await readFile(new URL('../../database/schema.sql',import.meta.url),'utf8'));
 let tail=Promise.resolve();
 async function lock(){const previous=tail;let unlock;tail=new Promise(r=>unlock=r);await previous;return unlock;}
 const run=async arg=>{const text=typeof arg==='string'?arg:arg.text;const values=typeof arg==='string'?[]:arg.values;return db.query(text,values);};
 const adapter={query:async arg=>{const release=await lock();try{return await run(arg);}finally{release();}},connect:async()=>{const release=await lock();return {query:run,release};}};
 const password='LocalQaPassword!2026',hash=await hashPassword(password),users={};
 for(const code of ['DEMO','SECOND']){
  const bank=(await db.query('INSERT INTO banks(code,name) VALUES ($1,$2) RETURNING id',[code,code+' Test Bank'])).rows[0].id;
  const branches=[];for(const code of ['CENTRAL','OTHER'])branches.push((await db.query('INSERT INTO branches(bank_id,name,code) VALUES ($1,$2,$3) RETURNING id',[bank,code,code])).rows[0].id);
  for(const [key,role,branch,manager] of [['admin','bank_admin',0,null],['head','head_of_sales',0,null],['regional','regional_manager',0,'head'],['manager','branch_manager',0,'regional'],['leader','team_leader',0,'manager'],['marketer','marketer',0,'leader'],['marketer2','marketer',0,'leader'],['outside','marketer',1,'head'],['executive','executive',0,null]]){
   const u=(await db.query('INSERT INTO users(bank_id,branch_id,manager_id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',[bank,branches[branch],manager?users[code+':'+manager].id:null,key,key+'@example.test',hash,role])).rows[0];users[code+':'+key]=u;
  }
 }
 return {db,adapter,users,password,close:()=>db.close()};
}
