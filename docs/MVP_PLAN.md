# MVP Implementation Plan

## Delivery Rules

Build in small vertical slices. Each slice must end in observable behavior,
relevant automated tests, lint, and a production build, and should be committed
independently. Add dependencies only when their slice needs them. Do not begin
the Chrome extension until the web workflow and versioned API are stable.

## Slices

### 0. Local foundation

- Add documented environment validation, Supabase CLI layout, local services,
  testing framework, and CI checks.
- Add `.env.example` containing names only; confirm secrets remain ignored.
- **Verify:** clean install, local Supabase startup, lint, test, and build.

### 1. Tenant schema and isolation

- Migrate profiles, organizations, memberships, enums, helper functions, RLS,
  and seed Acme Software with the founder as its first test administrator.
- Keep the schema multi-tenant; create a second fixture-only organization in
  policy tests rather than exposing it as another pilot destination.
- **Verify:** database tests prove member/admin boundaries and cross-tenant
  denial before any dashboard exists.

### 2. Google sign-in and protected shell

- Configure user-scoped Supabase clients, Google sign-in/callback/sign-out, and
  authenticated navigation with role-aware destinations.
- **Verify:** unauthenticated redirects, session refresh, and signed-in shell.
- **Manual gate:** Supabase project and Google OAuth credentials/redirect URLs.

### 3. Web feedback submission

- Add feedback schema and RLS, active-organization picker, validated submission
  form, and `POST /api/v1/feedback` using shared domain logic.
- **Verify:** a user submits required context; invalid and cross-tenant payloads
  fail; the item begins as `submitted`.

### 4. Submitter feedback loop

- Add submitter list and detail pages through shared queries.
- **Verify:** users see status and empty-response state for their own items but
  cannot open another user's item.

### 5. Organization inbox

- Add member inbox, status filtering, and feedback detail including submitter
  display name. Add an admin-only server operation for submitter email.
- **Verify:** members see only their organizations; non-members are denied by UI,
  API, and RLS; members cannot retrieve email while administrators can.

### 6. Administrative status workflow

- Add status history trigger, admin status control, and
  `PATCH /api/v1/feedback/:id/status`.
- **Verify:** admin changes are audited and visible to the submitter; members
  cannot mutate status; every direct transition between different valid statuses
  succeeds for an administrator.

### 7. Official response

- Add one updatable response and `PUT /api/v1/feedback/:id/response`.
- **Verify:** administrators publish/edit; submitters see the current response;
  member and cross-tenant writes fail.

### 8. Private screenshot

- Add the private bucket, upload endpoint, form integration, signed viewing URL,
  PNG/JPEG/WebP and 5 MB checks, parent-feedback cleanup, and failure recovery.
- **Verify:** optional upload works, unauthorized access fails, and raw public
  object URLs do not work; deleting feedback through controlled test cleanup also
  removes its screenshot.

### 9. Member administration

- Add roster and admin add/remove/role-change actions using exact lookup of an
  existing Google-authenticated pilot user. Do not add invitations.
- **Verify:** members are read-only, admins manage membership, and the last admin
  cannot be removed or demoted.

### 10. Pilot hardening

- Add end-to-end coverage for both roles and organizations, accessible states,
  request/error logging, rate limits on mutations, privacy copy, retention
  behavior, staging deployment, and a recovery runbook.
- **Verify:** full acceptance-criteria walkthrough against staging and policy
  tests in CI.

### 11. Chrome extension (later MVP)

- Create a separate `extension/` Manifest V3 TypeScript build with web-mediated
  authentication, right-click capture, editable confirmation UI, and `/api/v1`
  submission including optional selected text and screenshot.
- **Verify:** packaged extension submits the same contract, handles expired auth,
  requests minimal permissions, and passes manual Chrome review checks.

## Decision Gates

Before slice 1, obtain the founder's Google identity used for Acme Software's
test administrator. Before hosted environments, confirm privacy terms and create
Supabase in the available US region closest to New York users. Before production,
create the Vercel project, choose a domain and support owner, and confirm audit
retention. Before slice 11, after the web loop works, approve the extension
authentication flow, store account, privacy disclosure, and release channel.

## MVP Completion

The web MVP is pilot-ready after slices 0–10 satisfy the acceptance criteria in
`PRODUCT_SPEC.md`. Slice 11 is a later client of the same backend and does not
block validating the core feedback loop. Email invitations, email or SMS
notifications, and self-service feedback deletion remain deferred.
