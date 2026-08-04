export default function DashboardLoading() {
  return <div className="min-h-screen bg-slate-100 p-6" role="status" aria-label="Loading dashboard"><div className="mx-auto max-w-7xl animate-pulse"><div className="h-16 rounded-xl bg-slate-200" /><div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">{[1,2,3,4,5].map((item) => <div key={item} className="h-24 rounded-xl bg-white" />)}</div><div className="mt-6 h-96 rounded-2xl bg-white" /></div></div>;
}
