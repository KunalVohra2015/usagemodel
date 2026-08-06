import type { FeedbackType } from "./types";

const acceptedFeedbackTypes: readonly FeedbackType[] = [
  "feature_request",
  "bug",
  "confusing_experience",
  "other",
];

export const feedbackLimits = {
  title: 200,
  description: 10_000,
  sourceUrl: 2_048,
  pageTitle: 300,
  selectedText: 10_000,
} as const;

export type FeedbackSubmissionInput = {
  organizationId: string;
  type: string;
  title: string;
  description: string;
  sourceUrl: string;
  pageTitle: string;
  selectedText: string;
};

export type FeedbackSubmissionField = keyof FeedbackSubmissionInput;
export type FeedbackSubmissionErrors = Partial<
  Record<FeedbackSubmissionField | "form", string>
>;

export type ValidFeedbackSubmission = {
  organizationId: string;
  type: FeedbackType;
  title: string;
  description: string;
  sourceUrl: string;
  pageTitle: string;
  selectedText: string | null;
};

export type FeedbackSubmissionResult =
  | { ok: true; feedbackId: string }
  | { ok: false; errors: FeedbackSubmissionErrors };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isFeedbackUuid(value: string) {
  return uuidPattern.test(value);
}

function requiredText(
  value: string,
  maximum: number,
  requiredMessage: string,
  lengthMessage: string,
) {
  const cleaned = value.trim();
  if (!cleaned) return { error: requiredMessage };
  if (cleaned.length > maximum) return { error: lengthMessage };
  if (cleaned.includes("\u0000")) return { error: "Remove unsupported characters." };
  return { value: cleaned };
}

export function validateFeedbackSubmission(
  candidate: unknown,
):
  | { ok: true; value: ValidFeedbackSubmission }
  | { ok: false; errors: FeedbackSubmissionErrors } {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { ok: false, errors: { form: "Review the form and try again." } };
  }
  const record = candidate as Record<string, unknown>;
  const input: FeedbackSubmissionInput = {
    organizationId: typeof record.organizationId === "string" ? record.organizationId : "",
    type: typeof record.type === "string" ? record.type : "",
    title: typeof record.title === "string" ? record.title : "",
    description: typeof record.description === "string" ? record.description : "",
    sourceUrl: typeof record.sourceUrl === "string" ? record.sourceUrl : "",
    pageTitle: typeof record.pageTitle === "string" ? record.pageTitle : "",
    selectedText: typeof record.selectedText === "string" ? record.selectedText : "",
  };
  const errors: FeedbackSubmissionErrors = {};

  const organizationId = input.organizationId.trim();
  if (!isFeedbackUuid(organizationId)) {
    errors.organizationId = "Select an existing company or add this company.";
  }

  const type = input.type.trim();
  if (!acceptedFeedbackTypes.includes(type as FeedbackType)) {
    errors.type = "Choose a valid feedback type.";
  }

  const title = requiredText(
    input.title,
    feedbackLimits.title,
    "Add a short, specific title.",
    `Keep the title to ${feedbackLimits.title} characters or fewer.`,
  );
  if (title.error) errors.title = title.error;

  const description = requiredText(
    input.description,
    feedbackLimits.description,
    "Tell the product team what happened or what would help.",
    `Keep the description to ${feedbackLimits.description.toLocaleString()} characters or fewer.`,
  );
  if (description.error) errors.description = description.error;

  const pageTitle = requiredText(
    input.pageTitle,
    feedbackLimits.pageTitle,
    "Add the title of the source page.",
    `Keep the page title to ${feedbackLimits.pageTitle} characters or fewer.`,
  );
  if (pageTitle.error) errors.pageTitle = pageTitle.error;

  const sourceUrlInput = input.sourceUrl.trim();
  let sourceUrl = "";
  if (!sourceUrlInput) {
    errors.sourceUrl = "Enter the page URL.";
  } else if (sourceUrlInput.length > feedbackLimits.sourceUrl) {
    errors.sourceUrl = `Keep the URL to ${feedbackLimits.sourceUrl.toLocaleString()} characters or fewer.`;
  } else {
    try {
      const parsed = new URL(sourceUrlInput);
      if (
        (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
        parsed.username ||
        parsed.password ||
        !parsed.hostname
      ) {
        throw new Error("unsafe URL");
      }
      sourceUrl = parsed.toString();
    } catch {
      errors.sourceUrl = "Enter a valid URL beginning with http:// or https://.";
    }
  }

  const selectedText = input.selectedText.trim();
  if (selectedText.length > feedbackLimits.selectedText) {
    errors.selectedText = `Keep selected text to ${feedbackLimits.selectedText.toLocaleString()} characters or fewer.`;
  } else if (selectedText.includes("\u0000")) {
    errors.selectedText = "Remove unsupported characters.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      organizationId,
      type: type as FeedbackType,
      title: title.value!,
      description: description.value!,
      sourceUrl,
      pageTitle: pageTitle.value!,
      selectedText: selectedText || null,
    },
  };
}

export type FeedbackSubmissionStore = {
  organizationIsActive(organizationId: string): Promise<boolean>;
  insert(input: ValidFeedbackSubmission & { submitterId: string }): Promise<{
    id: string | null;
    error: boolean;
  }>;
};

export async function persistFeedbackSubmission(options: {
  identityId: string | null;
  input: FeedbackSubmissionInput;
  store: FeedbackSubmissionStore;
}): Promise<FeedbackSubmissionResult> {
  if (!options.identityId) {
    return { ok: false, errors: { form: "Sign in before submitting feedback." } };
  }

  const validated = validateFeedbackSubmission(options.input);
  if (!validated.ok) return validated;

  if (!(await options.store.organizationIsActive(validated.value.organizationId))) {
    return {
      ok: false,
      errors: { organizationId: "Choose an active company from the directory." },
    };
  }

  const inserted = await options.store.insert({
    ...validated.value,
    submitterId: options.identityId,
  });
  if (inserted.error || !inserted.id) {
    return {
      ok: false,
      errors: { form: "We could not save your feedback. Please try again." },
    };
  }

  return { ok: true, feedbackId: inserted.id };
}
