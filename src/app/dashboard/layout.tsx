import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileSetupError } from "@/components/profile-setup-error";
import { resolveProtectedLayoutContext } from "@/features/auth/protected-layout";
import {
  getOrganizationMembership,
  requireAuthenticatedViewer,
} from "@/features/auth/server";
import { getSupabaseEnvironmentStatus } from "@/lib/env";
import { DashboardAccessDenied } from "./access-denied";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await resolveProtectedLayoutContext({
    environmentStatus: getSupabaseEnvironmentStatus(),
    area: "dashboard",
    requireViewer: requireAuthenticatedViewer,
    getMembership: getOrganizationMembership,
  });
  if (context.mode === "profile_error") {
    return <ProfileSetupError retryPath="/dashboard" />;
  }
  if (context.mode === "access_denied") {
    return <DashboardAccessDenied viewer={context.viewer} />;
  }
  if (!context.membership) return null;

  return (
    <DashboardShell
      viewer={context.viewer}
      membership={context.membership}
      demoMode={context.mode === "mock"}
    >
      {children}
    </DashboardShell>
  );
}
