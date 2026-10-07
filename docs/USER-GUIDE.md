# Using the CRM

Each institution signs in with its own bank code. Identical staff emails may exist in different banks, but records are scoped to the authenticated bank. A bank administrator cannot browse another bank.

## Roles

| Role | Record visibility | Changes |
| --- | --- | --- |
| Marketer | Own leads, customers, opportunities and targets | Create/update relationships and opportunities; complete follow-ups |
| Team leader | Own records and reporting descendants | Relationship work; assign scoped activity targets |
| Branch manager | Staff in the manager's assigned branch | Relationship work; branch-scoped targets |
| Regional manager | Own records and reporting descendants | Relationship work; targets for descendants |
| Head of sales | Entire own bank | Relationship work, targets, product creation |
| Executive | Entire own bank | Read-only |
| Bank administrator | Entire own bank | Relationship work, targets, products, branches and staff; view audit history |

Regional visibility follows the staff reporting tree; geographical region entities are a later stage. Create management users first, then their direct reports. A marketer's manager should be a team leader; reporting relationships can also be configured to the institution's chosen structure. Branch managers require a branch.

## Daily workflow

1. Review Overview for your scoped pipeline and due follow-ups.
2. In Leads & pipeline, add a prospect with product interest, source, notes and a next follow-up date. Assign only to a permitted active staff member.
3. Open the lead to change its stage, record a call/visit/meeting/email, or schedule another action. Completing a managed follow-up clears its lead reminder date.
4. Convert an acquired relationship to a customer. Conversion creates one linked customer, marks the lead Won, and clears its managed reminder. Repeated conversion returns the same customer. It does not open a real bank account.
5. Add an opportunity against a visible customer. Ownership follows the customer. Specify a product, currency, estimated value, stage and expected close date. Update a stage when the sales situation changes.
6. Managers create staff goals in Targets. Progress counts matching CRM records during the inclusive UTC calendar period. Goals can count leads created, customers created or opportunities currently Won with a recorded win date in the period.
7. Bank administrators review Audit history for recorded actions. Database administrators can alter these records; this is not an immutable compliance ledger.

Direct customer creation is also available. Customer profiles are a CRM directory; they contain no bank-account credentials or verified balances. Product names are free-text references to an institution's catalogue, not approved product eligibility decisions.

## Interpretation and limits

Opportunity amounts are decimal estimates in their individual currency. No mixed-currency total, exchange-rate conversion, deposit volume or commission calculation is implied. Setting Won is a manual sales decision, not proof from a banking system. Moving an opportunity out of Won removes it from the corresponding current Won count; marking it Won again sets a new win date.

Targets reflect current record ownership, not immutable historical staff attribution. A converted lead cannot transfer to another owner through the ordinary lead editor because the linked customer and opportunities need a coordinated transfer workflow.

List pages currently return up to 500 records and support local searching (leads search on the server). Large-scale pagination/export, profile editing/deactivation, password recovery, formal sales approval queues and integrations are later stages. Do not represent these as included features.
