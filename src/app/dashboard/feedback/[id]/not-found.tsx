import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";

export default function DashboardFeedbackNotFound() {
  return <DashboardShell><main className="grid min-h-screen place-items-center p-6 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">!</span><h1 className="mt-5 text-2xl font-semibold">Feedback record not found</h1><p className="mt-2 text-sm text-slate-500">The record may have been removed or the link is incorrect.</p><Link className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white" href="/dashboard">Return to inbox</Link></div></main></DashboardShell>;
}
