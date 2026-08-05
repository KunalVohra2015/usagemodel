const protectedDestinations = ["/feedback", "/dashboard"] as const;

export function getSafeNextPath(
  value: unknown,
  fallback = "/feedback",
) {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 2048 ||
    value.includes("\\")
  ) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(value, "https://loopline.local");
  } catch {
    return fallback;
  }

  if (
    parsed.origin !== "https://loopline.local" ||
    !protectedDestinations.some(
      (destination) =>
        parsed.pathname === destination ||
        parsed.pathname.startsWith(`${destination}/`),
    )
  ) {
    return fallback;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function isProtectedPath(pathname: string) {
  return protectedDestinations.some(
    (destination) =>
      pathname === destination || pathname.startsWith(`${destination}/`),
  );
}

export function getAuthenticationRedirect(
  pathname: string,
  search: string,
  authenticated: boolean,
  requestedNext: unknown,
) {
  if (isProtectedPath(pathname) && !authenticated) {
    return `/login?next=${encodeURIComponent(`${pathname}${search}`)}`;
  }

  if (pathname === "/login" && authenticated) {
    return getSafeNextPath(requestedNext);
  }

  return null;
}
