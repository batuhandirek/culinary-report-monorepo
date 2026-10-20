import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const AuthenticatedUserReference = createParamDecorator(
	(_param: unknown, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest();

		if (!request.userRef) {
			throw new UnauthorizedException();
		}

		return request.userRef;
	},
);
