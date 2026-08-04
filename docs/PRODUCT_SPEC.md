# Product Specification

## MVP Problem Statement

Feedback is fragmented across surveys and support channels. Submitters cannot
see whether a product team received, reviewed, planned, or shipped their input,
while product teams lack a consistent intake and response workflow. The MVP
creates a private, visible feedback loop between authenticated users and the
organization responsible for a software product.

## Target Users

- **End user:** submits feedback and tracks only their own submissions.
- **Organization member:** reviews feedback routed to their organization.
- **Organization administrator:** manages members, changes status, and publishes
  an official response. Administrators also have all member capabilities.

One person may be an end user for one organization and a member of another.
The initial fictional pilot organization is **Acme Software**, with the founder
as its first test administrator. The schema and authorization model remain
multi-organization from the beginning.

## User Journeys

1. A user signs in with Google, completes a minimal profile, selects a listed
   destination company, and submits feedback.
2. The submission records type (`bug`, `feature_request`, `usability`, or
   `other`), title, description, source URL, page title, optional selected text,
   and optional screenshot.
3. The user sees the submission as `submitted` and can later view its current
   status and official company response.
4. A destination-company member sees routed submissions in a private dashboard
   and filters or opens their details.
5. An administrator changes status and creates or edits one official response;
   the submitter then sees the update.
6. In a later MVP slice, a Manifest V3 extension captures page context and sends
   the same submission shape through the versioned application API.

## In Scope

- Google OAuth through Supabase and protected web routes.
- Multi-organization membership with `member` and `admin` roles.
- Organization discovery for choosing a feedback destination.
- Web feedback creation, optional private screenshot upload, and validation.
- Submitter history and feedback detail views.
- Organization inbox and detail views.
- Status workflow: `submitted`, `under_review`, `planned`, `in_progress`,
  `shipped`, or `declined`, with an audit history.
- One editable official response per feedback item.
- Members may see submitter display names; only administrators may see submitter
  email addresses.
- RLS-protected PostgreSQL data and private Supabase Storage.
- A versioned API usable by the future extension.
- Basic loading, empty, error, and authorization states.

## Out of Scope

Multiple identities per user; public feeds; voting; comments; rewards; AI
categorization; duplicate detection; Productboard, Airtable, Jira, or Linear
integrations; SMS; billing; and native mobile apps are excluded. Email
notifications, custom statuses, anonymous submissions, and organization
self-service creation are also deferred unless pilot evidence requires them.
Email invitations and self-service feedback deletion are deferred. The Chrome
extension is deferred until the complete web feedback loop works.

## Acceptance Criteria

- An unauthenticated visitor cannot access protected pages or API operations.
- A Google-authenticated user can submit all required fields to an active
  organization and can read only feedback they submitted, unless they are an
  authorized member of its destination organization.
- Optional selected text and screenshot omission do not block submission.
- Screenshots are never public; authorized viewers receive expiring URLs.
- Screenshot uploads accept PNG, JPEG, and WebP files up to 5 MB and remain
  stored until their associated feedback is deleted.
- Members can list and view their organization's feedback but cannot manage
  membership, status, or official responses. They can see the submitter's
  display name but not email address.
- Administrators can add/remove organization members, change allowed statuses,
  view submitter email addresses, and create or edit an official response.
- Administrators can move feedback directly between any two different valid
  statuses; no sequential transition rule applies in the MVP.
- Status changes record actor, previous status, new status, and timestamp.
- Cross-organization reads and writes fail under tested RLS policies.
- The web client and extension contract use `/api/v1` and the same validation
  and authorization rules.

## Assumptions to Validate

- Submitters will sign in before providing feedback rather than abandon intake.
- A curated organization list is sufficient for the pilot.
- Six shared statuses describe pilot teams' workflows.
- A single official response is more useful than a conversation thread.
- Users are comfortable sharing source URLs, selected text, and screenshots.
- Product teams will regularly update status without notification automation.
- Google-only authentication covers pilot participants.
- Manual organization membership assignment is sufficient for the pilot.
- The pilot's privacy needs are met by hosted Supabase in the US region closest
  to users in New York and private object storage; legal requirements still
  need confirmation before real customer data is collected.

## Success Signals

For the pilot, track submission completion, percentage reviewed by a product
team, percentage receiving a status or response, and median time to first team
action. Define numeric targets with pilot organizations before launch.
