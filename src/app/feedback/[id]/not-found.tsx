import Link from "next/link";

export default function FeedbackNotFound() {
  return <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-4 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">!</span><h1 className="mt-5 text-2xl font-semibold">Feedback not found</h1><p className="mt-2 text-sm leading-6 text-slate-600">This sample record may not exist, or the link may be incorrect.</p><Link className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white" href="/feedback">Return to my feedback</Link></div></main>;
}
