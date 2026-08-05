import type { DirectoryCompany } from "./types";

export const mockCompanies: DirectoryCompany[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Acme Software",
    slug: "acme-software",
    websiteUrl: "https://acme-software.example",
    normalizedDomain: "acme-software.example",
    claimStatus: "claimed",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Salesforce",
    slug: "salesforce",
    websiteUrl: "https://salesforce.com",
    normalizedDomain: "salesforce.com",
    claimStatus: "verified",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Figma",
    slug: "figma",
    websiteUrl: "https://figma.com",
    normalizedDomain: "figma.com",
    claimStatus: "unclaimed",
  },
];
