import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query, transaction } from "./db.mjs";
import { config, allowedOrigins } from "./config.mjs";
import { schemas, leadPatch, customerSchema, opportunitySchema, opportunityPatch, targetSchema, productSchema } from "./validation.mjs";
import {
  cookieToken,
  tokenHash,
  newToken,
  safeEqual,
  verifyPassword,
  hashPassword,
  leadScope,
  peopleScope,
  canWrite,
  stages,
} from "./security.mjs";
export const app = express();
app.disable("x-powered-by");
if(process.env.VERCEL)app.set("trust proxy",1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
        "upgrade-insecure-requests": null,
      },
    },
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait a minute." },
  }),
);
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
const fail = (status, message) => Object.assign(new Error(message), { status });
const parse = (schema, data) => {
  const r = schema.safeParse(data);
  if (!r.success)
    throw fail(
      400,
      r.error.issues
        .map((i) => `${i.path.join(".") || "Request"}: ${i.message}`)
        .join("; "),
    );
  return r.data;
};
const rid = (req) => parse(schemas.id, req.params.id);
const audit = (db, user, action, entity, id) =>
  query(
    "INSERT INTO audit_events(bank_id,actor_id,action,entity,entity_id) VALUES (?,?,?,?,?)",
    [user.bank_id, user.id, action, entity, String(id)],
    db,
  );
const cookieOptions = `Path=/api; HttpOnly; SameSite=Strict${config.production ? "; Secure" : ""}`;
const userSelect =
  "u.id,u.bank_id,u.branch_id,u.manager_id,u.name,u.email,u.role,b.name bank_name,b.code bank_code,b.currency,b.timezone";
app.get("/api/health", async (_req, res) => {
  try {
    const [migration] = await query(
      "SELECT version FROM schema_migrations WHERE version='001-neon-crm'",
    );
    if (!migration) throw new Error("Schema setup incomplete");
    await query("SELECT id FROM users LIMIT 1");
    res.json({ status: "ready", database: "connected" });
  } catch {
    res
      .status(503)
      .json({
        error:
          "PostgreSQL is not configured or setup is incomplete. Set DATABASE_URL and run npm run db:setup.",
      });
  }
});
// Browser writes must originate from this app; session writes also require a CSRF token.
app.use("/api", (req, _res, next) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.get("origin") &&
    !allowedOrigins().includes(req.get("origin"))
  )
    return next(fail(403, "Request origin is not permitted."));
  next();
});
// Account-key throttling is persisted in PostgreSQL across serverless instances.
async function loginLimit(req,_res,next){
 const input=parse(schemas.login,req.body);
 const key=tokenHash(input.bankCode+':'+input.email);
 const [attempt]=await query("INSERT INTO login_throttles(key_hash,attempts) VALUES (?,1) ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN login_throttles.window_start<now()-interval '15 minutes' THEN 1 ELSE login_throttles.attempts+1 END,window_start=CASE WHEN login_throttles.window_start<now()-interval '15 minutes' THEN now() ELSE login_throttles.window_start END RETURNING attempts",[key]);
 if(attempt.attempts>20)throw fail(429,'Too many login attempts for this account. Try again in 15 minutes.');
 req.loginKey=key;next();
}
// A dummy hash keeps unknown users on the same expensive password-verification path.
const dummyHash = await hashPassword(newToken());
app.post("/api/auth/login", loginLimit, async (req, res) => {
  const input = parse(schemas.login, req.body);
  const [user] = await query(
    `SELECT ${userSelect},u.password_hash FROM users u JOIN banks b ON b.id=u.bank_id WHERE b.code=? AND u.email=? AND u.active=true`,
    [input.bankCode, input.email],
  );
  const valid = await verifyPassword(
    input.password,
    user?.password_hash || dummyHash,
  );
  if (!user || !valid)
    throw fail(401, "Bank code, email or password is incorrect.");
  delete user.password_hash;
 await query("DELETE FROM login_throttles WHERE key_hash=? OR window_start<now()-interval '1 day'",[req.loginKey]);
  const token = newToken(),
    csrfToken = newToken(),
    old = cookieToken(req.get("cookie"));
  await transaction(async (db) => {
    if (old)
      await query(
        "DELETE FROM sessions WHERE token_hash=?",
        [tokenHash(old)],
        db,
      );
    await query(
      "DELETE FROM sessions WHERE expires_at <= now()",
      [],
      db,
    );
    await query(
      "INSERT INTO sessions(token_hash,bank_id,user_id,csrf_token,expires_at) VALUES (?,?,?,?,now()+interval '8 hours')",
      [tokenHash(token), user.bank_id, user.id, csrfToken],
      db,
    );
    await audit(db, user, "login", "user", user.id);
  });
  res
    .set("Set-Cookie", `crm_session=${token}; ${cookieOptions}; Max-Age=28800`)
    .json({ user, csrfToken });
});
app.use("/api", async (req, _res, next) => {
  const token = cookieToken(req.get("cookie"));
  if (!token) return next(fail(401, "Please sign in."));
  const [session] = await query(
    `SELECT ${userSelect},s.csrf_token FROM sessions s JOIN users u ON u.id=s.user_id AND u.bank_id=s.bank_id JOIN banks b ON b.id=u.bank_id WHERE s.token_hash=? AND s.expires_at>now() AND u.active=true`,
    [tokenHash(token)],
  );
  if (!session)
    return next(fail(401, "Your session has expired. Please sign in."));
  const { csrf_token, ...user } = session;
  req.user = user;
  req.sessionHash = tokenHash(token);
  req.csrf = csrf_token;
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    !safeEqual(req.get("x-csrf-token"), csrf_token)
  )
    return next(
      fail(403, "Session verification failed. Refresh and try again."),
    );
  next();
});
app.get("/api/auth/me", (req, res) =>
  res.json({ user: req.user, csrfToken: req.csrf }),
);
app.post("/api/auth/logout", async (req, res) => {
  await transaction(async (db) => {
    await audit(db, req.user, "logout", "user", req.user.id);
    await query(
      "DELETE FROM sessions WHERE token_hash=?",
      [req.sessionHash],
      db,
    );
  });
  res
    .set("Set-Cookie", `crm_session=; ${cookieOptions}; Max-Age=0`)
    .json({ ok: true });
});
const admin = (req, _res, next) =>
  req.user.role === "bank_admin"
    ? next()
    : next(fail(403, "Only a bank administrator can perform this action."));
const writer = (req, _res, next) =>
  canWrite(req.user)
    ? next()
    : next(fail(403, "Executive access is read-only."));
const leadColumns = "l.*,u.name owner_name,(SELECT c.id FROM customers c WHERE c.bank_id=l.bank_id AND c.lead_id=l.id) customer_id";
async function findLead(req, db = pool) {
  const scope = leadScope(req.user);
  const [lead] = await query(
    `SELECT ${leadColumns} FROM leads l JOIN users u ON u.bank_id=l.bank_id AND u.id=l.owner_id WHERE ${scope.sql} AND l.id=?${db!==pool?" FOR UPDATE OF l":""}`,
    [...scope.values, rid(req)],
    db,
  );
  if (!lead) throw fail(404, "Lead not found in your workspace.");
  return lead;
}
async function allowedOwner(user, id, db) {
  const scope = peopleScope(user);
  const [owner] = await query(
    `SELECT u.id FROM users u WHERE ${scope.sql} AND u.id=? AND u.active=true AND u.role<>'executive'`,
    [...scope.values, id],
    db,
  );
  if (!owner)
    throw fail(400, "Select an active owner within your permitted team.");
}
// Keep the lead's scheduled date and its reminder in one transaction.
async function syncReminder(db,user,leadId,date){
 if(!date){await query('UPDATE activities SET due_date=NULL,completed=true WHERE bank_id=? AND lead_id=? AND is_lead_reminder=true',[user.bank_id,leadId],db);return;}
 await query("INSERT INTO activities(bank_id,lead_id,user_id,type,summary,due_date,is_lead_reminder) VALUES (?,?,?,'task','Scheduled lead follow-up',?,true) ON CONFLICT(bank_id,lead_id) WHERE is_lead_reminder DO UPDATE SET due_date=EXCLUDED.due_date,completed=false,user_id=EXCLUDED.user_id",[user.bank_id,leadId,user.id,date],db);
}
app.get("/api/users", async (req, res) => {
  const scope = peopleScope(req.user);
  res.json({
    users: await query(
      `SELECT u.id,u.name,u.email,u.role,u.branch_id,u.manager_id,u.active,br.name branch_name,m.name manager_name FROM users u LEFT JOIN branches br ON br.id=u.branch_id AND br.bank_id=u.bank_id LEFT JOIN users m ON m.id=u.manager_id AND m.bank_id=u.bank_id WHERE ${scope.sql} ORDER BY u.name`,
      scope.values,
    ),
  });
});
app.post("/api/users", admin, async (req, res) => {
  const p = parse(schemas.user, req.body);
  const passwordHash = await hashPassword(p.password);
  const user = await transaction(async (db) => {
    if (p.branch_id) {
      const [branch] = await query(
        "SELECT id FROM branches WHERE bank_id=? AND id=?",
        [req.user.bank_id, p.branch_id],
        db,
      );
      if (!branch) throw fail(400, "Branch is not in this bank.");
    }
    if (p.role === "branch_manager" && !p.branch_id)
      throw fail(400, "Branch managers must have a branch.");
    if (p.manager_id) {
      const [manager] = await query(
        "SELECT id,role FROM users WHERE bank_id=? AND id=? AND active=true",
        [req.user.bank_id, p.manager_id],
        db,
      );
      if (!manager || ["marketer", "executive"].includes(manager.role))
        throw fail(400, "Select an active manager in this bank.");
    }
    const [result] = await query(
      "INSERT INTO users(bank_id,branch_id,manager_id,name,email,password_hash,role) VALUES (?,?,?,?,?,?,?) RETURNING id",
      [
        req.user.bank_id,
        p.branch_id || null,
        p.manager_id || null,
        p.name,
        p.email,
        passwordHash,
        p.role,
      ],
      db,
    );
    await audit(db, req.user, "user.create", "user", result.id);
    return {
      id: result.id,
      name: p.name,
      email: p.email,
      role: p.role,
      branch_id: p.branch_id || null,
      manager_id: p.manager_id || null,
    };
  });
  res.status(201).json({ user });
});
app.get("/api/branches", async (req, res) =>
  res.json({
    branches: await query(
      "SELECT id,name,code FROM branches WHERE bank_id=? ORDER BY name",
      [req.user.bank_id],
    ),
  }),
);
app.post("/api/branches", admin, async (req, res) => {
  const p = parse(schemas.branch, req.body);
  const branch = await transaction(async (db) => {
    const [result] = await query(
      "INSERT INTO branches(bank_id,name,code) VALUES (?,?,?) RETURNING id",
      [req.user.bank_id, p.name, p.code],
      db,
    );
    await audit(db, req.user, "branch.create", "branch", result.id);
    return { id: result.id, ...p };
  });
  res.status(201).json({ branch });
});
app.get("/api/leads", async (req, res) => {
  const scope = leadScope(req.user);
  let sql = `SELECT ${leadColumns} FROM leads l JOIN users u ON u.bank_id=l.bank_id AND u.id=l.owner_id WHERE ${scope.sql}`;
  const values = [...scope.values];
  if (req.query.status) {
    if (!stages.includes(req.query.status))
      throw fail(400, "Unknown lead stage.");
    sql += " AND l.status=?";
    values.push(req.query.status);
  }
  if (req.query.q) {
    const q = String(req.query.q).slice(0, 160);
    sql += " AND (l.name ILIKE ? OR l.company ILIKE ? OR l.email ILIKE ?)";
    values.push(...Array(3).fill(`%${q}%`));
  }
  res.json({
    leads: await query(
      sql + " ORDER BY l.updated_at DESC,l.id DESC LIMIT 500",
      values,
    ),
  });
});
app.get("/api/leads/:id", async (req, res) => {
  const lead = await findLead(req);
  const activities = await query(
    "SELECT a.*,u.name actor_name FROM activities a JOIN users u ON u.id=a.user_id AND u.bank_id=a.bank_id WHERE a.bank_id=? AND a.lead_id=? ORDER BY a.created_at DESC,a.id DESC",
    [req.user.bank_id, lead.id],
  );
  res.json({ lead, activities });
});
app.post("/api/leads", writer, async (req, res) => {
  const p = parse(schemas.lead, req.body);
  const lead = await transaction(async (db) => {
    const owner = p.owner_id || req.user.id;
    await allowedOwner(req.user, owner, db);
    const [r] = await query(
      "INSERT INTO leads(bank_id,owner_id,name,company,email,phone,source,product,status,notes,next_follow_up) VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING id",
      [
        req.user.bank_id,
        owner,
        p.name,
        p.company,
        p.email,
        p.phone,
        p.source,
        p.product,
        p.status,
        p.notes,
        p.next_follow_up || null,
      ],
      db,
    );
    await syncReminder(db, req.user, r.id, p.next_follow_up);
    await audit(db, req.user, "lead.create", "lead", r.id);
    return { id: r.id, ...p, owner_id: owner };
  });
  res.status(201).json({ lead });
});
app.patch("/api/leads/:id", writer, async (req, res) => {
  const p = parse(leadPatch, req.body);
  if (!Object.keys(p).length) throw fail(400, "No changes provided.");
  const lead = await transaction(async (db) => {
    const existing = await findLead(req, db);
    if (p.owner_id && p.owner_id !== existing.owner_id && existing.customer_id) throw fail(409,"Converted leads keep their customer owner. Reassignment requires a coordinated customer-transfer workflow.");
    if (p.owner_id) await allowedOwner(req.user, p.owner_id, db);
    const keys = Object.keys(p);
    await query(
      `UPDATE leads SET ${keys.map((k) => `${k}=?`).join(",")},updated_at=now() WHERE bank_id=? AND id=?`,
      [...keys.map((k) => p[k] ?? null), req.user.bank_id, rid(req)],
      db,
    );
    if ("next_follow_up" in p)
      await syncReminder(db, req.user, rid(req), p.next_follow_up);
    await audit(db, req.user, "lead.update", "lead", rid(req));
    const [updated] = await query(
      "SELECT * FROM leads WHERE bank_id=? AND id=?",
      [req.user.bank_id, rid(req)],
      db,
    );
    return updated;
  });
  res.json({ lead });
});
app.post("/api/leads/:id/activities", writer, async (req, res) => {
  const p = parse(schemas.activity, req.body);
  const activity = await transaction(async (db) => {
    await findLead(req, db);
    const [r] = await query(
      "INSERT INTO activities(bank_id,lead_id,user_id,type,summary,due_date,completed) VALUES (?,?,?,?,?,?,?) RETURNING id",
      [
        req.user.bank_id,
        rid(req),
        req.user.id,
        p.type,
        p.summary,
        p.due_date || null,
        p.due_date ? false : true,
      ],
      db,
    );
    await audit(db, req.user, "activity.create", "activity", r.id);
    return { id: r.id, ...p, completed: !p.due_date };
  });
  res.status(201).json({ activity });
});
app.get("/api/activities", async (req, res) => {
  const scope = leadScope(req.user);
  res.json({
    activities: await query(
      `SELECT a.*,l.name lead_name,u.name actor_name FROM activities a JOIN leads l ON l.id=a.lead_id AND l.bank_id=a.bank_id JOIN users u ON u.id=a.user_id AND u.bank_id=a.bank_id WHERE ${scope.sql} ORDER BY a.completed ASC,a.due_date IS NULL,a.due_date,a.id DESC LIMIT 500`,
      scope.values,
    ),
  });
});
app.post("/api/activities/:id/complete", writer, async (req, res) => {
  await transaction(async (db) => {
    const scope = leadScope(req.user);
    const [a] = await query(
      `SELECT a.id,a.lead_id,a.is_lead_reminder FROM activities a JOIN leads l ON l.id=a.lead_id AND l.bank_id=a.bank_id WHERE ${scope.sql} AND a.id=?`,
      [...scope.values, rid(req)],
      db,
    );
    if (!a) throw fail(404, "Activity not found.");
    await query(
      "UPDATE activities SET completed=true WHERE bank_id=? AND id=?",
      [req.user.bank_id, a.id],
      db,
    );
    if (a.is_lead_reminder)
      await query(
        "UPDATE leads SET next_follow_up=NULL WHERE bank_id=? AND id=?",
        [req.user.bank_id, a.lead_id],
        db,
      );
    await audit(db, req.user, "activity.complete", "activity", a.id);
  });
  res.json({ ok: true });
});
app.get("/api/dashboard", async (req, res) => {
  const scope = leadScope(req.user);
  const counts = await query(
    `SELECT l.status,COUNT(*) count FROM leads l WHERE ${scope.sql} GROUP BY l.status`,
    scope.values,
  );
  const [overdue] = await query(
    `SELECT COUNT(*) count FROM activities a JOIN leads l ON l.id=a.lead_id AND l.bank_id=a.bank_id WHERE ${scope.sql} AND a.completed=false AND a.due_date<(now() AT TIME ZONE 'UTC')::date`,
    scope.values,
  );
  const recent = await query(
    `SELECT ${leadColumns} FROM leads l JOIN users u ON u.id=l.owner_id AND u.bank_id=l.bank_id WHERE ${scope.sql} ORDER BY l.updated_at DESC,l.id DESC LIMIT 5`,
    scope.values,
  );
  const upcoming = await query(
    `SELECT a.*,l.name lead_name FROM activities a JOIN leads l ON l.id=a.lead_id AND l.bank_id=a.bank_id WHERE ${scope.sql} AND a.completed=false AND a.due_date IS NOT NULL ORDER BY a.due_date,a.id LIMIT 5`,
    scope.values,
  );
  const total = counts.reduce((s, c) => s + Number(c.count), 0),
    won = Number(counts.find((c) => c.status === "won")?.count || 0),
    lost = Number(counts.find((c) => c.status === "lost")?.count || 0);
  res.json({
    metrics: {
      leads: total,
      active: total - won - lost,
      won,
      overdue: Number(overdue.count),
    },
    stages: stages.map((status) => ({
      status,
      count: Number(counts.find((c) => c.status === status)?.count || 0),
    })),
    recent,
    upcoming,
  });
});
app.get("/api/audit", admin, async (req, res) =>
  res.json({
    events: await query(
      "SELECT a.id,a.action,a.entity,a.entity_id,a.created_at,u.name actor_name FROM audit_events a JOIN users u ON u.bank_id=a.bank_id AND u.id=a.actor_id WHERE a.bank_id=? ORDER BY a.id DESC LIMIT 200",
      [req.user.bank_id],
    ),
  }),
);
// Customers and opportunities use the same reporting-tree scope as leads.
async function findCustomer(user,id,db=pool) {
 const scope=leadScope(user,'c');
 const [customer]=await query(`SELECT c.* FROM customers c WHERE ${scope.sql} AND c.id=?`,[...scope.values,id],db);
 if(!customer)throw fail(404,'Customer not found in your workspace.');
 return customer;
}
app.get('/api/customers',async(req,res)=>{
 const scope=leadScope(req.user,'c');
 res.json({customers:await query(`SELECT c.*,u.name owner_name FROM customers c JOIN users u ON u.bank_id=c.bank_id AND u.id=c.owner_id WHERE ${scope.sql} ORDER BY c.created_at DESC,c.id DESC LIMIT 500`,scope.values)});
});
app.post('/api/customers',writer,async(req,res)=>{
 const p=parse(customerSchema,req.body);
 const customer=await transaction(async db=>{
  const owner=p.owner_id||req.user.id;await allowedOwner(req.user,owner,db);
  const [c]=await query('INSERT INTO customers(bank_id,owner_id,name,company,email,phone,notes) VALUES (?,?,?,?,?,?,?) RETURNING *',[req.user.bank_id,owner,p.name,p.company,p.email,p.phone,p.notes],db);
  await audit(db,req.user,'customer.create','customer',c.id);return c;
 });res.status(201).json({customer});
});
// Lock the lead before checking conversion so concurrent submissions create one customer.
app.post('/api/leads/:id/convert',writer,async(req,res)=>{
 const result=await transaction(async db=>{
  const lead=await findLead(req,db);
  let [customer]=await query('SELECT * FROM customers WHERE bank_id=? AND lead_id=?',[req.user.bank_id,lead.id],db);
  if(customer){await findCustomer(req.user,customer.id,db);return {customer,lead};}
  [customer]=await query('INSERT INTO customers(bank_id,owner_id,lead_id,name,company,email,phone,notes) VALUES (?,?,?,?,?,?,?,?) RETURNING *',[req.user.bank_id,lead.owner_id,lead.id,lead.name,lead.company,lead.email,lead.phone,lead.notes],db);
  await query("UPDATE leads SET status='won',next_follow_up=NULL,updated_at=now() WHERE bank_id=? AND id=?",[req.user.bank_id,lead.id],db);
  await syncReminder(db,req.user,lead.id,null);
  await audit(db,req.user,'lead.convert','lead',lead.id);
  await audit(db,req.user,'customer.create','customer',customer.id);
  return {customer,lead:{...lead,status:'won',next_follow_up:null,customer_id:customer.id}};
 });res.json(result);
});
app.get('/api/opportunities',async(req,res)=>{
 const scope=leadScope(req.user,'o');
 res.json({opportunities:await query(`SELECT o.*,u.name owner_name,c.name customer_name FROM opportunities o JOIN users u ON u.bank_id=o.bank_id AND u.id=o.owner_id JOIN customers c ON c.bank_id=o.bank_id AND c.id=o.customer_id WHERE ${scope.sql} ORDER BY o.updated_at DESC,o.id DESC LIMIT 500`,scope.values)});
});
app.post('/api/opportunities',writer,async(req,res)=>{
 const p=parse(opportunitySchema,req.body);
 const opportunity=await transaction(async db=>{
  const customer=await findCustomer(req.user,p.customer_id,db);
  await allowedOwner(req.user,customer.owner_id,db);
  const [o]=await query("INSERT INTO opportunities(bank_id,owner_id,customer_id,title,product,amount,currency,stage,expected_close,notes,won_at) VALUES (?,?,?,?,?,?,?,?,?,?,CASE WHEN ?='won' THEN now() ELSE NULL END) RETURNING *",[req.user.bank_id,customer.owner_id,p.customer_id,p.title,p.product,p.amount,p.currency,p.stage,p.expected_close||null,p.notes,p.stage],db);
  await audit(db,req.user,'opportunity.create','opportunity',o.id);return o;
 });res.status(201).json({opportunity});
});
app.patch('/api/opportunities/:id',writer,async(req,res)=>{
 const p=parse(opportunityPatch,req.body);if(!Object.keys(p).length)throw fail(400,'No changes provided.');
 const opportunity=await transaction(async db=>{
  const scope=leadScope(req.user,'o');
  const [existing]=await query(`SELECT o.* FROM opportunities o WHERE ${scope.sql} AND o.id=? FOR UPDATE`,[...scope.values,rid(req)],db);
  if(!existing)throw fail(404,'Opportunity not found in your workspace.');
  if(p.customer_id){const customer=await findCustomer(req.user,p.customer_id,db);await allowedOwner(req.user,customer.owner_id,db);p.owner_id=customer.owner_id;}
  const keys=Object.keys(p);
  const wonSql=p.stage ? ",won_at=CASE WHEN ?='won' THEN COALESCE(won_at,now()) ELSE NULL END" : '';
  const [updated]=await query(`UPDATE opportunities SET ${keys.map(k=>k+'=?').join(',')},updated_at=now()${wonSql} WHERE bank_id=? AND id=? RETURNING *`,[...keys.map(k=>p[k]??null),...(p.stage?[p.stage]:[]),req.user.bank_id,rid(req)],db);
  await audit(db,req.user,'opportunity.update','opportunity',updated.id);return updated;
 });res.json({opportunity});
});
app.get('/api/targets',async(req,res)=>{
 const scope=peopleScope(req.user);
 // UTC dates give a stable inclusive period, independent of the Node machine timezone.
 const targets=await query(`SELECT t.*,u.name user_name,CASE t.metric WHEN 'leads_created' THEN (SELECT count(*) FROM leads l WHERE l.bank_id=t.bank_id AND l.owner_id=t.user_id AND (l.created_at AT TIME ZONE 'UTC')::date BETWEEN t.period_start AND t.period_end) WHEN 'customers_created' THEN (SELECT count(*) FROM customers c WHERE c.bank_id=t.bank_id AND c.owner_id=t.user_id AND (c.created_at AT TIME ZONE 'UTC')::date BETWEEN t.period_start AND t.period_end) WHEN 'opportunities_won' THEN (SELECT count(*) FROM opportunities o WHERE o.bank_id=t.bank_id AND o.owner_id=t.user_id AND o.stage='won' AND (o.won_at AT TIME ZONE 'UTC')::date BETWEEN t.period_start AND t.period_end) END actual FROM targets t JOIN users u ON u.bank_id=t.bank_id AND u.id=t.user_id WHERE ${scope.sql} ORDER BY t.period_end DESC,t.id DESC LIMIT 500`,scope.values);
 res.json({targets});
});
const targetManager=(req,_res,next)=>['bank_admin','head_of_sales','team_leader','branch_manager','regional_manager'].includes(req.user.role)?next():next(fail(403,'Only permitted managers can set targets.'));
app.post('/api/targets',targetManager,async(req,res)=>{
 const p=parse(targetSchema,req.body);
 const target=await transaction(async db=>{
  await allowedOwner(req.user,p.user_id,db);
  const [t]=await query('INSERT INTO targets(bank_id,user_id,metric,goal,period_start,period_end) VALUES (?,?,?,?,?,?) RETURNING *',[req.user.bank_id,p.user_id,p.metric,p.goal,p.period_start,p.period_end],db);
  await audit(db,req.user,'target.create','target',t.id);return t;
 });res.status(201).json({target});
});
app.get('/api/products',async(req,res)=>res.json({products:await query('SELECT * FROM products WHERE bank_id=? ORDER BY name',[req.user.bank_id])}));
const productManager=(req,_res,next)=>['bank_admin','head_of_sales'].includes(req.user.role)?next():next(fail(403,'Only bank administrators and sales heads can manage products.'));
app.post('/api/products',productManager,async(req,res)=>{
 const p=parse(productSchema,req.body);
 const product=await transaction(async db=>{
  const [item]=await query('INSERT INTO products(bank_id,name,category,description) VALUES (?,?,?,?) RETURNING *',[req.user.bank_id,p.name,p.category,p.description],db);
  await audit(db,req.user,'product.create','product',item.id);return item;
 });res.status(201).json({product});
});

app.use("/api", (_req, _res, next) =>
  next(fail(404, "API endpoint not found.")),
);
const dist = resolve(
  fileURLToPath(new URL("../../web/dist/", import.meta.url)),
);
app.use(express.static(dist));
app.get("/{*splat}", (_req, res) => res.sendFile(resolve(dist, "index.html")));
app.use((error, _req, res, _next) => {
  let status = error.status || 500,
    message = error.message;
  if (error.code === "23505") {
    status = 409;
    message = "That record already exists in this bank.";
  } else if (["23503","23514","22003"].includes(error.code)) { status=400;message="Invalid relationship or value for this bank."; } else if (error.code) {
    status = 503;
    message =
      "Database request failed. Check DATABASE_URL and run database setup; review the API terminal for the error code.";
    console.error("Database error:", error.code);
  } else if (status === 500) {
    message = "Unexpected server error. Please try again.";
    console.error(error.stack);
  }
  if (error.type === "entity.parse.failed") {
    status = 400;
    message = "Request must contain valid JSON.";
  }
  res.status(status).json({ error: message });
});
