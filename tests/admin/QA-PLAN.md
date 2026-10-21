# Admin QA Plan

Legend: [A] automated  [M] manual  [A*] automated, to be written once the code lands

## Auth
- [ ] [A*] Login succeeds with valid credentials; session cookie set
- [ ] [A*] Generic error for wrong password AND unknown email (same message, similar timing)
- [ ] [A*] Lockout after 5 failures within 15 min; unlocks after window; counter resets on success
- [ ] [A*] MFA enrollment is mandatory before any admin page is reachable
- [ ] [A*] TOTP verify: valid code accepted, wrong/expired/reused code rejected
- [ ] [A*] Recovery codes work once only; second use rejected; stored hashed
- [ ] [A*] 2FA lockout after repeated bad codes
- [ ] [A*] Session expiry (idle + absolute) forces re-login
- [ ] [A*] Sign-out deletes the DB session; old cookie replay → redirected/401
- [ ] [A*] Disabled user cannot log in; existing sessions invalidated
- [ ] [M] Full login → enroll → verify → sign-out flow in browser

## RBAC (SUPER_ADMIN / ADMIN / PRODUCT_MANAGER / CONTENT_MANAGER / VIEWER)
- [ ] [A*] Matrix test: each role × each admin page (allowed → 200, denied → 403/redirect)
- [ ] [A*] Matrix test: each role × each action (create/edit/delete/publish/users/roles/audit)
- [ ] [A*] Deny-by-default: unknown permission or role → denied
- [ ] [A*] Server enforced: direct POST/PUT/DELETE without permission → 403 (no UI involved)
- [ ] [A*] Only SUPER_ADMIN can manage roles; nobody can elevate themselves
- [ ] [M] UI hides controls the role cannot use (defense in depth, not the control)

## Audit log
- [ ] [A*] Entry for every sensitive action (login ok/fail, lockout, MFA changes, recovery-code use, role/user changes, product/content writes, sign-out)
- [ ] [A*] No secrets in entries (passwords, TOTP secrets, codes, tokens, cookies)
- [ ] [A*] Metadata capped at 60,000 bytes (truncated, not rejected)
- [ ] [A*] Timestamps stored in UTC
- [ ] [M] VIEWER cannot read audit unless permitted

## Security headers / cookies
- [ ] [A*] Session cookie HttpOnly, SameSite=Lax/Strict, Path=/, Secure in production
- [ ] [M] Admin responses: no-store cache, X-Frame-Options/frame-ancestors, nosniff, Referrer-Policy
- [ ] [A*] CSRF / Origin check: cross-origin POST → 403; missing Origin handled per policy
- [ ] [A*] Rate limits on login, MFA verify, recovery → 429 when exceeded
- [ ] [M] `/admin-preview` returns 404 in `next build && next start`

## Accessibility
- [ ] [M] Keyboard-only: all forms, menus, tables, dialogs reachable; no traps
- [ ] [M] Visible focus ring; focus moved to errors / dialog on open, restored on close
- [ ] [M] Contrast ≥ 4.5:1 text, 3:1 UI (axe / Lighthouse)
- [ ] [M] Labels on inputs, aria-live for errors, accessible names on icon buttons

## Responsive
- [ ] [M] 360, 768, 1024, 1440 px: no horizontal scroll, nav usable, tables scroll/stack

## Storefront regression
- [x] [A] `node --test tests/catalog.test.mjs tests/cart.test.mjs tests/checkout.test.mjs`
- [x] [A] `node --conditions=react-server --test tests/db-config.test.mjs`
- [x] [A] `node --test tests/admin/storefront-chrome.test.mjs` (cart chrome hidden on /admin)
- [ ] [A] `npx eslint` – no new errors vs baseline 59 errors / 55 warnings
- [ ] [M] Curl smoke: /, /our-shop, /cart, /checkout, /customizer, product + strap pages → 200, no error overlay
- [ ] [M] Cart add/remove/persist, checkout flow, customizer unchanged; no cart drawer/toasts on /admin

## Migrations
- [ ] [M] Apply to a disposable test DB first (`prisma migrate deploy`); never prod first
- [ ] [M] Drift check: `prisma migrate diff` / `migrate status` clean
- [ ] [A*] Integration tests (`tests/integration/*`) pass against the test DB
- [ ] [M] Backup taken and rollback path documented before production apply
