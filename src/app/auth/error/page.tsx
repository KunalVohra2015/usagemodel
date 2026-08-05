import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "Sign-in problem" };

const messages: Record<string, string> = {
  missing_code: "The sign-in response was incomplete.",
  invalid_oauth_context: "This sign-in attempt expired or is no longer valid.",
  exchange_failed: "The sign-in link expired or could not be verified.",
  verification_failed: "We could not verify the signed-in account.",
  profile_failed: "Your account was verified, but setup could not be completed.",
  signout_failed: "Your session could not be ended safely.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string | string[] }>;
}) {
  const { reason } = await searchParams;
  const message =
    (typeof reason === "string" ? messages[reason] : null) ??
    "Sign-in could not be completed.";

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7faf8] px-5 py-12">
      <div className="w-full max-w-md">
        <Brand />
        <section className="mt-8 rounded-2xl border border-rose-200 bg-white p-7 shadow-xl shadow-slate-900/5">
          <span
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-xl bg-rose-50 font-bold text-rose-700"
          >
            !
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            We couldn&apos;t sign you in.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Please start again. If the problem continues, contact the pilot
            administrator.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Return to sign in
          </Link>
        </section>
      </div>
    </main>
  );
}
