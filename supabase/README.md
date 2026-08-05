# Supabase Foundation

This directory contains the version-controlled database foundation. Google
authentication uses Supabase, while feedback screens continue to read
`src/features/feedback/mock-data.ts` until a later implementation slice.

Without both public Supabase environment variables, the application remains in
mock mode: `/login` renders the approved prototype with Google sign-in disabled,
and `/feedback` plus `/dashboard` retain their mock-data shells without creating
a Supabase client. Demo shells are labeled “Demo · not saved” and do not offer
sign-out. A partial environment behaves the same way and emits only a sanitized
server diagnostic; it is never treated as valid.

## Local setup

1. Install Docker Desktop and use Node.js 22 or newer.
2. Copy `.env.example` to `.env.local` and fill in the local values printed by
   `npx supabase status`. Never commit `.env.local`.
3. Start services and apply migrations:

   ```bash
   npx supabase start
   npx supabase db reset
   ```

4. Run `supabase/tests/foundation_audit.sql` in local Studio's SQL editor.

The audit runs transaction-scoped identities and feedback fixtures, verifies the
canonical screenshot lifecycle and role boundaries, and rolls back all fixtures.

`supabase/seed.sql` always creates Acme Software. Identity-dependent rows are
skipped until test users exist. Create one administrator and one member through
local Studio Auth, make an uncommitted copy of the seed, replace its two
`.invalid` email placeholders, and run that copy in the SQL editor. The script
looks up the real Auth UUIDs by email instead of hardcoding UUIDs that do not
exist in another project.

## Apply to a hosted project

This repository is not linked to a hosted Supabase project. After reviewing the
migration and creating a backup where appropriate:

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push --dry-run
npx supabase db push
```

Then run the foundation audit in the hosted SQL editor and review Database
Advisors. Create hosted test users before using a temporary, uncommitted copy of
the seed template. Do not run a seed containing real emails from version
control.

## Security boundaries

- No application table has anonymous access.
- Browser clients cannot create organization memberships.
- Membership checks bind to `auth.uid()` in the non-exposed `private` schema.
- Profiles contain display names and avatar URLs only, never Auth emails.
- The screenshot bucket is private and permits upload by the feedback submitter
  only at `{feedback_id}/screenshot`. The submitter may associate that path once
  but cannot rename, replace, or delete the object in this slice. The submitter
  or destination-organization members may read it.
- There is no browser delete policy for feedback or screenshots in this slice.

## Google authentication

No additional database migration is required for the authentication slice. The
OAuth callback inserts the authenticated user's own `profiles` row through the
existing RLS policy with conflict handling set to do nothing, so later profile
edits are not overwritten on subsequent logins.

OAuth starts in a Server Action. The SDK receives the fixed allowlisted callback
URL with no application destination in its query string. A validated internal
destination and the SDK-issued PKCE flow identifier live for ten minutes in an
HttpOnly, SameSite=Lax cookie scoped to `/auth/callback`; the callback consumes
and expires it, verifies its embedded expiration, revalidates the destination,
and defaults to `/feedback` only when that valid context omits a destination.
Missing, malformed, or expired context is rejected before the SDK exchange.

The pinned Auth SDK returns a per-flow identifier from `signInWithOAuth`, and
the callback passes it back to `exchangeCodeForSession`. This protects the
normal flow from using a different pending verifier. A second short-lived,
HttpOnly marker scoped to `/login` prevents the application from starting a
second flow while one is pending, including from another tab. Both cookies are
expired by every callback response. The login button also prevents repeated
activation within one rendered page.

Google receives only `openid email profile`; the application does not request
offline access or consent prompting and never reads or logs provider tokens.
Behavioral coverage against `@supabase/auth-js` demonstrates that when GoTrue
returns a provider access token, the pinned SDK includes it transiently in its
supported cookie-backed session representation. There is no supported option
in these versions to exclude that field without changing the session format.
Supabase does not store provider tokens in the project database, and refreshes
do not preserve or refresh the one-time provider token. Revisit this behavior
when upgrading the SDK.

Verified claims and profile readiness are separate. A database failure while
loading or creating a profile leaves the Supabase identity authenticated and
shows a retryable setup screen instead of redirecting through `/login`.

For local manual verification, configure Google in Supabase, set Site URL to
`http://localhost:3000`, allow `http://localhost:3000/auth/callback`, and then:

1. Run `npm run dev` and visit `/feedback/new` in a signed-out browser.
2. Confirm the app redirects to `/login` with the destination preserved.
3. Continue with Google and confirm the callback returns to `/feedback/new`.
4. Confirm one profile exists with the Auth user UUID and Google display data.
5. Edit that profile, sign out, sign in again, and confirm the edit remains.
6. Visit `/dashboard` before membership assignment and confirm the access-denied
   state. Assign membership manually, refresh, and confirm the mock inbox opens.
7. Sign out and confirm `/feedback` and `/dashboard` redirect to `/login`.
