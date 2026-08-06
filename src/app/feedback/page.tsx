import type { Metadata } from "next";
import Link from "next/link";
import { FeedbackCard } from "@/components/feedback-card";
import { formatFeedbackDate } from "@/features/feedback/presentation";
import { currentUserFeedback } from "@/features/feedback/mock-data";
import { listOwnFeedback, type UserFeedbackSummary } from "@/features/feedback/server";
import { getSupabaseEnvironmentStatus } from "@/lib/env";

export const metadata: Metadata = { title: "My feedback" };

export default async function FeedbackPage() {
  const demoMode = getSupabaseEnvironmentStatus() !== "configured";
  let items: UserFeedbackSummary[] = currentUserFeedback;
  let queryFailed = false;

  if (!demoMode) {
    const result = await listOwnFeedback();
    if (result.status === "ok") items = result.data;
    else {
      items = [];
      queryFailed = true;
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-700">Your feedback loop</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">My feedback</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Track what you have shared and see the latest updates from product teams.</p>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 sm:hidden" href="/feedback/new">Share new feedback</Link>
        </div>

        <div className="mt-8 grid gap-4">
          {queryFailed ? (
            <div className="rounded-2xl border border-rose-200 bg-white px-6 py-12 text-center" role="alert">
              <h2 className="text-lg font-semibold text-slate-950">We could not load your feedback</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">Your records were not replaced with sample data. Please refresh and try again.</p>
              <Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50" href="/feedback">Try again</Link>
            </div>
          ) : items.length > 0 ? items.map((item) => <FeedbackCard key={item.id} item={{ ...item, submittedAt: formatFeedbackDate(item.submittedAt), officialResponse: item.officialResponse ? { ...item.officialResponse, date: formatFeedbackDate(item.officialResponse.date) } : undefined }} />) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-teal-50 text-lg text-teal-700" aria-hidden="true">＋</span>
              <h2 className="mt-4 text-lg font-semibold">No feedback yet</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">Share an idea, issue, or confusing experience and it will appear here.</p>
              <Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700" href="/feedback/new">Share feedback</Link>
            </div>
          )}
        </div>

        {demoMode && <aside className="mt-10 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <strong className="font-semibold">Prototype note:</strong> These are realistic sample records. Local changes reset when you leave a page.
        </aside>}
    </main>
  );
}
