import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseEnvironment,
  hasSupabaseEnvironment,
} from "@/lib/env";

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnvironment()) {
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
  await supabase.auth.getClaims();

  return supabaseResponse;
}
