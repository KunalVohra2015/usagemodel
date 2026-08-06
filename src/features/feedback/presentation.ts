import type { FeedbackStatus } from "./types";

const presentationStatusLabels: Record<FeedbackStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
  declined: "Declined",
};

export function formatFeedbackDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function statusHistoryLabel(
  status: FeedbackStatus,
  isInitial: boolean,
) {
  if (isInitial) return "Feedback submitted";
  return `Status changed to ${presentationStatusLabels[status]}`;
}
