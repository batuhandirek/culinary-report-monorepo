---
name: backend-endpoint
description: Add or change a backend API endpoint end-to-end (controller, DTOs, client regen, frontend consumption). Use whenever creating/editing/deleting a NestJS controller route.
---

# Add / change a backend endpoint

Conventions live in `apps/backend/CLAUDE.md` — this is the ordered procedure.

1. **DTOs first** — plain interfaces (typia validates via compile-time transforms), `dto/<name>.input.dto.ts` / `.output.dto.ts`. Constrain with `tags` (`tags.Format<'uuid'>`, `tags.MaxLength<...>`). Reuse shared output DTOs (e.g. `image.output.dto.ts`) instead of redefining shapes.
2. **Controller** — `@TypedRoute.Get/Post/...`, `@TypedBody/@TypedParam/@TypedQuery`. Template: `apps/backend/src/modules/notification/controllers/notifications.controller.ts`. Admin-only routes go in `admin.*.controller.ts`.
3. **Guards** — every non-public route needs `@UseGuards(AuthenticationGuard)` (or `OptionalAuthenticationGuard`) + an ownership check in the service.
4. **Response building** — fetch with `populate` and return `wrap(entity).serialize({ skipNull: true, populate, forceObject: true })` cast to the output DTO (see `getUser` in `src/modules/auth/controllers/admin.users.controller.ts`). Never hand-map fields.
5. **Business logic in the service**, controller stays thin. Cross-module data only via that module's exported services — never its repositories.
6. **Regenerate the client**: `npm run create:client` from repo root (~30–50 s, run in background). Frontend types come from `packages/client/src/Api.ts` — never hand-edit it.
7. **Frontend**: call via the `api` singleton (`apps/frontend/src/lib/api.ts`), method name = the controller method's name (operationId).
8. **Test**: add/extend a `*.pglite.spec.ts` (see the `pglite-test` skill). Run `npm run backend:test`.
