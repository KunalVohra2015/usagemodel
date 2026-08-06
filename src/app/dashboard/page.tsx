import type { Metadata } from "next";
import {
  getOrganizationMemberships,
  getVerifiedIdentity,
} from "@/features/auth/server";
import { selectAuthorizedOrganization } from "@/features/dashboard/authorization";
import { listOrganizationFeedback } from "@/features/dashboard/server";
import type { DashboardFeedbackSummary } from "@/features/dashboard/types";
import { mockFeedback } from "@/features/feedback/mock-data";
import { getSupabaseEnvironmentStatus } from "@/lib/env";
import { Inbox } from "./inbox";

export const metadata: Metadata = { title: "Product feedback inbox" };

const mockItems: DashboardFeedbackSummary[] = mockFeedback.map((item) => ({
  id: item.id,
  title: item.title,
  description: item.description,
  type: item.type,
  status: item.status,
  createdAt: item.submittedAt,
  pageTitle: item.pageTitle,
  sourceUrl: item.sourceUrl,
  hasScreenshot: item.hasScreenshot,
  submitter: {
    displayName: item.submitter.name,
    initials: item.submitter.initials,
  },
  officialResponse: item.officialResponse
    ? { body: item.officialResponse.body, createdAt: item.officialResponse.date }
    : null,
}));

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ organization?: string | string[] }>;
}) {
  const demoMode = getSupabaseEnvironmentStatus() !== "configured";
  let items = mockItems;
  let memberships = [] as Awaited<ReturnType<typeof getOrganizationMemberships>>;
  let selectedOrganization = null as ReturnType<typeof selectAuthorizedOrganization>;
  let queryFailed = false;

  if (!demoMode) {
    const identity = await getVerifiedIdentity();
    if (identity) memberships = await getOrganizationMemberships(identity.id);
    selectedOrganization = selectAuthorizedOrganization(
      memberships,
      (await searchParams).organization,
    );
    if (selectedOrganization) {
      const result = await listOrganizationFeedback(selectedOrganization.organizationId);
      if (result.status === "ok") items = result.data;
      else {
        items = [];
        queryFailed = true;
      }
    } else {
      items = [];
      queryFailed = true;
    }
  }

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-4 py-5 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Product workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Feedback inbox</h1><p className="mt-1 text-sm text-slate-500">{selectedOrganization?.organizationName ?? "Acme Software"} · Understand what customers need and close the loop.</p></div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${demoMode ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}><span className={`size-2 rounded-full ${demoMode ? "bg-amber-500" : "bg-emerald-500"}`} />{demoMode ? "Demo data · not saved" : "Live organization data"}</div>
              {!demoMode && memberships.length > 1 && <form method="get" className="flex items-center gap-2"><label className="text-xs font-semibold text-slate-600" htmlFor="organization-workspace">Organization</label><select id="organization-workspace" name="organization" defaultValue={selectedOrganization?.organizationId} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium">{memberships.map((membership) => <option key={membership.organizationId} value={membership.organizationId}>{membership.organizationName}</option>)}</select><button className="min-h-10 rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white" type="submit">Open</button></form>}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl p-4 sm:p-7 lg:p-10">
        {queryFailed ? <section className="rounded-2xl border border-rose-200 bg-white px-6 py-16 text-center" role="alert"><h2 className="text-lg font-semibold">We could not load this organization’s inbox</h2><p className="mt-2 text-sm text-slate-500">No demo records were substituted. Refresh and try again.</p></section> : <Inbox items={items} organizationId={selectedOrganization?.organizationId} />}
      </div>
    </>
  );
}
