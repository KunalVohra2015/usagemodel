import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  feedbackLimits,
  persistFeedbackSubmission,
  validateFeedbackSubmission,
} from "../src/features/feedback/submission.ts";
import { formatFeedbackDate } from "../src/features/feedback/presentation.ts";

const validInput = {
  organizationId: "4a436a11-620b-4ea0-a892-bf6404b66a11",
  type: "feature_request",
  title: "  Schedule weekly reports  ",
  description: "  Please let me schedule this report.  ",
  sourceUrl: "https://app.example.com/reports?range=weekly",
  pageTitle: "  Weekly report  ",
  selectedText: "   ",
};

test("authenticated feedback submission derives identity and normalizes optional fields", async () => {
  let inserted;
  const result = await persistFeedbackSubmission({
    identityId: "user-from-verified-claims",
    input: validInput,
    store: {
      async organizationIsActive() { return true; },
      async insert(value) { inserted = value; return { id: "new-feedback-id", error: false }; },
    },
  });

  assert.deepEqual(result, { ok: true, feedbackId: "new-feedback-id" });
  assert.equal(inserted.submitterId, "user-from-verified-claims");
  assert.equal(inserted.title, "Schedule weekly reports");
  assert.equal(inserted.selectedText, null);
  assert.equal(inserted.status, undefined);
});

test("unauthenticated submission is rejected before database access", async () => {
  let accessed = false;
  const result = await persistFeedbackSubmission({
    identityId: null,
    input: validInput,
    store: {
      async organizationIsActive() { accessed = true; return true; },
      async insert() { accessed = true; return { id: null, error: true }; },
    },
  });
  assert.equal(result.ok, false);
  assert.equal(accessed, false);
});

test("inactive or nonexistent organizations are rejected before insertion", async () => {
  let inserted = false;
  const result = await persistFeedbackSubmission({
    identityId: "verified-user",
    input: validInput,
    store: {
      async organizationIsActive() { return false; },
      async insert() { inserted = true; return { id: null, error: true }; },
    },
  });
  assert.equal(result.ok, false);
  assert.equal(inserted, false);
  assert.match(result.errors.organizationId, /active company/i);
});

test("feedback validation rejects invalid types, required fields, URLs, and lengths", () => {
  const result = validateFeedbackSubmission({
    ...validInput,
    type: "planned",
    title: " ",
    description: "x".repeat(feedbackLimits.description + 1),
    sourceUrl: "javascript:alert(1)",
    pageTitle: "",
    selectedText: "x".repeat(feedbackLimits.selectedText + 1),
  });
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), [
    "description", "pageTitle", "selectedText", "sourceUrl", "title", "type",
  ]);

  const credentials = validateFeedbackSubmission({
    ...validInput,
    sourceUrl: "https://user:password@example.com/private",
  });
  assert.equal(credentials.ok, false);
  assert.match(credentials.errors.sourceUrl, /valid URL/i);
});

test("malformed server-action payloads fail with controlled validation", () => {
  const result = validateFeedbackSubmission(null);
  assert.equal(result.ok, false);
  assert.match(result.errors.form, /review the form/i);
});

test("database failures never claim success", async () => {
  const result = await persistFeedbackSubmission({
    identityId: "verified-user",
    input: validInput,
    store: {
      async organizationIsActive() { return true; },
      async insert() { return { id: null, error: true }; },
    },
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.form, /could not save/i);
});

test("configured submission prevents repeat clicks and redirects only after insert", async () => {
  const form = await readFile(new URL("../src/app/feedback/new/feedback-form.tsx", import.meta.url), "utf8");
  const action = await readFile(new URL("../src/app/feedback/new/actions.ts", import.meta.url), "utf8");
  assert.match(form, /if \(isSubmitting\) return/);
  assert.match(form, /disabled=\{isSubmitting\}/);
  assert.match(form, /router\.push\(`\/feedback\/\$\{result\.feedbackId\}\?created=1`\)/);
  assert.match(action, /revalidatePath\("\/feedback"\)/);
  assert.doesNotMatch(action, /status:\s*input|submitterId:\s*input/i);
});

test("My Feedback is owner-scoped, newest-first, and never falls back to mocks on query failure", async () => {
  const server = await readFile(new URL("../src/features/feedback/server.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../src/app/feedback/page.tsx", import.meta.url), "utf8");
  assert.match(server, /\.eq\("submitter_id", identity\.id\)/);
  assert.match(server, /\.order\("created_at", \{ ascending: false \}\)/);
  assert.match(server, /feedback_responses\(body, created_at\)/);
  assert.match(page, /queryFailed = true/);
  assert.match(page, /not replaced with sample data/i);
  assert.match(page, /demoMode.*currentUserFeedback/s);
});

test("detail lookup hides unauthorized UUIDs and renders history and responses", async () => {
  const server = await readFile(new URL("../src/features/feedback/server.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../src/app/feedback/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(server, /\.eq\("id", feedbackId\)[\s\S]*\.eq\("submitter_id", identity\.id\)/);
  assert.match(server, /feedback_status_history/);
  assert.match(server, /feedback_responses/);
  assert.match(page, /status === "not_found"\) notFound/);
  assert.match(page, /Official response from/);
  assert.match(page, /rel="noopener noreferrer"/);
});

test("mock mode stays independent and configured screenshots are not partially uploaded", async () => {
  const form = await readFile(new URL("../src/app/feedback/new/feedback-form.tsx", import.meta.url), "utf8");
  const list = await readFile(new URL("../src/app/feedback/page.tsx", import.meta.url), "utf8");
  assert.match(form, /if \(demoMode\)/);
  assert.match(form, /disabled=\{!demoMode\}/);
  assert.match(form, /No screenshot will be included/i);
  assert.match(list, /getSupabaseEnvironmentStatus\(\) !== "configured"/);
});

test("presentation dates are deterministic across server time zones", () => {
  assert.equal(formatFeedbackDate("2026-08-05T23:30:00-07:00"), "Aug 6, 2026");
});
