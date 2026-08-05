type SupabaseEnvironment = {
  url: string;
  publishableKey: string;
};

type EnvironmentSource = {
  [key: string]: string | undefined;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

export type SupabaseEnvironmentStatus =
  | "configured"
  | "missing"
  | "incomplete";

function readSupabaseEnvironment(
  source: EnvironmentSource = process.env,
): Partial<SupabaseEnvironment> {
  return {
    url: source.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getSupabaseEnvironmentStatus(
  source: EnvironmentSource = process.env,
): SupabaseEnvironmentStatus {
  const environment = readSupabaseEnvironment(source);
  const hasUrl = Boolean(environment.url);
  const hasKey = Boolean(environment.publishableKey);

  if (hasUrl && hasKey) return "configured";
  if (!hasUrl && !hasKey) return "missing";
  return "incomplete";
}

export function isSupabaseEnvironmentAvailable(
  source: EnvironmentSource = process.env,
) {
  return getSupabaseEnvironmentStatus(source) === "configured";
}

export function hasSupabaseEnvironment() {
  const status = getSupabaseEnvironmentStatus();

  if (status === "incomplete") {
    throw new Error(
      "Supabase environment configuration is incomplete; set both public variables.",
    );
  }

  return status === "configured";
}

export function getSupabaseEnvironment(): SupabaseEnvironment {
  const environment = readSupabaseEnvironment();

  if (!environment.url || !environment.publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(environment.url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "127.0.0.1") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must use HTTPS, except for local Supabase.",
    );
  }

  return {
    url: environment.url,
    publishableKey: environment.publishableKey,
  };
}
