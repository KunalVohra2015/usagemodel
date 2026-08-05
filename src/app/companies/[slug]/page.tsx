import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";
import { getPublicCompanyBySlug } from "@/features/organizations/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const company = await getPublicCompanyBySlug((await params).slug);
  return { title: company ? `${company.name} feedback` : "Company not found" };
}
export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const company = await getPublicCompanyBySlug((await params).slug);
  if (!company) notFound();

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Sign in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-11">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Company directory</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">{company.name}</h1>
              <a href={company.websiteUrl} rel="noreferrer" target="_blank" className="mt-3 inline-flex text-sm font-medium text-slate-600 hover:text-teal-700">
                {company.normalizedDomain}<span className="ml-1" aria-hidden="true">↗</span>
              </a>
            </div>
            <span className={`self-start rounded-full px-3 py-1.5 text-xs font-bold capitalize ${company.claimStatus === "unclaimed" ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"}`}>
              {company.claimStatus}
            </span>
          </div>

          <div className="mt-10 rounded-2xl border border-teal-100 bg-teal-50/60 p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Have feedback for {company.name}?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Share product feedback privately. Feedback content, submitter details, responses, and screenshots are never shown on this public page.</p>
            <Link href={`/feedback/new?company=${encodeURIComponent(company.slug)}`} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700">
              Submit feedback
            </Link>
          </div>

          {company.claimStatus === "unclaimed" && (
            <p className="mt-6 text-xs leading-5 text-slate-500">Unclaimed means this directory entry has not yet been connected to a verified product team. Creating an entry does not grant company access.</p>
          )}
        </div>
      </main>
    </div>
  );
}
