# Security model and review boundaries

Bank scope is derived from authenticated sessions, never trusted from a client-supplied bank identifier. Composite foreign keys protect same-bank ownership. Marketers see owned records; team and regional managers see reporting descendants; branch managers see branch records; higher management sees its institution. Executive users are read-only. A bank administrator manages institution configuration; it is not a universal cross-bank administrator.

Passwords use salted scrypt hashes. Opaque session tokens are stored as SHA-256 hashes and transported in HttpOnly cookies. Writes require session CSRF tokens and approved origin checks. Production cookies are Secure. Login throttling is persisted in PostgreSQL. SQL uses bound parameters. Mutations and audit events must commit in the same transaction.

Neon credentials live only in root environment configuration or hosting secret variables. Hosted database TLS uses certificate verification. Do not relax validation to make a failed connection pass. No frontend environment variable should contain a database URL or password. Avoid real customer data before the institution approves a data-handling arrangement.

Tests must attempt cross-bank access, owner reassignment, hierarchy visibility, unauthorized writes, executive mutations, malformed values, login failures and CSRF bypass. Browser checks supplement these tests. Audit history is an application record, not a tamper-proof regulatory ledger: database administrators can alter it.

Production review still requires identity-provider/SSO and MFA arrangements, penetration testing, backup restoration, disaster recovery, monitoring, retention policy, incident procedures, data residency, approved support access and institution-specific legal/security requirements. No universal country compliance claim is made.
