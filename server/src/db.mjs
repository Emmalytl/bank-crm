import pg from 'pg';
import {databaseOptions} from './config.mjs';
// Keep calendar dates as YYYY-MM-DD strings rather than timezone-shifted JS Date objects.
pg.types.setTypeParser(1082,value=>value);
let instance,testDatabase;
function connection(){if(testDatabase)return testDatabase;if(!instance){instance=new pg.Pool(databaseOptions());instance.on('error',e=>console.error('Idle PostgreSQL connection error:',e.code||'unknown'));}return instance;}
export const pool={query:(...args)=>connection().query(...args),connect:()=>connection().connect(),end:async()=>{if(instance)await instance.end();}};
// One compiler numbers positional bindings after composing validated scope fragments.
// Values are ALWAYS passed separately to PostgreSQL. Question marks inside SQL strings are ignored.
export function bind(sql,values=[]){let quoted=false,count=0,text='';for(let i=0;i<sql.length;i++){const c=sql[i];if(c==="'"){if(quoted&&sql[i+1]==="'"){text+="''";i++;continue;}quoted=!quoted;}text+=c==='?'&&!quoted?'$'+(++count):c;}if(count!==values.length)throw new Error('SQL parameter count mismatch');return {text,values};}
export async function query(sql,values=[],db=pool){return (await db.query(bind(sql,values))).rows;}
// Mutations and their audit records commit atomically on the same checked-out connection.
export async function transaction(work){const db=await pool.connect();try{await db.query('BEGIN');const value=await work(db);await db.query('COMMIT');return value;}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}}
// Test-only injection; never selected by an environment flag in the running application.
export function useDatabaseForTests(db){if(process.env.NODE_ENV!=='test')throw new Error('Test injection is disabled outside tests');testDatabase=db;}
