import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const OptionalAuthenticatedUserId = createParamDecorator(
	(_param: unknown, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest();

		return request.userId;
	},
);
