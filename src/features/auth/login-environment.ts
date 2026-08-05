import type { SupabaseEnvironmentStatus } from "@/lib/env";

export const AUTH_UNAVAILABLE_MESSAGE =
  "Authentication is not configured in this environment.";

export function getLoginAvailability(status: SupabaseEnvironmentStatus) {
  return {
    authenticationAvailable: status === "configured",
    message: status === "configured" ? null : AUTH_UNAVAILABLE_MESSAGE,
  };
}

export async function resolveLoginIdentity<T>(
  authenticationAvailable: boolean,
  loadIdentity: () => Promise<T>,
) {
  if (!authenticationAvailable) return null;
  return loadIdentity();
}
