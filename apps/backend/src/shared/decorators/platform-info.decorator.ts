import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { Platform } from 'src/shared/constants/platform.enum.const.js';

export const PlatformInfo = createParamDecorator(
	(_param: unknown, ctx: ExecutionContext): Platform => {
		const request = ctx.switchToHttp().getRequest();

		return request.headers['culinary-report-sent-by'];
	},
);
