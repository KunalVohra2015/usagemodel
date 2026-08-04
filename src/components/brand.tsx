import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 font-semibold tracking-[-0.02em] ${inverse ? "text-white" : "text-slate-950"}`}
    >
      <span
        aria-hidden="true"
        className={`grid size-8 place-items-center rounded-xl text-sm font-bold ${inverse ? "bg-teal-300 text-slate-950" : "bg-teal-600 text-white"}`}
      >
        L
      </span>
      Loopline
    </Link>
  );
}
