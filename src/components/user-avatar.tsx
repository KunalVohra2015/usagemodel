import type { AuthenticatedViewer } from "@/features/auth/types";

function initials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

export function UserAvatar({
  viewer,
  className = "size-9",
}: {
  viewer: AuthenticatedViewer;
  className?: string;
}) {
  if (viewer.avatarUrl) {
    return (
      <span
        role="img"
        aria-label={`${viewer.displayName}'s avatar`}
        className={`${className} block shrink-0 rounded-full bg-cover bg-center bg-slate-200`}
        style={{ backgroundImage: `url(${JSON.stringify(viewer.avatarUrl)})` }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${className} grid shrink-0 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-800`}
    >
      {initials(viewer.displayName)}
    </span>
  );
}
