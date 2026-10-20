import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import _ from 'lodash';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';

import { ROLES_METADATA_KEY } from '../constants/roles-guard-metadata-key.constant.js';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();

		// `@Roles` on the method wins over one on the controller class
		const roles = this.reflector.getAllAndOverride<UserRoleEnum[] | undefined>(ROLES_METADATA_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		const userRoles: UserRoleEnum[] = request.userRoles;
		if (!userRoles) throw new UnauthorizedException();

		if (_.intersection(userRoles, roles).length > 0) return true;

		throw new UnauthorizedException();
	}
}
