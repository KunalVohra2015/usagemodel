import type { Metadata } from "next";
import { selectCompanyBySlug } from "@/features/organizations/directory";
import { listDirectoryCompanies } from "@/features/organizations/server";
import { getSupabaseEnvironmentStatus } from "@/lib/env";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = { title: "Share feedback" };

export default async function NewFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string | string[] }>;
}) {
  const companies = await listDirectoryCompanies();
  const requestedSlug = (await searchParams).company;
  const initialCompany = selectCompanyBySlug(companies, requestedSlug) ?? companies[0];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <p className="text-sm font-semibold text-teal-700">Share product feedback</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Tell us what could be better.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Choose an existing company or add a missing one using its website. Required fields are marked with an asterisk.</p>
        </div>
        <FeedbackForm companies={companies} initialCompanyId={initialCompany?.id} demoMode={getSupabaseEnvironmentStatus() !== "configured"} />
    </main>
  );
}
