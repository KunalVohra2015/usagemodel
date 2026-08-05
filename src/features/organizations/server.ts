import "server-only";

import { cache } from "react";
import { getSupabaseEnvironmentStatus } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getMockDirectoryCompanies } from "./mock-directory";
import { getCompanyBySlug } from "./directory";
import type { CompanyClaimStatus, DirectoryCompany } from "./types";

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  website_url: string;
  normalized_domain: string;
  claim_status: CompanyClaimStatus;
};

export function companyFromRow(row: CompanyRow): DirectoryCompany {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    websiteUrl: row.website_url,
    normalizedDomain: row.normalized_domain,
    claimStatus: row.claim_status,
  };
}

export const listDirectoryCompanies = cache(async (): Promise<DirectoryCompany[]> => {
  if (getSupabaseEnvironmentStatus() !== "configured") return getMockDirectoryCompanies();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, website_url, normalized_domain, claim_status")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error("Company directory could not be loaded.");
  return (data as CompanyRow[]).map(companyFromRow);
});

export const getPublicCompanyBySlug = cache(
  async (slug: string): Promise<DirectoryCompany | null> => {
    if (getSupabaseEnvironmentStatus() !== "configured") {
      return getCompanyBySlug(getMockDirectoryCompanies(), slug) ?? null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc("get_public_company_by_slug", { company_slug: slug })
      .maybeSingle();
    if (error || !data) return null;
    return companyFromRow(data as CompanyRow);
  },
);

export async function getPublicCompanyByDomain(domain: string) {
  if (getSupabaseEnvironmentStatus() !== "configured") {
    return getMockDirectoryCompanies().find((company) => company.normalizedDomain === domain) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_public_company_by_domain", { company_domain: domain })
    .maybeSingle();
  if (error || !data) return null;
  return companyFromRow(data as CompanyRow);
}
