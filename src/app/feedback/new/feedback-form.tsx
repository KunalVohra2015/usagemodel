"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";

type FormErrors = Partial<Record<"title" | "description" | "sourceUrl" | "screenshot", string>>;

export function FeedbackForm() {
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [fileName, setFileName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextErrors: FormErrors = {};
    if (!String(data.get("title") ?? "").trim()) nextErrors.title = "Add a short, specific title.";
    if (!String(data.get("description") ?? "").trim()) nextErrors.description = "Tell the product team what happened or what would help.";
    const sourceUrl = String(data.get("sourceUrl") ?? "");
    if (!sourceUrl.startsWith("http://") && !sourceUrl.startsWith("https://")) nextErrors.sourceUrl = "Enter a complete URL beginning with http:// or https://.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleFile(file?: File) {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setErrors((current) => ({ ...current, screenshot: "Choose a PNG, JPEG, or WebP image." }));
      setFileName("");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((current) => ({ ...current, screenshot: "Choose an image smaller than 5 MB." }));
      setFileName("");
      return;
    }
    setErrors((current) => ({ ...current, screenshot: undefined }));
    setFileName(file.name);
  }

  if (submitted) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white p-7 text-center shadow-xl shadow-slate-900/5 sm:p-12" role="status">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700" aria-hidden="true">✓</span>
        <p className="mt-6 text-sm font-semibold text-emerald-700">Feedback submitted</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Thanks for helping Acme improve.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">Your mock submission has been received with status <strong>Submitted</strong>. In the real product, you could return anytime to follow its progress.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700" href="/feedback">View my feedback</Link>
          <button className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => { setSubmitted(false); setErrors({}); setFileName(""); formRef.current?.reset(); }}>Submit another</button>
        </div>
      </div>
    );
  }

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-3 focus:ring-teal-100";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8" noValidate>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="border-b border-slate-100 pb-5"><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Step 1 of 2</p><h2 className="mt-2 text-xl font-semibold">What would you like to share?</h2><p className="mt-1 text-sm text-slate-600">Give the product team enough context to understand your experience.</p></div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800">Destination company<select name="organization" className={inputClass} defaultValue="acme"><option value="acme">Acme Software</option></select></label>
          <label className="text-sm font-semibold text-slate-800">Feedback type<select name="type" className={inputClass} defaultValue="feature_request"><option value="feature_request">Feature request</option><option value="bug">Bug</option><option value="confusing_experience">Confusing experience</option><option value="other">Other</option></select></label>
          <label className="text-sm font-semibold text-slate-800 sm:col-span-2">Title<span className="ml-1 text-rose-600">*</span><input name="title" className={`${inputClass} ${errors.title ? "border-rose-400" : ""}`} placeholder="e.g. Let me schedule reports" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "title-error" : undefined} />{errors.title && <span id="title-error" className="mt-2 block text-xs font-medium text-rose-600">{errors.title}</span>}</label>
          <label className="text-sm font-semibold text-slate-800 sm:col-span-2">Description<span className="ml-1 text-rose-600">*</span><textarea name="description" rows={6} className={`${inputClass} py-3 ${errors.description ? "border-rose-400" : ""}`} placeholder="What happened? What were you trying to do? What would a better experience look like?" aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "description-error" : "description-help"} /><span id="description-help" className="mt-2 block text-xs font-normal text-slate-500">Please avoid passwords, payment details, or other sensitive information.</span>{errors.description && <span id="description-error" className="mt-2 block text-xs font-medium text-rose-600">{errors.description}</span>}</label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="border-b border-slate-100 pb-5"><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Step 2 of 2</p><h2 className="mt-2 text-xl font-semibold">Add page context</h2><p className="mt-1 text-sm text-slate-600">This helps Acme find the exact part of the product you mean.</p></div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800 sm:col-span-2">Source URL<span className="ml-1 text-rose-600">*</span><input name="sourceUrl" type="url" className={`${inputClass} ${errors.sourceUrl ? "border-rose-400" : ""}`} defaultValue="https://app.acme.test/reports" aria-invalid={Boolean(errors.sourceUrl)} aria-describedby={errors.sourceUrl ? "url-error" : undefined} />{errors.sourceUrl && <span id="url-error" className="mt-2 block text-xs font-medium text-rose-600">{errors.sourceUrl}</span>}</label>
          <label className="text-sm font-semibold text-slate-800 sm:col-span-2">Page title<input name="pageTitle" className={inputClass} defaultValue="Reports · Acme" /></label>
          <label className="text-sm font-semibold text-slate-800 sm:col-span-2">Selected webpage text <span className="font-normal text-slate-400">(optional)</span><textarea name="selectedText" rows={3} className={`${inputClass} py-3`} placeholder="Paste the exact text you were looking at" /></label>
          <div className="sm:col-span-2">
            <span className="text-sm font-semibold text-slate-800">Screenshot <span className="font-normal text-slate-400">(optional)</span></span>
            <label className={`mt-2 flex cursor-pointer flex-col items-center rounded-2xl border border-dashed px-5 py-8 text-center transition hover:bg-slate-50 ${errors.screenshot ? "border-rose-400 bg-rose-50/30" : "border-slate-300 bg-slate-50/50"}`}>
              <span className="grid size-11 place-items-center rounded-xl bg-white text-xl text-slate-500 shadow-sm" aria-hidden="true">↑</span>
              <span className="mt-3 text-sm font-semibold text-slate-700">{fileName || "Choose a screenshot"}</span>
              <span className="mt-1 text-xs text-slate-500">PNG, JPEG, or WebP · Maximum 5 MB</span>
              <input name="screenshot" type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleFile(event.target.files?.[0])} />
            </label>
            {errors.screenshot && <span className="mt-2 block text-xs font-medium text-rose-600" role="alert">{errors.screenshot}</span>}
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100" href="/feedback">Cancel</Link>
        <button className="min-h-12 rounded-xl bg-teal-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-teal-700" type="submit">Submit feedback</button>
      </div>
    </form>
  );
}
