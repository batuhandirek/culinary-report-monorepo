import type { AssignableUserRole } from '../constants/assignable-user-roles.constant.js';

export interface AdminUpdateUserRolesInputDto {
	/** Anything outside `ASSIGNABLE_USER_ROLES` is rejected — `system` above all. */
	roles: AssignableUserRole[];
}
