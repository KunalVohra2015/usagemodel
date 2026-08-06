"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedIdentity } from "@/features/auth/server";
import {
  persistFeedbackSubmission,
  type FeedbackSubmissionInput,
  type FeedbackSubmissionResult,
} from "@/features/feedback/submission";
import {
  normalizeCompanyWebsite,
  WebsiteNormalizationError,
} from "@/features/organizations/domain-normalization";
import { createOrReuseMockCompany } from "@/features/organizations/mock-directory";
import { companyFromRow } from "@/features/organizations/server";
import type {
  CompanyClaimStatus,
  CreateCompanyResult,
} from "@/features/organizations/types";
import { getSupabaseEnvironmentStatus } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type CompanyRpcRow = {
  id: string;
  name: string;
  slug: string;
  website_url: string;
  normalized_domain: string;
  claim_status: CompanyClaimStatus;
  created: boolean;
};

class CompanyNameValidationError extends Error {}

function cleanCompanyName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120 || /[<>\u0000-\u001f\u007f]/.test(name)) {
    throw new CompanyNameValidationError("Enter a company name between 2 and 120 characters without markup.");
  }
  return name;
}

export async function createOrReuseCompany(
  companyName: string,
  websiteInput: string,
): Promise<CreateCompanyResult> {
  try {
    const name = cleanCompanyName(companyName);
    const normalized = normalizeCompanyWebsite(websiteInput);

    if (getSupabaseEnvironmentStatus() !== "configured") {
      const result = createOrReuseMockCompany(name, normalized);
      return {
        ok: true,
        created: result.created,
        demo: true,
        company: result.company,
      };
    }

    const identity = await getVerifiedIdentity();
    if (!identity) return { ok: false, message: "Sign in before adding a company." };

    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc("find_or_create_unclaimed_organization", {
        company_name: name,
        company_website: normalized.websiteUrl,
      })
      .single();

    if (error || !data) {
      console.error("Company directory creation failed", {
        operation: "find_or_create_company",
      });
      return { ok: false, message: "We could not add that company. Please try again." };
    }

    const row = data as CompanyRpcRow;
    return {
      ok: true,
      company: companyFromRow(row),
      created: row.created,
      demo: false,
    };
  } catch (error) {
    if (!(error instanceof WebsiteNormalizationError) && !(error instanceof CompanyNameValidationError)) {
      console.error("Company directory request failed", {
        operation: "normalize_or_create_company",
      });
    }
    return {
      ok: false,
      message: error instanceof WebsiteNormalizationError || error instanceof CompanyNameValidationError
        ? error.message
        : "We could not add that company. Please try again.",
    };
  }
}

export async function submitFeedback(
  input: FeedbackSubmissionInput,
): Promise<FeedbackSubmissionResult> {
  if (getSupabaseEnvironmentStatus() !== "configured") {
    return {
      ok: false,
      errors: { form: "Feedback is not persisted in demo mode." },
    };
  }

  const identity = await getVerifiedIdentity();
  if (!identity) {
    return {
      ok: false,
      errors: { form: "Sign in before submitting feedback." },
    };
  }
  const supabase = await createClient();
  const result = await persistFeedbackSubmission({
    identityId: identity.id,
    input,
    store: {
      async organizationIsActive(organizationId) {
        const { data, error } = await supabase
          .from("organizations")
          .select("id")
          .eq("id", organizationId)
          .eq("is_active", true)
          .maybeSingle();
        return !error && Boolean(data);
      },
      async insert(feedback) {
        const { data, error } = await supabase
          .from("feedback")
          .insert({
            submitter_id: feedback.submitterId,
            organization_id: feedback.organizationId,
            type: feedback.type,
            title: feedback.title,
            description: feedback.description,
            source_url: feedback.sourceUrl,
            page_title: feedback.pageTitle,
            selected_text: feedback.selectedText,
          })
          .select("id")
          .single();
        return { id: data?.id ?? null, error: Boolean(error) };
      },
    },
  });

  if (!result.ok) {
    if (result.errors.form === "We could not save your feedback. Please try again.") {
      console.error("Feedback submission failed", {
        operation: "insert_feedback",
      });
    }
    return result;
  }

  revalidatePath("/feedback");
  revalidatePath(`/feedback/${result.feedbackId}`);
  return result;
}
