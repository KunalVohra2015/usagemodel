import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import type { AuthenticatedViewer } from "@/features/auth/types";
import { Brand } from "./brand";
import { UserAvatar } from "./user-avatar";

export function UserShell({
  children,
  viewer,
  demoMode = false,
}: {
  children: React.ReactNode;
  viewer: AuthenticatedViewer;
  demoMode?: boolean;
}) {
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
            <div className="ml-1 hidden items-center gap-2 sm:flex">
              <UserAvatar viewer={viewer} />
              <span className="max-w-32 truncate text-sm font-medium text-slate-700">
                {viewer.displayName}
              </span>
            </div>
            {demoMode ? (
              <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Demo · not saved
              </span>
            ) : <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-950"
              >
                Sign out
              </button>
            </form>}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
