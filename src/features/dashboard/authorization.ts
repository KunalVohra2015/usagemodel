import type { OrganizationMembership } from "@/features/auth/types";

export function selectAuthorizedOrganization(
  memberships: OrganizationMembership[],
  requestedOrganization: string | string[] | undefined,
): OrganizationMembership | null {
  const requested = typeof requestedOrganization === "string"
    ? requestedOrganization
    : undefined;
  if (requested) {
    return memberships.find(
      (membership) => membership.organizationId === requested,
    ) ?? null;
  }
  return memberships[0] ?? null;
}

export function membershipForOrganization(
  memberships: OrganizationMembership[],
  organizationId: string,
) {
  return memberships.find(
    (membership) => membership.organizationId === organizationId,
  ) ?? null;
}
