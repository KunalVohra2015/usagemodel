import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import type {
  AuthenticatedViewer,
  OrganizationMembership,
} from "@/features/auth/types";
import { Brand } from "./brand";
import { UserAvatar } from "./user-avatar";

export function DashboardShell({
  children,
  viewer,
  membership,
  organizationCount = 1,
  demoMode = false,
}: {
  children: React.ReactNode;
  viewer: AuthenticatedViewer;
  membership: OrganizationMembership;
  organizationCount?: number;
  demoMode?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <aside className="bg-slate-950 text-slate-300 lg:fixed lg:inset-y-0 lg:w-64">
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Brand inverse />
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{demoMode ? "Demo · not saved" : organizationCount > 1 ? "Multi-org" : membership.role}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 lg:block lg:px-3 lg:py-6">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 lg:mb-6">
            <span className="grid size-9 place-items-center rounded-lg bg-indigo-500 text-xs font-bold text-white">{organizationCount > 1 ? "PT" : membership.organizationName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">{organizationCount > 1 ? `${organizationCount} organizations` : membership.organizationName}</span>
              <span className="hidden text-xs text-slate-400 lg:block">Product workspace</span>
            </span>
          </div>
          <nav aria-label="Product team navigation" className="flex gap-1 lg:block lg:space-y-1">
            <Link className="block rounded-lg bg-white/10 px-3 py-2.5 text-sm font-semibold text-white" href="/dashboard">
              Feedback inbox
            </Link>
            <span className="hidden rounded-lg px-3 py-2.5 text-sm text-slate-400 lg:block">Team members</span>
            <Link className="hidden rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white lg:block" href="/feedback">
              User view
            </Link>
          </nav>
        </div>
        <div className="hidden border-t border-white/10 p-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <div className="flex items-center gap-3">
            <UserAvatar viewer={viewer} />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-white">{viewer.displayName}</span><span className="text-xs capitalize text-slate-400">{organizationCount > 1 ? "Role varies by organization" : membership.role}</span></span>
            {!demoMode && <form action={signOut}>
              <button type="submit" className="text-xs font-semibold text-slate-400 hover:text-white">Sign out</button>
            </form>}
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 lg:ml-64">{children}</main>
    </div>
  );
}
