export const feedbackStatuses = [
  "submitted",
  "under_review",
  "planned",
  "in_progress",
  "shipped",
  "declined",
] as const;

export const feedbackTypes = [
  "feature_request",
  "bug",
  "confusing_experience",
  "other",
] as const;

export type FeedbackStatus = (typeof feedbackStatuses)[number];
export type FeedbackType = (typeof feedbackTypes)[number];

export type FeedbackEvent = {
  status: FeedbackStatus;
  label: string;
  date: string;
  note?: string;
};

export type FeedbackItem = {
  id: string;
  title: string;
  description: string;
  organization: string;
  organizationInitials: string;
  type: FeedbackType;
  status: FeedbackStatus;
  submittedAt: string;
  updatedAt: string;
  sourceUrl: string;
  pageTitle: string;
  selectedText?: string;
  hasScreenshot: boolean;
  submitter: {
    name: string;
    email: string;
    initials: string;
  };
  officialResponse?: {
    body: string;
    author: string;
    date: string;
  };
  timeline: FeedbackEvent[];
};

export const statusLabels: Record<FeedbackStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
  declined: "Declined",
};

export const typeLabels: Record<FeedbackType, string> = {
  feature_request: "Feature request",
  bug: "Bug",
  confusing_experience: "Confusing experience",
  other: "Other",
};
