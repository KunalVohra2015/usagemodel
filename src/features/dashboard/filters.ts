import type { DashboardFeedbackSummary } from "./types";
import type { FeedbackStatus, FeedbackType } from "@/features/feedback/types";

function sourceHost(sourceUrl: string) {
  try { return new URL(sourceUrl).hostname; } catch { return "source page"; }
}

export function filterDashboardFeedback(
  items: DashboardFeedbackSummary[],
  options: {
    query: string;
    status: FeedbackStatus | "all";
    type: FeedbackType | "all";
  },
) {
  const search = options.query.trim().toLowerCase();
  return items.filter((item) => {
    const searchable = `${item.title} ${item.description} ${item.submitter.displayName} ${item.pageTitle} ${sourceHost(item.sourceUrl)}`.toLowerCase();
    return (!search || searchable.includes(search)) &&
      (options.status === "all" || item.status === options.status) &&
      (options.type === "all" || item.type === options.type);
  });
}
