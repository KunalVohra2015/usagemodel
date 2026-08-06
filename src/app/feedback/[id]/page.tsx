import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { getFeedbackById } from "@/features/feedback/mock-data";
import {
  formatFeedbackDate,
  statusHistoryLabel,
} from "@/features/feedback/presentation";
import { getOwnFeedbackDetail } from "@/features/feedback/server";
import { statusLabels, typeLabels, type FeedbackStatus } from "@/features/feedback/types";
import { getSupabaseEnvironmentStatus } from "@/lib/env";

export const metadata: Metadata = { title: "Feedback details" };

export default async function FeedbackDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string | string[] }>;
}) {
  const { id } = await params;
  const demoMode = getSupabaseEnvironmentStatus() !== "configured";
  const created = (await searchParams).created === "1";

  const mockItem = demoMode ? getFeedbackById(id) : null;
  const result = demoMode ? null : await getOwnFeedbackDetail(id);
  if (demoMode && !mockItem) notFound();
  if (result?.status === "not_found") notFound();
  if (result?.status === "error") {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">We could not load this feedback</h1>
        <p className="mt-3 text-sm text-slate-600">Please try again. No sample record has been substituted.</p>
        <Link href="/feedback" className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50">Back to my feedback</Link>
      </main>
    );
  }

  const realItem = result?.status === "ok" ? result.data : null;
  const item = realItem ?? mockItem!;
  const selectedText = realItem ? realItem.selectedText : mockItem?.selectedText;
  const screenshotUrl = realItem?.screenshotUrl ?? null;
  const response = realItem?.officialResponse ?? mockItem?.officialResponse;
  const history: Array<{ id: string; status: FeedbackStatus; label: string; date: string; note?: string }> = realItem
    ? realItem.history.map((event) => ({
        id: event.id,
        status: event.new_status,
        label: statusHistoryLabel(event.new_status, event.previous_status === null),
        date: formatFeedbackDate(event.created_at),
      }))
    : (mockItem?.timeline ?? []).map((event, index) => ({
        id: `${event.status}-${index}`,
        status: event.status,
        label: event.label,
        date: event.date,
        note: event.note,
      }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {created && !demoMode && <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">Your feedback was submitted and saved successfully.</div>}
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-700" href="/feedback"><span aria-hidden="true">←</span> Back to my feedback</Link>
      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={item.status} /><span className="text-xs text-slate-500">Updated {formatFeedbackDate(item.updatedAt)}</span></div>
            <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{item.title}</h1>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.description}</p>
            {selectedText && <blockquote className="mt-6 whitespace-pre-wrap border-l-3 border-teal-400 bg-teal-50/60 px-4 py-3 text-sm italic leading-6 text-slate-700">“{selectedText}”</blockquote>}
            {screenshotUrl && <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Private screenshot</p><a className="mt-2 inline-flex text-sm font-semibold text-teal-700 underline underline-offset-3" href={screenshotUrl} target="_blank" rel="noopener noreferrer">Open authorized screenshot</a><p className="mt-1 text-xs text-slate-500">This private link expires shortly.</p></div>}
            {demoMode && mockItem?.hasScreenshot && <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"><div className="grid min-h-44 place-items-center"><span className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm">Demo screenshot preview</span></div></div>}
          </article>

          <section className={`rounded-2xl border p-5 sm:p-7 ${response ? "border-teal-200 bg-teal-50/60" : "border-dashed border-slate-300 bg-white"}`}>
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-xs font-bold text-white">{item.organizationInitials}</span><div><h2 className="font-semibold">Official response from {item.organization}</h2>{response && <p className="text-xs text-slate-500">{formatFeedbackDate(response.date)}</p>}</div></div>
            {response ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{response.body}</p> : <p className="mt-4 text-sm leading-6 text-slate-600">{item.organization} has not posted a response yet. You will see it here when they do.</p>}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Feedback details</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div><dt className="text-xs font-medium text-slate-500">Destination</dt><dd className="mt-1 flex items-center gap-2 font-medium"><span className="grid size-7 place-items-center rounded-lg bg-indigo-50 text-[10px] font-bold text-indigo-700">{item.organizationInitials}</span>{item.organization}</dd></div>
              <div><dt className="text-xs font-medium text-slate-500">Type</dt><dd className="mt-1 font-medium">{typeLabels[item.type]}</dd></div>
              <div><dt className="text-xs font-medium text-slate-500">Submitted</dt><dd className="mt-1 font-medium">{formatFeedbackDate(item.submittedAt)}</dd></div>
              <div><dt className="text-xs font-medium text-slate-500">Source page</dt><dd className="mt-1 break-words"><a className="font-medium text-teal-700 underline decoration-teal-200 underline-offset-3" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.pageTitle}</a></dd></div>
            </dl>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Progress</h2>
            <ol className="mt-5 space-y-0">
              {history.map((event, index) => <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0"><div className="relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">✓</div>{index < history.length - 1 && <span className="absolute left-3.25 top-7 h-full w-px bg-slate-200" />}<div><p className="text-sm font-medium">{event.label}</p><p className="mt-0.5 text-xs text-slate-500">{event.date}</p>{event.note && <p className="mt-1 text-xs text-teal-700">{event.note}</p>}</div></li>)}
            </ol>
            <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">Current status: <strong className="text-slate-700">{statusLabels[item.status as FeedbackStatus]}</strong></p>
          </section>
        </aside>
      </div>
    </main>
  );
}
