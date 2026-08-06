export default function FeedbackLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14" aria-busy="true" aria-label="Loading feedback">
      <div className="h-9 w-52 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-8 grid gap-4">
        {[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
      </div>
    </main>
  );
}
