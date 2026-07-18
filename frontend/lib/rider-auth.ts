export function getRiderToken() {
  try { return window.localStorage.getItem("aoa_rider_token") || ""; } catch { return ""; }
}

export function requireRiderToken(returnTo: string) {
  const token = getRiderToken();
  if (token) return token;
  const safeReturn = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  window.location.href = `/rider/login?signup=1&return_to=${encodeURIComponent(safeReturn)}`;
  return "";
}
