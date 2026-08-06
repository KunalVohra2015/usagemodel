export type SelectorKeyAction =
  | { type: "none"; activeIndex: number }
  | { type: "close"; activeIndex: number }
  | { type: "select"; resultIndex: number; activeIndex: number }
  | { type: "add"; activeIndex: number };

export function suggestedCompanyFromQuery(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const withoutScheme = trimmed.replace(/^https?:\/\//i, "");
  const host = withoutScheme.split(/[/?#]/, 1)[0].replace(/^www\./i, "").toLowerCase();
  const looksLikeDomain = host.includes(".") && !/\s/.test(host);
  const firstLabel = looksLikeDomain ? host.split(".")[0] : trimmed;
  const name = firstLabel
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");

  return {
    label: looksLikeDomain ? host : trimmed,
    website: looksLikeDomain ? host : "",
    name,
  };
}

export function moveSelectorHighlight(
  currentIndex: number,
  direction: 1 | -1,
  optionCount: number,
) {
  if (optionCount <= 0) return -1;
  if (currentIndex < 0) return direction === 1 ? 0 : optionCount - 1;
  return (currentIndex + direction + optionCount) % optionCount;
}

export function getSelectorKeyAction(options: {
  key: string;
  activeIndex: number;
  resultCount: number;
  hasAddAction: boolean;
}): SelectorKeyAction {
  const optionCount = options.resultCount + (options.hasAddAction ? 1 : 0);
  if (options.key === "Escape") return { type: "close", activeIndex: -1 };
  if (options.key === "ArrowDown" || options.key === "ArrowUp") {
    return {
      type: "none",
      activeIndex: moveSelectorHighlight(
        options.activeIndex,
        options.key === "ArrowDown" ? 1 : -1,
        optionCount,
      ),
    };
  }
  if (options.key !== "Enter" || options.activeIndex < 0) {
    return { type: "none", activeIndex: options.activeIndex };
  }
  if (options.activeIndex < options.resultCount) {
    return {
      type: "select",
      resultIndex: options.activeIndex,
      activeIndex: -1,
    };
  }
  if (options.hasAddAction && options.activeIndex === options.resultCount) {
    return { type: "add", activeIndex: -1 };
  }
  return { type: "none", activeIndex: options.activeIndex };
}
