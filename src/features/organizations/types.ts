export type CompanyClaimStatus = "unclaimed" | "claimed" | "verified";

export type DirectoryCompany = {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string;
  normalizedDomain: string;
  claimStatus: CompanyClaimStatus;
};

export type CreateCompanyResult =
  | { ok: true; company: DirectoryCompany; created: boolean; demo: boolean }
  | { ok: false; message: string };
