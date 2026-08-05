export type AuthenticatedViewer = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type VerifiedIdentity = {
  id: string;
  metadata: Record<string, unknown>;
};

export type ViewerResolution =
  | { status: "ready"; viewer: AuthenticatedViewer }
  | { status: "profile_error"; userId: string };

export type OrganizationMembership = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: "member" | "admin";
};
