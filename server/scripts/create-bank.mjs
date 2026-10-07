import pg from 'pg';
import {databaseOptions} from '../src/config.mjs';
import {hashPassword} from '../src/security.mjs';
// Administrative bootstrap runs locally with database authority; it is not a public registration API.
const currency=process.env.BANK_CURRENCY||'USD',timezone=process.env.BANK_TIMEZONE||'UTC';
let validZone=true;try{new Intl.DateTimeFormat('en',{timeZone:timezone});}catch{validZone=false;}
const {BANK_CODE:code,BANK_NAME:name,BANK_ADMIN_NAME:adminName,BANK_ADMIN_EMAIL:email,BANK_ADMIN_PASSWORD:password}=process.env;
if(!validZone||!/^[A-Z]{3}$/.test(currency)||!/^[A-Z0-9_-]{2,32}$/.test(code||'')||!name||name.length>160||!adminName||adminName.length>120||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||'')||email.length>190||!password||password.length<12){console.error('Set BANK_CODE (uppercase), BANK_NAME, BANK_ADMIN_NAME, BANK_ADMIN_EMAIL and BANK_ADMIN_PASSWORD (12+ characters) in root .env.');process.exitCode=1;}else{
 const db=new pg.Client(databaseOptions());try{await db.connect();await db.query('BEGIN');const bank=(await db.query('INSERT INTO banks(code,name,currency,timezone) VALUES($1,$2,$3,$4) RETURNING id',[code,name,currency,timezone])).rows[0];await db.query("INSERT INTO users(bank_id,name,email,password_hash,role) VALUES($1,$2,$3,$4,'bank_admin')",[bank.id,adminName,email.toLowerCase(),await hashPassword(password)]);await db.query('COMMIT');console.log(`Created ${code} and its bank administrator. Password was not printed.`);}catch(error){await db.query('ROLLBACK').catch(()=>{});console.error('Bank setup failed:',error.code||error.message);process.exitCode=1;}finally{await db.end();}
}
