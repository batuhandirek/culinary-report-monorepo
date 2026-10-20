import { UserRoleEnum } from './user-role.enum.constant.js';

/**
 * The roles the admin panel may hand out, and the only ones
 * `UserService.updateUserRoles` accepts. `system` is deliberately absent: it is the
 * internal service account's role (see `UserService.getSystemUser`) and nothing in the
 * panel may grant or revoke it. A new role becomes assignable by being listed here —
 * the input DTO's type, the service's validation and the panel's checkboxes all follow
 * from this list.
 */
export const ASSIGNABLE_USER_ROLES = [
	UserRoleEnum.USER,
	UserRoleEnum.ADMIN,
	UserRoleEnum.PROMOTER,
] as const;

export type AssignableUserRole = (typeof ASSIGNABLE_USER_ROLES)[number];
