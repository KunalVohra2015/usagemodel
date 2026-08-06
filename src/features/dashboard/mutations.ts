import type { OrganizationMembership } from "@/features/auth/types";
import type { FeedbackStatus } from "@/features/feedback/types";

const allowedStatuses: readonly FeedbackStatus[] = [
  "submitted",
  "under_review",
  "planned",
  "in_progress",
  "shipped",
  "declined",
];

export type DashboardMutationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export function validateStatusUpdate(options: {
  requestedStatus: unknown;
  currentStatus: FeedbackStatus;
  membership: OrganizationMembership | null;
}): DashboardMutationResult {
  if (
    typeof options.requestedStatus !== "string" ||
    !allowedStatuses.includes(options.requestedStatus as FeedbackStatus)
  ) {
    return { ok: false, message: "Choose a valid feedback status." };
  }
  if (!options.membership || options.membership.role !== "admin") {
    return { ok: false, message: "Only an organization administrator can change status." };
  }
  if (options.requestedStatus === options.currentStatus) {
    return { ok: false, message: "Choose a different status before saving." };
  }
  return { ok: true, message: "Status updated." };
}

export function validateOfficialResponse(options: {
  body: unknown;
  membership: OrganizationMembership | null;
  responseExists: boolean;
}): DashboardMutationResult & { body?: string } {
  if (!options.membership) {
    return { ok: false, message: "Organization membership is required." };
  }
  if (options.responseExists) {
    return { ok: false, message: "An official response has already been published." };
  }
  if (typeof options.body !== "string" || !options.body.trim()) {
    return { ok: false, message: "Write a response before publishing." };
  }
  const body = options.body.trim();
  if (body.length > 10_000) {
    return { ok: false, message: "Keep the response to 10,000 characters or fewer." };
  }
  if (body.includes("\u0000")) {
    return { ok: false, message: "Remove unsupported characters from the response." };
  }
  return { ok: true, message: "Official response published.", body };
}
