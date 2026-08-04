import type { FeedbackItem } from "./types";

export const mockFeedback: FeedbackItem[] = [
  {
    id: "fb-1042",
    title: "Let me schedule reports for Monday mornings",
    description:
      "Our team reviews the weekly adoption report every Monday. I would love to schedule it once and have the latest version arrive automatically instead of exporting it by hand each week.",
    organization: "Acme Software",
    organizationInitials: "AS",
    type: "feature_request",
    status: "planned",
    submittedAt: "Jul 28, 2026",
    updatedAt: "Aug 3, 2026",
    sourceUrl: "https://app.acme.test/reports/weekly-adoption",
    pageTitle: "Weekly adoption report · Acme",
    selectedText: "Export report",
    hasScreenshot: true,
    submitter: { name: "Maya Chen", email: "maya@example.com", initials: "MC" },
    officialResponse: {
      body: "Thanks, Maya — this fits the reporting automation work already on our roadmap. We have moved it into planning and will share a target window once the scope is confirmed.",
      author: "Kunal at Acme Software",
      date: "Aug 3, 2026",
    },
    timeline: [
      { status: "submitted", label: "Feedback submitted", date: "Jul 28, 2026" },
      {
        status: "under_review",
        label: "Acme started reviewing this",
        date: "Jul 30, 2026",
      },
      {
        status: "planned",
        label: "Added to the product plan",
        date: "Aug 3, 2026",
        note: "Official response added",
      },
    ],
  },
  {
    id: "fb-1038",
    title: "CSV export loses the selected date range",
    description:
      "When I filter activity to the last 30 days and export it, the CSV includes older rows. The table view is correct but the downloaded file is not.",
    organization: "Acme Software",
    organizationInitials: "AS",
    type: "bug",
    status: "in_progress",
    submittedAt: "Jul 24, 2026",
    updatedAt: "Aug 2, 2026",
    sourceUrl: "https://app.acme.test/activity",
    pageTitle: "Account activity · Acme",
    hasScreenshot: true,
    submitter: { name: "Jordan Lee", email: "jordan@example.com", initials: "JL" },
    officialResponse: {
      body: "We reproduced this and a fix is now in development. The export is incorrectly using the account default range instead of your active filter.",
      author: "Kunal at Acme Software",
      date: "Aug 2, 2026",
    },
    timeline: [
      { status: "submitted", label: "Feedback submitted", date: "Jul 24, 2026" },
      { status: "under_review", label: "Issue reproduced", date: "Jul 25, 2026" },
      { status: "in_progress", label: "Fix in progress", date: "Aug 2, 2026" },
    ],
  },
  {
    id: "fb-1033",
    title: "The workspace role labels are hard to understand",
    description:
      "I am not sure what the practical difference is between Manager and Editor when inviting a teammate. A short description beside each option would help.",
    organization: "Acme Software",
    organizationInitials: "AS",
    type: "confusing_experience",
    status: "under_review",
    submittedAt: "Jul 19, 2026",
    updatedAt: "Jul 29, 2026",
    sourceUrl: "https://app.acme.test/settings/members",
    pageTitle: "Members and roles · Acme",
    selectedText: "Manager can manage workspace settings",
    hasScreenshot: false,
    submitter: { name: "Priya Shah", email: "priya@example.com", initials: "PS" },
    timeline: [
      { status: "submitted", label: "Feedback submitted", date: "Jul 19, 2026" },
      { status: "under_review", label: "Under review by Acme", date: "Jul 29, 2026" },
    ],
  },
  {
    id: "fb-1029",
    title: "Add a compact view for the customer list",
    description:
      "The customer cards are easy to scan, but our team has thousands of accounts. A dense table option would help us compare more customers at once.",
    organization: "Acme Software",
    organizationInitials: "AS",
    type: "feature_request",
    status: "submitted",
    submittedAt: "Jul 15, 2026",
    updatedAt: "Jul 15, 2026",
    sourceUrl: "https://app.acme.test/customers",
    pageTitle: "Customers · Acme",
    hasScreenshot: false,
    submitter: { name: "Noah Williams", email: "noah@example.com", initials: "NW" },
    timeline: [{ status: "submitted", label: "Feedback submitted", date: "Jul 15, 2026" }],
  },
  {
    id: "fb-1021",
    title: "Keyboard shortcut for global search",
    description:
      "A shortcut such as Command-K would make it much faster to move between customer records without reaching for the mouse.",
    organization: "Acme Software",
    organizationInitials: "AS",
    type: "feature_request",
    status: "shipped",
    submittedAt: "Jun 30, 2026",
    updatedAt: "Jul 22, 2026",
    sourceUrl: "https://app.acme.test/customers/atlas-labs",
    pageTitle: "Atlas Labs · Acme",
    hasScreenshot: false,
    submitter: { name: "Elena García", email: "elena@example.com", initials: "EG" },
    officialResponse: {
      body: "This is live! Press Command-K on Mac or Control-K on Windows from anywhere in Acme to open global search.",
      author: "Kunal at Acme Software",
      date: "Jul 22, 2026",
    },
    timeline: [
      { status: "submitted", label: "Feedback submitted", date: "Jun 30, 2026" },
      { status: "planned", label: "Added to the product plan", date: "Jul 7, 2026" },
      { status: "shipped", label: "Shipped in Acme", date: "Jul 22, 2026" },
    ],
  },
  {
    id: "fb-1017",
    title: "Remember my sidebar preference",
    description:
      "I collapse the sidebar for more room, but it expands again every time I return. Please remember the setting for my account.",
    organization: "Acme Software",
    organizationInitials: "AS",
    type: "other",
    status: "declined",
    submittedAt: "Jun 22, 2026",
    updatedAt: "Jul 2, 2026",
    sourceUrl: "https://app.acme.test/home",
    pageTitle: "Home · Acme",
    hasScreenshot: false,
    submitter: { name: "Owen Brooks", email: "owen@example.com", initials: "OB" },
    officialResponse: {
      body: "We appreciate the detail. We are not planning account-level persistence right now, but we did improve the current session behavior so the sidebar no longer resets between pages.",
      author: "Kunal at Acme Software",
      date: "Jul 2, 2026",
    },
    timeline: [
      { status: "submitted", label: "Feedback submitted", date: "Jun 22, 2026" },
      { status: "declined", label: "Not planned at this time", date: "Jul 2, 2026" },
    ],
  },
];

export const currentUserFeedback = [mockFeedback[0], mockFeedback[2], mockFeedback[4]];

export function getFeedbackById(id: string) {
  return mockFeedback.find((item) => item.id === id);
}
