import typia from 'typia';

import type { AssignableUserRole } from '../constants/assignable-user-roles.constant.js';

export interface AdminCreateUserInputDto {
	firstName: string & typia.tags.MinLength<1>;

	lastName: string;

	email: string & typia.tags.Format<'email'>;

	password: string & typia.tags.MinLength<8>;

	/** Granted on top of `user`; anything outside `ASSIGNABLE_USER_ROLES` is rejected. */
	roles: AssignableUserRole[];
}
