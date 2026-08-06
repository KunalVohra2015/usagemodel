export type FeedbackField =
  | "organization"
  | "title"
  | "description"
  | "sourceUrl"
  | "pageTitle";

export type FeedbackFormValues = Record<FeedbackField, string>;
export type FeedbackFormErrors = Partial<Record<FeedbackField, string>>;

export function validateFeedbackField(
  field: FeedbackField,
  value: string,
): string | undefined {
  const trimmed = value.trim();
  if (field === "organization") {
    return trimmed ? undefined : "Select an existing company or add this company.";
  }
  if (field === "title") {
    return trimmed ? undefined : "Add a short, specific title.";
  }
  if (field === "description") {
    return trimmed
      ? undefined
      : "Tell the product team what happened or what would help.";
  }
  if (field === "pageTitle") {
    return trimmed ? undefined : "Add the title of the source page.";
  }
  return /^https?:\/\//i.test(trimmed)
    ? undefined
    : "Enter a complete URL beginning with http:// or https://.";
}

export function validateFeedbackForm(values: FeedbackFormValues) {
  const errors: FeedbackFormErrors = {};
  for (const field of Object.keys(values) as FeedbackField[]) {
    const error = validateFeedbackField(field, values[field]);
    if (error) errors[field] = error;
  }
  return errors;
}

export function visibleFeedbackError(options: {
  field: FeedbackField;
  value: string;
  touched: boolean;
  submitAttempted: boolean;
}) {
  if (!options.touched && !options.submitAttempted) return undefined;
  return validateFeedbackField(options.field, options.value);
}
