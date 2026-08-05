"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  OAUTH_CONTEXT_COOKIE,
  OAUTH_CONTEXT_MAX_AGE_SECONDS,
  OAUTH_PENDING_COOKIE,
  hasPendingOAuthAttempt,
  oauthContextCookieOptions,
  oauthPendingCookieOptions,
  serializeOAuthContext,
} from "@/features/auth/oauth-context";
import { getSafeNextPath } from "@/features/auth/redirects";
import { createClient } from "@/lib/supabase/server";

type GoogleSignInResult =
  | { url: string; error?: never }
  | { url?: never; error: "start_failed" };

function getRequestOrigin(originHeader: string | null) {
  if (!originHeader) return null;

  try {
    const origin = new URL(originHeader);
    const localHttp =
      origin.protocol === "http:" &&
      (origin.hostname === "localhost" || origin.hostname === "127.0.0.1");
    if (
      (origin.protocol !== "https:" && !localHttp) ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    ) {
      return null;
    }
    return origin.origin;
  } catch {
    return null;
  }
}

export async function startGoogleSignIn(
  requestedNext: string,
): Promise<GoogleSignInResult> {
  const requestHeaders = await headers();
  const origin = getRequestOrigin(requestHeaders.get("origin"));
  if (!origin) return { error: "start_failed" };

  const nextPath = getSafeNextPath(requestedNext);
  const cookieStore = await cookies();
  if (hasPendingOAuthAttempt(cookieStore.get(OAUTH_PENDING_COOKIE)?.value)) {
    return { error: "start_failed" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      scopes: "openid email profile",
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url || !data.flowId) {
    return { error: "start_failed" };
  }

  const expiresAt = Date.now() + OAUTH_CONTEXT_MAX_AGE_SECONDS * 1000;
  cookieStore.set(
    OAUTH_CONTEXT_COOKIE,
    serializeOAuthContext({ nextPath, flowId: data.flowId, expiresAt }),
    oauthContextCookieOptions(process.env.NODE_ENV === "production"),
  );
  cookieStore.set(
    OAUTH_PENDING_COOKIE,
    "1",
    oauthPendingCookieOptions(process.env.NODE_ENV === "production"),
  );

  return { url: data.url };
}

export async function signOut() {
  const supabase = await createClient();

  // Verify the cookie-backed identity before performing the local sign-out.
  await supabase.auth.getClaims();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) redirect("/auth/error?reason=signout_failed");

  redirect("/login");
}
