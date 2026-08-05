export const OAUTH_CONTEXT_COOKIE = "loopline_oauth_context";
export const OAUTH_PENDING_COOKIE = "loopline_oauth_pending";
export const OAUTH_CONTEXT_MAX_AGE_SECONDS = 10 * 60;

const FLOW_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

export type OAuthContext = {
  nextPath?: string;
  flowId: string;
  expiresAt: number;
};

export function isValidPkceFlowId(value: unknown): value is string {
  return typeof value === "string" && FLOW_ID_PATTERN.test(value);
}

export function hasPendingOAuthAttempt(value: string | undefined) {
  return value === "1";
}

export function serializeOAuthContext(context: OAuthContext) {
  return encodeURIComponent(JSON.stringify(context));
}

export function parseOAuthContext(
  value: string | undefined,
  now = Date.now(),
) {
  if (!value || value.length > 2300) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<OAuthContext>;
    if (
      (parsed.nextPath !== undefined && typeof parsed.nextPath !== "string") ||
      !isValidPkceFlowId(parsed.flowId) ||
      !Number.isInteger(parsed.expiresAt) ||
      parsed.expiresAt! <= now ||
      parsed.expiresAt! > now + OAUTH_CONTEXT_MAX_AGE_SECONDS * 1000
    ) {
      return null;
    }
    return {
      nextPath: parsed.nextPath,
      flowId: parsed.flowId,
      expiresAt: parsed.expiresAt!,
    };
  } catch {
    return null;
  }
}

export function oauthPendingCookieOptions(production: boolean) {
  return {
    ...oauthContextCookieOptions(production),
    path: "/login",
  };
}

export function expiredOAuthPendingCookieOptions(production: boolean) {
  return {
    ...oauthPendingCookieOptions(production),
    maxAge: 0,
    expires: new Date(0),
  };
}

export function oauthContextCookieOptions(production: boolean) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/auth/callback",
    maxAge: OAUTH_CONTEXT_MAX_AGE_SECONDS,
  };
}

export function expiredOAuthContextCookieOptions(production: boolean) {
  return {
    ...oauthContextCookieOptions(production),
    maxAge: 0,
    expires: new Date(0),
  };
}
