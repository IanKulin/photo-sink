const SAFE_REDIRECT_RE = /^\/[a-zA-Z0-9/_-]*$/;

export function safeRedirect(returnTo, fallback) {
  return returnTo && SAFE_REDIRECT_RE.test(returnTo) ? returnTo : fallback;
}
