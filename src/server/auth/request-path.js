// The site uses `trailingSlash: true` (next.config.mjs), so Next redirects
// /api/auth/sign-in/email to /api/auth/sign-in/email/ (308, method and body kept).
// Better Auth's router only matches paths without the trailing slash and answers
// 404 otherwise, so the slash is removed before the request reaches Better Auth.

/** Returns the URL string without a trailing slash on the path (query kept). */
export function stripTrailingSlash(rawUrl) {
  const url = new URL(rawUrl)
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) url.pathname = url.pathname.replace(/\/+$/, '')
  return url.toString()
}

/** Same request (method, headers, body) with the trailing slash removed. */
export function withoutTrailingSlash(request) {
  const url = stripTrailingSlash(request.url)
  if (url === request.url) return request
  return new Request(url, request.body ? { method: request.method, headers: request.headers, body: request.body, duplex: 'half', signal: request.signal } : request)
}
