import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {seedDemo} from '../src/seed.mjs';
import {verifyPassword} from '../src/security.mjs';
test('schema additive rerun and explicit demo seeds preserve existing accounts',async()=>{const db=new PGlite();try{const schema=await readFile(new URL('../../database/schema.sql',import.meta.url),'utf8');await db.exec(schema);const seed=await seedDemo(db,'SyntheticTestPassword!');assert.equal(seed.banks.length,2);assert.equal(seed.users.length,14);const before=(await db.query('SELECT password_hash FROM users ORDER BY id LIMIT 1')).rows[0].password_hash;assert.equal(await verifyPassword('SyntheticTestPassword!',before),true);await db.exec(schema);await assert.rejects(seedDemo(db,'DifferentSyntheticPassword!'),/already exists/);assert.equal((await db.query('SELECT count(*) total FROM users')).rows[0].total,14);assert.equal((await db.query('SELECT password_hash FROM users ORDER BY id LIMIT 1')).rows[0].password_hash,before);const old=process.env.NODE_ENV;process.env.NODE_ENV='production';try{await assert.rejects(seedDemo(db,'SyntheticTestPassword!'),/disabled in production/);}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}}finally{await db.close();}});
