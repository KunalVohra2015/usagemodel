import Link from "next/link";
import { Brand } from "./brand";

export function UserShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <nav aria-label="User navigation" className="flex items-center gap-1 sm:gap-3">
            <Link className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950" href="/feedback">
              My feedback
            </Link>
            <Link className="hidden rounded-lg bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:inline-flex" href="/feedback/new">
              Share feedback
            </Link>
            <span className="ml-1 grid size-9 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-800" title="Maya Chen">
              MC
            </span>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
