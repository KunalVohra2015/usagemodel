"use client";

import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  getSelectorKeyAction,
  suggestedCompanyFromQuery,
} from "@/features/organizations/company-selector-model";
import { searchDirectoryCompanies } from "@/features/organizations/directory";
import type { DirectoryCompany } from "@/features/organizations/types";
import { createOrReuseCompany } from "./actions";

export function CompanySelector({
  companies,
  initialCompanyId,
  onSelect,
  onSelectionCleared,
  error,
}: {
  companies: DirectoryCompany[];
  initialCompanyId?: string;
  onSelect: (company: DirectoryCompany) => void;
  onSelectionCleared: () => void;
  error?: string;
}) {
  const initial = companies.find((company) => company.id === initialCompanyId) ?? companies[0];
  const [directory, setDirectory] = useState(companies);
  const [selected, setSelected] = useState<DirectoryCompany | undefined>(initial);
  const [query, setQuery] = useState(initial?.name ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [adding, setAdding] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const companyNameRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const matches = useMemo(
    () => searchDirectoryCompanies(directory, query),
    [directory, query],
  );
  const suggestion = suggestedCompanyFromQuery(query);
  const hasAddAction = Boolean(suggestion);
  const showError = Boolean(error && !open && !adding);
  const activeOptionId = activeIndex < 0
    ? undefined
    : activeIndex < matches.length
      ? `${listboxId}-company-${matches[activeIndex]?.id}`
      : `${listboxId}-add`;

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  function closePopover() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function choose(company: DirectoryCompany) {
    setSelected(company);
    setQuery(company.name);
    setMessage(null);
    setAdding(false);
    closePopover();
    onSelect(company);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function beginAdding() {
    if (!suggestion) return;
    setCompanyName(suggestion.name);
    setWebsite(suggestion.website);
    setMessage(null);
    setAdding(true);
    closePopover();
    requestAnimationFrame(() => companyNameRef.current?.focus());
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
    }
    const action = getSelectorKeyAction({
      key: event.key,
      activeIndex,
      resultCount: matches.length,
      hasAddAction,
    });
    if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) {
      if (event.key !== "Enter" || activeIndex >= 0) event.preventDefault();
    }
    if (action.type === "close") {
      closePopover();
      return;
    }
    if (action.type === "select") {
      const company = matches[action.resultIndex];
      if (company) choose(company);
      return;
    }
    if (action.type === "add") {
      beginAdding();
      return;
    }
    setActiveIndex(action.activeIndex);
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
    <div ref={containerRef} className="sm:col-span-2">
      <label htmlFor="company-search" className="text-sm font-semibold text-slate-800">
        Destination company<span className="ml-1 text-rose-600">*</span>
      </label>
      <input type="hidden" name="organization" value={selected?.id ?? ""} />
      <div className="relative mt-2">
        <input
          ref={searchInputRef}
          id="company-search"
          type="search"
          role="combobox"
          value={query}
          onFocus={() => { setOpen(true); setActiveIndex(-1); }}
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value !== selected?.name) {
              setSelected(undefined);
              onSelectionCleared();
            }
            setAdding(false);
            setMessage(null);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search by company or domain"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open ? activeOptionId : undefined}
          aria-autocomplete="list"
          aria-invalid={showError}
          aria-describedby={showError ? "company-error" : "company-help"}
          className={`min-h-11 w-full rounded-xl border bg-white px-3.5 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-3 focus:ring-teal-100 ${showError ? "border-rose-400" : "border-slate-300"}`}
        />

        {open && (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Company results"
            className="absolute inset-x-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
          >
            {matches.length > 0 ? (
              <div className="space-y-1">
                {matches.map((company, index) => (
                  <button
                    id={`${listboxId}-company-${company.id}`}
                    key={company.id}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(company)}
                    className={`flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left ${activeIndex === index ? "bg-teal-50" : "hover:bg-slate-50"}`}
                  >
                    <span><span className="block text-sm font-semibold text-slate-900">{company.name}</span><span className="block text-xs text-slate-500">{company.normalizedDomain}</span></span>
                    <ClaimBadge status={company.claimStatus} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-3 pb-2 pt-3 text-sm font-medium text-slate-700">
                No company found for <span className="font-semibold text-slate-950">{suggestion?.label ?? query.trim()}</span>
              </p>
            )}

            {suggestion && (
              <div className={matches.length ? "mt-1 border-t border-slate-100 pt-1" : ""}>
                <button
                  id={`${listboxId}-add`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === matches.length}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(matches.length)}
                  onClick={beginAdding}
                  className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-teal-800 ${activeIndex === matches.length ? "bg-teal-100" : "bg-teal-50 hover:bg-teal-100"}`}
                >
                  <span>Add {suggestion.label}</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
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
      {showError && <p id="company-error" className="mt-2 text-xs font-medium text-rose-600">{error}</p>}

      {adding && (
        <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800">
            Company name
            <input ref={companyNameRef} value={companyName} onChange={(event) => setCompanyName(event.target.value)} maxLength={120} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-3 focus:ring-teal-100" />
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Website or domain
            <input value={website} onChange={(event) => setWebsite(event.target.value)} maxLength={2048} placeholder="salesforce.com" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-3 focus:ring-teal-100" />
          </label>
          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
            <button type="button" onClick={addCompany} disabled={isPending} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">
              {isPending ? "Checking directory…" : "Add and select company"}
            </button>
            <button type="button" onClick={() => { setAdding(false); searchInputRef.current?.focus(); }} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-200/60">
              Cancel
            </button>
          </div>
          <p className="text-xs leading-5 text-slate-500 sm:col-span-2">Adding a company does not make you its owner or administrator.</p>
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
