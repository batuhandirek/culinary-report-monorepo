import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const OptionalAuthenticatedUserRoles = createParamDecorator(
	(_param: unknown, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest();

		return request.userRoles;
	},
);
