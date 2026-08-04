import type { Metadata } from "next";
import { UserShell } from "@/components/user-shell";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = { title: "Share feedback" };

export default function NewFeedbackPage() {
  return (
    <UserShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <p className="text-sm font-semibold text-teal-700">Share with Acme Software</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Tell us what could be better.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Your feedback goes directly to Acme’s product team. Required fields are marked with an asterisk.</p>
        </div>
        <FeedbackForm />
      </main>
    </UserShell>
  );
}
