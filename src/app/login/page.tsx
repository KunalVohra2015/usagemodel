import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-[#f7faf8] lg:grid-cols-2">
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16">
        <Brand />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-16">
          <div className="mb-8">
            <p className="text-sm font-semibold text-teal-700">Welcome back</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Your feedback, all in one place.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Sign in to share feedback and follow what product teams do with it.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-7">
            <button type="button" className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50" aria-describedby="prototype-note">
              <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-[conic-gradient(from_-45deg,#4285f4_0_25%,#34a853_0_50%,#fbbc05_0_75%,#ea4335_0)] text-[10px] font-bold text-white">G</span>
              Continue with Google
            </button>
            <p id="prototype-note" className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs leading-5 text-amber-800">Prototype only — Google sign-in is not connected yet.</p>
            <p className="mt-5 text-center text-xs leading-5 text-slate-500">By continuing, you agree to the pilot terms and privacy notice.</p>
          </div>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs">
            <Link className="font-medium text-slate-600 hover:text-teal-700" href="/feedback">Preview user view</Link>
            <span className="text-slate-300">•</span>
            <Link className="font-medium text-slate-600 hover:text-teal-700" href="/dashboard">Preview team view</Link>
          </div>
        </div>
      </section>
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(45,212,191,.22),transparent_30%),radial-gradient(circle_at_10%_80%,rgba(99,102,241,.25),transparent_35%)]" />
        <p className="relative text-sm font-medium text-teal-300">A better feedback experience</p>
        <div className="relative max-w-lg">
          <blockquote className="text-3xl font-medium leading-tight tracking-[-0.03em]">“I didn’t just submit an idea. I could see when Acme reviewed it, planned it, and shipped it.”</blockquote>
          <div className="mt-8 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-white/10 text-xs font-bold">MC</span><div><p className="text-sm font-semibold">Maya Chen</p><p className="text-xs text-slate-400">Pilot customer</p></div></div>
        </div>
        <p className="relative text-xs text-slate-500">Secure authentication will be added in the implementation phase.</p>
      </section>
    </main>
  );
}
