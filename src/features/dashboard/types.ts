import type { FeedbackStatus, FeedbackType } from "@/features/feedback/types";

export type DashboardFeedbackSummary = {
  id: string;
  title: string;
  description: string;
  type: FeedbackType;
  status: FeedbackStatus;
  createdAt: string;
  pageTitle: string;
  sourceUrl: string;
  hasScreenshot: boolean;
  submitter: { displayName: string; initials: string };
  officialResponse: { body: string; createdAt: string } | null;
};

export type DashboardHistoryEvent = {
  id: string;
  previousStatus: FeedbackStatus | null;
  newStatus: FeedbackStatus;
  createdAt: string;
};

export type DashboardFeedbackDetail = DashboardFeedbackSummary & {
  organizationId: string;
  organizationName: string;
  selectedText: string | null;
  screenshotUrl: string | null;
  history: DashboardHistoryEvent[];
};

export type DashboardQueryResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_found" }
  | { status: "error" };
