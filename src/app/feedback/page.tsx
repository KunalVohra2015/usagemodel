import type { Metadata } from "next";
import Link from "next/link";
import { FeedbackCard } from "@/components/feedback-card";
import { currentUserFeedback } from "@/features/feedback/mock-data";

export const metadata: Metadata = { title: "My feedback" };

export default function FeedbackPage() {
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
          {currentUserFeedback.length > 0 ? currentUserFeedback.map((item) => <FeedbackCard key={item.id} item={item} />) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-teal-50 text-lg text-teal-700" aria-hidden="true">＋</span>
              <h2 className="mt-4 text-lg font-semibold">No feedback yet</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">Share an idea, issue, or confusing experience and it will appear here.</p>
            </div>
          )}
        </div>

        <aside className="mt-10 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <strong className="font-semibold">Prototype note:</strong> These are realistic sample records. Local changes reset when you leave a page.
        </aside>
    </main>
  );
}
