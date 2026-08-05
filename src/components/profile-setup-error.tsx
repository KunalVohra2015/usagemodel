import Link from "next/link";

export function ProfileSetupError({ retryPath }: { retryPath: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7faf8] px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-7 shadow-xl shadow-slate-900/5">
        <span
          aria-hidden="true"
          className="grid size-11 place-items-center rounded-xl bg-amber-50 font-bold text-amber-700"
        >
          !
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Your account needs one more step.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          You are signed in, but we could not finish loading your profile. Your
          session is safe; try again in a moment.
        </p>
        <Link
          href={retryPath}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Retry profile setup
        </Link>
      </section>
    </main>
  );
}
