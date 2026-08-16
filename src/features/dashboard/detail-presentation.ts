type FeedbackWithResponse = {
  officialResponse?: { body: string } | null;
};

export function selectOfficialResponseBody(
  realItem: FeedbackWithResponse | null,
  mockItem: FeedbackWithResponse | null | undefined,
) {
  return realItem
    ? realItem.officialResponse?.body
    : mockItem?.officialResponse?.body;
}
