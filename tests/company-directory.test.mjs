import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  normalizeCompanyWebsite,
  WebsiteNormalizationError,
} from "../src/features/organizations/domain-normalization.ts";
import {
  createOrReuseDirectoryCompany,
  getCompanyBySlug,
  searchDirectoryCompanies,
  selectCompanyBySlug,
} from "../src/features/organizations/directory.ts";
import { mockCompanies } from "../src/features/organizations/mock-data.ts";

test("normalizes company websites with standards-based URL parsing", () => {
  const cases = [
    ["https://www.Salesforce.com/products/sales-cloud/?source=google#top", "salesforce.com", "https://salesforce.com"],
    ["salesforce.com", "salesforce.com", "https://salesforce.com"],
    ["https://WWW.EXAMPLE.COM:443/path", "example.com", "https://example.com"],
    ["http://example.com:80/path", "example.com", "https://example.com"],
    ["https://app.example.com/path", "app.example.com", "https://app.example.com"],
    ["https://bücher.de/catalog", "xn--bcher-kva.de", "https://xn--bcher-kva.de"],
  ];
  for (const [input, normalizedDomain, websiteUrl] of cases) {
    assert.deepEqual(normalizeCompanyWebsite(input), { normalizedDomain, websiteUrl });
  }
  assert.equal(
    normalizeCompanyWebsite("https://www.salesforce.com").normalizedDomain,
    normalizeCompanyWebsite("https://salesforce.com").normalizedDomain,
  );
});

test("rejects unsafe and invalid website inputs", () => {
  const invalid = [
    "not a website",
    "ftp://example.com",
    "https://user:password@example.com",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://10.0.0.4",
    "http://[::1]",
    "https://bad_host.example",
    "https://example.com:8443",
    "https://service.local",
    "https://service.internal",
    "https://example.test",
    "https://example.invalid",
    "https://example.example",
    "https://999.999.999.999",
  ];
  for (const input of invalid) {
    assert.throws(() => normalizeCompanyWebsite(input), WebsiteNormalizationError);
  }
});

test("mock creation reuses domains and assigns stable collision-safe slugs", () => {
  let directory = [...mockCompanies];
  const first = createOrReuseDirectoryCompany(directory, "Twin Company", {
    normalizedDomain: "twin-one.com",
    websiteUrl: "https://twin-one.com",
  });
  directory = first.companies;
  const repeated = createOrReuseDirectoryCompany(directory, "Renamed Twin", {
    normalizedDomain: "twin-one.com",
    websiteUrl: "https://twin-one.com",
  });
  directory = repeated.companies;
  const sameName = createOrReuseDirectoryCompany(directory, "Twin Company", {
    normalizedDomain: "twin-two.com",
    websiteUrl: "https://twin-two.com",
  });
  directory = sameName.companies;
  const sameBase = createOrReuseDirectoryCompany(directory, "Twin + Company", {
    normalizedDomain: "twin-three.com",
    websiteUrl: "https://twin-three.com",
  });
  directory = sameBase.companies;

  assert.equal(first.created, true);
  assert.equal(repeated.created, false);
  assert.deepEqual(repeated.company, first.company);
  assert.notEqual(sameName.company.slug, first.company.slug);
  assert.notEqual(sameBase.company.slug, first.company.slug);
  assert.notEqual(sameBase.company.slug, sameName.company.slug);

  assert.equal(
    directory.filter((company) => company.normalizedDomain === "twin-one.com").length,
    1,
  );
  assert.equal(
    getCompanyBySlug(directory, sameName.company.slug)?.id,
    sameName.company.id,
  );
  assert.equal(
    selectCompanyBySlug(directory, sameBase.company.slug)?.id,
    sameBase.company.id,
  );

  const stableReplay = createOrReuseDirectoryCompany([...mockCompanies], "Twin Company", {
    normalizedDomain: "twin-one.com",
    websiteUrl: "https://twin-one.com",
  });
  assert.equal(stableReplay.company.slug, first.company.slug);
});

test("searches existing companies by name and normalized domain", () => {
  assert.deepEqual(searchDirectoryCompanies(mockCompanies, "sales"), [mockCompanies[1]]);
  assert.deepEqual(searchDirectoryCompanies(mockCompanies, "https://www.figma.com"), [mockCompanies[2]]);
  assert.deepEqual(searchDirectoryCompanies(mockCompanies, ""), mockCompanies);
});

test("preselection accepts only a known safe slug", () => {
  assert.equal(selectCompanyBySlug(mockCompanies, "salesforce"), mockCompanies[1]);
  assert.equal(selectCompanyBySlug(mockCompanies, "//attacker.example"), undefined);
  assert.equal(selectCompanyBySlug(mockCompanies, "https://attacker.example"), undefined);
  assert.equal(selectCompanyBySlug(mockCompanies, ["salesforce"]), undefined);
  assert.equal(selectCompanyBySlug(mockCompanies, "missing-company"), undefined);
});

test("migration exposes only a narrow authenticated creation boundary", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260805010000_company_directory.sql", import.meta.url),
    "utf8",
  );
  const start = sql.indexOf("create function public.find_or_create_unclaimed_organization");
  const end = sql.indexOf("create function public.get_public_company_by_slug");
  const creationFunction = sql.slice(start, end);

  assert.match(creationFunction, /security definer/i);
  assert.match(creationFunction, /set search_path = ''/i);
  assert.match(creationFunction, /caller_id uuid := auth\.uid\(\)/i);
  assert.match(creationFunction, /'unclaimed'/i);
  assert.match(creationFunction, /pg_advisory_xact_lock/i);
  assert.match(creationFunction, /domain_value ~ '\^\[0-9\.\]\+\$'/i);
  assert.match(creationFunction, /\\\.localhost\$/i);
  assert.match(creationFunction, /\\\.\(local\|internal\|test\|invalid\|example\)\$/i);
  assert.doesNotMatch(creationFunction, /::\s*(inet|cidr)/i);
  assert.doesNotMatch(creationFunction, /organization_members/i);
  assert.doesNotMatch(creationFunction, /company_claim_status|creator_id|membership_role/i);
  assert.match(sql, /unique index organizations_normalized_domain_unique_idx/i);
  assert.match(sql, /revoke all on function public\.find_or_create_unclaimed_organization\(text, text\)\s+from public, anon/i);
  assert.match(sql, /grant execute on function public\.find_or_create_unclaimed_organization\(text, text\)\s+to authenticated/i);
});

test("public company route contains no private feedback or membership query", async () => {
  const page = await readFile(
    new URL("../src/app/companies/[slug]/page.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(page, /from\(["']feedback["']\)|organization_members|submitter_id|screenshot_path/i);
  assert.match(page, /feedback\/new\?company=/);
});

test("feedback submission remains explicit local-only prototype behavior", async () => {
  const form = await readFile(
    new URL("../src/app/feedback/new/feedback-form.tsx", import.meta.url),
    "utf8",
  );
  const action = await readFile(
    new URL("../src/app/feedback/new/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(form, /feedback entered below is not saved yet/i);
  assert.match(form, /prototype feedback was <strong>not saved<\/strong>/i);
  assert.doesNotMatch(form, /\.from\(["']feedback["']\)|\.rpc\(["'][^"']*feedback/i);
  assert.doesNotMatch(action, /\.from\(["']feedback["']\)|\.rpc\(["'][^"']*feedback/i);
});
