// DOM interactions call the actual Node API backed by PostgreSQL WASM.
// This verifies rendered React behavior; it does not replace a real browser/layout test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
import {fixture} from '../../server/test/fixture.mjs';
process.env.NODE_ENV='test';
const {useDatabaseForTests}=await import('../../server/src/db.mjs');
const {app}=await import('../../server/src/app.mjs');
const bundle=await build({entryPoints:[new URL('../src/main.jsx',import.meta.url).pathname],bundle:true,write:false,format:'iife',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}});
const pause=()=>new Promise(r=>setTimeout(r,20));
async function wait(check){for(let n=0;n<250;n++){const result=check();if(result)return result;await pause();}throw new Error('React interaction timed out');}
test('React DOM: login, navigation, lead creation/conversion, opportunity form and executive controls',async t=>{
 const f=await fixture();useDatabaseForTests(f.adapter);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await f.close();});const base='http://127.0.0.1:'+server.address().port;
 async function open(role){let cookie='';const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));const dom=new JSDOM('<div id="root"></div>',{url:base,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc});
 let mediaChange;const media={matches:true,addEventListener:(_event,listener)=>{mediaChange=listener;},removeEventListener:()=>{}};dom.window.matchMedia=()=>media;
 dom.window.fetch=async(path,options={})=>{const response=await fetch(base+path,{...options,headers:{...options.headers,...(cookie?{cookie}:{}),origin:'http://localhost:5173'}});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;};
 dom.window.eval(bundle.outputFiles[0].text);const d=dom.window.document;
 await wait(()=>d.querySelector('input[name="bankCode"]'));d.querySelector('[name="bankCode"]').value='DEMO';d.querySelector('[name="email"]').value=role+'@example.test';d.querySelector('[name="password"]').value=f.password;d.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await wait(()=>d.querySelector('aside nav'));
 const button=text=>[...d.querySelectorAll('button')].find(x=>x.textContent.trim().includes(text));
 const nav=async text=>{button(text).click();await wait(()=>!d.querySelector('.loading'));await pause();};
 return {dom,d,errors,button,nav,resizeDesktop:()=>{media.matches=false;mediaChange({matches:false});},submit:()=>d.querySelector('[role="dialog"] form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}))};
 }
 const ui=await open('marketer');const {d,button,nav,submit}=ui;
 assert.equal(button('Delivery roadmap'),undefined);
 // Header search changes actual navigation; React's controlled input requires the native setter.
 const search=d.querySelector('[aria-label="Find a workspace page"]');
 Object.getOwnPropertyDescriptor(ui.dom.window.HTMLInputElement.prototype,'value').set.call(search,'customers');search.dispatchEvent(new ui.dom.window.Event('input',{bubbles:true}));
 await wait(()=>d.querySelector('.nav-search-results button'));d.querySelector('.nav-search-results button').click();await wait(()=>d.querySelector('h1')?.textContent==='Customers');assert.equal(search.value,'');
 // JSDOM has no layout. Supply visible button rectangles only to exercise the focus trap.
 for(const node of d.querySelectorAll('aside button'))node.getClientRects=()=>[{width:100,height:30}];
 const toggle=d.querySelector('[aria-label="Open navigation"]');toggle.focus();toggle.click();await wait(()=>toggle.getAttribute('aria-expanded')==='true');await pause();assert.equal(d.querySelector('main').inert,true);assert.equal(d.activeElement,d.querySelector('aside button'));
 const drawerButtons=[...d.querySelectorAll('aside button')];drawerButtons.at(-1).focus();d.dispatchEvent(new ui.dom.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(d.activeElement,drawerButtons[0]);
 ui.dom.window.dispatchEvent(new ui.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait(()=>toggle.getAttribute('aria-expanded')==='false');assert.equal(d.querySelector('main').inert,false);assert.equal(d.activeElement,toggle);
 toggle.click();await wait(()=>d.querySelector('.sidebar-backdrop'));d.querySelector('.sidebar-backdrop').click();await wait(()=>toggle.getAttribute('aria-expanded')==='false');
 toggle.click();await wait(()=>toggle.getAttribute('aria-expanded')==='true');ui.resizeDesktop();await wait(()=>toggle.getAttribute('aria-expanded')==='false');assert.equal(d.querySelector('main').inert,false);assert.equal(d.body.style.overflow,'');
 toggle.click();await wait(()=>toggle.getAttribute('aria-expanded')==='true');await nav('Leads & pipeline');assert.equal(toggle.getAttribute('aria-expanded'),'false');
 
 for(const page of ['Customers','Opportunities','Targets','Products','Follow-ups','People','Branches','Overview','Leads & pipeline'])await nav(page);
 button('+ Add lead').click();await wait(()=>d.querySelector('[role="dialog"]'));d.querySelector('[role="dialog"] [name="name"]').value='DOM Test Customer';submit();await wait(()=>{if(d.querySelector('[role="dialog"] .error'))throw new Error(d.querySelector('[role="dialog"] .error').textContent);return !d.querySelector('[role="dialog"]')});await wait(()=>button('DOM Test Customer'));button('DOM Test Customer').click();await wait(()=>button('Convert to customer'));button('Convert to customer').click();await wait(()=>d.body.textContent.includes('Converted to a customer record.'));
 // Close the lead detail and create an opportunity using a decimal string.
 const close=d.querySelector('[role="dialog"] [aria-label="Close dialog"]');if(close)close.click();else d.querySelector('[role="dialog"] button').click();await nav('Opportunities');await wait(()=>button('+ Add opportunity'));button('+ Add opportunity').click();await wait(()=>d.querySelector('[name="customer_id"] option[value]:not([value=""])'));
 d.querySelector('[name="customer_id"]').value=d.querySelector('[name="customer_id"] option[value]:not([value=""])').value;d.querySelector('[name="title"]').value='DOM Payroll Opportunity';d.querySelector('[name="amount"]').value='0.10';submit();await wait(()=>!d.querySelector('[role="dialog"]'));await wait(()=>button('DOM Payroll Opportunity'));assert.equal(ui.errors.length,0,ui.errors.map(String).join('\n'));ui.dom.window.close();
 const executive=await open('executive');await executive.nav('Leads & pipeline');assert.equal(executive.button('+ Add lead'),undefined);await executive.nav('Customers');assert.equal(executive.button('+ Add customer'),undefined);await executive.nav('Opportunities');assert.equal(executive.button('+ Add opportunity'),undefined);assert.equal(executive.errors.length,0);executive.dom.window.close();
});
