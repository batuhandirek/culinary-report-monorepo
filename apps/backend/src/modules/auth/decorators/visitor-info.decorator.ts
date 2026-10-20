import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { IResult as UserAgentInfo, UAParser } from 'ua-parser-js';

import { Visitor } from '../interfaces/visitor.interface.js';

export const VisitorInfo = createParamDecorator(
	(_param: unknown, ctx: ExecutionContext): Visitor => {
		const request = ctx.switchToHttp().getRequest();

		const ip =
			request.headers['cf-connecting-ip'] ?? request.headers['x-forwarded-for'] ?? null;
		const countryCode = request.headers['cf-ipcountry'] ?? null;
		const userAgent = request.headers['user-agent'] ?? null;
		let userAgentInfo: UserAgentInfo;
		let visitor: Visitor = { ip, countryCode };
		if (userAgent) {
			userAgentInfo = UAParser(userAgent);
			visitor = { ...visitor, ...userAgentInfo };
		}

		return visitor;
	},
);
