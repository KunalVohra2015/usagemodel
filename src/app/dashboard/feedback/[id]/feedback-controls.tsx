"use client";

import { FormEvent, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { feedbackStatuses, statusLabels, type FeedbackStatus } from "@/features/feedback/types";

export function FeedbackControls({ initialStatus, initialResponse }: { initialStatus: FeedbackStatus; initialResponse?: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [savedStatus, setSavedStatus] = useState(initialStatus);
  const [response, setResponse] = useState(initialResponse ?? "");
  const [savedResponse, setSavedResponse] = useState(initialResponse ?? "");
  const [message, setMessage] = useState("");

  function saveStatus() {
    setSavedStatus(status);
    setMessage(`Status updated to ${statusLabels[status]}.`);
    window.setTimeout(() => setMessage(""), 3500);
  }

  function saveResponse(event: FormEvent) {
    event.preventDefault();
    if (!response.trim()) return;
    setSavedResponse(response.trim());
    setMessage(initialResponse ? "Official response updated." : "Official response published.");
    window.setTimeout(() => setMessage(""), 3500);
  }

  return (
    <div className="space-y-5">
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status"><span className="mr-2" aria-hidden="true">✓</span>{message} <span className="font-normal">Mock change only.</span></div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Status</h2><StatusBadge status={savedStatus} /></div>
        <label className="mt-5 block text-xs font-semibold text-slate-600" htmlFor="feedback-status">Update status</label>
        <select id="feedback-status" value={status} onChange={(event) => setStatus(event.target.value as FeedbackStatus)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-100">
          {feedbackStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
        </select>
        <button type="button" onClick={saveStatus} disabled={status === savedStatus} className="mt-3 min-h-10 w-full rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">Save status</button>
        <p className="mt-3 text-xs leading-5 text-slate-500">Administrators can move directly between any valid statuses.</p>
      </section>

      <form onSubmit={saveResponse} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Official response</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Visible to the submitter as Acme Software’s official update.</p>
        <label className="sr-only" htmlFor="official-response">Response</label>
        <textarea id="official-response" value={response} onChange={(event) => setResponse(event.target.value)} rows={7} placeholder="Explain what Acme is doing and what the submitter can expect next…" className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm leading-6 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-100" />
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500"><span>{response.length}/2,000</span>{!response.trim() && <span className="text-amber-700">Response cannot be empty</span>}</div>
        <button type="submit" disabled={!response.trim() || response.trim() === savedResponse} className="mt-4 min-h-10 w-full rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{initialResponse ? "Update response" : "Publish response"}</button>
      </form>
    </div>
  );
}
