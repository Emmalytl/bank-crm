import {hashPassword,roles} from './security.mjs';
// Explicit fixture setup only. Caller supplies the database and password; no production fallback.
export async function seedDemo(db,password){
 if(process.env.NODE_ENV==='production')throw new Error('Demo seeding is disabled in production.');
 if(typeof password!=='string'||password.length<12)throw new Error('Demo password must contain at least 12 characters.');
 const hash=await hashPassword(password);const result={banks:[],users:[]};
 await db.query('BEGIN');try{
 for(const [code,name] of [['NORTH','North Demo Bank'],['SOUTH','South Demo Bank']]){
 const exists=await db.query('SELECT id FROM banks WHERE code=$1',[code]);if(exists.rows.length)throw new Error(`Bank ${code} already exists. No existing accounts will be overwritten.`);
 const bank=(await db.query('INSERT INTO banks(code,name) VALUES($1,$2) RETURNING *',[code,name])).rows[0];result.banks.push(bank);
 const branches=[];for(const [branchCode,branchName] of [['HQ','Head Office'],['CENTRAL','Central Branch']])branches.push((await db.query('INSERT INTO branches(bank_id,name,code) VALUES($1,$2,$3) RETURNING *',[bank.id,branchName,branchCode])).rows[0]);
 const people={};for(const role of [...roles].reverse()){
 const managers={head_of_sales:'executive',regional_manager:'head_of_sales',branch_manager:'regional_manager',team_leader:'branch_manager',marketer:'team_leader'};
 const email=`${role}@${code.toLowerCase()}.example`;const person=(await db.query('INSERT INTO users(bank_id,branch_id,manager_id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,bank_id,name,email,role',[bank.id,branches[0].id,people[managers[role]]?.id||null,role.split('_').map(x=>x[0].toUpperCase()+x.slice(1)).join(' '),email,hash,role])).rows[0];people[role]=person;result.users.push(person);
 }
 for(const [name,company,stage,product] of [['Alex Morgan','Cedar Trading','qualified','Business account'],['Jordan Taylor','Orchard Logistics','contacted','Payroll banking'],['Casey Brown','','new','Savings account']]){
 const lead=(await db.query('INSERT INTO leads(bank_id,owner_id,name,company,status,product,next_follow_up,notes) VALUES($1,$2,$3,$4,$5,$6,CURRENT_DATE+1,$7) RETURNING id',[bank.id,people.marketer.id,name,company,stage,product,'Synthetic demonstration record; no real customer or financial data.'])).rows[0];
 await db.query("INSERT INTO activities(bank_id,lead_id,user_id,type,summary,due_date,is_lead_reminder) VALUES($1,$2,$3,'task','Follow up on product interest',CURRENT_DATE+1,true)",[bank.id,lead.id,people.marketer.id]);
 }
 for(const product of ['Business account','Savings account','Payroll banking'])await db.query('INSERT INTO products(bank_id,name,category,description) VALUES($1,$2,$3,$4)',[bank.id,product,'Demo product','Illustrative product; eligibility and terms must be configured by the bank.']);
 }
 await db.query('COMMIT');return result;
 }catch(error){await db.query('ROLLBACK');throw error;}
}
