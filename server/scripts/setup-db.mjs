import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {databaseOptions} from '../src/config.mjs';
const client=new pg.Client(databaseOptions(process.env.DATABASE_URL_DIRECT||process.env.DATABASE_URL));
try{await client.connect();await client.query(await readFile(new URL('../../database/schema.sql',import.meta.url),'utf8'));console.log('Schema applied successfully. Existing records were preserved.');}catch(error){console.error('Schema setup failed:',error.code||error.message);process.exitCode=1;}finally{await client.end();}
