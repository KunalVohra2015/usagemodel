import assert from "node:assert/strict";
import test from "node:test";
import { GoTrueClient } from "@supabase/auth-js";
import { beginLoginAttempt } from "../src/features/auth/login-attempt.ts";
import {
  AUTH_UNAVAILABLE_MESSAGE,
  getLoginAvailability,
  resolveLoginIdentity,
} from "../src/features/auth/login-environment.ts";
import {
  expiredOAuthContextCookieOptions,
  expiredOAuthPendingCookieOptions,
  hasPendingOAuthAttempt,
  OAUTH_CONTEXT_MAX_AGE_SECONDS,
  oauthContextCookieOptions,
  oauthPendingCookieOptions,
  parseOAuthContext,
  serializeOAuthContext,
} from "../src/features/auth/oauth-context.ts";
import { processOAuthCallback } from "../src/features/auth/oauth-callback.ts";
import { resolveProtectedLayoutContext } from "../src/features/auth/protected-layout.ts";
import {
  profileFromOAuthMetadata,
  resolveViewerProfile,
} from "../src/features/auth/profile-resolution.ts";
import {
  getAuthenticationRedirect,
  getSafeNextPath,
  isProtectedPath,
} from "../src/features/auth/redirects.ts";
import {
  getSupabaseEnvironmentStatus,
  isSupabaseEnvironmentAvailable,
} from "../src/lib/env.ts";

test("classifies complete, absent, and partial Supabase environments", () => {
  const configured = {
    NEXT_PUBLIC_SUPABASE_URL: "https://project.example.test",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-placeholder",
  };
  assert.equal(getSupabaseEnvironmentStatus(configured), "configured");
  assert.equal(isSupabaseEnvironmentAvailable(configured), true);
  assert.equal(getSupabaseEnvironmentStatus({}), "missing");
  assert.equal(isSupabaseEnvironmentAvailable({}), false);
  assert.equal(getSupabaseEnvironmentStatus({
    NEXT_PUBLIC_SUPABASE_URL: configured.NEXT_PUBLIC_SUPABASE_URL,
  }), "incomplete");
  assert.equal(getSupabaseEnvironmentStatus({
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: configured.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }), "incomplete");
});

test("mock login remains renderable without constructing an auth client", async () => {
  for (const status of ["missing", "incomplete"]) {
    const availability = getLoginAvailability(status);
    let identityCalls = 0;
    const identity = await resolveLoginIdentity(
      availability.authenticationAvailable,
      async () => {
        identityCalls += 1;
        throw new Error("must not construct a Supabase client");
      },
    );
    assert.equal(identity, null);
    assert.equal(identityCalls, 0);
    assert.equal(availability.authenticationAvailable, false);
    assert.equal(availability.message, AUTH_UNAVAILABLE_MESSAGE);
  }
});

test("configured login preserves authenticated identity resolution", async () => {
  const availability = getLoginAvailability("configured");
  let identityCalls = 0;
  const identity = await resolveLoginIdentity(
    availability.authenticationAvailable,
    async () => {
      identityCalls += 1;
      return { id: "verified-user" };
    },
  );
  assert.deepEqual(identity, { id: "verified-user" });
  assert.equal(identityCalls, 1);
  assert.equal(availability.message, null);
});

test("all protected prototype routes resolve to mock shells without auth calls", async () => {
  const routes = [
    ["/feedback", "feedback"],
    ["/feedback/new", "feedback"],
    ["/feedback/fb-104", "feedback"],
    ["/dashboard", "dashboard"],
    ["/dashboard/feedback/fb-104", "dashboard"],
  ];

  for (const environmentStatus of ["missing", "incomplete"]) {
    for (const [route, area] of routes) {
      let viewerCalls = 0;
      let membershipCalls = 0;
      const context = await resolveProtectedLayoutContext({
        environmentStatus,
        area,
        async requireViewer() {
          viewerCalls += 1;
          throw new Error("mock mode must not construct a Supabase client");
        },
        async getMembership() {
          membershipCalls += 1;
          throw new Error("mock mode must not query membership");
        },
      });

      assert.equal(context.mode, "mock", route);
      assert.equal(viewerCalls, 0, route);
      assert.equal(membershipCalls, 0, route);
      assert.equal(context.viewer.displayName, "Demo user", route);
      assert.equal(Boolean(context.membership), area === "dashboard", route);
    }
  }
});

test("configured feedback requires a verified viewer", async () => {
  let viewerCalls = 0;
  let membershipCalls = 0;
  const viewer = {
    id: "verified-user",
    displayName: "Verified User",
    avatarUrl: null,
  };
  const context = await resolveProtectedLayoutContext({
    environmentStatus: "configured",
    area: "feedback",
    async requireViewer(nextPath) {
      viewerCalls += 1;
      assert.equal(nextPath, "/feedback");
      return { status: "ready", viewer };
    },
    async getMembership() {
      membershipCalls += 1;
      return null;
    },
  });
  assert.equal(context.mode, "authenticated");
  assert.equal(viewerCalls, 1);
  assert.equal(membershipCalls, 0);
});

test("configured dashboard requires organization membership", async () => {
  const viewer = {
    id: "verified-user",
    displayName: "Verified User",
    avatarUrl: null,
  };
  let membershipCalls = 0;
  const denied = await resolveProtectedLayoutContext({
    environmentStatus: "configured",
    area: "dashboard",
    async requireViewer(nextPath) {
      assert.equal(nextPath, "/dashboard");
      return { status: "ready", viewer };
    },
    async getMembership(userId) {
      membershipCalls += 1;
      assert.equal(userId, viewer.id);
      return null;
    },
  });
  assert.deepEqual(denied, { mode: "access_denied", viewer });
  assert.equal(membershipCalls, 1);

  const membership = {
    organizationId: "org-1",
    organizationName: "Acme Software",
    organizationSlug: "acme-software",
    role: "member",
  };
  const allowed = await resolveProtectedLayoutContext({
    environmentStatus: "configured",
    area: "dashboard",
    async requireViewer() {
      return { status: "ready", viewer };
    },
    async getMembership() {
      return membership;
    },
  });
  assert.equal(allowed.mode, "authenticated");
  assert.deepEqual(allowed.membership, membership);
});

test("configured unauthenticated routes redirect while mock mode cannot loop", () => {
  assert.equal(
    getAuthenticationRedirect("/feedback/new", "", false, null),
    "/login?next=%2Ffeedback%2Fnew",
  );
  assert.equal(
    getAuthenticationRedirect("/dashboard", "", false, null),
    "/login?next=%2Fdashboard",
  );
  assert.equal(getAuthenticationRedirect("/login", "", false, null), null);
});

test("accepts only protected relative next destinations", () => {
  assert.equal(getSafeNextPath("/feedback/fb-104?tab=activity"), "/feedback/fb-104?tab=activity");
  assert.equal(getSafeNextPath("/dashboard"), "/dashboard");
  assert.equal(getSafeNextPath("https://attacker.test"), "/feedback");
  assert.equal(getSafeNextPath("//attacker.test/dashboard"), "/feedback");
  assert.equal(getSafeNextPath("/\\attacker.test"), "/feedback");
  assert.equal(getSafeNextPath("/auth/callback"), "/feedback");
  assert.equal(getSafeNextPath(["/dashboard", "//attacker.test"]), "/feedback");
  assert.equal(getSafeNextPath("javascript:alert(1)"), "/feedback");
});

test("recognizes every protected route family", () => {
  assert.equal(isProtectedPath("/feedback"), true);
  assert.equal(isProtectedPath("/feedback/new"), true);
  assert.equal(isProtectedPath("/dashboard/feedback/fb-104"), true);
  assert.equal(isProtectedPath("/login"), false);
  assert.equal(isProtectedPath("/feedback-public"), false);
});

test("normalizes safe profile metadata and provides fallbacks", () => {
  assert.deepEqual(
    profileFromOAuthMetadata({
      full_name: "  Maya   Chen  ",
      avatar_url: "https://images.example.test/maya.png",
    }),
    { displayName: "Maya Chen", avatarUrl: "https://images.example.test/maya.png" },
  );
  assert.deepEqual(
    profileFromOAuthMetadata({ full_name: "", avatar_url: "javascript:alert(1)" }),
    { displayName: "Loopline user", avatarUrl: null },
  );
});

test("OAuth context is short-lived, HttpOnly, narrowly scoped, and safely parsed", () => {
  const now = Date.now();
  const encoded = serializeOAuthContext({
    nextPath: "/dashboard/feedback/fb-104",
    flowId: "12345678_valid-flow",
    expiresAt: now + 60_000,
  });
  assert.deepEqual(parseOAuthContext(encoded, now), {
    nextPath: "/dashboard/feedback/fb-104",
    flowId: "12345678_valid-flow",
    expiresAt: now + 60_000,
  });
  assert.equal(parseOAuthContext(undefined), null);
  assert.equal(parseOAuthContext("not-json"), null);
  assert.equal(parseOAuthContext(serializeOAuthContext({
    nextPath: "/feedback",
    flowId: "bad",
    expiresAt: now + 60_000,
  }), now), null);
  assert.equal(parseOAuthContext(serializeOAuthContext({
    nextPath: "/feedback",
    flowId: "12345678_valid-flow",
    expiresAt: now - 1,
  }), now), null);
  assert.equal(parseOAuthContext(serializeOAuthContext({
    nextPath: "/feedback",
    flowId: "12345678_valid-flow",
    expiresAt: now + (OAUTH_CONTEXT_MAX_AGE_SECONDS + 1) * 1000,
  }), now), null);
  assert.deepEqual(oauthContextCookieOptions(false), {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: OAUTH_CONTEXT_MAX_AGE_SECONDS,
  });
  assert.equal(oauthContextCookieOptions(true).secure, true);
  assert.equal(expiredOAuthContextCookieOptions(true).maxAge, 0);
  assert.equal(expiredOAuthContextCookieOptions(true).expires.getTime(), 0);
  assert.equal(oauthPendingCookieOptions(false).path, "/login");
  assert.equal(expiredOAuthPendingCookieOptions(true).maxAge, 0);
  assert.equal(hasPendingOAuthAttempt("1"), true);
  assert.equal(hasPendingOAuthAttempt(undefined), false);
});

test("OAuth callback exchanges only a valid code and unexpired correlated context", async () => {
  const now = Date.now();
  const validContext = parseOAuthContext(serializeOAuthContext({
    nextPath: "/dashboard",
    flowId: "12345678_valid-flow",
    expiresAt: now + 60_000,
  }), now);
  let exchangeCalls = 0;
  const exchange = async (code, flowId) => {
    exchangeCalls += 1;
    assert.equal(code, "authorization-code");
    assert.equal(flowId, "12345678_valid-flow");
    return { ok: true };
  };

  const valid = await processOAuthCallback({
    code: "authorization-code",
    context: validContext,
    validateNextPath: getSafeNextPath,
    exchange,
  });
  assert.equal(valid.status, "valid");
  assert.equal(valid.nextPath, "/dashboard");
  assert.equal(exchangeCalls, 1);

  for (const invalid of [
    { code: null, context: validContext, reason: "missing_code" },
    { code: "authorization-code", context: null, reason: "invalid_oauth_context" },
  ]) {
    const result = await processOAuthCallback({
      code: invalid.code,
      context: invalid.context,
      validateNextPath: getSafeNextPath,
      exchange,
    });
    assert.deepEqual(result, { status: "invalid", reason: invalid.reason });
  }
  assert.equal(exchangeCalls, 1, "invalid callbacks must not invoke exchange");
});

test("OAuth callback rejects malformed, expired, missing-flow, and unsafe contexts before exchange", async () => {
  const now = Date.now();
  const rawContexts = [
    undefined,
    "malformed-cookie",
    serializeOAuthContext({
      nextPath: "/feedback",
      flowId: "12345678_valid-flow",
      expiresAt: now - 1,
    }),
    encodeURIComponent(JSON.stringify({
      nextPath: "/feedback",
      expiresAt: now + 60_000,
    })),
  ];
  let exchangeCalls = 0;

  for (const rawContext of rawContexts) {
    const result = await processOAuthCallback({
      code: "sensitive-authorization-code",
      context: parseOAuthContext(rawContext, now),
      validateNextPath: getSafeNextPath,
      exchange: async () => {
        exchangeCalls += 1;
        return { ok: true };
      },
    });
    assert.deepEqual(result, {
      status: "invalid",
      reason: "invalid_oauth_context",
    });
    assert.equal(JSON.stringify(result).includes("sensitive-authorization-code"), false);
  }

  const unsafeNext = parseOAuthContext(serializeOAuthContext({
    nextPath: "//attacker.test",
    flowId: "12345678_valid-flow",
    expiresAt: now + 60_000,
  }), now);
  const unsafeResult = await processOAuthCallback({
    code: "sensitive-authorization-code",
    context: unsafeNext,
    validateNextPath: getSafeNextPath,
    exchange: async () => {
      exchangeCalls += 1;
      return { ok: true };
    },
  });
  assert.deepEqual(unsafeResult, {
    status: "invalid",
    reason: "invalid_oauth_context",
  });
  assert.equal(exchangeCalls, 0);
});

test("valid OAuth context without a destination falls back to feedback", async () => {
  const now = Date.now();
  const context = parseOAuthContext(serializeOAuthContext({
    flowId: "12345678_valid-flow",
    expiresAt: now + 60_000,
  }), now);
  const result = await processOAuthCallback({
    code: "authorization-code",
    context,
    validateNextPath: getSafeNextPath,
    exchange: async () => ({ ok: true }),
  });
  assert.equal(result.status, "valid");
  assert.equal(result.nextPath, "/feedback");
});

test("profile resolution initializes a missing profile from safe OAuth metadata", async () => {
  const identity = {
    id: "user-1",
    metadata: { full_name: "Maya Chen", avatar_url: "https://example.test/maya.png" },
  };
  let createdValues;
  const created = await resolveViewerProfile(identity, {
    async read() {
      return { profile: null, error: false };
    },
    async create(userId, profile) {
      assert.equal(userId, identity.id);
      createdValues = profile;
      return { error: false };
    },
  });
  assert.equal(created.status, "ready");
  assert.deepEqual(createdValues, {
    displayName: "Maya Chen",
    avatarUrl: "https://example.test/maya.png",
  });
  assert.equal(created.viewer.avatarUrl, "https://example.test/maya.png");
});

test("existing profile fields remain authoritative across repeated resolution", async () => {
  const identity = {
    id: "user-1",
    metadata: { full_name: "Google Name", avatar_url: "https://google.test/avatar.png" },
  };
  const resolveExisting = (avatarUrl) => resolveViewerProfile(identity, {
    async read() {
      return {
        profile: { display_name: "User Edited Name", avatar_url: avatarUrl },
        error: false,
      };
    },
    async create() {
      throw new Error("existing profiles must never be recreated");
    },
  });

  const custom = await resolveExisting("https://custom.test/avatar.png");
  assert.equal(custom.status, "ready");
  assert.equal(custom.viewer.displayName, "User Edited Name");
  assert.equal(custom.viewer.avatarUrl, "https://custom.test/avatar.png");

  const cleared = await resolveExisting(null);
  assert.equal(cleared.status, "ready");
  assert.equal(cleared.viewer.displayName, "User Edited Name");
  assert.equal(cleared.viewer.avatarUrl, null);

  const repeated = await resolveExisting(null);
  assert.equal(repeated.status, "ready");
  assert.equal(repeated.viewer.displayName, "User Edited Name");
  assert.equal(repeated.viewer.avatarUrl, null);
});

test("missing or malformed OAuth avatars initialize safely", async () => {
  for (const metadata of [
    { full_name: "No Avatar" },
    { full_name: "Unsafe Avatar", avatar_url: "javascript:alert(1)" },
    { full_name: "Malformed Avatar", avatar_url: "://bad-url" },
  ]) {
    let createdAvatar = "not-called";
    const result = await resolveViewerProfile({ id: "user-1", metadata }, {
      async read() {
        return { profile: null, error: false };
      },
      async create(_userId, profile) {
        createdAvatar = profile.avatarUrl;
        return { error: false };
      },
    });
    assert.equal(result.status, "ready");
    assert.equal(createdAvatar, null);
    assert.equal(result.viewer.avatarUrl, null);
  }
});

test("profile resolution returns a controlled state for repository failures", async () => {
  const identity = {
    id: "user-1",
    metadata: { full_name: "Maya Chen" },
  };

  const createFailure = await resolveViewerProfile(identity, {
    async read() {
      return { profile: null, error: false };
    },
    async create() {
      return { error: true };
    },
  });
  assert.deepEqual(createFailure, { status: "profile_error", userId: identity.id });

  const readFailure = await resolveViewerProfile(identity, {
    async read() {
      return { profile: null, error: true };
    },
    async create() {
      throw new Error("must not create after a failed lookup");
    },
  });
  assert.deepEqual(readFailure, { status: "profile_error", userId: identity.id });
});

test("verified authentication decisions cannot form a login/profile loop", () => {
  assert.equal(getAuthenticationRedirect("/feedback", "", false, null), "/login?next=%2Ffeedback");
  assert.equal(getAuthenticationRedirect("/login", "", true, "/feedback"), "/feedback");
  assert.equal(getAuthenticationRedirect("/feedback", "", true, null), null);
  assert.equal(getAuthenticationRedirect("/login", "", false, null), null);
});

test("repeated login activation is rejected while an attempt is pending", () => {
  const inFlight = { current: false };
  assert.equal(beginLoginAttempt(inFlight), true);
  assert.equal(beginLoginAttempt(inFlight), false);
});

test("pinned auth SDK correlates PKCE flows and persists returned provider tokens", async () => {
  const items = new Map();
  const storage = {
    async getItem(key) { return items.get(key) ?? null; },
    async setItem(key, value) { items.set(key, value); },
    async removeItem(key) { items.delete(key); },
  };
  const fakeUser = {
    id: "11111111-1111-1111-1111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "test@example.test",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: "2026-01-01T00:00:00.000Z",
  };
  const auth = new GoTrueClient({
    url: "https://project.example.test/auth/v1",
    headers: { apikey: "fake-publishable-key" },
    storageKey: "sdk-behavior-test",
    storage,
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    skipAutoInitialize: true,
    fetch: async (url) => {
      assert.match(String(url), /\/token\?grant_type=pkce$/);
      return new Response(JSON.stringify({
        access_token: "fake-supabase-access",
        refresh_token: "fake-supabase-refresh",
        expires_in: 3600,
        token_type: "bearer",
        provider_token: "fake-provider-access",
        user: fakeUser,
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  const callbackUrl = "http://localhost:3000/auth/callback";
  const started = await auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl, skipBrowserRedirect: true },
  });
  assert.equal(started.error, null);
  assert.match(started.data.flowId, /^[a-zA-Z0-9_-]{8,64}$/);
  assert.equal(new URL(started.data.url).searchParams.get("redirect_to"), callbackUrl);

  const invalidFlow = await auth.exchangeCodeForSession("fake-code", {
    flowId: "invalid",
  });
  assert.ok(invalidFlow.error);

  const exchanged = await auth.exchangeCodeForSession("fake-code", { flowId: started.data.flowId });
  assert.equal(exchanged.error, null);
  const stored = JSON.parse(items.get("sdk-behavior-test"));
  assert.equal(stored.access_token, "fake-supabase-access");
  assert.equal(stored.refresh_token, "fake-supabase-refresh");
  assert.equal(stored.provider_token, "fake-provider-access");
});
