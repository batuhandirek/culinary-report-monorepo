import { UserRoleEnum } from '../constants/user-role.enum.constant.js';

export interface AccessTokenPayload {
	userId: string;
	sessionId: string;
	roles: UserRoleEnum[];
}
