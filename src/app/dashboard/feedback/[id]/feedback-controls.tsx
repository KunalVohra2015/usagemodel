"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { feedbackStatuses, statusLabels, type FeedbackStatus } from "@/features/feedback/types";
import { publishOfficialResponse, updateFeedbackStatus } from "./actions";

export function FeedbackControls({
  feedbackId,
  initialStatus,
  initialResponse,
  canManageStatus,
  demoMode,
}: {
  feedbackId: string;
  initialStatus: FeedbackStatus;
  initialResponse?: string;
  canManageStatus: boolean;
  demoMode: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [savedStatus, setSavedStatus] = useState(initialStatus);
  const [response, setResponse] = useState("");
  const [publishedResponse, setPublishedResponse] = useState(initialResponse ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function showSuccess(value: string) {
    setError("");
    setMessage(value);
    window.setTimeout(() => setMessage(""), 3500);
  }

  function saveStatus() {
    if (isPending || status === savedStatus || !canManageStatus) return;
    if (demoMode) {
      setSavedStatus(status);
      showSuccess(`Status updated to ${statusLabels[status]}. Demo change only.`);
      return;
    }
    startTransition(async () => {
      const result = await updateFeedbackStatus(feedbackId, status);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSavedStatus(status);
      showSuccess(result.message);
      router.refresh();
    });
  }

  function saveResponse(event: FormEvent) {
    event.preventDefault();
    if (isPending || !response.trim() || publishedResponse) return;
    if (demoMode) {
      setPublishedResponse(response.trim());
      showSuccess("Official response published. Demo change only.");
      return;
    }
    startTransition(async () => {
      const result = await publishOfficialResponse(feedbackId, response);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPublishedResponse(response.trim());
      setResponse("");
      showSuccess(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status"><span className="mr-2" aria-hidden="true">✓</span>{message}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">{error}</div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Status</h2><StatusBadge status={savedStatus} /></div>
        <label className="mt-5 block text-xs font-semibold text-slate-600" htmlFor="feedback-status">Update status</label>
        <select id="feedback-status" value={status} disabled={!canManageStatus || isPending} onChange={(event) => { setStatus(event.target.value as FeedbackStatus); setError(""); }} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100">
          {feedbackStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
        </select>
        <button type="button" onClick={saveStatus} disabled={!canManageStatus || isPending || status === savedStatus} className="mt-3 min-h-10 w-full rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{isPending ? "Saving…" : "Save status"}</button>
        <p className="mt-3 text-xs leading-5 text-slate-500">{canManageStatus ? "Administrators can move directly between any valid statuses." : "Only organization administrators can change status."}</p>
      </section>

      <form onSubmit={saveResponse} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Official response</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Visible to the submitter as the organization’s official update.</p>
        {publishedResponse ? <div className="mt-4 rounded-xl bg-teal-50 p-4 text-sm leading-6 text-teal-900"><p>{publishedResponse}</p><p className="mt-2 text-xs text-teal-700">Published responses are read-only in this slice.</p></div> : <><label className="sr-only" htmlFor="official-response">Response</label><textarea id="official-response" value={response} maxLength={10000} onChange={(event) => { setResponse(event.target.value); setError(""); }} rows={7} placeholder="Explain what the product team is doing and what the submitter can expect next…" className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm leading-6 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-100" /><div className="mt-2 flex items-center justify-between text-[11px] text-slate-500"><span>{response.length}/10,000</span>{!response.trim() && <span className="text-amber-700">Response cannot be empty</span>}</div><button type="submit" disabled={isPending || !response.trim()} className="mt-4 min-h-10 w-full rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{isPending ? "Publishing…" : "Publish response"}</button></>}
      </form>
    </div>
  );
}
