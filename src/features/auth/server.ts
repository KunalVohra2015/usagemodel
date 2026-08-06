import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/features/auth/redirects";
import {
  resolveViewerProfile,
  type ProfileRow,
} from "@/features/auth/profile-resolution";
import type {
  OrganizationMembership,
  VerifiedIdentity,
  ViewerResolution,
} from "@/features/auth/types";

export const getVerifiedIdentity = cache(
  async (): Promise<VerifiedIdentity | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;

    if (error || typeof userId !== "string") return null;

    const metadata =
      data?.claims?.user_metadata &&
      typeof data.claims.user_metadata === "object"
        ? (data.claims.user_metadata as Record<string, unknown>)
        : {};

    return { id: userId, metadata };
  },
);

export const getAuthenticatedViewer = cache(
  async (): Promise<ViewerResolution | null> => {
    const identity = await getVerifiedIdentity();
    if (!identity) return null;

    const supabase = await createClient();
    const resolution = await resolveViewerProfile(identity, {
      async read(userId) {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", userId)
          .maybeSingle<ProfileRow>();
        return { profile: data, error: Boolean(error) };
      },
      async create(userId, profile) {
        const { error } = await supabase.from("profiles").upsert(
          {
            id: userId,
            display_name: profile.displayName,
            avatar_url: profile.avatarUrl,
          },
          { onConflict: "id", ignoreDuplicates: true },
        );
        return { error: Boolean(error) };
      },
    });

    if (resolution.status === "profile_error") {
      console.error("Authenticated profile setup failed", {
        operation: "protected_route_profile_resolution",
      });
    }
    return resolution;
  },
);

export async function requireAuthenticatedIdentity(nextPath: string) {
  const identity = await getVerifiedIdentity();
  if (!identity) {
    redirect(`/login?next=${encodeURIComponent(getSafeNextPath(nextPath))}`);
  }
  return identity;
}

export async function requireAuthenticatedViewer(nextPath: string) {
  await requireAuthenticatedIdentity(nextPath);
  return getAuthenticatedViewer();
}

export const getOrganizationMemberships = cache(
  async (userId: string): Promise<OrganizationMembership[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_members")
      .select("organization_id, role, organizations!inner(name, slug)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    return data.flatMap((row) => {
      const organization = Array.isArray(row.organizations)
        ? row.organizations[0]
        : row.organizations;

      if (!organization) return [];

      return [{
        organizationId: row.organization_id,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        role: row.role,
      }];
    });
  },
);

export const getOrganizationMembership = cache(
  async (userId: string): Promise<OrganizationMembership | null> =>
    (await getOrganizationMemberships(userId))[0] ?? null,
);
