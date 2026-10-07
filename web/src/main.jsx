import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { LayoutDashboard, Users, UserRound, TrendingUp, CalendarDays, Target, Package, Building2, ShieldCheck, Map } from "lucide-react";
const statuses = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "onboarding",
  "won",
  "lost",
];
const roles = [
  "marketer",
  "team_leader",
  "branch_manager",
  "regional_manager",
  "head_of_sales",
  "executive",
  "bank_admin",
];
const label = (s) =>
  String(s || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
const date = (d) =>
  d
    ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString(
        undefined,
        { month: "short", day: "numeric", year: "numeric" },
      )
    : "—";
let csrf = "";
// All records come from the Node API; no local demonstration records are substituted.
async function api(path, method = "GET", data) {
  let r;
  try {
    r = await fetch("/api" + path, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new Error(
      "Cannot reach the CRM server. Start the Node server and check your local setup.",
    );
  }
  let body;
  try {
    body = await r.json();
  } catch {
    throw new Error(
      "The API is unavailable. Check that the Node server is running on port 4000.",
    );
  }
  if (!r.ok) {
    const error = new Error(
      body.error || body.message || "The request could not be completed.",
    );
    error.status = r.status;
    if (r.status === 401 && path !== "/auth/login" && path !== "/auth/me")
      window.dispatchEvent(new Event("crm-session-expired"));
    throw error;
  }
  return body;
}
function App() {
  const [user, setUser] = useState(null),
    [boot, setBoot] = useState(true),
    [page, setPage] = useState("dashboard"),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    api("/auth/me")
      .then((x) => {
        setUser(x.user);
        csrf = x.csrfToken;
      })
      .catch((e) => {
        if (e.status !== 401) setError(e.message);
      })
      .finally(() => setBoot(false));
  }, []);
  useEffect(() => {
    const expired = () => {
      setUser(null);
      csrf = "";
      setPage("dashboard");
      setError("Your session ended. Please sign in again.");
    };
    window.addEventListener("crm-session-expired", expired);
    return () => window.removeEventListener("crm-session-expired", expired);
  }, []);
  const refresh = () => setVersion((v) => v + 1);
  if (boot) return <div className="loading">Opening your workspace…</div>;
  if (!user)
    return (
      <Login
        error={error}
        onLogin={(x) => {
          setUser(x.user);
          csrf = x.csrfToken;
          setError("");
        }}
      />
    );
  const pages = [
    ["dashboard", "Overview", <LayoutDashboard size={19}/>],
    ["leads", "Leads & pipeline", <UserRound size={19}/>],
    ["customers", "Customers", <Users size={19}/>],
    ["opportunities", "Opportunities", <TrendingUp size={19}/>],
    ["targets", "Targets", <Target size={19}/>],
    ["products", "Products", <Package size={19}/>],
    ["activities", "Follow-ups", <CalendarDays size={19}/>],
    ["team", "People", <Users size={19}/>],
    ["branches", "Branches", <Building2 size={19}/>],
    ...(user.role === "bank_admin" ? [["audit", "Audit history", <ShieldCheck size={19}/>]] : []),
    ["roadmap", "Delivery roadmap", <Map size={19}/>],
  ];
  return (
    <div className="app">
      <aside>
        <div className="brand">
          <span className="brandmark">B</span>
          <div>
            Bank CRM<small>RELATIONSHIP WORKSPACE</small>
          </div>
        </div>
        <div className="bankbadge">
          <span>YOUR BANK</span>
          <strong>{user.bank_name}</strong>
        </div>
        <nav>
          {pages.map(([id, text, icon]) => (
            <button
              key={id}
              className={page === id ? "selected" : ""}
              onClick={() => {
                setPage(id);
                setError("");
              }}
            >
              <span>{icon}</span>
              {text}
            </button>
          ))}
        </nav>
        <div className="sidebarfoot">
          Better relationships.
          <br />
          Stronger opportunities.<span>BANK RELATIONSHIP WORKSPACE</span>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span className="eyebrow">RELATIONSHIP MANAGEMENT</span>
            <h1>{pages.find((x) => x[0] === page)?.[1]}</h1>
          </div>
          <div className="profile">
            <span className="avatar">{user.name?.slice(0, 1)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{label(user.role)}</small>
            </div>
            <button
              className="quiet"
              onClick={async () => {
                try {
                  await api("/auth/logout", "POST");
                  setUser(null);
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        <div className="content">
          {["customers", "opportunities", "targets", "products"].includes(page) ? (
            <SalesPage key={page} page={page} user={user} version={version} refresh={refresh} />
          ) : page === "roadmap" ? (
            <Roadmap />
          ) : (
            <DataPage
              key={page}
              page={page}
              user={user}
              version={version}
              refresh={refresh}
              onError={setError}
            />
          )}
        </div>
      </main>
    </div>
  );
}
function Login({ error, onLogin }) {
  const [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="login">
      <section className="loginstory">
        <div className="brand">
          <span className="brandmark">B</span>Bank CRM
        </div>
        <span className="eyebrow">ONE WORKSPACE. EVERY RELATIONSHIP.</span>
        <h1>
          Move your next
          <br />
          opportunity forward.
        </h1>
        <p>
          A focused workspace for bank marketers and the leaders who support
          them.
        </p>
        <div className="storyline">
          Prospects <span>→</span> Relationships <span>→</span> Growth
        </div>
      </section>
      <section className="loginpanel">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr("");
            try {
              onLogin(
                await api(
                  "/auth/login",
                  "POST",
                  Object.fromEntries(new FormData(e.target)),
                ),
              );
            } catch (x) {
              setErr(x.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to your bank</h2>
          <p>
            Use the institution code and account provided by your administrator.
          </p>
          {(err || error) && (
            <div className="error" role="alert">
              {err || error}
            </div>
          )}
          <Field
            name="bankCode"
            title="Institution code"
            required
            autoComplete="organization"
          />
          <Field
            name="email"
            title="Work email"
            type="email"
            required
            autoComplete="username"
          />
          <Field
            name="password"
            title="Password"
            type="password"
            required
            autoComplete="current-password"
          />
          <button className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Open workspace →"}
          </button>
          <small className="loginhint">
            Local installation? Follow the project README to configure the server and
            create the initial accounts.
          </small>
        </form>
      </section>
    </div>
  );
}
function Field({ title, ...props }) {
  return (
    <label>
      {title}
      <input {...props} />
    </label>
  );
}
function Select({ title, children, ...props }) {
  return (
    <label>
      {title}
      <select {...props}>{children}</select>
    </label>
  );
}
function DataPage({ page, user, version, refresh, onError }) {
  const [data, setData] = useState(null),
    [busy, setBusy] = useState(true),
    [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [modal, setModal] = useState(null),
    [detail, setDetail] = useState(null);
  const endpoint = {
    dashboard: "/dashboard",
    leads: "/leads",
    activities: "/activities",
    team: "/users",
    branches: "/branches",
    audit: "/audit",
  }[page];
  useEffect(() => {
    let active = true;
    setBusy(true);
    api(
      endpoint +
        (page === "leads"
          ? `?q=${encodeURIComponent(q)}&status=${status}`
          : ""),
    )
      .then((x) => {
        if (active) setData(x);
      })
      .catch((e) => onError(e.message))
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [endpoint, version, q, status]);
  const open = async (lead) => {
    try {
      setDetail(await api("/leads/" + lead.id));
    } catch (e) {
      onError(e.message);
    }
  };
  if (busy) return <div className="loading">Loading workspace records…</div>;
  if (!data)
    return (
      <div className="empty">
        Records could not be loaded. Check the server connection.
        <button onClick={refresh}>Try again</button>
      </div>
    );
  return (
    <>
      {page === "dashboard" && (
        <>
          <div className="welcome">
            <div>
              <span className="eyebrow">YOUR WORKDAY, IN FOCUS</span>
              <h2>Build relationships that last.</h2>
              <p>Keep your pipeline moving and every next action visible.</p>
            </div>
            <span className="welcomemark">↗</span>
          </div>
          <div className="metrics">
            {[
              ["leads", "Total leads"],
              ["active", "Active leads"],
              ["won", "Leads marked won"],
              ["overdue", "Overdue follow-ups"],
            ].map(([k, t]) => (
              <div className="metric" key={k}>
                <span>{t}</span>
                <strong>{data.metrics?.[k] ?? 0}</strong>
                <small>
                  {k === "overdue"
                    ? "Due actions needing attention"
                    : "Within your permitted scope"}
                </small>
              </div>
            ))}
          </div>
          <div className="twocol">
            <section className="card">
              <h3>Pipeline snapshot</h3>
              {statuses.map((s) => {
                let n = data.stages?.find((x) => x.status === s)?.count || 0;
                return (
                  <div className="pipeline" key={s}>
                    <span>{label(s)}</span>
                    <div>
                      <i
                        style={{
                          width: `${Math.max(n ? 5 : 0, (Number(n) / Math.max(1, data.metrics?.leads || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <strong>{n}</strong>
                  </div>
                );
              })}
            </section>
            <section className="card">
              <h3>Upcoming follow-ups</h3>
              <Activities
                items={data.upcoming || []}
                refresh={refresh}
                onError={onError}
                readOnly={user.role === "executive"}
              />
            </section>
          </div>
          <section className="card">
            <h3>Recent leads</h3>
            <LeadTable items={data.recent || []} open={open} />
          </section>
        </>
      )}
      {page === "leads" && (
        <>
          <div className="toolbar">
            <div>
              <h2>Your relationship pipeline</h2>
              <p>From the first conversation to the next opportunity.</p>
            </div>
            {user.role !== "executive" && (
              <button className="primary" onClick={() => setModal("lead")}>
                + Add lead
              </button>
            )}
          </div>
          <div className="filters">
            <input
              aria-label="Search leads"
              placeholder="Search name, company or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              aria-label="Filter stage"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All stages</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <section className="card">
            <LeadTable items={data.leads || []} open={open} />
            <p className="muted">
              Showing up to 500 leads. Use search and stage filters to narrow
              results.
            </p>
          </section>
        </>
      )}
      {page === "activities" && (
        <section className="card">
          <h2>Plan. Follow up. Follow through.</h2>
          <p>Add follow-ups from a lead’s detail view.</p>
          <Activities
            items={data.activities || []}
            refresh={refresh}
            onError={onError}
            readOnly={user.role === "executive"}
          />
        </section>
      )}
      {page === "team" && (
        <>
          <div className="toolbar">
            <div>
              <h2>Your people</h2>
              <p>Relationship owners and management structure.</p>
            </div>
            {user.role === "bank_admin" && (
              <button className="primary" onClick={() => setModal("user")}>
                + Add staff member
              </button>
            )}
          </div>
          <section className="card">
            <Table
              headers={["Name", "Email", "Role", "Branch", "Reports to"]}
              rows={(data.users || []).map((x) => [
                x.name,
                x.email,
                label(x.role),
                x.branch_name || "—",
                x.manager_name || "—",
              ])}
            />
          </section>
        </>
      )}
      {page === "branches" && (
        <>
          <div className="toolbar">
            <div>
              <h2>Branch network</h2>
              <p>Your institution’s operating locations.</p>
            </div>
            {user.role === "bank_admin" && (
              <button className="primary" onClick={() => setModal("branch")}>
                + Add branch
              </button>
            )}
          </div>
          <section className="card">
            <Table
              headers={["Branch", "Code"]}
              rows={(data.branches || []).map((x) => [x.name, x.code])}
            />
          </section>
        </>
      )}
      {page === "audit" && (
        <section className="card">
          <h2>Accountability in every action</h2>
          <Table
            headers={["When", "Actor", "Action", "Record"]}
            rows={(data.events || []).map((x) => [
              new Date(x.created_at).toLocaleString(),
              x.actor_name || x.user_name || x.user_id || "System",
              x.action,
              [x.entity_type || x.entity, x.entity_id]
                .filter(Boolean)
                .join(" · "),
            ])}
          />
        </section>
      )}
      {modal && (
        <Editor
          kind={modal}
          close={() => setModal(null)}
          done={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
      {detail && (
        <LeadDetail
          detail={detail}
          close={() => setDetail(null)}
          readOnly={user.role === "executive"}
          updated={async () => {
            refresh();
            await open(detail.lead);
          }}
        />
      )}
    </>
  );
}
function Table({ headers, rows }) {
  return rows.length ? (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="empty">No records yet. Your next action starts here.</div>
  );
}
function LeadTable({ items, open }) {
  return (
    <Table
      headers={[
        "Relationship",
        "Product interest",
        "Stage",
        "Owner",
        "Next follow-up",
      ]}
      rows={items.map((l) => [
        <button className="link" onClick={() => open(l)}>
          {l.name}
          <small>{l.company || l.email || "Individual prospect"}</small>
        </button>,
        l.product || "—",
        <span className={"pill " + l.status}>{label(l.status)}</span>,
        l.owner_name || "—",
        date(l.next_follow_up),
      ])}
    />
  );
}
function Activities({ items, refresh, onError, readOnly = false }) {
  return items.length ? (
    <div className="activities">
      {items.map((a) => (
        <div className="activity" key={a.id}>
          <span className="activityicon"><CalendarDays size={17}/></span>
          <div>
            <strong>{a.summary}</strong>
            <small>
              {label(a.type)} · {a.lead_name || "Lead"} · {date(a.due_date)}
            </small>
          </div>
          {a.completed_at || a.completed ? (
            <span className="pill won">Completed</span>
          ) : readOnly ? (
            <span className="pill">Pending</span>
          ) : (
            <button
              className="quiet"
              onClick={async () => {
                try {
                  await api("/activities/" + a.id + "/complete", "POST");
                  refresh();
                } catch (e) {
                  onError(e.message);
                }
              }}
            >
              Complete
            </button>
          )}
        </div>
      ))}
    </div>
  ) : (
    <div className="empty">No follow-ups to display.</div>
  );
}
function Modal({ title, close, children }) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const nodes = () =>
      [
        ...panel.current.querySelectorAll(
          "button,input,select,textarea,[tabindex]",
        ),
      ].filter((n) => !n.disabled);
    nodes()[0]?.focus();
    const key = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const n = nodes(),
          first = n[0],
          last = n[n.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="overlay">
      <section
        ref={panel}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modalhead">
          <h2>{title}</h2>
          <button className="quiet" onClick={close} aria-label="Close dialog">
            ✕
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Editor({ kind, close, done, lead }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [users, setUsers] = useState([]),
    [branches, setBranches] = useState([]);
  useEffect(() => {
    if (kind === "user" || kind === "lead") {
      api("/users")
        .then((x) => setUsers(x.users))
        .catch((e) => setError(e.message));
      api("/branches")
        .then((x) => setBranches(x.branches))
        .catch((e) => setError(e.message));
    }
  }, [kind]);
  return (
    <Modal
      title={
        kind === "lead"
          ? lead
            ? "Update lead"
            : "New lead"
          : kind === "user"
            ? "New staff member"
            : "New branch"
      }
      close={close}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          let values = Object.fromEntries(new FormData(e.target));
          if ("next_follow_up" in values && !values.next_follow_up)
            values.next_follow_up = null;
          if ("owner_id" in values && !values.owner_id) delete values.owner_id;
          ["branch_id", "manager_id", "owner_id"].forEach((k) => {
            if (k in values) values[k] = values[k] ? Number(values[k]) : null;
          });
          try {
            await api(
              kind === "lead"
                ? "/leads" + (lead ? "/" + lead.id : "")
                : kind === "user"
                  ? "/users"
                  : "/branches",
              lead ? "PATCH" : "POST",
              values,
            );
            done();
          } catch (x) {
            setError(x.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="formgrid">
          <Field
            title={kind === "branch" ? "Branch name" : "Name"}
            name="name"
            defaultValue={lead?.name}
            required
          />
          {kind === "branch" ? (
            <Field title="Branch code" name="code" required />
          ) : (
            <>
              <Field
                title="Email"
                name="email"
                type="email"
                required={kind === "user"}
                defaultValue={lead?.email}
              />
              {kind === "user" ? (
                <>
                  <Field
                    title="Initial password"
                    name="password"
                    type="password"
                    minLength={12}
                    required
                  />
                  <Select title="Role" name="role">
                    {roles.map((r) => (
                      <option value={r} key={r}>
                        {label(r)}
                      </option>
                    ))}
                  </Select>
                  <Select title="Branch" name="branch_id">
                    <option value="">No branch</option>
                    {branches.map((b) => (
                      <option value={b.id} key={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                  <Select title="Reports to" name="manager_id">
                    <option value="">No manager</option>
                    {users
                      .filter(
                        (u) => !["marketer", "executive"].includes(u.role),
                      )
                      .map((u) => (
                        <option value={u.id} key={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </Select>
                </>
              ) : (
                <>
                  <Select
                    title="Relationship owner"
                    name="owner_id"
                    defaultValue={lead?.owner_id || ""}
                  >
                    <option value="">Assign to me</option>
                    {users
                      .filter((u) => u.role !== "executive")
                      .map((u) => (
                        <option value={u.id} key={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </Select>
                  <Field
                    title="Company"
                    name="company"
                    defaultValue={lead?.company}
                  />
                  <Field
                    title="Phone"
                    name="phone"
                    defaultValue={lead?.phone}
                  />
                  <Field
                    title="Lead source"
                    name="source"
                    defaultValue={lead?.source || "Referral"}
                  />
                  <Field
                    title="Product interest"
                    name="product"
                    defaultValue={lead?.product}
                  />
                  <Select
                    title="Stage"
                    name="status"
                    defaultValue={lead?.status || "new"}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {label(s)}
                      </option>
                    ))}
                  </Select>
                  <Field
                    title="Next follow-up"
                    name="next_follow_up"
                    type="date"
                    defaultValue={lead?.next_follow_up?.slice(0, 10)}
                  />
                </>
              )}
            </>
          )}
        </div>
        {kind === "lead" && (
          <label>
            Relationship notes
            <textarea name="notes" rows="4" defaultValue={lead?.notes} />
          </label>
        )}
        <div className="formactions">
          <button type="button" className="quiet" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy
              ? "Saving…"
              : "Save " + (kind === "user" ? "staff member" : kind)}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function LeadDetail({ detail, close, updated, readOnly }) {
  const [edit, setEdit] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  let l = detail.lead;
  if (edit)
    return (
      <Editor
        kind="lead"
        lead={l}
        close={() => setEdit(false)}
        done={() => {
          setEdit(false);
          updated();
        }}
      />
    );
  return (
    <Modal title={l.name} close={close}>
      <div className="detailtop">
        <div>
          <span className={"pill " + l.status}>{label(l.status)}</span>
          <p>
            {l.company || "Individual prospect"} ·{" "}
            {l.product || "Product not specified"}
          </p>
        </div>
        {!readOnly && (
          <div className="detailbuttons"><button className="quiet" onClick={() => setEdit(true)}>Edit lead</button>{!l.customer_id && <button className="primary" disabled={busy} onClick={async () => { setBusy(true); try { await api(`/leads/${l.id}/convert`, "POST"); await updated(); } catch(e) { setError(e.message); } finally { setBusy(false); } }}>Convert to customer</button>}</div>
        )}
      </div>
      <dl>
        <dt>Email</dt>
        <dd>{l.email || "—"}</dd>
        <dt>Phone</dt>
        <dd>{l.phone || "—"}</dd>
        <dt>Owner</dt>
        <dd>{l.owner_name || "—"}</dd>
        <dt>Follow-up</dt>
        <dd>{date(l.next_follow_up)}</dd>
      </dl>
      {error && <div className="error" role="alert">{error}</div>}
      {l.customer_id && <p className="muted">Converted to a customer record.</p>}
      <p className="notes">{l.notes || "No relationship notes yet."}</p>
      {!readOnly && (
        <>
          <h3>Record an interaction or next action</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              let form = e.target;
              try {
                const values = Object.fromEntries(new FormData(form));
                if (!values.due_date) values.due_date = null;
                await api("/leads/" + l.id + "/activities", "POST", values);
                form.reset();
                await updated();
                setError("");
              } catch (x) {
                setError(x.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {error && (
              <div role="alert" className="error">
                {error}
              </div>
            )}
            <div className="formgrid">
              <Select title="Interaction type" name="type">
                {["call", "visit", "meeting", "email", "task"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
              <Field title="Due date (optional)" name="due_date" type="date" />
            </div>
            <Field
              title="Summary / next action"
              name="summary"
              required
              maxLength={1000}
            />
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Add activity"}
            </button>
          </form>
        </>
      )}
      <h3>Activity history</h3>
      <Activities
        items={detail.activities || []}
        refresh={updated}
        onError={setError}
        readOnly={readOnly}
      />
    </Modal>
  );
}

// Sales modules fetch scoped records; activity goals are separate from verified financial outcomes.
function SalesPage({page,user,version,refresh}) {
  const [data,setData]=useState(null), [error,setError]=useState(""), [modal,setModal]=useState(null), [search,setSearch]=useState("");
  useEffect(()=>{let active=true; setData(null); api('/'+page).then(x=>active&&setData(x)).catch(e=>active&&setError(e.message)); return ()=>{active=false};},[page,version]);
  const canCreate=page==='products' ? ['bank_admin','head_of_sales'].includes(user.role) : page==='targets' ? ['bank_admin','head_of_sales','team_leader','branch_manager','regional_manager'].includes(user.role) : user.role!=='executive';
  const titles={customers:['Customer relationships','Maintain the people and businesses in your portfolio.'],opportunities:['Your next opportunity','Move product conversations through a clear sales pipeline.'],targets:['Focus on the right actions','Track activity goals across your permitted team.'],products:['Product catalogue','A shared reference for your bank’s sales conversations.']};
  const items=(data?.[page]||[]).filter(x=>JSON.stringify(x).toLowerCase().includes(search.toLowerCase()));
  const headers={customers:['Customer','Company','Contact','Owner','Notes'],opportunities:['Opportunity','Customer','Product','Estimated value','Stage','Owner','Expected close'],targets:['Staff member','Metric','Progress','Period'],products:['Product','Category','Description']};
  const rows=items.map(x=>page==='customers'?[x.name,x.company||'—',<div>{x.email||'—'}<small>{x.phone}</small></div>,x.owner_name||'—',<span className="cliptext">{x.notes||'—'}</span>]:page==='opportunities'?[<button className="link" disabled={user.role==='executive'} onClick={()=>setModal(x)}>{x.title}</button>,x.customer_name||'—',x.product||'—',new Intl.NumberFormat(undefined,{style:'currency',currency:x.currency||'USD'}).format(Number(x.amount)||0),<span className={'pill '+x.stage}>{label(x.stage)}</span>,x.owner_name||'—',date(x.expected_close)]:page==='targets'?[x.user_name||x.name,label(x.metric),<div><strong>{x.actual||0} / {x.goal}</strong><progress max={Number(x.goal)||1} value={Math.min(Number(x.actual)||0,Number(x.goal)||1)}/></div>,date(x.period_start)+' – '+date(x.period_end)]:[x.name,x.category||'—',x.description||'—']);
  return <><div className="toolbar"><div><h2>{titles[page][0]}</h2><p>{titles[page][1]}</p></div>{canCreate&&<button className="primary" onClick={()=>setModal('new')}>+ Add {page==='opportunities'?'opportunity':page.slice(0,-1)}</button>}</div>{error&&<div className="error" role="alert">{error}</div>}<div className="filters"><input aria-label={'Search '+page} placeholder={'Search '+page+'…'} value={search} onChange={e=>setSearch(e.target.value)}/><span className="resultcount">{items.length} records</span></div>{!data&&!error?<div className="loading">Loading records…</div>:data?<section className="card"><Table headers={headers[page]} rows={rows}/></section>:<button className="quiet" onClick={refresh}>Try again</button>}{page==='opportunities'&&<p className="muted">Amounts are estimates. A Won stage records a sales outcome; it does not confirm deposits, disbursements or account activation.</p>}{page==='targets'&&<p className="muted">Goals measure CRM activity. Financial targets require authorised banking integrations and agreed metric definitions.</p>}{modal&&<SalesEditor page={page} record={modal==='new'?null:modal} close={()=>setModal(null)} done={()=>{setModal(null);refresh()}}/>}</>;
}
function SalesEditor({page,record,close,done}) {
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[users,setUsers]=useState([]),[customers,setCustomers]=useState([]),[products,setProducts]=useState([]);
  useEffect(()=>{if(page==='targets'||page==='customers')api('/users').then(x=>setUsers(x.users)).catch(e=>setError(e.message));if(page==='opportunities')Promise.all([api('/customers'),api('/products')]).then(([c,p])=>{setCustomers(c.customers);setProducts(p.products)}).catch(e=>setError(e.message));},[page]);
  const singular={customers:'customer',opportunities:'opportunity',targets:'target',products:'product'}[page];
  return <Modal title={(record?'Update ':'New ')+singular} close={close}><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError(''); const values=Object.fromEntries(new FormData(e.target)); ['user_id','customer_id','owner_id','goal'].forEach(k=>{if(k in values){if(values[k]==='')delete values[k];else values[k]=Number(values[k])}});if('expected_close' in values&&!values.expected_close)values.expected_close=null;try{await api('/'+page+(record?'/'+record.id:''),record?'PATCH':'POST',values);done()}catch(x){setError(x.message)}finally{setBusy(false)}}}>{error&&<div className="error" role="alert">{error}</div>}<div className="formgrid">
  {page==='customers'&&<><Field title="Customer name" name="name" required maxLength={160}/><Field title="Company" name="company" maxLength={160}/><Field title="Email" name="email" type="email"/><Field title="Phone" name="phone" maxLength={40}/><Select title="Relationship owner" name="owner_id"><option value="">Assign to me</option>{users.filter(x=>x.role!=='executive').map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</Select></>}
  {page==='opportunities'&&<><Field title="Opportunity title" name="title" required maxLength={160} defaultValue={record?.title}/><Select title="Customer" name="customer_id" required defaultValue={record?.customer_id||''}><option value="">Choose customer</option>{customers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</Select><Field title="Product" name="product" list="bank-products" maxLength={120} required defaultValue={record?.product}/><datalist id="bank-products">{products.map(x=><option key={x.id} value={x.name}/>)}</datalist><Field title="Estimated value" name="amount" type="number" min="0" step="0.01" required defaultValue={record?.amount||0}/><Field title="Currency (3-letter code)" name="currency" pattern="[A-Z]{3}" maxLength={3} required defaultValue={record?.currency||'USD'}/><Select title="Stage" name="stage" defaultValue={record?.stage||'new'}>{['new','qualified','proposal','onboarding','won','lost'].map(x=><option key={x} value={x}>{label(x)}</option>)}</Select><Field title="Expected close" name="expected_close" type="date" defaultValue={record?.expected_close?.slice(0,10)}/></>}
  {page==='targets'&&<><Select title="Staff member" name="user_id" required><option value="">Choose staff member</option>{users.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</Select><Select title="Activity metric" name="metric">{['leads_created','customers_created','opportunities_won'].map(x=><option key={x} value={x}>{label(x)}</option>)}</Select><Field title="Goal" name="goal" type="number" min="1" step="1" required/><Field title="Period starts" name="period_start" type="date" required/><Field title="Period ends" name="period_end" type="date" required/></>}
  {page==='products'&&<><Field title="Product name" name="name" maxLength={120} required/><Field title="Category" name="category" maxLength={80} required/></>}
  </div>{['customers','opportunities'].includes(page)&&<label>Relationship notes<textarea name="notes" rows="4" maxLength={5000} defaultValue={record?.notes}/></label>}{page==='products'&&<label>Description<textarea name="description" rows="4" maxLength={2000}/></label>}{page==='opportunities'&&!customers.length&&<p>Create a customer before adding an opportunity.</p>}<div className="formactions"><button type="button" className="quiet" onClick={close}>Cancel</button><button className="primary" disabled={busy||(page==='opportunities'&&!customers.length)}>{busy?'Saving…':'Save '+singular}</button></div></form></Modal>;
}
function Roadmap() {
  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow">BUILT IN REVIEWABLE STAGES</span>
          <h2>A clear path from foundation to enterprise.</h2>
          <p>
            This release provides relationship and sales workflows. Bank connections and production qualification remain future work.
          </p>
        </div>
      </div>
      <div className="roadmap">
        {[
          [
            "01",
            "Relationship workspace",
            "Bank isolation, staff hierarchy, leads, follow-ups, scoped dashboards and audit history.",
            "Included in this release",
          ],
          [
            "02",
            "Sales operations",
            "Customers, opportunities, product catalogue and activity targets. Formal approval workflows remain planned.",
            "Included; approvals planned",
          ],
          [
            "03",
            "Management intelligence",
            "Branch and regional reporting, campaign tracking and performance definitions.",
            "Planned",
          ],
          [
            "04",
            "Enterprise connections",
            "Bank-approved integrations, outcome verification and reconciliation.",
            "Planned",
          ],
          [
            "05",
            "Release readiness",
            "Independent QA, security review, backup restoration and deployment evidence.",
            "Planned",
          ],
        ].map(([n, t, d, s]) => (
          <section className="card roaditem" key={n}>
            <span>{n}</span>
            <div>
              <h3>{t}</h3>
              <p>{d}</p>
              <small>{s}</small>
            </div>
          </section>
        ))}
      </div>
      <p className="muted">
        A lead marked Won is a sales status in this foundation. It does not
        verify deposits, account activation or other banking outcomes.
      </p>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
