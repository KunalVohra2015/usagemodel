"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import type { DashboardFeedbackSummary } from "@/features/dashboard/types";
import { filterDashboardFeedback } from "@/features/dashboard/filters";
import { formatFeedbackDate } from "@/features/feedback/presentation";
import { feedbackStatuses, statusLabels, typeLabels, type FeedbackStatus, type FeedbackType } from "@/features/feedback/types";

const countCards: { status: FeedbackStatus; label: string }[] = [
  { status: "submitted", label: "New" },
  { status: "under_review", label: "Reviewing" },
  { status: "planned", label: "Planned" },
  { status: "in_progress", label: "In progress" },
  { status: "shipped", label: "Shipped" },
];

function sourceHost(sourceUrl: string) {
  try { return new URL(sourceUrl).hostname; } catch { return "Source page"; }
}

export function Inbox({
  items,
  organizationId,
}: {
  items: DashboardFeedbackSummary[];
  organizationId?: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FeedbackStatus | "all">("all");
  const [type, setType] = useState<FeedbackType | "all">("all");

  const filtered = useMemo(() => {
    return filterDashboardFeedback(items, { query, status, type });
  }, [items, query, status, type]);

  const selectClass = "min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-100";

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {countCards.map((card) => {
          const count = items.filter((item) => item.status === card.status).length;
          return <button type="button" key={card.status} onClick={() => setStatus(status === card.status ? "all" : card.status)} className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 ${status === card.status ? "border-indigo-500 ring-3 ring-indigo-100" : "border-slate-200"}`} aria-pressed={status === card.status}><span className="text-2xl font-semibold tracking-tight">{count}</span><span className="mt-1 block text-xs font-medium text-slate-500">{card.label}</span></button>;
        })}
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div><h2 className="font-semibold">Feedback inbox</h2><p className="mt-0.5 text-xs text-slate-500">{filtered.length} of {items.length} conversations</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative sm:min-w-72"><span className="sr-only">Search feedback</span><span className="pointer-events-none absolute left-3 top-2.5 text-sm text-slate-400" aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-100" placeholder="Search feedback or submitter" /></label>
              <label><span className="sr-only">Filter by status</span><select className={selectClass} value={status} onChange={(event) => setStatus(event.target.value as FeedbackStatus | "all")}><option value="all">All statuses</option>{feedbackStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
              <label><span className="sr-only">Filter by type</span><select className={selectClass} value={type} onChange={(event) => setType(event.target.value as FeedbackType | "all")}><option value="all">All types</option><option value="feature_request">Feature request</option><option value="bug">Bug</option><option value="confusing_experience">Confusing experience</option><option value="other">Other</option></select></label>
            </div>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div>
            <div className="hidden grid-cols-[minmax(0,1fr)_10rem_9rem_7rem] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 md:grid"><span>Feedback</span><span>Submitter</span><span>Status</span><span>Received</span></div>
            <ul className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const href = organizationId ? `/dashboard/feedback/${item.id}?organization=${encodeURIComponent(organizationId)}` : `/dashboard/feedback/${item.id}`;
                return <li key={item.id}><Link href={href} className="group grid gap-4 px-4 py-4 transition hover:bg-indigo-50/40 sm:px-5 md:grid-cols-[minmax(0,1fr)_10rem_9rem_7rem] md:items-center"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`size-2 shrink-0 rounded-full ${item.status === "submitted" ? "bg-indigo-500" : "bg-transparent"}`} aria-hidden="true" /><h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-700">{item.title}</h3></div><div className="mt-1 flex flex-wrap items-center gap-2 pl-4.5 text-xs text-slate-500"><span>{typeLabels[item.type]}</span><span>·</span><span>{sourceHost(item.sourceUrl)}</span>{item.hasScreenshot && <span>· Screenshot</span>}{item.officialResponse && <span className="font-medium text-teal-700">· Responded</span>}</div>{item.officialResponse && <p className="mt-1 line-clamp-1 pl-4.5 text-xs text-teal-700">{item.officialResponse.body}</p>}</div><div className="flex items-center gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">{item.submitter.initials}</span><span className="truncate text-sm text-slate-700">{item.submitter.displayName}</span></div><div><StatusBadge status={item.status} /></div><div className="text-xs text-slate-500">{formatFeedbackDate(item.createdAt)}</div></Link></li>;
              })}
            </ul>
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center" role="status"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-indigo-50 text-xl text-indigo-600" aria-hidden="true">✓</span><h3 className="mt-4 font-semibold">No feedback yet</h3><p className="mt-1 text-sm text-slate-500">New feedback routed to this organization will appear here.</p></div>
        ) : (
          <div className="px-6 py-16 text-center" role="status"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-xl text-slate-500" aria-hidden="true">⌕</span><h3 className="mt-4 font-semibold">No feedback matches</h3><p className="mt-1 text-sm text-slate-500">Try a different search or clear your filters.</p><button type="button" className="mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50" onClick={() => { setQuery(""); setStatus("all"); setType("all"); }}>Clear filters</button></div>
        )}
      </section>
    </>
  );
}
