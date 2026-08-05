import type { SupabaseEnvironmentStatus } from "@/lib/env";
import type {
  AuthenticatedViewer,
  OrganizationMembership,
  ViewerResolution,
} from "./types";

export type ProtectedArea = "feedback" | "dashboard";

type ProtectedLayoutContext =
  | {
      mode: "mock";
      viewer: AuthenticatedViewer;
      membership: OrganizationMembership | null;
    }
  | { mode: "profile_error" }
  | {
      mode: "authenticated";
      viewer: AuthenticatedViewer;
      membership: OrganizationMembership | null;
    }
  | { mode: "access_denied"; viewer: AuthenticatedViewer };

const mockViewer: AuthenticatedViewer = {
  id: "mock-user",
  displayName: "Demo user",
  avatarUrl: null,
};

const mockMembership: OrganizationMembership = {
  organizationId: "mock-acme-software",
  organizationName: "Acme Software",
  organizationSlug: "acme-software",
  role: "admin",
};

export async function resolveProtectedLayoutContext(options: {
  environmentStatus: SupabaseEnvironmentStatus;
  area: ProtectedArea;
  requireViewer: (nextPath: string) => Promise<ViewerResolution | null>;
  getMembership: (userId: string) => Promise<OrganizationMembership | null>;
}): Promise<ProtectedLayoutContext> {
  if (options.environmentStatus !== "configured") {
    return {
      mode: "mock",
      viewer: mockViewer,
      membership: options.area === "dashboard" ? mockMembership : null,
    };
  }

  const nextPath = options.area === "dashboard" ? "/dashboard" : "/feedback";
  const resolution = await options.requireViewer(nextPath);
  if (!resolution || resolution.status === "profile_error") {
    return { mode: "profile_error" };
  }

  if (options.area === "feedback") {
    return {
      mode: "authenticated",
      viewer: resolution.viewer,
      membership: null,
    };
  }

  const membership = await options.getMembership(resolution.viewer.id);
  if (!membership) {
    return { mode: "access_denied", viewer: resolution.viewer };
  }

  return {
    mode: "authenticated",
    viewer: resolution.viewer,
    membership,
  };
}
