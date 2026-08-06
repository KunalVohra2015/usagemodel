"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";
import {
  type FeedbackField,
  type FeedbackFormValues,
  validateFeedbackForm,
  visibleFeedbackError,
} from "@/features/feedback/form-validation";
import type { DirectoryCompany } from "@/features/organizations/types";
import type { FeedbackSubmissionErrors } from "@/features/feedback/submission";
import { submitFeedback } from "./actions";
import { CompanySelector } from "./company-selector";

export function FeedbackForm({
  companies,
  initialCompanyId,
  demoMode,
}: {
  companies: DirectoryCompany[];
  initialCompanyId?: string;
  demoMode: boolean;
}) {
  const router = useRouter();
  const initialCompany = companies.find((company) => company.id === initialCompanyId) ?? companies[0];
  const [submitted, setSubmitted] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, startSubmitting] = useTransition();
  const [serverErrors, setServerErrors] = useState<FeedbackSubmissionErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FeedbackField, boolean>>>({});
  const [values, setValues] = useState<FeedbackFormValues>({
    organization: initialCompany?.id ?? "",
    title: "",
    description: "",
    sourceUrl: "https://app.acme.test/reports",
    pageTitle: "Reports · Acme",
  });
  const [feedbackType, setFeedbackType] = useState("feature_request");
  const [selectedText, setSelectedText] = useState("");
  const [screenshotError, setScreenshotError] = useState<string>();
  const [fileName, setFileName] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(initialCompany);
  const formRef = useRef<HTMLFormElement>(null);

  const fieldErrors = {
    organization: serverErrors.organizationId ?? visibleFeedbackError({ field: "organization", value: values.organization, touched: Boolean(touched.organization), submitAttempted }),
    title: serverErrors.title ?? visibleFeedbackError({ field: "title", value: values.title, touched: Boolean(touched.title), submitAttempted }),
    description: serverErrors.description ?? visibleFeedbackError({ field: "description", value: values.description, touched: Boolean(touched.description), submitAttempted }),
    sourceUrl: serverErrors.sourceUrl ?? visibleFeedbackError({ field: "sourceUrl", value: values.sourceUrl, touched: Boolean(touched.sourceUrl), submitAttempted }),
    pageTitle: serverErrors.pageTitle ?? visibleFeedbackError({ field: "pageTitle", value: values.pageTitle, touched: Boolean(touched.pageTitle), submitAttempted }),
  };

  function updateField(field: FeedbackField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    const serverField = field === "organization" ? "organizationId" : field;
    setServerErrors((current) => ({ ...current, [serverField]: undefined, form: undefined }));
  }

  function touchField(field: FeedbackField) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitAttempted(true);
    setServerErrors({});
    if (Object.keys(validateFeedbackForm(values)).length > 0 || screenshotError) return;

    if (demoMode) {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    startSubmitting(async () => {
      const result = await submitFeedback({
        organizationId: values.organization,
        type: feedbackType,
        title: values.title,
        description: values.description,
        sourceUrl: values.sourceUrl,
        pageTitle: values.pageTitle,
        selectedText,
      });
      if (!result.ok) {
        setServerErrors(result.errors);
        return;
      }
      router.push(`/feedback/${result.feedbackId}?created=1`);
      router.refresh();
    });
  }

  function handleFile(file?: File) {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setScreenshotError("Choose a PNG, JPEG, or WebP image.");
      setFileName("");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setScreenshotError("Choose an image smaller than 5 MB.");
      setFileName("");
      return;
    }
    setScreenshotError(undefined);
    setFileName(file.name);
  }

  if (submitted) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white p-7 text-center shadow-xl shadow-slate-900/5 sm:p-12" role="status">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700" aria-hidden="true">✓</span>
        <p className="mt-6 text-sm font-semibold text-emerald-700">Demo submission complete</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Thanks for helping {selectedCompany?.name ?? "this company"} improve.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">This prototype feedback was <strong>not saved</strong>. The next implementation slice will persist submissions with status <strong>Submitted</strong>.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700" href="/feedback">View my feedback</Link>
          <button className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => { setSubmitted(false); setSubmitAttempted(false); setTouched({}); setServerErrors({}); setValues({ organization: initialCompany?.id ?? "", title: "", description: "", sourceUrl: "https://app.acme.test/reports", pageTitle: "Reports · Acme" }); setFeedbackType("feature_request"); setSelectedText(""); setScreenshotError(undefined); setFileName(""); formRef.current?.reset(); }}>Submit another</button>
        </div>
      </div>
    );
  }

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-3 focus:ring-teal-100";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8" noValidate>
      {demoMode && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="note"><strong>Demo submission:</strong> feedback entered below is not saved and resets when you leave this page.</div>}
      {serverErrors.form && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">{serverErrors.form}</div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="border-b border-slate-100 pb-5"><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Step 1 of 2</p><h2 className="mt-2 text-xl font-semibold">What would you like to share?</h2><p className="mt-1 text-sm text-slate-600">Give the product team enough context to understand your experience.</p></div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <CompanySelector companies={companies} initialCompanyId={initialCompanyId} onSelect={(company) => { setSelectedCompany(company); updateField("organization", company.id); }} onSelectionCleared={() => updateField("organization", "")} error={fieldErrors.organization} />
          <label className="text-sm font-semibold text-slate-800 sm:col-span-2">Feedback type<select name="type" className={inputClass} value={feedbackType} onChange={(event) => { setFeedbackType(event.target.value); setServerErrors((current) => ({ ...current, type: undefined, form: undefined })); }} aria-invalid={Boolean(serverErrors.type)}><option value="feature_request">Feature request</option><option value="bug">Bug</option><option value="confusing_experience">Confusing experience</option><option value="other">Other</option></select>{serverErrors.type && <span className="mt-2 block text-xs font-medium text-rose-600">{serverErrors.type}</span>}</label>
          <label className="text-sm font-semibold text-slate-800 sm:col-span-2">Title<span className="ml-1 text-rose-600">*</span><input name="title" value={values.title} onChange={(event) => updateField("title", event.target.value)} onBlur={() => touchField("title")} className={`${inputClass} ${fieldErrors.title ? "border-rose-400" : ""}`} placeholder="e.g. Let me schedule reports" aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "title-error" : undefined} />{fieldErrors.title && <span id="title-error" className="mt-2 block text-xs font-medium text-rose-600">{fieldErrors.title}</span>}</label>
          <label className="text-sm font-semibold text-slate-800 sm:col-span-2">Description<span className="ml-1 text-rose-600">*</span><textarea name="description" value={values.description} onChange={(event) => updateField("description", event.target.value)} onBlur={() => touchField("description")} rows={6} className={`${inputClass} py-3 ${fieldErrors.description ? "border-rose-400" : ""}`} placeholder="What happened? What were you trying to do? What would a better experience look like?" aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? "description-help description-error" : "description-help"} /><span id="description-help" className="mt-2 block text-xs font-normal text-slate-500">Please avoid passwords, payment details, or other sensitive information.</span>{fieldErrors.description && <span id="description-error" className="mt-2 block text-xs font-medium text-rose-600">{fieldErrors.description}</span>}</label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="border-b border-slate-100 pb-5"><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Step 2 of 2</p><h2 className="mt-2 text-xl font-semibold">Add page context</h2><p className="mt-1 text-sm text-slate-600">This helps the product team find the exact part of the product you mean.</p></div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800 sm:col-span-2">Source URL<span className="ml-1 text-rose-600">*</span><input name="sourceUrl" type="url" value={values.sourceUrl} onChange={(event) => updateField("sourceUrl", event.target.value)} onBlur={() => touchField("sourceUrl")} className={`${inputClass} ${fieldErrors.sourceUrl ? "border-rose-400" : ""}`} aria-invalid={Boolean(fieldErrors.sourceUrl)} aria-describedby={fieldErrors.sourceUrl ? "url-error" : undefined} />{fieldErrors.sourceUrl && <span id="url-error" className="mt-2 block text-xs font-medium text-rose-600">{fieldErrors.sourceUrl}</span>}</label>
          <label className="text-sm font-semibold text-slate-800 sm:col-span-2">Page title<span className="ml-1 text-rose-600">*</span><input name="pageTitle" value={values.pageTitle} onChange={(event) => updateField("pageTitle", event.target.value)} onBlur={() => touchField("pageTitle")} className={`${inputClass} ${fieldErrors.pageTitle ? "border-rose-400" : ""}`} aria-invalid={Boolean(fieldErrors.pageTitle)} aria-describedby={fieldErrors.pageTitle ? "page-title-error" : undefined} />{fieldErrors.pageTitle && <span id="page-title-error" className="mt-2 block text-xs font-medium text-rose-600">{fieldErrors.pageTitle}</span>}</label>
          <label className="text-sm font-semibold text-slate-800 sm:col-span-2">Selected webpage text <span className="font-normal text-slate-400">(optional)</span><textarea name="selectedText" value={selectedText} onChange={(event) => { setSelectedText(event.target.value); setServerErrors((current) => ({ ...current, selectedText: undefined, form: undefined })); }} rows={3} className={`${inputClass} py-3 ${serverErrors.selectedText ? "border-rose-400" : ""}`} placeholder="Paste the exact text you were looking at" aria-invalid={Boolean(serverErrors.selectedText)} />{serverErrors.selectedText && <span className="mt-2 block text-xs font-medium text-rose-600">{serverErrors.selectedText}</span>}</label>
          <div className="sm:col-span-2">
            <span className="text-sm font-semibold text-slate-800">Screenshot <span className="font-normal text-slate-400">(optional)</span></span>
            <label className={`mt-2 flex flex-col items-center rounded-2xl border border-dashed px-5 py-8 text-center transition ${demoMode ? "cursor-pointer hover:bg-slate-50" : "cursor-not-allowed opacity-70"} ${screenshotError ? "border-rose-400 bg-rose-50/30" : "border-slate-300 bg-slate-50/50"}`}>
              <span className="grid size-11 place-items-center rounded-xl bg-white text-xl text-slate-500 shadow-sm" aria-hidden="true">↑</span>
              <span className="mt-3 text-sm font-semibold text-slate-700">{demoMode ? fileName || "Choose a screenshot" : "Screenshot upload coming next"}</span>
              <span className="mt-1 text-xs text-slate-500">{demoMode ? "PNG, JPEG, or WebP · Maximum 5 MB" : "No screenshot will be included in this submission."}</span>
              <input name="screenshot" type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" disabled={!demoMode} onChange={(event) => handleFile(event.target.files?.[0])} />
            </label>
            {screenshotError && <span className="mt-2 block text-xs font-medium text-rose-600" role="alert">{screenshotError}</span>}
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100" href="/feedback">Cancel</Link>
        <button className="min-h-12 rounded-xl bg-teal-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting…" : "Submit feedback"}</button>
      </div>
    </form>
  );
}
