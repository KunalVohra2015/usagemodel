import Link from "next/link";
import { Brand } from "@/components/brand";

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#fbfcfa] text-slate-950">
      <header className="relative z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <nav aria-label="Main navigation" className="flex items-center gap-2">
            <Link className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950" href="/login">Sign in</Link>
            <Link className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800" href="/feedback/new">Share feedback</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative isolate">
          <div className="absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(circle_at_75%_20%,rgba(45,212,191,0.18),transparent_28%),radial-gradient(circle_at_15%_35%,rgba(129,140,248,0.15),transparent_28%)]" />
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:py-32">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
                <span className="size-1.5 rounded-full bg-teal-500" /> Feedback that goes somewhere
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-balance sm:text-6xl">
                Close the loop between customer feedback and product decisions.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Loopline gives customers a clear place to share what matters—and gives product teams a trustworthy way to respond, plan, and follow through.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700" href="/feedback/new">
                  Share product feedback <span className="ml-2" aria-hidden="true">→</span>
                </Link>
                <Link className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50" href="/dashboard">
                  Preview Acme dashboard
                </Link>
              </div>
              <p className="mt-4 text-xs text-slate-500">Visual prototype · No account or setup required</p>
            </div>

            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="absolute -inset-5 -z-10 rotate-2 rounded-[2rem] bg-indigo-100/70" />
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10 sm:p-7">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Your feedback</p><p className="mt-1 font-semibold">Weekly report scheduling</p></div>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">Planned</span>
                </div>
                <div className="py-6">
                  <p className="text-sm leading-6 text-slate-600">“Let me schedule reports for Monday mornings so my team always has the latest version.”</p>
                  <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-lg bg-indigo-600 text-xs font-bold text-white">AS</span>
                      <div><p className="text-sm font-semibold text-slate-900">Acme Software responded</p><p className="text-xs text-slate-500">August 3</p></div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">This fits the reporting automation work already on our roadmap. We’ve moved it into planning.</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-5 text-center">
                  {[['1', 'Submitted'], ['2', 'Reviewed'], ['3', 'Planned']].map(([number, label], index) => (
                    <div key={number} className="relative">
                      <span className={`mx-auto grid size-7 place-items-center rounded-full text-xs font-bold ${index === 2 ? "bg-violet-600 text-white" : "bg-teal-100 text-teal-700"}`}>{index === 2 ? number : "✓"}</span>
                      <p className="mt-2 text-[11px] font-medium text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3">
            {[
              ["01", "One clear destination", "Capture the page, context, and exact words behind every piece of feedback."],
              ["02", "A shared source of truth", "Product teams see feedback in one private inbox instead of scattered channels."],
              ["03", "Visible follow-through", "Customers can return anytime to see the latest status and official response."],
            ].map(([number, title, copy]) => (
              <div key={number} className="border-l border-slate-200 pl-5">
                <p className="text-xs font-bold tracking-widest text-teal-600">{number}</p>
                <h2 className="mt-3 text-lg font-semibold tracking-tight">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Brand /><p>Built to make every customer voice count.</p>
      </footer>
    </div>
  );
}
