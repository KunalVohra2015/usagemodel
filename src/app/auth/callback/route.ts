import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  expiredOAuthContextCookieOptions,
  expiredOAuthPendingCookieOptions,
  OAUTH_CONTEXT_COOKIE,
  OAUTH_PENDING_COOKIE,
  parseOAuthContext,
} from "@/features/auth/oauth-context";
import { processOAuthCallback } from "@/features/auth/oauth-callback";
import { getSafeNextPath } from "@/features/auth/redirects";
import { profileFromOAuthMetadata } from "@/features/auth/profile";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type CodeExchangeResult = Awaited<
  ReturnType<SupabaseServerClient["auth"]["exchangeCodeForSession"]>
>;

function errorRedirect(request: NextRequest, reason: string) {
  const url = new URL("/auth/error", request.url);
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

function clearOAuthContext(response: NextResponse) {
  response.cookies.set(
    OAUTH_CONTEXT_COOKIE,
    "",
    expiredOAuthContextCookieOptions(process.env.NODE_ENV === "production"),
  );
  response.cookies.set(
    OAUTH_PENDING_COOKIE,
    "",
    expiredOAuthPendingCookieOptions(process.env.NODE_ENV === "production"),
  );
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const cookieStore = await cookies();
  const context = parseOAuthContext(
    cookieStore.get(OAUTH_CONTEXT_COOKIE)?.value,
  );
  let supabase: SupabaseServerClient | null = null;
  let processed: Awaited<
    ReturnType<typeof processOAuthCallback<CodeExchangeResult>>
  >;
  try {
    processed = await processOAuthCallback({
      code,
      context,
      validateNextPath: getSafeNextPath,
      exchange: async (authorizationCode, flowId) => {
        supabase = await createClient();
        return supabase.auth.exchangeCodeForSession(authorizationCode, {
          flowId,
        });
      },
    });
  } catch {
    return clearOAuthContext(errorRedirect(request, "exchange_failed"));
  }

  if (processed.status === "invalid") {
    return clearOAuthContext(errorRedirect(request, processed.reason));
  }

  const authenticatedSupabase = supabase!;
  const { data: exchange, error: exchangeError } = processed.exchange;

  if (exchangeError || !exchange.user) {
    return clearOAuthContext(errorRedirect(request, "exchange_failed"));
  }

  const { data: claimsData, error: claimsError } =
    await authenticatedSupabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (
    claimsError ||
    typeof userId !== "string" ||
    userId !== exchange.user.id
  ) {
    await authenticatedSupabase.auth.signOut({ scope: "local" });
    return clearOAuthContext(errorRedirect(request, "verification_failed"));
  }

  const profile = profileFromOAuthMetadata(exchange.user.user_metadata);
  const { error: profileError } = await authenticatedSupabase.from("profiles").upsert(
    {
      id: userId,
      display_name: profile.displayName,
      avatar_url: profile.avatarUrl,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  if (profileError) {
    console.error("Authenticated profile setup failed", {
      operation: "oauth_callback_profile_upsert",
    });
  }

  return clearOAuthContext(
    NextResponse.redirect(new URL(processed.nextPath, request.url)),
  );
}
