import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { UserShell } from "@/components/user-shell";
import { getFeedbackById } from "@/features/feedback/mock-data";
import { statusLabels, typeLabels } from "@/features/feedback/types";

export const metadata: Metadata = { title: "Feedback details" };

export default async function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getFeedbackById(id);
  if (!item) notFound();

  return (
    <UserShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-700" href="/feedback"><span aria-hidden="true">←</span> Back to my feedback</Link>
        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center gap-2"><StatusBadge status={item.status} /><span className="text-xs text-slate-500">Updated {item.updatedAt}</span></div>
              <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{item.title}</h1>
              <p className="mt-5 text-sm leading-7 text-slate-700">{item.description}</p>
              {item.selectedText && <blockquote className="mt-6 border-l-3 border-teal-400 bg-teal-50/60 px-4 py-3 text-sm italic leading-6 text-slate-700">“{item.selectedText}”</blockquote>}
              {item.hasScreenshot && <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"><div className="flex h-10 items-center gap-1.5 border-b border-slate-200 bg-white px-4"><span className="size-2.5 rounded-full bg-rose-300" /><span className="size-2.5 rounded-full bg-amber-300" /><span className="size-2.5 rounded-full bg-emerald-300" /></div><div className="grid min-h-44 place-items-center bg-[linear-gradient(135deg,#f8fafc_25%,#eef2ff_25%,#eef2ff_50%,#f8fafc_50%,#f8fafc_75%,#eef2ff_75%)] bg-[length:32px_32px]"><span className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm">Screenshot preview</span></div></div>}
            </article>

            <section className={`rounded-2xl border p-5 sm:p-7 ${item.officialResponse ? "border-teal-200 bg-teal-50/60" : "border-dashed border-slate-300 bg-white"}`}>
              <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-xs font-bold text-white">AS</span><div><h2 className="font-semibold">Official response from Acme</h2>{item.officialResponse && <p className="text-xs text-slate-500">{item.officialResponse.author} · {item.officialResponse.date}</p>}</div></div>
              {item.officialResponse ? <p className="mt-4 text-sm leading-7 text-slate-700">{item.officialResponse.body}</p> : <p className="mt-4 text-sm leading-6 text-slate-600">Acme has not posted a response yet. You will see it here when they do.</p>}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold">Feedback details</h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div><dt className="text-xs font-medium text-slate-500">Destination</dt><dd className="mt-1 flex items-center gap-2 font-medium"><span className="grid size-7 place-items-center rounded-lg bg-indigo-50 text-[10px] font-bold text-indigo-700">AS</span>{item.organization}</dd></div>
                <div><dt className="text-xs font-medium text-slate-500">Type</dt><dd className="mt-1 font-medium">{typeLabels[item.type]}</dd></div>
                <div><dt className="text-xs font-medium text-slate-500">Submitted</dt><dd className="mt-1 font-medium">{item.submittedAt}</dd></div>
                <div><dt className="text-xs font-medium text-slate-500">Source page</dt><dd className="mt-1 break-words"><a className="font-medium text-teal-700 underline decoration-teal-200 underline-offset-3" href={item.sourceUrl}>{item.pageTitle}</a></dd></div>
              </dl>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold">Progress</h2>
              <ol className="mt-5 space-y-0">
                {item.timeline.map((event, index) => <li key={`${event.status}-${event.date}`} className="relative flex gap-3 pb-6 last:pb-0"><div className="relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">✓</div>{index < item.timeline.length - 1 && <span className="absolute left-3.25 top-7 h-full w-px bg-slate-200" />}<div><p className="text-sm font-medium">{event.label}</p><p className="mt-0.5 text-xs text-slate-500">{event.date}</p>{event.note && <p className="mt-1 text-xs text-teal-700">{event.note}</p>}</div></li>)}
              </ol>
              <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">Current status: <strong className="text-slate-700">{statusLabels[item.status]}</strong></p>
            </section>
          </aside>
        </div>
      </main>
    </UserShell>
  );
}
