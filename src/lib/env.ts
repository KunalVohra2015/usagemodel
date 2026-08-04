type SupabaseEnvironment = {
  url: string;
  publishableKey: string;
};

function readSupabaseEnvironment(): Partial<SupabaseEnvironment> {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function hasSupabaseEnvironment() {
  const environment = readSupabaseEnvironment();

  if (Boolean(environment.url) !== Boolean(environment.publishableKey)) {
    throw new Error(
      "Supabase environment configuration is incomplete; set both public variables.",
    );
  }

  return Boolean(environment.url && environment.publishableKey);
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
