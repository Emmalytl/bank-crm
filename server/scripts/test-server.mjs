// Explicit test executable: no Neon credentials or production data are used.
process.env.NODE_ENV='test';
process.env.PORT='4000';
process.env.APP_ORIGIN='http://127.0.0.1:4000';
const {fixture}=await import('../test/fixture.mjs');
const {useDatabaseForTests}=await import('../src/db.mjs');
const f=await fixture();useDatabaseForTests(f.adapter);
for(const code of ['DEMO','SECOND']){
 const u=f.users[code+':marketer'];
 await f.db.query("INSERT INTO products(bank_id,name,category,description) VALUES ($1,'Business account','Accounts','Synthetic test product')",[u.bank_id]);
}
const {app}=await import('../src/app.mjs');
const server=app.listen(4000,'127.0.0.1',()=>console.log('Browser QA fixture ready on http://127.0.0.1:4000'));
async function stop(){server.close(async()=>{await f.close();process.exit(0);});}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
