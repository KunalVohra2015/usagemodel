import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrganizationMemberships,
  getVerifiedIdentity,
} from "@/features/auth/server";
import { selectAuthorizedOrganization } from "@/features/dashboard/authorization";
import { selectOfficialResponseBody } from "@/features/dashboard/detail-presentation";
import { getOrganizationFeedbackDetail } from "@/features/dashboard/server";
import type { DashboardFeedbackDetail } from "@/features/dashboard/types";
import { getFeedbackById } from "@/features/feedback/mock-data";
import { formatFeedbackDate, statusHistoryLabel } from "@/features/feedback/presentation";
import { typeLabels } from "@/features/feedback/types";
import { getSupabaseEnvironmentStatus } from "@/lib/env";
import { FeedbackControls } from "./feedback-controls";

export const metadata: Metadata = { title: "Review feedback" };

export default async function DashboardFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organization?: string | string[] }>;
}) {
  const { id } = await params;
  const demoMode = getSupabaseEnvironmentStatus() !== "configured";
  const mockItem = demoMode ? getFeedbackById(id) : null;
  if (demoMode && !mockItem) notFound();

  let realItem: DashboardFeedbackDetail | null = null;
  let membership = null as ReturnType<typeof selectAuthorizedOrganization>;
  if (!demoMode) {
    const identity = await getVerifiedIdentity();
    if (!identity) notFound();
    membership = selectAuthorizedOrganization(
      await getOrganizationMemberships(identity.id),
      (await searchParams).organization,
    );
    if (!membership) notFound();
    const result = await getOrganizationFeedbackDetail(membership.organizationId, id);
    if (result.status === "not_found") notFound();
    if (result.status === "error") {
      return <main className="mx-auto max-w-3xl p-8 text-center"><h1 className="text-2xl font-semibold">We could not load this feedback</h1><p className="mt-2 text-sm text-slate-500">No demo record was substituted. Refresh and try again.</p><Link href="/dashboard" className="mt-6 inline-flex rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold">Return to inbox</Link></main>;
    }
    realItem = result.data;
  }

  const view = realItem
    ? {
        item: realItem,
        organizationName: realItem.organizationName,
        createdAt: realItem.createdAt,
        submitter: realItem.submitter,
        history: realItem.history.map((event) => ({
          id: event.id,
          label: statusHistoryLabel(event.newStatus, event.previousStatus === null),
          date: formatFeedbackDate(event.createdAt),
        })).reverse(),
        officialResponseBody: selectOfficialResponseBody(realItem, null),
        hasDemoScreenshot: false,
      }
    : (() => {
        if (!mockItem) notFound();
        return {
          item: mockItem,
          organizationName: mockItem.organization,
          createdAt: mockItem.submittedAt,
          submitter: {
            displayName: mockItem.submitter.name,
            initials: mockItem.submitter.initials,
          },
          history: [...mockItem.timeline].reverse().map((event, index) => ({
            id: `${event.status}-${index}`,
            label: event.label,
            date: event.note ? `${event.date} · ${event.note}` : event.date,
          })),
          officialResponseBody: selectOfficialResponseBody(null, mockItem),
          hasDemoScreenshot: mockItem.hasScreenshot,
        };
      })();
  const {
    item,
    organizationName,
    createdAt,
    submitter,
    history,
    officialResponseBody,
    hasDemoScreenshot,
  } = view;
  const inboxHref = membership
    ? `/dashboard?organization=${encodeURIComponent(membership.organizationId)}`
    : "/dashboard";

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-7 lg:px-10"><div className="mx-auto max-w-7xl"><Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700" href={inboxHref}><span aria-hidden="true">←</span> Feedback inbox</Link></div></div>
      <main className="mx-auto grid max-w-7xl items-start gap-6 p-4 sm:p-7 xl:grid-cols-[minmax(0,1fr)_22rem] lg:p-10">
        <div className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500"><span className="rounded-md bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">{typeLabels[item.type]}</span><span>#{item.id.slice(0, 8)}</span><span>·</span><span>Submitted {formatFeedbackDate(createdAt)}</span></div>
              <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{item.title}</h1>
              <div className="mt-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">{submitter.initials}</span><div><p className="text-sm font-semibold">{submitter.displayName}</p><p className="text-xs text-slate-500">Submitter display name · Email is not exposed</p></div></div>
            </header>
            <div className="p-5 sm:p-7">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer description</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.description}</p>
              {item.selectedText && <div className="mt-6"><h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected webpage text</h2><blockquote className="mt-2 whitespace-pre-wrap border-l-3 border-indigo-400 bg-indigo-50/60 px-4 py-3 text-sm italic leading-6 text-slate-700">“{item.selectedText}”</blockquote></div>}
              {realItem?.screenshotUrl && <div className="mt-6"><h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Private screenshot</h2><a href={realItem.screenshotUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-indigo-700">Open authorized screenshot</a><p className="mt-1 text-xs text-slate-500">This private link expires shortly.</p></div>}
              {hasDemoScreenshot && <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-xs font-semibold text-slate-500">Private demo screenshot</div>}
            </div>
          </article>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-sm font-semibold">Page context</h2>
            <dl className="mt-4 grid gap-5 text-sm sm:grid-cols-2"><div><dt className="text-xs font-medium text-slate-500">Destination</dt><dd className="mt-1 font-medium">{organizationName}</dd></div><div><dt className="text-xs font-medium text-slate-500">Page title</dt><dd className="mt-1 font-medium">{item.pageTitle}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-medium text-slate-500">Source URL</dt><dd className="mt-1 break-all"><a className="font-medium text-indigo-700 underline decoration-indigo-200 underline-offset-3" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceUrl}</a></dd></div></dl>
          </section>

          {officialResponseBody && <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm sm:p-7"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Official {organizationName} response</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-teal-950">{officialResponseBody}</p></section>}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-sm font-semibold">Activity</h2>
            <ol className="mt-5 space-y-5">{history.map((event) => <li key={event.id} className="flex gap-3"><span className="mt-1 size-2 shrink-0 rounded-full bg-indigo-500" /><div><p className="text-sm font-medium text-slate-800">{event.label}</p><p className="mt-0.5 text-xs text-slate-500">{event.date}</p></div></li>)}</ol>
          </section>
        </div>
        <aside className="xl:sticky xl:top-6"><FeedbackControls feedbackId={item.id} initialStatus={item.status} initialResponse={officialResponseBody} canManageStatus={demoMode || membership?.role === "admin"} demoMode={demoMode} /></aside>
      </main>
    </>
  );
}
