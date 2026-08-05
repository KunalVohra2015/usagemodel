import type { Metadata } from "next";
import { Inbox } from "./inbox";

export const metadata: Metadata = { title: "Acme feedback inbox" };

export default function DashboardPage() {
  return (
    <>
      <div className="border-b border-slate-200 bg-white px-4 py-5 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-7xl"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Product workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Feedback inbox</h1><p className="mt-1 text-sm text-slate-500">Understand what customers need and close the loop.</p></div><div className="inline-flex items-center gap-2 self-start rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" /> Mock data connected</div></div></div>
      </div>
      <div className="mx-auto max-w-7xl p-4 sm:p-7 lg:p-10"><Inbox /></div>
    </>
  );
}
