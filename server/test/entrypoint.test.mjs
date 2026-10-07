import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('Vercel exports Express without starting a listener',async()=>{const {default:handler}=await import('../../api/index.js');assert.equal(typeof handler,'function');const entry=await readFile(new URL('../../api/index.js',import.meta.url),'utf8');assert.doesNotMatch(entry,/\.listen\s*\(/);});
test('Hosting configuration keeps API and SPA routes separate',async()=>{const config=JSON.parse(await readFile(new URL('../../vercel.json',import.meta.url),'utf8'));assert.equal(config.outputDirectory,'web/dist');assert.equal(config.rewrites[0].source,'/api/:path*');assert.equal(config.rewrites[0].destination,'/api/index?endpoint=:path*');});

test('API rewrite preserves filters and rejects invalid paths',async()=>{const {normalizeApiUrl}=await import('../../api/index.js');assert.equal(normalizeApiUrl('/api/index?endpoint=leads&q=Alex&status=new'),'/api/leads?q=Alex&status=new');assert.equal(normalizeApiUrl('/api/leads?q=Alex'),'/api/leads?q=Alex');assert.equal(normalizeApiUrl('/api/index?endpoint=auth%2Fme'),'/api/auth/me');assert.throws(()=>normalizeApiUrl('/api/index?endpoint=..%2Fsecrets'));assert.throws(()=>normalizeApiUrl('/api/index?endpoint=leads%3Fadmin'));});
