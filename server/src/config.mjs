import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
dotenv.config({path:fileURLToPath(new URL('../../.env',import.meta.url)),quiet:true});
export const config={port:Number(process.env.PORT||4000),origin:process.env.APP_ORIGIN||'http://localhost:5173',production:process.env.NODE_ENV==='production'};
// Hosted databases must authenticate the TLS server. Local PostgreSQL test hosts may disable TLS.
export function databaseOptions(connectionString=process.env.DATABASE_URL){
 if(!connectionString)throw Object.assign(new Error('Set DATABASE_URL in .env or your hosting environment.'),{code:'DATABASE_CONFIG'});
 let url;try{url=new URL(connectionString);}catch{throw Object.assign(new Error('Invalid DATABASE_URL.'),{code:'DATABASE_CONFIG'});}
 if(!['postgres:','postgresql:'].includes(url.protocol)||/your_/i.test(url.hostname)||!url.hostname)throw Object.assign(new Error('Replace the example DATABASE_URL with your Neon connection string.'),{code:'DATABASE_CONFIG'});
 if(!['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname))url.searchParams.set('sslmode','verify-full');
 return {connectionString:url.toString(),max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:15000,statement_timeout:15000,enableChannelBinding:true};
}

export function allowedOrigins(){return [...new Set([...(process.env.APP_ORIGIN?[process.env.APP_ORIGIN]:!config.production?[config.origin]:[]),...(!config.production?[`http://localhost:${config.port}`]:[]),...(process.env.VERCEL_URL?[`https://${process.env.VERCEL_URL}`]:[])])];}
