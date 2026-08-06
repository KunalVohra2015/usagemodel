import Link from "next/link";
import type { UserFeedbackSummary } from "@/features/feedback/server";
import { typeLabels } from "@/features/feedback/types";
import { StatusBadge } from "./status-badge";

export function FeedbackCard({ item }: { item: UserFeedbackSummary }) {
  return (
    <Link
      href={`/feedback/${item.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="grid size-7 place-items-center rounded-lg bg-indigo-50 font-bold text-indigo-700">{item.organizationInitials}</span>
            <span>{item.organization}</span>
            <span aria-hidden="true">·</span>
            <span>{typeLabels[item.type]}</span>
          </div>
          <h2 className="text-base font-semibold tracking-tight text-slate-950 group-hover:text-teal-700 sm:text-lg">{item.title}</h2>
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-600">{item.description}</p>
          {item.officialResponse && <p className="mt-3 line-clamp-2 rounded-lg bg-teal-50 px-3 py-2 text-xs leading-5 text-teal-800"><strong>Latest response:</strong> {item.officialResponse.body}</p>}
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span>Submitted {item.submittedAt}</span>
        <span className={item.officialResponse ? "font-medium text-teal-700" : "text-slate-400"}>
          {item.officialResponse ? "Official response received" : "Awaiting a response"} <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
