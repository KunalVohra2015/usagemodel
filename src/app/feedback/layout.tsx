import { UserShell } from "@/components/user-shell";
import { ProfileSetupError } from "@/components/profile-setup-error";
import { resolveProtectedLayoutContext } from "@/features/auth/protected-layout";
import {
  getOrganizationMembership,
  requireAuthenticatedViewer,
} from "@/features/auth/server";
import { getSupabaseEnvironmentStatus } from "@/lib/env";

export default async function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await resolveProtectedLayoutContext({
    environmentStatus: getSupabaseEnvironmentStatus(),
    area: "feedback",
    requireViewer: requireAuthenticatedViewer,
    getMembership: getOrganizationMembership,
  });
  if (context.mode === "profile_error") {
    return <ProfileSetupError retryPath="/feedback" />;
  }
  if (context.mode === "access_denied") return null;

  return (
    <UserShell viewer={context.viewer} demoMode={context.mode === "mock"}>
      {children}
    </UserShell>
  );
}
