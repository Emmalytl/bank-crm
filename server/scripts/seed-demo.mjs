import pg from 'pg';
import {databaseOptions} from '../src/config.mjs';
import {seedDemo} from '../src/seed.mjs';
if(process.env.SEED_DEMO!=='true'||process.env.NODE_ENV==='production'){console.error('Set SEED_DEMO=true in a development environment to create synthetic accounts.');process.exitCode=1;}else{
 const client=new pg.Client(databaseOptions());try{await client.connect();const result=await seedDemo(client,process.env.DEMO_PASSWORD);console.log('Created synthetic NORTH and SOUTH banks. Existing banks were not modified.');for(const user of result.users)console.log(`${result.banks.find(b=>b.id===user.bank_id).code} | ${user.email} | ${user.role}`);console.log('Use your supplied DEMO_PASSWORD. It is never printed.');}catch(error){console.error('Demo setup failed:',error.code||error.message);process.exitCode=1;}finally{await client.end();}
}
