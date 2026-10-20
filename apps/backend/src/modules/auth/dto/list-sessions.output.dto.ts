import { IBrowser, ICPU, IDevice, IEngine, IOS, IResult } from 'ua-parser-js';

import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';

interface ListSessionsItem {
	id: string;
	isCurrent: boolean;
	expiresAt: Date;
	createdAt: Date;
	// Bumped on every authenticated request (`touchSession`); absent on sessions older than it.
	lastSeenAt?: Date;
	visitorInfo: {
		ip?: string;
		countryCode?: string;
		userAgent?: string;
		ua?: IResult['ua'];
		device?: IDevice;
		browser?: IBrowser;
		engine?: IEngine;
		os?: IOS;
		cpu?: ICPU;
	};
}

export interface ListSessionsOutputDto extends PaginatedResult<ListSessionsItem> {}

/** "Sign out everywhere else": how many sessions it ended. */
export interface RevokeOtherSessionsOutputDto {
	revoked: number;
}
