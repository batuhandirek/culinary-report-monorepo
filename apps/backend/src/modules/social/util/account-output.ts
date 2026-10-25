// An account as the admin routes return it. The account must have `ACCOUNT_POPULATE` populated: an unpopulated one serializes as `{ id }` and fails the DTO.

import { wrap } from '@mikro-orm/core';

import type { AdminAccountOutputDto, AdminAccountSnapshotOutputDto } from '../dto/admin-account.output.dto.js';
import type { AccountWithFigures } from '../services/social-account.service.js';

import { accountUrl } from './accounts.js';

export const ACCOUNT_POPULATE = ['creator', 'brand', 'branch', 'suggestedBrand', 'rejections', 'rejections.brand'] as const;

export const accountOutput = ({ account, latest, previous, stats }: AccountWithFigures): AdminAccountOutputDto => ({
	...(wrap(account).serialize({
		skipNull: true,
		forceObject: true,
		populate: [...ACCOUNT_POPULATE],
		exclude: ['brand.branches', 'suggestedBrand.branches', 'creator.accounts', 'rejections.account', 'rejections.brand.branches'],
	}) as unknown as Omit<AdminAccountOutputDto, 'url' | 'latest' | 'followersChange' | 'stats'>),
	url: accountUrl(account.platform, account.handle),
	...(latest && {
		latest: wrap(latest).serialize({ skipNull: true, forceObject: true }) as unknown as AdminAccountSnapshotOutputDto,
	}),
	...(latest?.followers != null &&
		previous?.followers != null && { followersChange: latest.followers - previous.followers }),
	stats,
});
