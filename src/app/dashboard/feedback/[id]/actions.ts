"use server";

import { revalidatePath } from "next/cache";
import {
  getOrganizationMemberships,
  getVerifiedIdentity,
} from "@/features/auth/server";
import { membershipForOrganization } from "@/features/dashboard/authorization";
import {
  validateOfficialResponse,
  validateStatusUpdate,
  type DashboardMutationResult,
} from "@/features/dashboard/mutations";
import { isFeedbackUuid } from "@/features/feedback/submission";
import type { FeedbackStatus } from "@/features/feedback/types";
import { getSupabaseEnvironmentStatus } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type FeedbackAuthorizationRow = {
  id: string;
  organization_id: string;
  status: FeedbackStatus;
  feedback_responses: Array<{ id: string }> | null;
};

async function getMutationContext(feedbackId: string) {
  if (getSupabaseEnvironmentStatus() !== "configured" || !isFeedbackUuid(feedbackId)) {
    return null;
  }
  const identity = await getVerifiedIdentity();
  if (!identity) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("id, organization_id, status, feedback_responses(id)")
    .eq("id", feedbackId)
    .maybeSingle();
  if (error || !data) return null;
  const membership = membershipForOrganization(
    await getOrganizationMemberships(identity.id),
    data.organization_id,
  );
  if (!membership) return null;
  return {
    identity,
    membership,
    feedback: data as FeedbackAuthorizationRow,
    supabase,
  };
}

function refreshFeedbackLoop(feedbackId: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/feedback/${feedbackId}`);
  revalidatePath("/feedback");
  revalidatePath(`/feedback/${feedbackId}`);
}

export async function updateFeedbackStatus(
  feedbackId: string,
  requestedStatus: string,
): Promise<DashboardMutationResult> {
  const context = await getMutationContext(feedbackId);
  if (!context) return { ok: false, message: "Feedback was not found or access was denied." };
  const validation = validateStatusUpdate({
    requestedStatus,
    currentStatus: context.feedback.status,
    membership: context.membership,
  });
  if (!validation.ok) return validation;

  const { data, error } = await context.supabase
    .from("feedback")
    .update({ status: requestedStatus as FeedbackStatus })
    .eq("id", context.feedback.id)
    .eq("organization_id", context.membership.organizationId)
    .eq("status", context.feedback.status)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: "The status changed elsewhere or could not be saved. Refresh and try again." };
  }

  refreshFeedbackLoop(feedbackId);
  return { ok: true, message: "Status updated." };
}

export async function publishOfficialResponse(
  feedbackId: string,
  body: string,
): Promise<DashboardMutationResult> {
  const context = await getMutationContext(feedbackId);
  if (!context) return { ok: false, message: "Feedback was not found or access was denied." };
  const validation = validateOfficialResponse({
    body,
    membership: context.membership,
    responseExists: Boolean(context.feedback.feedback_responses?.length),
  });
  if (!validation.ok || !validation.body) return validation;

  const { error } = await context.supabase.from("feedback_responses").insert({
    feedback_id: context.feedback.id,
    organization_id: context.feedback.organization_id,
    author_id: context.identity.id,
    body: validation.body,
  });
  if (error) {
    return { ok: false, message: "The response could not be published. Refresh and try again." };
  }

  refreshFeedbackLoop(feedbackId);
  return { ok: true, message: "Official response published." };
}
