import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const AuthenticatedUserSessionId = createParamDecorator(
	(_param: unknown, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest();
		if (!request.sessionId) {
			throw new UnauthorizedException();
		}
		return request.sessionId;
	},
);
