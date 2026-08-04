# Supabase Foundation

This directory contains the version-controlled database foundation. The web
prototype still reads `src/features/feedback/mock-data.ts`; applying these files
does not connect the UI to Supabase or enable Google OAuth.

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
