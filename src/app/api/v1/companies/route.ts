import { NextResponse } from "next/server";
import {
  normalizeCompanyWebsite,
  WebsiteNormalizationError,
} from "@/features/organizations/domain-normalization";
import { getPublicCompanyByDomain } from "@/features/organizations/server";

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("domain") ?? "";
  try {
    const { normalizedDomain } = normalizeCompanyWebsite(input);
    const company = await getPublicCompanyByDomain(normalizedDomain);
    return NextResponse.json({ company });
  } catch (error) {
    if (error instanceof WebsiteNormalizationError) {
      return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
    }
    return NextResponse.json({ error: "directory_unavailable" }, { status: 503 });
  }
}
