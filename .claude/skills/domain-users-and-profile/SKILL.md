---
name: domain-users-and-profile
description: The user record — `GET/PATCH/DELETE /auth/me`, publicName/surname masking, roles, consents, notification switches, account deletion, the admin user pages. Use before touching `UserService`, `MeController`, `AdminUsersController`, `CONSENT_TEXTS`, frontend `/admin/users`.
---

# Users and profile

Nothing is released yet (root `CLAUDE.md`): user DTOs change freely.

## Map

Backend `modules/auth`: `User` (`description` is a free-text bio), `UserService` (`updateMe`, `updateUserRoles`, `deleteUser`, `filterPromotionalRecipients`), `MeController` (`GET/PATCH/DELETE /auth/me`), `AdminUsersController` (`/admin/users`: list, detail, CSV export, roles, delete). Account deletion: `DELETE /auth/me` marks the account, `DeleteAccountsCron` deletes it later, `AccountDeletionReminderCron` warns the day before; constants in `auth/constants/account-deletion.constant.ts`.

Frontend: `constants/CONSENT_TEXTS.ts`; admin pages `/admin/users`, `/admin/users/<id>` (`UserView`: overview and sessions), `dialogs/admin/ChangeUserRolesDialog.svelte`. There is no account area for users yet.

## Rules

- **Show other users by `publicName`, never their surname.** It is a getter on `User` ("Mert K.", the first name alone when there is no surname). No DTO that shows another user declares `lastName`; only the signed-in user's own (`GetMeOutputDto`) and the admin DTOs do. The DTO is what keeps it off the wire: a serialized `User` still holds the surname, and nestia's stringifier drops what the interface does not declare, so a test reads the answer back through `typia.json.stringify<Dto>(…)` rather than asserting on the service's object. The frontend never builds a name from parts.
- **Roles are set only by `UserService.updateUserRoles`**: `user` is always kept, `system` is never handed out, and an admin cannot change their own roles. Roles live in the access token, so the change drops every session of that user. The one exception is `venue_owner`, which follows venue memberships (`UserService.setVenueOwnerRole`, `domain-identity-and-auth`) and survives a panel edit.
- `GET /auth/me` also carries `venueMemberships` (the venues whose portal the person may open, with role and `acceptedAt`), added by `MeController.serializeMe`.
- **A consent sentence lives in `CONSENT_TEXTS` and is never paraphrased**: wherever a consent is collected or changed must show the wording it was collected under. A settings switch is a `SwitchRow` that saves itself (`loading` / `saved`, rolls back on refusal), no page-level "Kaydet".
- Which topics the account hears about is `notificationPreferences` on `GET/PATCH /auth/me`, resolved by `NotificationPreferenceService` (not a `User` column, so `MeController.serializeMe` adds it). The PATCH changes only the switches it names. Storage, senders and the marketing consents are in `domain-notifications-and-email`.

## Tests

`auth/tests/services/` (`update-me`, `admin-update-user-roles`).
