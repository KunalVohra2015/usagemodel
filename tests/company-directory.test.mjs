import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  normalizeCompanyWebsite,
  WebsiteNormalizationError,
} from "../src/features/organizations/domain-normalization.ts";
import {
  getSelectorKeyAction,
  suggestedCompanyFromQuery,
} from "../src/features/organizations/company-selector-model.ts";
import {
  createOrReuseDirectoryCompany,
  getCompanyBySlug,
  searchDirectoryCompanies,
  selectCompanyBySlug,
} from "../src/features/organizations/directory.ts";
import { mockCompanies } from "../src/features/organizations/mock-data.ts";
import {
  validateFeedbackForm,
  visibleFeedbackError,
} from "../src/features/feedback/form-validation.ts";

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

test("no-result domain searches produce an editable add-company suggestion", () => {
  assert.deepEqual(suggestedCompanyFromQuery("potatoes.com"), {
    label: "potatoes.com",
    website: "potatoes.com",
    name: "Potatoes",
  });
  assert.deepEqual(suggestedCompanyFromQuery("https://www.green-potatoes.com/products"), {
    label: "green-potatoes.com",
    website: "green-potatoes.com",
    name: "Green Potatoes",
  });
});

test("selector keyboard navigation reaches results and the add action", () => {
  assert.deepEqual(getSelectorKeyAction({
    key: "ArrowDown", activeIndex: -1, resultCount: 2, hasAddAction: true,
  }), { type: "none", activeIndex: 0 });
  assert.deepEqual(getSelectorKeyAction({
    key: "ArrowDown", activeIndex: 1, resultCount: 2, hasAddAction: true,
  }), { type: "none", activeIndex: 2 });
  assert.deepEqual(getSelectorKeyAction({
    key: "Enter", activeIndex: 0, resultCount: 2, hasAddAction: true,
  }), { type: "select", resultIndex: 0, activeIndex: -1 });
  assert.deepEqual(getSelectorKeyAction({
    key: "Enter", activeIndex: 0, resultCount: 0, hasAddAction: true,
  }), { type: "add", activeIndex: -1 });
  assert.deepEqual(getSelectorKeyAction({
    key: "Escape", activeIndex: 1, resultCount: 2, hasAddAction: true,
  }), { type: "close", activeIndex: -1 });
});

test("feedback validation waits for blur or submit and clears after correction", () => {
  assert.equal(visibleFeedbackError({
    field: "title", value: "", touched: false, submitAttempted: false,
  }), undefined);
  assert.equal(visibleFeedbackError({
    field: "description", value: "", touched: false, submitAttempted: false,
  }), undefined);
  assert.equal(visibleFeedbackError({
    field: "title", value: "", touched: true, submitAttempted: false,
  }), "Add a short, specific title.");
  assert.equal(visibleFeedbackError({
    field: "title", value: "Clear export labels", touched: true, submitAttempted: false,
  }), undefined);

  assert.deepEqual(validateFeedbackForm({
    organization: "",
    title: "",
    description: "",
    sourceUrl: "invalid",
    pageTitle: "",
  }), {
    organization: "Select an existing company or add this company.",
    title: "Add a short, specific title.",
    description: "Tell the product team what happened or what would help.",
    sourceUrl: "Enter a complete URL beginning with http:// or https://.",
    pageTitle: "Add the title of the source page.",
  });
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

test("feedback submission keeps an explicit demo path beside configured persistence", async () => {
  const form = await readFile(
    new URL("../src/app/feedback/new/feedback-form.tsx", import.meta.url),
    "utf8",
  );
  const action = await readFile(
    new URL("../src/app/feedback/new/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(form, /feedback entered below is not saved/i);
  assert.match(form, /demoMode/);
  assert.doesNotMatch(form, /\.from\(["']feedback["']\)|\.rpc\(["'][^"']*feedback/i);
  assert.match(action, /\.from\("feedback"\)/);
  assert.match(action, /getVerifiedIdentity/);
});

test("selector keeps no-results actions in its popover and closes accessibly", async () => {
  const selector = await readFile(
    new URL("../src/app/feedback/new/company-selector.tsx", import.meta.url),
    "utf8",
  );
  const action = await readFile(
    new URL("../src/app/feedback/new/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(selector, /No company found for/);
  assert.match(selector, /<span>Add \{suggestion\.label\}<\/span>/);
  assert.match(selector, /role="combobox"/);
  assert.match(selector, /role="listbox"/);
  assert.match(selector, /aria-activedescendant/);
  assert.match(selector, /document\.addEventListener\("pointerdown"/);
  assert.match(selector, /action\.type === "close"/);
  assert.doesNotMatch(selector, /Can’t find the company\? Add it/);
  assert.match(action, /getSupabaseEnvironmentStatus\(\) !== "configured"/);
  assert.match(action, /\.rpc\("find_or_create_unclaimed_organization"/);
});
