import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { ExceptionCodes } from 'exceptions';

import { UserRoleEnum } from '../constants/user-role.enum.constant.js';
import { BrandMemberService } from '../services/brand-member.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The gate of every `/portal/brands/:brandId/*` route: a member of that brand, or an admin.
 * Runs after `AuthenticationGuard` (`@UseGuards(AuthenticationGuard, BrandAccessGuard)`),
 * which puts the user on the request. It reads the memberships on every call rather than
 * a role in the token, so removing someone shuts them out at once.
 */
@Injectable()
export class BrandAccessGuard implements CanActivate {
	constructor(private readonly brandMemberService: BrandMemberService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();
		const brandId: string | undefined = request.params?.brandId;
		const userId: string | undefined = request.userId;
		const roles: UserRoleEnum[] = request.userRoles ?? [];
		if (!userId || !brandId || !UUID.test(brandId)) {
			throw new ForbiddenException({ code: ExceptionCodes.NO_BRAND_ACCESS });
		}
		if (!(await this.brandMemberService.canAccess(userId, roles, brandId))) {
			throw new ForbiddenException({ code: ExceptionCodes.NO_BRAND_ACCESS });
		}
		return true;
	}
}
