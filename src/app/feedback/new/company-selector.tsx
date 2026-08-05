"use client";

import { useMemo, useState, useTransition } from "react";
import { searchDirectoryCompanies } from "@/features/organizations/directory";
import type { DirectoryCompany } from "@/features/organizations/types";
import { createOrReuseCompany } from "./actions";

export function CompanySelector({
  companies,
  initialCompanyId,
  onSelect,
  error,
}: {
  companies: DirectoryCompany[];
  initialCompanyId?: string;
  onSelect: (company: DirectoryCompany) => void;
  error?: string;
}) {
  const initial = companies.find((company) => company.id === initialCompanyId) ?? companies[0];
  const [directory, setDirectory] = useState(companies);
  const [selected, setSelected] = useState<DirectoryCompany | undefined>(initial);
  const [query, setQuery] = useState(initial?.name ?? "");
  const [adding, setAdding] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const matches = useMemo(
    () => searchDirectoryCompanies(directory, query),
    [directory, query],
  );

  function choose(company: DirectoryCompany) {
    setSelected(company);
    setQuery(company.name);
    setMessage(null);
    onSelect(company);
  }

  function addCompany() {
    setMessage(null);
    startTransition(async () => {
      const result = await createOrReuseCompany(companyName, website);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setDirectory((current) => {
        const withoutDuplicate = current.filter((company) => company.id !== result.company.id);
        return [...withoutDuplicate, result.company].sort((a, b) => a.name.localeCompare(b.name));
      });
      choose(result.company);
      setAdding(false);
      setCompanyName("");
      setWebsite("");
      setMessage(
        result.created
          ? `Added ${result.company.name} as an unclaimed company${result.demo ? " for this demo only" : ""}.`
          : `${result.company.name} already exists, so we selected it instead.`,
      );
    });
  }

  return (
    <div className="sm:col-span-2">
      <label htmlFor="company-search" className="text-sm font-semibold text-slate-800">
        Destination company<span className="ml-1 text-rose-600">*</span>
      </label>
      <input type="hidden" name="organization" value={selected?.id ?? ""} />
      <div className="relative mt-2">
        <input
          id="company-search"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value !== selected?.name) setSelected(undefined);
          }}
          placeholder="Search by company or domain"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "company-error" : "company-help"}
          className={`min-h-11 w-full rounded-xl border bg-white px-3.5 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-3 focus:ring-teal-100 ${error ? "border-rose-400" : "border-slate-300"}`}
        />
        {!selected && (
          <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" role="listbox" aria-label="Company results">
            {matches.length ? matches.map((company) => (
              <button
                key={company.id}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => choose(company)}
                className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"
              >
                <span><span className="block text-sm font-semibold text-slate-900">{company.name}</span><span className="block text-xs text-slate-500">{company.normalizedDomain}</span></span>
                <ClaimBadge status={company.claimStatus} />
              </button>
            )) : (
              <p className="px-3 py-4 text-sm text-slate-500">No matching companies.</p>
            )}
          </div>
        )}
      </div>
      <p id="company-help" className="mt-2 text-xs text-slate-500">
        Search the directory, or add a company when it is missing.
      </p>
      {selected && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50/60 px-3.5 py-3">
          <span><span className="block text-sm font-semibold text-slate-900">{selected.name}</span><span className="block text-xs text-slate-600">{selected.normalizedDomain}</span></span>
          <ClaimBadge status={selected.claimStatus} />
        </div>
      )}
      {error && <p id="company-error" className="mt-2 text-xs font-medium text-rose-600">{error}</p>}

      <button
        type="button"
        onClick={() => { setAdding((value) => !value); setMessage(null); }}
        className="mt-3 text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        {adding ? "Cancel adding company" : "Can’t find the company? Add it"}
      </button>

      {adding && (
        <div className="mt-3 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800">
            Company name
            <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} maxLength={120} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-3 focus:ring-teal-100" />
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Website or domain
            <input value={website} onChange={(event) => setWebsite(event.target.value)} maxLength={2048} placeholder="salesforce.com" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-3 focus:ring-teal-100" />
          </label>
          <div className="sm:col-span-2">
            <button type="button" onClick={addCompany} disabled={isPending} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">
              {isPending ? "Checking directory…" : "Add and select company"}
            </button>
            <p className="mt-2 text-xs leading-5 text-slate-500">Adding a company does not make you its owner or administrator.</p>
          </div>
        </div>
      )}
      {message && <p className={`mt-3 text-xs font-medium ${message.startsWith("We") || message.startsWith("Enter") ? "text-rose-600" : "text-teal-700"}`} role="status">{message}</p>}
    </div>
  );
}

function ClaimBadge({ status }: { status: DirectoryCompany["claimStatus"] }) {
  const claimed = status !== "unclaimed";
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${claimed ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"}`}>
      {status}
    </span>
  );
}
