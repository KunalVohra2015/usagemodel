import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  membershipForOrganization,
  selectAuthorizedOrganization,
} from "../src/features/dashboard/authorization.ts";
import { filterDashboardFeedback } from "../src/features/dashboard/filters.ts";
import {
  validateOfficialResponse,
  validateStatusUpdate,
} from "../src/features/dashboard/mutations.ts";

const memberships = [
  { organizationId: "org-acme", organizationName: "Acme", organizationSlug: "acme", role: "admin" },
  { organizationId: "org-beta", organizationName: "Beta", organizationSlug: "beta", role: "member" },
];

const inboxItems = [
  {
    id: "feedback-1", title: "Schedule reports", description: "Weekly automation",
    type: "feature_request", status: "submitted", createdAt: "2026-08-05T12:00:00Z",
    pageTitle: "Reports", sourceUrl: "https://app.acme.test/reports", hasScreenshot: false,
    submitter: { displayName: "Maya Chen", initials: "MC" }, officialResponse: null,
  },
  {
    id: "feedback-2", title: "CSV is incorrect", description: "Wrong date range",
    type: "bug", status: "in_progress", createdAt: "2026-08-04T12:00:00Z",
    pageTitle: "Activity", sourceUrl: "https://app.acme.test/activity", hasScreenshot: true,
    submitter: { displayName: "Jordan Lee", initials: "JL" }, officialResponse: { body: "Working on it", createdAt: "2026-08-05T12:00:00Z" },
  },
];

test("dashboard organization selection handles none, one, and many memberships", () => {
  assert.equal(selectAuthorizedOrganization([], undefined), null);
  assert.equal(selectAuthorizedOrganization([memberships[0]], undefined), memberships[0]);
  assert.equal(selectAuthorizedOrganization(memberships, "org-beta"), memberships[1]);
  assert.equal(selectAuthorizedOrganization(memberships, "org-forged"), null);
  assert.equal(selectAuthorizedOrganization(memberships, ["org-acme"]), memberships[0]);
  assert.equal(membershipForOrganization(memberships, "org-forged"), null);
});

test("real inbox filtering supports search, status, and feedback type", () => {
  assert.deepEqual(filterDashboardFeedback(inboxItems, { query: "maya", status: "all", type: "all" }).map((item) => item.id), ["feedback-1"]);
  assert.deepEqual(filterDashboardFeedback(inboxItems, { query: "app.acme.test", status: "in_progress", type: "bug" }).map((item) => item.id), ["feedback-2"]);
  assert.deepEqual(filterDashboardFeedback(inboxItems, { query: "missing", status: "all", type: "all" }), []);
});

test("only administrators may change status and no-op or invalid changes fail", () => {
  assert.equal(validateStatusUpdate({ requestedStatus: "planned", currentStatus: "submitted", membership: memberships[0] }).ok, true);
  assert.match(validateStatusUpdate({ requestedStatus: "planned", currentStatus: "submitted", membership: memberships[1] }).message, /administrator/i);
  assert.match(validateStatusUpdate({ requestedStatus: "submitted", currentStatus: "submitted", membership: memberships[0] }).message, /different status/i);
  assert.match(validateStatusUpdate({ requestedStatus: "invented", currentStatus: "submitted", membership: memberships[0] }).message, /valid feedback status/i);
});

test("members may publish one validated official response", () => {
  const valid = validateOfficialResponse({ body: "  We are reviewing this.  ", membership: memberships[1], responseExists: false });
  assert.equal(valid.ok, true);
  assert.equal(valid.body, "We are reviewing this.");
  assert.match(validateOfficialResponse({ body: " ", membership: memberships[1], responseExists: false }).message, /write a response/i);
  assert.match(validateOfficialResponse({ body: "x".repeat(10_001), membership: memberships[1], responseExists: false }).message, /10,000/i);
  assert.match(validateOfficialResponse({ body: "Another", membership: memberships[1], responseExists: true }).message, /already/i);
  assert.match(validateOfficialResponse({ body: "Response", membership: null, responseExists: false }).message, /membership/i);
});

test("dashboard queries enforce membership and organization scope without email", async () => {
  const server = await readFile(new URL("../src/features/dashboard/server.ts", import.meta.url), "utf8");
  assert.match(server, /membershipForOrganization/);
  assert.match(server, /\.eq\("organization_id", membership\.organizationId\)/);
  assert.match(server, /\.eq\("id", feedbackId\)[\s\S]*\.eq\("organization_id", membership\.organizationId\)/);
  assert.match(server, /\.from\("profiles"\)[\s\S]*\.select\("id, display_name"\)/);
  assert.doesNotMatch(server, /auth\.users|select\([^)]*email|submitter\.email/i);
});

test("dashboard mutations derive actor and organization instead of accepting them", async () => {
  const action = await readFile(new URL("../src/app/dashboard/feedback/[id]/actions.ts", import.meta.url), "utf8");
  assert.match(action, /getVerifiedIdentity/);
  assert.match(action, /membershipForOrganization/);
  assert.match(action, /organization_id: context\.feedback\.organization_id/);
  assert.match(action, /author_id: context\.identity\.id/);
  assert.doesNotMatch(action, /function updateFeedbackStatus\([^)]*actor|function publishOfficialResponse\([^)]*organization/i);
  assert.match(action, /\.eq\("status", context\.feedback\.status\)/);
});

test("applied trigger records status history and suppresses no-op entries", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260804224228_mvp_database_foundation.sql", import.meta.url), "utf8");
  const historyFunction = migration.slice(
    migration.indexOf("create function private.record_feedback_status_history"),
    migration.indexOf("create trigger feedback_record_status_history"),
  );
  assert.match(historyFunction, /new\.status is distinct from old\.status/i);
  assert.match(historyFunction, /old\.status[\s\S]*new\.status[\s\S]*auth\.uid\(\)/i);
});

test("authorized and missing dashboard feedback use a safe not-found boundary", async () => {
  const page = await readFile(new URL("../src/app/dashboard/feedback/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /result\.status === "not_found"\) notFound\(\)/);
  assert.match(page, /selectAuthorizedOrganization/);
  assert.doesNotMatch(page, /submitter\.email/);
  assert.match(page, /rel="noopener noreferrer"/);
});

test("dashboard mutations refresh both product-team and submitter views", async () => {
  const action = await readFile(new URL("../src/app/dashboard/feedback/[id]/actions.ts", import.meta.url), "utf8");
  assert.match(action, /revalidatePath\("\/dashboard"\)/);
  assert.match(action, /revalidatePath\(`\/dashboard\/feedback\/\$\{feedbackId\}`\)/);
  assert.match(action, /revalidatePath\("\/feedback"\)/);
  assert.match(action, /revalidatePath\(`\/feedback\/\$\{feedbackId\}`\)/);
  const submitterServer = await readFile(new URL("../src/features/feedback/server.ts", import.meta.url), "utf8");
  assert.match(submitterServer, /feedback_status_history/);
  assert.match(submitterServer, /feedback_responses/);
});

test("configured failures never substitute mock inbox data while demo mode remains isolated", async () => {
  const page = await readFile(new URL("../src/app/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const demoMode = getSupabaseEnvironmentStatus\(\) !== "configured"/);
  assert.match(page, /if \(!demoMode\)/);
  assert.match(page, /queryFailed = true/);
  assert.match(page, /No demo records were substituted/);
  assert.match(page, /let items = mockItems/);
});

test("pilot bootstrap is transactional, exact, idempotent, and contains placeholders only", async () => {
  const sql = await readFile(new URL("../supabase/bootstrap/pilot_administrator.sql", import.meta.url), "utf8");
  assert.match(sql, /^--[\s\S]*\nbegin;/i);
  assert.match(sql, /organization_count <> 1/);
  assert.match(sql, /user_count <> 1/);
  assert.match(sql, /claim_status = 'unclaimed'/);
  assert.match(sql, /on conflict \(organization_id, user_id\)[\s\S]*do update set role = 'admin'/i);
  assert.match(sql, /commit;\s*$/i);
  assert.doesNotMatch(sql, /@[a-z0-9.-]+\.(com|org|net|io)\b/i);
  assert.doesNotMatch(sql, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  assert.doesNotMatch(sql, /created_by|service_role\s*=|sb_(secret|service_role)_/i);
});

test("company creation still contains no membership grant", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260805010000_company_directory.sql", import.meta.url), "utf8");
  const creation = migration.slice(
    migration.indexOf("create function public.find_or_create_unclaimed_organization"),
    migration.indexOf("create function public.get_public_company_by_slug"),
  );
  assert.doesNotMatch(creation, /organization_members/);
});
