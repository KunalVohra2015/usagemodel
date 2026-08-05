import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseEnvironment,
  getSupabaseEnvironmentStatus,
} from "@/lib/env";
import {
  getAuthenticationRedirect,
} from "@/features/auth/redirects";

function redirectWithSession(
  url: URL,
  sessionResponse: NextResponse,
) {
  const redirectResponse = NextResponse.redirect(url);

  sessionResponse.cookies.getAll().forEach((cookie) =>
    redirectResponse.cookies.set(cookie),
  );

  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = sessionResponse.headers.get(header);
    if (value) redirectResponse.headers.set(header, value);
  }

  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  const environmentStatus = getSupabaseEnvironmentStatus();
  if (environmentStatus !== "configured") {
    if (environmentStatus === "incomplete") {
      console.error("Supabase authentication configuration is incomplete.");
    }
    // Auth is not connected to the prototype yet. Keeping this a no-op allows
    // the approved mock UI to run before local environment setup is complete.
    return NextResponse.next({ request });
  }

  const { url, publishableKey } = getSupabaseEnvironment();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          supabaseResponse.headers.set(name, value),
        );
      },
    },
  });

  // getClaims validates the access token and refreshes the cookie-backed
  // session when needed. It does not protect routes by itself.
  const { data, error } = await supabase.auth.getClaims();
  const authenticated = !error && typeof data?.claims?.sub === "string";
  const { pathname, search } = request.nextUrl;

  const destination = getAuthenticationRedirect(
    pathname,
    search,
    authenticated,
    request.nextUrl.searchParams.get("next"),
  );
  if (destination) {
    return redirectWithSession(
      new URL(destination, request.url),
      supabaseResponse,
    );
  }

  return supabaseResponse;
}
