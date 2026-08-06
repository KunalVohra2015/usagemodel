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
- `organization_claim_status`: `unclaimed`, `claimed`, `verified`
- `feedback_type`: `bug`, `feature_request`, `confusing_experience`, `other`
- `feedback_status`: `submitted`, `under_review`, `planned`, `in_progress`,
  `shipped`, `declined`

### Core tables

| Table | Key fields and constraints |
| --- | --- |
| `profiles` | `id` references `auth.users` with cascade delete; `display_name`, optional `avatar_url`, timestamps |
| `organizations` | `id`, `name`, unique lowercase `slug`, canonical `website_url`, unique `normalized_domain`, `claim_status`, nullable `created_by`, `is_active`, timestamps |
| `organization_members` | `organization_id`, `user_id`, `role`, `created_at`; composite primary key on organization/user |
| `feedback` | `id`, `organization_id`, `submitter_id`, `type`, `title`, `description`, `source_url`, `page_title`, nullable `selected_text`, nullable `screenshot_path`, `status` default `submitted`, timestamps |
| `feedback_status_history` | `id`, `feedback_id`, nullable `previous_status`, `new_status`, `changed_by`, `created_at` |
| `feedback_responses` | `id`, unique `feedback_id`, `organization_id`, `body`, `author_id`, timestamps; one official response per item |

`source_url` must be HTTP(S). Apply practical length checks to titles, page
titles, response bodies, URLs, descriptions, and selected text. Use triggers for
`updated_at`, profile creation, organization-ID consistency on child rows, and
status-history insertion. Prevent updates to immutable ownership fields. Permit
administrators to change directly between any two different enum statuses.

## Relationships and Indexes

An organization has many members and feedback items. A user can belong to many
organizations and submit to any active organization. Feedback has many status
events and zero or one official response.

Directory identity is domain-based, not name-based: names need not be unique.
`www.example.com` normalizes to `example.com`; meaningful subdomains such as
`app.example.com` remain separate. Canonical website URLs contain only HTTPS and
the normalized IDNA hostname. Application validation provides user-friendly
errors, while the privileged creation RPC independently rejects raw IPs, local
and reserved development hosts, credentials, ports, paths, malformed labels,
and conflicting representations. Database validation is authoritative for
direct authenticated calls. It also rejects markup-like names, duplicate
normalized domains, and protected claim-state input.

Add indexes for:

- `feedback (submitter_id, created_at desc)`
- `feedback (organization_id, created_at desc)`
- `feedback (organization_id, status, created_at desc)`
- `organization_members (user_id, organization_id)`
- unique `organizations (normalized_domain)` plus lookup indexes on lowercase
  name and non-null `created_by`
- `feedback_status_history (feedback_id, created_at)`

## Row Level Security

Enable and force RLS on all public tables. Policies should be expressed through
small `security definer` membership helpers with a fixed `search_path`, owned by
a non-login role and executable only by authenticated users.

| Resource | Read | Create/change |
| --- | --- | --- |
| Profiles | own profile; organization members may read a submitter's display name for feedback routed to their organization | own display fields only |
| Organizations | authenticated users list active destinations; safe-field RPCs support public slug/domain lookup | authenticated creation RPC accepts only name and canonical website, binds `created_by` to `auth.uid()`, and always inserts `unclaimed`; no direct browser insert/update |
| Memberships | members read their organization's roster | organization admins manually add/remove existing authenticated users and change roles; prevent removing/demoting the last admin |
| Feedback | submitter or destination-organization member | authenticated user inserts as self to active organization; only org admins change status; no submitter edits in MVP |
| Status history | same visibility as parent feedback | trigger only; clients cannot update/delete |
| Official response | same visibility as parent feedback | destination-organization members may publish the single response; existing author or admin update is allowed by RLS, but editing/deletion UI is deferred |

Never accept `submitter_id`, status actor, or response author as trusted client
claims; derive them from `auth.uid()`. Test every policy using at least two
organizations, a non-member submitter, a member, and an administrator.

Supabase Auth remains the source for email addresses. Do not copy email into the
public profile. Return it only through an administrator-authorized server
operation; members receive `display_name` only. Do not expose broad Auth-table
access through a client-readable view or function.

The directory creation function is `SECURITY DEFINER` with an empty
`search_path`, schema-qualified objects, public/anon execution revoked, and an
explicit authenticated grant. A transaction-scoped advisory lock keyed by
normalized domain plus the unique index makes duplicate creation safe. It never
inserts `organization_members`; directory contribution and verified ownership
are separate. Existing claimed organizations are not user-editable.

The pilot administrator bootstrap is a manual, transactional SQL Editor
template. It requires exactly one organization match and one Auth-user match,
promotes only `unclaimed` to `claimed`, preserves `verified`, and idempotently
upserts an explicit admin membership. It is never exposed through the app.

## Screenshot Storage

Create a private `feedback-screenshots` bucket. Each item has exactly one
canonical object path: `{feedback_id}/screenshot`. Insert the feedback row with a
null `screenshot_path`, upload only to that canonical key, then let the submitter
associate `screenshot_path` once from null to the same key. Database constraints,
RLS, and the feedback immutability trigger reject other paths, other users, and
updates combined with content or status changes. Storage's unique bucket/name
key prevents additional objects. Object replacement is deferred because a broad
Storage update policy could also authorize renaming an object; no browser update
or delete policy is provided in this slice.

Submitters and destination-organization members may read through short-lived
signed URLs. Limit uploads to PNG, JPEG, or WebP and 5 MB, and verify content type
in the application as well as through the bucket allowlist. Delete the object
when its associated feedback is deleted using a controlled database/storage
cleanup operation. Self-service feedback deletion is deferred, so ordinary
submitters receive no object-delete policy.

## Migration and Seed Strategy

Keep all schema, constraints, functions, and policies in ordered files under
`supabase/migrations/`. Never edit production schema manually. Seed local data
with Acme Software and the founder's test administrator identity. Automated RLS
tests should create a second fixture-only organization and role-separated users
so cross-tenant denials remain repeatable without presenting a second pilot
organization in the product. Generated TypeScript database types should be
committed after each schema change.

Future moderation must cover duplicate merges, incorrect names, misleading
records, domain ownership disputes, claims, and verification. The MVP records
`created_by` but does not implement these workflows or automatic verification.
