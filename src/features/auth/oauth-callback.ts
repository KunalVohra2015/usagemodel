import type { OAuthContext } from "./oauth-context";

type ValidCallback = {
  status: "valid";
  code: string;
  context: OAuthContext;
  nextPath: string;
};

type InvalidCallback = {
  status: "invalid";
  reason: "missing_code" | "invalid_oauth_context";
};

export async function processOAuthCallback<T>(options: {
  code: string | null;
  context: OAuthContext | null;
  validateNextPath: (value: unknown, fallback?: string) => string;
  exchange: (code: string, flowId: string) => Promise<T>;
}): Promise<InvalidCallback | (ValidCallback & { exchange: T })> {
  if (!options.code) {
    return { status: "invalid", reason: "missing_code" };
  }
  if (!options.context) {
    return { status: "invalid", reason: "invalid_oauth_context" };
  }

  const nextPath = options.context.nextPath
    ? options.validateNextPath(options.context.nextPath, "")
    : "/feedback";
  if (!nextPath) {
    return { status: "invalid", reason: "invalid_oauth_context" };
  }

  const exchange = await options.exchange(
    options.code,
    options.context.flowId,
  );
  return {
    status: "valid",
    code: options.code,
    context: options.context,
    nextPath,
    exchange,
  };
}
