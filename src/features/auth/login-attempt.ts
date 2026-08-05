export function beginLoginAttempt(inFlight: { current: boolean }) {
  if (inFlight.current) return false;
  inFlight.current = true;
  return true;
}
