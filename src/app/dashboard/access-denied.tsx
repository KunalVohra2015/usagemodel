import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { Brand } from "@/components/brand";
import { UserAvatar } from "@/components/user-avatar";
import type { AuthenticatedViewer } from "@/features/auth/types";

export function DashboardAccessDenied({
  viewer,
}: {
  viewer: AuthenticatedViewer;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5 py-12 text-white">
      <div className="w-full max-w-lg">
        <Brand inverse />
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-7 shadow-2xl">
          <div className="flex items-center gap-3">
            <UserAvatar viewer={viewer} className="size-11" />
            <div>
              <p className="font-semibold">{viewer.displayName}</p>
              <p className="text-xs text-slate-400">Signed in successfully</p>
            </div>
          </div>
          <h1 className="mt-7 text-2xl font-semibold tracking-tight">
            Your product-team workspace isn&apos;t ready yet.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Access to the Acme Software dashboard is assigned manually during
            the pilot. Ask the pilot administrator to add this account as an
            organization member.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/feedback"
              className="inline-flex min-h-11 items-center rounded-xl bg-teal-300 px-4 text-sm font-semibold text-slate-950 hover:bg-teal-200"
            >
              Go to my feedback
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-semibold text-white hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
