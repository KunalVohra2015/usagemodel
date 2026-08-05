import { isIP } from "node:net";

export type NormalizedWebsite = {
  normalizedDomain: string;
  websiteUrl: string;
};

export class WebsiteNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebsiteNormalizationError";
  }
}

const MAX_WEBSITE_LENGTH = 2048;
const hostnameLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function normalizeCompanyWebsite(input: string): NormalizedWebsite {
  const value = input.trim();
  if (!value || value.length > MAX_WEBSITE_LENGTH) {
    throw new WebsiteNormalizationError("Enter a website no longer than 2,048 characters.");
  }

  const explicitScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  const parseableValue = explicitScheme ? value : `https://${value}`;
  let parsed: URL;

  try {
    parsed = new URL(parseableValue);
  } catch {
    throw new WebsiteNormalizationError("Enter a valid website or domain.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new WebsiteNormalizationError("Company websites must use HTTP or HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new WebsiteNormalizationError("Website addresses cannot contain credentials.");
  }
  if (parsed.port) {
    throw new WebsiteNormalizationError("Company websites cannot use a custom port.");
  }

  let hostname = parsed.hostname.toLowerCase();
  if (hostname.startsWith("www.")) hostname = hostname.slice(4);

  const ipCandidate = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
  const reservedSuffix = [".local", ".internal", ".test", ".invalid", ".example"]
    .some((suffix) => hostname.endsWith(suffix));
  if (
    hostname === "localhost"
    || hostname.endsWith(".localhost")
    || reservedSuffix
    || isIP(ipCandidate)
  ) {
    throw new WebsiteNormalizationError("Use a public company domain, not a local or IP address.");
  }

  const labels = hostname.split(".");
  if (
    hostname.length > 253 ||
    labels.length < 2 ||
    labels.some((label) => !hostnameLabel.test(label)) ||
    labels.at(-1)!.length < 2 ||
    !/^[a-z]/.test(labels.at(-1)!)
  ) {
    throw new WebsiteNormalizationError("Enter a valid public company hostname.");
  }

  return {
    normalizedDomain: hostname,
    websiteUrl: `https://${hostname}`,
  };
}
