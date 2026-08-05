"use client";

import { useRef, useState } from "react";
import { startGoogleSignIn } from "@/app/auth/actions";
import { beginLoginAttempt } from "@/features/auth/login-attempt";

export function GoogleLoginButton({
  nextPath,
  authenticationAvailable,
}: {
  nextPath: string;
  authenticationAvailable: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  async function handleGoogleLogin() {
    if (!authenticationAvailable) return;
    if (!beginLoginAttempt(inFlight)) return;
    setPending(true);
    setError(null);

    const result = await startGoogleSignIn(nextPath);
    if (result.error || !result.url) {
      setError("Google sign-in could not be started. Please try again.");
      setPending(false);
      inFlight.current = false;
      return;
    }

    window.location.assign(result.url);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={pending || !authenticationAvailable}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
      >
        <span
          aria-hidden="true"
          className="grid size-6 place-items-center rounded-full bg-[conic-gradient(from_-45deg,#4285f4_0_25%,#34a853_0_50%,#fbbc05_0_75%,#ea4335_0)] text-[10px] font-bold text-white"
        >
          G
        </span>
        {pending
          ? "Opening Google…"
          : authenticationAvailable
            ? "Continue with Google"
            : "Google sign-in unavailable"}
      </button>
      {error && (
        <p
          className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-center text-xs leading-5 text-rose-700"
          role="alert"
        >
          {error}
        </p>
      )}
    </>
  );
}
