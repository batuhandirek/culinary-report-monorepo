import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const WebsocketAuthenticatedUser = createParamDecorator(
	(_param: unknown, ctx: ExecutionContext) => {
		const client = ctx.switchToWs().getClient();
		if (!client.user) {
			throw new UnauthorizedException();
		}

		return client.user;
	},
);
