import Link from "next/link";

export default function CompanyNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8faf9] px-4 text-center">
      <div>
        <p className="text-sm font-semibold text-teal-700">Company not found</p>
        <h1 className="mt-2 text-3xl font-semibold">This directory page is unavailable.</h1>
        <Link href="/feedback/new" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white">Search the directory</Link>
      </div>
    </main>
  );
}
