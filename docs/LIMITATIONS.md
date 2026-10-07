# Scope and limitations

This is an evolving local/cloud-ready candidate, not a completed certified banking system. Products, currencies and reporting structures are configurable foundation data; full multilingual user interface, region entities, campaign automation, file management, granular permission policies and bank-specific onboarding approvals require further stages.

Opportunity values are estimates entered by staff. Won states and count-based targets measure CRM entries, not externally verified banking outcomes. No core-banking, email, SMS, WhatsApp, loan-origination or financial-account integration is connected. No fake integration responses substitute for them.

There is no automatic MySQL-to-PostgreSQL migration. Schema setup creates absent PostgreSQL objects on a compatible fresh branch; incompatible schemas require reviewed migrations. Demo setup is opt-in, synthetic and transactional; it never resets existing banks or credentials.

Local embedded database tests are useful for SQL and API behavior but do not establish Neon networking, pooling, service availability, Vercel execution or deployment success. CI configuration is not proof that GitHub Actions ran. Deployments require actual records and browser verification.

The current model separates banks using application authorization and foreign keys; it does not claim independent databases or PostgreSQL row-level security. Dedicated institution deployment and stronger defence-in-depth controls can be assessed for procurement requirements.
