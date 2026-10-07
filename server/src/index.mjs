import {app} from './app.mjs';
import {config} from './config.mjs';
import {pool} from './db.mjs';
const server=app.listen(config.port,()=>console.log(`CRM API listening on http://localhost:${config.port}`));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(async()=>{await pool.end();process.exit(0);}));
