---
name: domain-identity-and-auth
description: Login/signup/sessions, token sources (header vs cookie), verification codes (OTP/e-mail), Turnstile bot protection. Use before touching `modules/auth` (guards, verification, cookies), `modules/turnstile`, `modules/otp`, frontend `components/auth`, `routes/auth`, `UserStore`, `TurnstileStore`.
---

# Identity and auth

Nothing is released yet (root `CLAUDE.md`): auth contracts change freely, like everything else.

## Map

Backend `modules/auth/`: `User`, `UserSession`, `CredentialVerificationRequest`; `LoginService`, `JwtService`, `UserSessionService`, `PasswordService`, `VerificationService`, `AuthCookieService`; guards in `guards/` (`AuthenticationGuard`, `OptionalAuthenticationGuard`, `RolesGuard`, websocket guard); `constants/auth-cookie.constant.ts`, `verification-throttle.constant.ts`. `modules/turnstile` (global), `modules/otp`, `modules/sms`.

Sign-in is email or mobile number with a password, or (the venue portal) an e-mail code with no password. There is no social login.

## Code login and brand access (the portal)

- **`POST /auth/login/code`** (`LoginCodeInputDto`: e-mail) sends a `LOGIN_EMAIL` code to an existing account through `createOrResend` (same throttle; an unknown address answers 400 `USER_DOES_NOT_EXIST`, there is no signup through it). **`POST /auth/login/code/verify`** (`LoginService.loginWithCode`) checks it with `verifyAndHandle(input, LOGIN_EMAIL)` — the expected type stops a signup token from becoming a session — marks the e-mail verified, accepts the person's venue invites and opens a session with cookies. Both are Turnstile-guarded. The code mail is `PortalLoginCodeEmail`, in English.
- **A passwordless account is one with no `hashedPassword`** (no separate flag): invites create them, password login answers `USER_HAS_NO_PASSWORD`, forgot-password can still give them one.
- **Brand membership lives here, not in `venues`**, because `/auth/me` lists it (`brandMemberships`, each brand with its branches) and the invite creates accounts: `BrandMember` (user × brand, unique: the portal of every branch; `role` OWNER | STAFF, `invitedBy`, `acceptedAt`). `BrandMemberService` is the one entry point (`invite({ brandId, … })`, `acceptInvites`, `remove`, `listForBrand`, `membershipsOf`, `canAccess`). An invite creates the account if needed and mails `PortalInviteEmail` (en/de) with `/portal/login?email=…`; inviting again keeps one row and mails again.
- **`venue_owner` follows the memberships**: `UserService.setVenueOwnerRole` (called only by `BrandMemberService`) grants it on accepting and drops it with the last membership, without ending sessions; `updateUserRoles` keeps it whatever the admin ticks.
- **`BrandAccessGuard`** gates every `/portal/brands/:brandId/*` route after `AuthenticationGuard`: an admin, or a member of that brand, read from the table on every call (not from the token), so a removal shuts the door at once. Refusal is 403 `NO_BRAND_ACCESS`. Merging brands moves members onto the chain (`BrandService.merge`). A module using it imports `AuthModule`.

Frontend: `components/auth/` (`LoginForm`, `SignupForm`, `PhoneForm`, `CodeStep`, `AuthDialog`, `auth-dialog-manager`, `after-auth.ts`), `routes/auth/` (login, signup, forgot-password, onboarding-phone), `lib/require-login.ts`, `stores/UserStore.svelte.ts` (session kept in `localStorage` under `session`, exception handling reference), `stores/TurnstileStore.svelte.ts` (fails open).

## Sessions

`GET /auth/sessions` lists the user's live sessions (`lastSeenAt` and `platform` are bumped by `touchSession` on `GET /auth/me`), `DELETE /auth/sessions/:id` ends one, `DELETE /auth/sessions` ends every other one (`UserSessionService.revokeOtherSessions`, the current session named by `AuthenticatedUserSessionId`) and answers how many. The platform comes from the `CULINARY-REPORT-SENT-BY` header the frontend sends on every request (`PlatformInfo` decorator).

## Tokens and cookies

- **Two token sources, `Authorization` header first, cookie second.** `AuthenticationGuard`, `OptionalAuthenticationGuard` and `POST /auth/refresh-token` all read `header ?? cookie`, never the reverse: the header is an explicit act, a cookie rides along automatically. `AuthCookieService` is the only writer; names in `auth-cookie.constant.ts`.
- The cookies exist so SvelteKit's SSR `fetch` (forwards same-origin cookies, no access to the SPA's token storage) can call the API as the signed-in user. Both are `httpOnly` + `sameSite: 'lax'`; **moving either to `sameSite: 'none'` needs a CSRF scheme first**.
- `RefreshTokenInputDto.refreshToken` is optional so the cookie can supply it instead; don't make it required again. The websocket guard authenticates off the handshake, not cookies.

## Verification codes

- **Every code goes out through `VerificationService.createOrResend`**, never `createAndSend` or an OTP/e-mail send directly. It keeps one pending `CredentialVerificationRequest` per (type, identifier, account) and mutates it in place: a resend inside the cooldown returns the code in flight, a later one resends the same code, and both charge a per-row budget (`verification-throttle.constant.ts`) that answers 429 `TOO_MANY_VERIFICATION_REQUESTS` when spent. A row is only reused for the account that created it. **Never log a code**; only `OtpService`'s `OTP_IS_DISABLED` branch may print one. With OTP disabled (dev) every code is `VERIFICATION_DEFAULT_CODE`.
- **`verifyAndHandle` must link the account a SIGNUP_* verification creates onto `verificationRequest.user`.** Unlinked, the row outlives the account (FK cascade has nothing to follow) while still holding its password hash, and `checkForEmailLogin` / `checkForMobileLogin` would rebuild the account from it through the *login* endpoint. Those lookups are therefore `verifiedAt: null` only. The `user` relation cascades persist/merge only; `Cascade.ALL` would delete the account when a request is removed.
- Frontend: a code is confirmed inline with `CodeStep`, never in a dialog over the form. A password field defaults to `current-password`; signup and change forms pass `'new-password'`.

## Turnstile

Bot-sensitive public routes get `@UseGuards(TurnstileGuard)`: login, signup(+verify), forgot-password(+verify), change-mobile-number(+verify), change-email(+verify). It verifies `CULINARY-REPORT-TURNSTILE-TOKEN`; no-op without `TURNSTILE_SECRET_KEY`, log-only until `TURNSTILE_ENFORCE=true`, fails open when siteverify is unreachable. Guarding a new route: the frontend passes `await turnstileStore.getHeaders('<action>')` as the call's params, and the guard spec's route list includes it.

## Private routes (frontend)

The portal's pages (`/portal/...`) send a visitor to `/portal/login` (`loginHref` picks it by path), which asks for the address, then the code with `CodeStep lang="en"`; `UserStore.requestLoginCode` / `loginWithCode` / `venueMemberships`.

A private route calls `requireLogin()` from `onMount`: it sends a visitor to login and brings them back to the same path and query. Exceptions: see `UserStore.svelte.ts`; codes come from `packages/exceptions`, mapped in `constants/EXCEPTION_MAPPING.ts`.

## Tests

`auth/tests/`, the Turnstile guard spec's route list, and the auth journey (`integration-test` skill), so a change to signup or login updates and runs them.
