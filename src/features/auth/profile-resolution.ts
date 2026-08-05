import type {
  VerifiedIdentity,
  ViewerResolution,
} from "./types";

type OAuthMetadata = Record<string, unknown>;

function cleanText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, maximumLength) : null;
}

export function profileFromOAuthMetadata(metadata: OAuthMetadata) {
  const displayName =
    cleanText(metadata.full_name, 100) ??
    cleanText(metadata.name, 100) ??
    "Loopline user";

  const avatarCandidate =
    cleanText(metadata.avatar_url, 2048) ?? cleanText(metadata.picture, 2048);
  let avatarUrl: string | null = null;

  if (avatarCandidate) {
    try {
      const parsed = new URL(avatarCandidate);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        avatarUrl = parsed.toString();
      }
    } catch {
      avatarUrl = null;
    }
  }

  return { displayName, avatarUrl };
}

export type ProfileRow = {
  display_name: string;
  avatar_url: string | null;
};

export type ProfileRepository = {
  read(userId: string): Promise<{
    profile: ProfileRow | null;
    error: boolean;
  }>;
  create(
    userId: string,
    profile: { displayName: string; avatarUrl: string | null },
  ): Promise<{ error: boolean }>;
};

export async function resolveViewerProfile(
  identity: VerifiedIdentity,
  repository: ProfileRepository,
): Promise<ViewerResolution> {
  const result = await repository.read(identity.id);
  if (result.error) {
    return { status: "profile_error", userId: identity.id };
  }

  const metadataProfile = profileFromOAuthMetadata(identity.metadata);
  if (!result.profile) {
    const created = await repository.create(identity.id, metadataProfile);
    if (created.error) {
      return { status: "profile_error", userId: identity.id };
    }
  }

  return {
    status: "ready",
    viewer: {
      id: identity.id,
      displayName: result.profile
        ? result.profile.display_name
        : metadataProfile.displayName,
      avatarUrl: result.profile
        ? result.profile.avatar_url
        : metadataProfile.avatarUrl,
    },
  };
}
