import "server-only";

import {
  getOrganizationMemberships,
  getVerifiedIdentity,
} from "@/features/auth/server";
import { membershipForOrganization } from "./authorization";
import type {
  DashboardFeedbackDetail,
  DashboardFeedbackSummary,
  DashboardQueryResult,
} from "./types";
import { isFeedbackUuid } from "@/features/feedback/submission";
import type { FeedbackStatus, FeedbackType } from "@/features/feedback/types";
import { createClient } from "@/lib/supabase/server";

type ResponseRow = { body: string; created_at: string };
type ProfileRow = { id: string; display_name: string };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase()).join("") || "FU";
}

function latestResponse(value: unknown) {
  const responses = Array.isArray(value) ? value as ResponseRow[] : [];
  const latest = [...responses].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )[0];
  return latest ? { body: latest.body, createdAt: latest.created_at } : null;
}

export async function listOrganizationFeedback(
  organizationId: string,
): Promise<DashboardQueryResult<DashboardFeedbackSummary[]>> {
  if (!isFeedbackUuid(organizationId)) return { status: "not_found" };
  const identity = await getVerifiedIdentity();
  if (!identity) return { status: "not_found" };
  const membership = membershipForOrganization(
    await getOrganizationMemberships(identity.id),
    organizationId,
  );
  if (!membership) return { status: "not_found" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("id, submitter_id, title, description, type, status, created_at, page_title, source_url, screenshot_path, feedback_responses(body, created_at)")
    .eq("organization_id", membership.organizationId)
    .order("created_at", { ascending: false });
  if (error || !data) {
    console.error("Organization inbox query failed", {
      operation: "list_organization_feedback",
    });
    return { status: "error" };
  }

  const submitterIds = [...new Set(data.map((row) => row.submitter_id))];
  const profiles = new Map<string, string>();
  if (submitterIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", submitterIds);
    if (profileError) {
      console.error("Inbox submitter profile query failed", {
        operation: "list_inbox_submitter_profiles",
      });
      return { status: "error" };
    }
    for (const profile of (profileRows ?? []) as ProfileRow[]) {
      profiles.set(profile.id, profile.display_name);
    }
  }

  return {
    status: "ok",
    data: data.map((row) => {
      const displayName = profiles.get(row.submitter_id) ?? "Feedback user";
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.type as FeedbackType,
        status: row.status as FeedbackStatus,
        createdAt: row.created_at,
        pageTitle: row.page_title,
        sourceUrl: row.source_url,
        hasScreenshot: Boolean(row.screenshot_path),
        submitter: { displayName, initials: initials(displayName) },
        officialResponse: latestResponse(row.feedback_responses),
      };
    }),
  };
}

export async function getOrganizationFeedbackDetail(
  organizationId: string,
  feedbackId: string,
): Promise<DashboardQueryResult<DashboardFeedbackDetail>> {
  if (!isFeedbackUuid(organizationId) || !isFeedbackUuid(feedbackId)) {
    return { status: "not_found" };
  }
  const identity = await getVerifiedIdentity();
  if (!identity) return { status: "not_found" };
  const membership = membershipForOrganization(
    await getOrganizationMemberships(identity.id),
    organizationId,
  );
  if (!membership) return { status: "not_found" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("id, submitter_id, organization_id, title, description, type, status, created_at, page_title, source_url, selected_text, screenshot_path, organizations!inner(name), feedback_status_history(id, previous_status, new_status, created_at), feedback_responses(body, created_at)")
    .eq("id", feedbackId)
    .eq("organization_id", membership.organizationId)
    .maybeSingle();
  if (error) {
    console.error("Organization feedback detail query failed", {
      operation: "get_organization_feedback",
    });
    return { status: "error" };
  }
  if (!data) return { status: "not_found" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", data.submitter_id)
    .maybeSingle();
  if (profileError) return { status: "error" };
  const displayName = profile?.display_name ?? "Feedback user";
  const organization = Array.isArray(data.organizations)
    ? data.organizations[0]
    : data.organizations;
  if (!organization) return { status: "error" };

  let screenshotUrl: string | null = null;
  if (data.screenshot_path) {
    const { data: signed, error: screenshotError } = await supabase.storage
      .from("feedback-screenshots")
      .createSignedUrl(data.screenshot_path, 60);
    if (!screenshotError) screenshotUrl = signed.signedUrl;
  }

  const history = Array.isArray(data.feedback_status_history)
    ? data.feedback_status_history
    : [];
  return {
    status: "ok",
    data: {
      id: data.id,
      organizationId: data.organization_id,
      organizationName: organization.name,
      title: data.title,
      description: data.description,
      type: data.type as FeedbackType,
      status: data.status as FeedbackStatus,
      createdAt: data.created_at,
      pageTitle: data.page_title,
      sourceUrl: data.source_url,
      selectedText: data.selected_text,
      hasScreenshot: Boolean(data.screenshot_path),
      screenshotUrl,
      submitter: { displayName, initials: initials(displayName) },
      officialResponse: latestResponse(data.feedback_responses),
      history: history.map((event) => ({
        id: event.id,
        previousStatus: event.previous_status as FeedbackStatus | null,
        newStatus: event.new_status as FeedbackStatus,
        createdAt: event.created_at,
      })).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    },
  };
}
