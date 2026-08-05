import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFeedbackById } from "@/features/feedback/mock-data";
import { typeLabels } from "@/features/feedback/types";
import { FeedbackControls } from "./feedback-controls";

export const metadata: Metadata = { title: "Review feedback" };

export default async function DashboardFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getFeedbackById(id);
  if (!item) notFound();

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-7 lg:px-10"><div className="mx-auto max-w-7xl"><Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700" href="/dashboard"><span aria-hidden="true">←</span> Feedback inbox</Link></div></div>
      <main className="mx-auto grid max-w-7xl items-start gap-6 p-4 sm:p-7 xl:grid-cols-[minmax(0,1fr)_22rem] lg:p-10">
        <div className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500"><span className="rounded-md bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">{typeLabels[item.type]}</span><span>#{item.id.replace("fb-", "")}</span><span>·</span><span>Submitted {item.submittedAt}</span></div>
              <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{item.title}</h1>
              <div className="mt-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">{item.submitter.initials}</span><div><p className="text-sm font-semibold">{item.submitter.name}</p><p className="text-xs text-slate-500">{item.submitter.email} · Visible because you are an administrator</p></div></div>
            </header>
            <div className="p-5 sm:p-7">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer description</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">{item.description}</p>
              {item.selectedText && <div className="mt-6"><h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected webpage text</h2><blockquote className="mt-2 border-l-3 border-indigo-400 bg-indigo-50/60 px-4 py-3 text-sm italic leading-6 text-slate-700">“{item.selectedText}”</blockquote></div>}
              {item.hasScreenshot && <div className="mt-6"><h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Screenshot</h2><div className="mt-2 overflow-hidden rounded-xl border border-slate-200"><div className="flex h-9 items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3"><span className="size-2 rounded-full bg-rose-300" /><span className="size-2 rounded-full bg-amber-300" /><span className="size-2 rounded-full bg-emerald-300" /></div><div className="grid min-h-56 place-items-center bg-[linear-gradient(135deg,#f8fafc_25%,#eef2ff_25%,#eef2ff_50%,#f8fafc_50%,#f8fafc_75%,#eef2ff_75%)] bg-[length:32px_32px]"><div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center shadow-sm"><p className="text-xs font-semibold text-slate-700">Customer screenshot</p><p className="mt-1 text-[11px] text-slate-400">Private mock attachment</p></div></div></div></div>}
            </div>
          </article>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-sm font-semibold">Page context</h2>
            <dl className="mt-4 grid gap-5 text-sm sm:grid-cols-2"><div><dt className="text-xs font-medium text-slate-500">Page title</dt><dd className="mt-1 font-medium">{item.pageTitle}</dd></div><div><dt className="text-xs font-medium text-slate-500">Source URL</dt><dd className="mt-1 break-all"><a className="font-medium text-indigo-700 underline decoration-indigo-200 underline-offset-3" href={item.sourceUrl}>{item.sourceUrl}</a></dd></div></dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-sm font-semibold">Activity</h2>
            <ol className="mt-5 space-y-5">{[...item.timeline].reverse().map((event) => <li key={`${event.status}-${event.date}`} className="flex gap-3"><span className="mt-1 size-2 shrink-0 rounded-full bg-indigo-500" /><div><p className="text-sm font-medium text-slate-800">{event.label}</p><p className="mt-0.5 text-xs text-slate-500">{event.date}{event.note ? ` · ${event.note}` : ""}</p></div></li>)}</ol>
          </section>
        </div>
        <aside className="xl:sticky xl:top-6"><FeedbackControls initialStatus={item.status} initialResponse={item.officialResponse?.body} /></aside>
      </main>
    </>
  );
}
