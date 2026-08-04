# Database Design

## Principles

PostgreSQL in Supabase is the system of record. Every tenant-owned row carries
an `organization_id`; user identity comes only from `auth.users`. UUID primary
keys, UTC `timestamptz`, foreign keys, constraints, and RLS are required. Browser
and extension clients use the publishable/anon key plus the user's JWT—never a
service-role key.

## Types and Tables

### Enums

- `organization_role`: `member`, `admin`
- `feedback_type`: `bug`, `feature_request`, `usability`, `other`
- `feedback_status`: `submitted`, `under_review`, `planned`, `in_progress`,
  `shipped`, `declined`

### Core tables

| Table | Key fields and constraints |
| --- | --- |
| `profiles` | `id` references `auth.users` with cascade delete; `display_name`, optional `avatar_url`, timestamps |
| `organizations` | `id`, unique case-insensitive `name`, unique lowercase `slug`, `is_active`, timestamps |
| `organization_members` | `organization_id`, `user_id`, `role`, `created_by`, timestamps; composite primary key on organization/user |
| `feedback` | `id`, `organization_id`, `submitter_id`, `type`, `title`, `description`, `source_url`, `page_title`, nullable `selected_text`, nullable `screenshot_path`, `status` default `submitted`, timestamps |
| `feedback_status_history` | `id`, `feedback_id`, `organization_id`, nullable `from_status`, `to_status`, `changed_by`, `created_at` |
| `feedback_responses` | `feedback_id` primary key, `organization_id`, `body`, `created_by`, timestamps; one official response per item |

`source_url` must be HTTP(S). Apply practical length checks to titles, page
titles, response bodies, URLs, descriptions, and selected text. Use triggers for
`updated_at`, profile creation, organization-ID consistency on child rows, and
status-history insertion. Prevent updates to immutable ownership fields. Permit
administrators to change directly between any two different enum statuses.

## Relationships and Indexes

An organization has many members and feedback items. A user can belong to many
organizations and submit to any active organization. Feedback has many status
events and zero or one official response.

Add indexes for:

- `feedback (submitter_id, created_at desc)`
- `feedback (organization_id, created_at desc)`
- `feedback (organization_id, status, created_at desc)`
- `organization_members (user_id, organization_id)`
- `feedback_status_history (feedback_id, created_at)`

## Row Level Security

Enable and force RLS on all public tables. Policies should be expressed through
small `security definer` membership helpers with a fixed `search_path`, owned by
a non-login role and executable only by authenticated users.

| Resource | Read | Create/change |
| --- | --- | --- |
| Profiles | own profile; organization members may read a submitter's display name for feedback routed to their organization | own display fields only |
| Organizations | authenticated users can list active destinations; members can read their inactive organization | seeded or controlled admin operation only |
| Memberships | members read their organization's roster | organization admins manually add/remove existing authenticated users and change roles; prevent removing/demoting the last admin |
| Feedback | submitter or destination-organization member | authenticated user inserts as self to active organization; only org admins change status; no submitter edits in MVP |
| Status history | same visibility as parent feedback | trigger only; clients cannot update/delete |
| Official response | same visibility as parent feedback | destination-organization admins insert/update; no client delete initially |

Never accept `submitter_id`, status actor, or response author as trusted client
claims; derive them from `auth.uid()`. Test every policy using at least two
organizations, a non-member submitter, a member, and an administrator.

Supabase Auth remains the source for email addresses. Do not copy email into the
public profile. Return it only through an administrator-authorized server
operation; members receive `display_name` only. Do not expose broad Auth-table
access through a client-readable view or function.

## Screenshot Storage

Create a private `feedback-screenshots` bucket. Use object paths
`{organization_id}/{feedback_id}/{uuid}.{ext}`. Only the submitter may upload to
their new feedback item; submitters and destination-organization members may
read through short-lived signed URLs. Limit uploads initially to PNG, JPEG, or
WebP and 5 MB, verify content type server-side, and allow one current screenshot.
Delete the object when its associated feedback is deleted, using a controlled
database/storage cleanup operation. Self-service feedback deletion is deferred,
so ordinary submitters receive no object-delete policy.

## Migration and Seed Strategy

Keep all schema, constraints, functions, and policies in ordered files under
`supabase/migrations/`. Never edit production schema manually. Seed local data
with Acme Software and the founder's test administrator identity. Automated RLS
tests should create a second fixture-only organization and role-separated users
so cross-tenant denials remain repeatable without presenting a second pilot
organization in the product. Generated TypeScript database types should be
committed after each schema change.
