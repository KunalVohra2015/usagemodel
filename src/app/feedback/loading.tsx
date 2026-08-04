export default function FeedbackLoading() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-24" role="status" aria-label="Loading feedback">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-9 w-48 rounded-lg bg-slate-200" />
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((item) => <div key={item} className="h-40 rounded-2xl border border-slate-200 bg-white" />)}
        </div>
      </div>
    </div>
  );
}
