# Architecture

## Current Repository

The repository uses Next.js 16.3, React 19, strict TypeScript, App Router,
Tailwind CSS 4, and Supabase SSR. It includes the approved responsive prototype,
Google PKCE authentication, mock-mode fallbacks, an applied RLS foundation
migration, SQL audits, and Node tests. With Supabase configured, `/feedback/new`
persists authenticated text feedback and `/feedback` plus `/feedback/[id]` read
only the verified submitter's records. Without Supabase, those routes retain a
clearly labeled and isolated demo experience.

## Recommended Shape

Use a **modular monolith** deployed as one Next.js web application plus one
Supabase project. Keep product modules (`auth`, `organizations`, `feedback`, and
`memberships`) separate in code, but do not create independent services.
The initial fictional pilot tenant is **Acme Software**, with the founder as its
first test administrator, while every tenant-owned table and policy supports
multiple organizations.

```text
Browser web UI ─┐
                ├─> Next.js /api/v1 Route Handlers ─> domain services
MV3 extension ──┘                                  ├─> Supabase Postgres + RLS
Next.js Server Components ─> domain services       └─> private Storage bucket
                                      Supabase Auth (Google OAuth)
```

Server Components should call domain services directly rather than fetch the
application's own HTTP API. Route Handlers are the authenticated public adapter
for mutations and extension access. Both paths reuse schemas and services from
`src/features/`, preventing business-rule drift.

## Proposed Organization

```text
src/app/                 pages, layouts, and /api/v1 Route Handlers
src/components/          shared presentation components
src/features/            auth, organizations, feedback, memberships
src/lib/supabase/        browser and server Supabase clients
src/lib/validation/      shared request schemas
supabase/migrations/     schema, functions, triggers, and RLS policies
supabase/seed.sql        repeatable local demo data
tests/                   integration and end-to-end tests
extension/               later MV3 TypeScript client
docs/                    product and engineering decisions
```

## Request and Security Model

Supabase owns Google OAuth sessions. Web requests use secure cookie-backed
sessions; extension requests later send a Supabase access token as a bearer
token over HTTPS. Route Handlers validate payloads, establish the current user,
and use a user-scoped Supabase client so RLS remains active. Do not use a
service-role client for normal product requests.

Initial endpoints:

- `GET /api/v1/companies?domain=...` returns public directory metadata for a
  normalized website lookup; this is the future extension preselection seam.
- Authenticated company creation uses the narrowly granted
  `find_or_create_unclaimed_organization` RPC after server-side URL parsing.
- `POST /api/v1/feedback`
- `GET /api/v1/feedback` and `GET /api/v1/feedback/:id`
- `POST /api/v1/feedback/:id/screenshot`
- `PATCH /api/v1/feedback/:id/status`
- `PUT /api/v1/feedback/:id/response`
- `GET/POST/DELETE /api/v1/organizations/:id/members`

The application normalizer uses the platform URL parser, converts internationalized
hostnames consistently to IDNA ASCII, removes only a leading `www`, and preserves
meaningful subdomains. It strips paths, queries, fragments, and default ports;
custom ports, credentials, localhost, reserved development suffixes, and raw IP
addresses are rejected, and canonical storage always uses HTTPS. This layer
provides user-friendly errors; the privileged RPC independently repeats the host
checks and is authoritative for direct authenticated calls. It derives the
normalized domain from the canonical URL without unsafe network-address casts.
The database unique domain index and transaction advisory lock make duplicate
reuse concurrency-safe. RPC inputs cannot include creator, claim status, or
membership.

Public company pages query a dedicated safe-field RPC rather than granting anon
table access. Company creation uses the caller's JWT and never a service-role
key. A deployment-level rate limit is still required for the creation action
(for example, per-user and per-IP limits at Vercel); `created_by` supports
moderation and abuse investigation.

Screenshot upload remains the next vertical slice. The future screenshot endpoint accepts one size- and MIME-limited upload after the
feedback row exists. Store only its object path in PostgreSQL. A server endpoint
authorizes the viewer before issuing a short-lived signed URL. Accept PNG, JPEG,
and WebP files up to 5 MB and retain them until the parent feedback is deleted.
Members receive submitter display names; an administrator-authorized server path
may additionally return the email held by Supabase Auth. Administrators may move
feedback directly between any different valid statuses.

## Deployment and Operations

Use Vercel for production deployment later and hosted Supabase for auth,
database, and storage. When creating the hosted project, choose the available US
region closest to users in New York. Maintain separate local/staging/production
Supabase projects when the pilot moves beyond local development. Apply versioned
SQL migrations through CI; run lint, tests, and production build before
deployment. Log request IDs and server-side failures without feedback text,
tokens, email addresses, or signed URLs.

## Important Decisions Remaining

- The founder's Google account identifier to assign as Acme Software's first
  administrator when authentication exists.
- Pilot privacy terms, status-history retention, production support owner, and
  whether feedback itself receives an administrator-operated deletion process.
- The eventual production domain and exact Vercel/Supabase project ownership.
- Extension authentication UX and Chrome Web Store distribution, deferred until
  the web feedback loop works.
- Directory moderation policy and tooling for duplicate merges, incorrect names,
  domain disputes, malicious records, and the later claim/verification workflow.

## Manual Setup Needed

Implementation will require a Supabase project, its URL and publishable/anon
key, database credentials for migration tooling, and a private screenshot bucket.
Google Cloud OAuth credentials must be configured with Supabase callback URLs.
Deployment later needs a Vercel project, production domain, environment values,
and matching OAuth redirect URLs. The extension phase needs a Chrome Web Store
developer account, extension ID, icons, privacy disclosures, and allowed origins.
Any service-role key must remain only in an approved secret store and is not
expected for ordinary runtime requests.

Pilot membership is assigned manually by an administrator to an existing
Google-authenticated user; email invitations and notifications are not part of
the MVP. Self-service feedback deletion is also deferred.
