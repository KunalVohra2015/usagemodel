import { statusLabels, type FeedbackStatus } from "@/features/feedback/types";

const styles: Record<FeedbackStatus, string> = {
  submitted: "border-slate-200 bg-slate-100 text-slate-700",
  under_review: "border-sky-200 bg-sky-50 text-sky-700",
  planned: "border-violet-200 bg-violet-50 text-violet-700",
  in_progress: "border-amber-200 bg-amber-50 text-amber-800",
  shipped: "border-emerald-200 bg-emerald-50 text-emerald-700",
  declined: "border-rose-200 bg-rose-50 text-rose-700",
};

export function StatusBadge({ status }: { status: FeedbackStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}
