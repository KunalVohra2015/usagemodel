import type { NormalizedWebsite } from "./domain-normalization";
import type { DirectoryCompany } from "./types";

export function companySlugBase(name: string) {
  const base = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
  return base.length >= 2 ? base : "company";
}

function stableDomainHash(domain: string) {
  let hash = 2166136261;
  for (const character of domain) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function uniqueMockCompanySlug(
  name: string,
  normalizedDomain: string,
  companies: DirectoryCompany[],
) {
  const base = companySlugBase(name);
  const existingSlugs = new Set(companies.map((company) => company.slug));
  if (!existingSlugs.has(base)) return base;

  const suffix = stableDomainHash(normalizedDomain);
  const candidate = `${base}-${suffix}`;
  if (!existingSlugs.has(candidate)) return candidate;

  let discriminator = 2;
  while (existingSlugs.has(`${candidate}-${discriminator}`)) discriminator += 1;
  return `${candidate}-${discriminator}`;
}

export function createOrReuseDirectoryCompany(
  companies: DirectoryCompany[],
  name: string,
  normalized: NormalizedWebsite,
) {
  const existing = companies.find(
    (company) => company.normalizedDomain === normalized.normalizedDomain,
  );
  if (existing) {
    return { company: existing, created: false, companies };
  }

  const company: DirectoryCompany = {
    id: `demo-${normalized.normalizedDomain}`,
    name,
    slug: uniqueMockCompanySlug(name, normalized.normalizedDomain, companies),
    websiteUrl: normalized.websiteUrl,
    normalizedDomain: normalized.normalizedDomain,
    claimStatus: "unclaimed",
  };
  return { company, created: true, companies: [...companies, company] };
}

export function searchDirectoryCompanies(
  companies: DirectoryCompany[],
  query: string,
) {
  const term = query.trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "");
  if (!term) return companies;
  return companies.filter(
    (company) => company.name.toLowerCase().includes(term)
      || company.normalizedDomain.includes(term),
  );
}

export function selectCompanyBySlug(
  companies: DirectoryCompany[],
  candidate: string | string[] | undefined,
) {
  if (typeof candidate !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate)) {
    return undefined;
  }
  return getCompanyBySlug(companies, candidate);
}

export function getCompanyBySlug(companies: DirectoryCompany[], slug: string) {
  return companies.find((company) => company.slug === slug);
}
