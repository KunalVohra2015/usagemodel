import "server-only";

import { getVerifiedIdentity } from "@/features/auth/server";
import { createClient } from "@/lib/supabase/server";
import type { FeedbackStatus, FeedbackType } from "./types";
import { isFeedbackUuid } from "./submission";

type OrganizationRelation = { name: string; slug: string };
type ResponseRow = { body: string; created_at: string };
type HistoryRow = {
  id: string;
  previous_status: FeedbackStatus | null;
  new_status: FeedbackStatus;
  created_at: string;
};

export type UserFeedbackSummary = {
  id: string;
  title: string;
  description: string;
  organization: string;
  organizationInitials: string;
  type: FeedbackType;
  status: FeedbackStatus;
  submittedAt: string;
  officialResponse?: { body: string; date: string };
};

export type UserFeedbackDetail = UserFeedbackSummary & {
  updatedAt: string;
  sourceUrl: string;
  pageTitle: string;
  selectedText: string | null;
  screenshotUrl: string | null;
  history: HistoryRow[];
  responses: ResponseRow[];
};

export type FeedbackQueryResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_found" }
  | { status: "error" };

function relatedOrganization(value: unknown): OrganizationRelation | null {
  if (Array.isArray(value)) return (value[0] as OrganizationRelation | undefined) ?? null;
  return (value as OrganizationRelation | null) ?? null;
}

export function organizationInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CO";
}

export async function listOwnFeedback(): Promise<
  FeedbackQueryResult<UserFeedbackSummary[]>
> {
  const identity = await getVerifiedIdentity();
  if (!identity) return { status: "error" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback")
    .select(
      "id, title, description, type, status, created_at, organizations!inner(name, slug), feedback_responses(body, created_at)",
    )
    .eq("submitter_id", identity.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("My Feedback query failed", { operation: "list_own_feedback" });
    return { status: "error" };
  }

  const items = data.flatMap((row) => {
    const organization = relatedOrganization(row.organizations);
    if (!organization) return [];
    const responses = (row.feedback_responses ?? []) as ResponseRow[];
    const latestResponse = [...responses].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )[0];
    return [{
      id: row.id,
      title: row.title,
      description: row.description,
      organization: organization.name,
      organizationInitials: organizationInitials(organization.name),
      type: row.type as FeedbackType,
      status: row.status as FeedbackStatus,
      submittedAt: row.created_at,
      officialResponse: latestResponse
        ? { body: latestResponse.body, date: latestResponse.created_at }
        : undefined,
    }];
  });

  return { status: "ok", data: items };
}

export async function getOwnFeedbackDetail(
  feedbackId: string,
): Promise<FeedbackQueryResult<UserFeedbackDetail>> {
  if (!isFeedbackUuid(feedbackId)) return { status: "not_found" };
  const identity = await getVerifiedIdentity();
  if (!identity) return { status: "not_found" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback")
    .select(
      "id, title, description, type, status, created_at, updated_at, source_url, page_title, selected_text, screenshot_path, organizations!inner(name, slug), feedback_status_history(id, previous_status, new_status, created_at), feedback_responses(body, created_at)",
    )
    .eq("id", feedbackId)
    .eq("submitter_id", identity.id)
    .maybeSingle();

  if (error) {
    console.error("Feedback detail query failed", { operation: "get_own_feedback" });
    return { status: "error" };
  }
  if (!data) return { status: "not_found" };

  const organization = relatedOrganization(data.organizations);
  if (!organization) return { status: "error" };

  let screenshotUrl: string | null = null;
  if (data.screenshot_path) {
    const { data: signedScreenshot, error: screenshotError } = await supabase.storage
      .from("feedback-screenshots")
      .createSignedUrl(data.screenshot_path, 60);
    if (!screenshotError) screenshotUrl = signedScreenshot.signedUrl;
  }

  const responses = [...((data.feedback_responses ?? []) as ResponseRow[])].sort(
    (a, b) => a.created_at.localeCompare(b.created_at),
  );
  const latestResponse = responses.at(-1);

  return {
    status: "ok",
    data: {
      id: data.id,
      title: data.title,
      description: data.description,
      organization: organization.name,
      organizationInitials: organizationInitials(organization.name),
      type: data.type as FeedbackType,
      status: data.status as FeedbackStatus,
      submittedAt: data.created_at,
      updatedAt: data.updated_at,
      sourceUrl: data.source_url,
      pageTitle: data.page_title,
      selectedText: data.selected_text,
      screenshotUrl,
      history: [...((data.feedback_status_history ?? []) as HistoryRow[])].sort(
        (a, b) => a.created_at.localeCompare(b.created_at),
      ),
      responses,
      officialResponse: latestResponse
        ? { body: latestResponse.body, date: latestResponse.created_at }
        : undefined,
    },
  };
}
