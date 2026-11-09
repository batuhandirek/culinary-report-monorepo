// An account as the admin routes return it. The account must have `ACCOUNT_POPULATE` populated: an unpopulated one serializes as `{ id }` and fails the DTO.

import { wrap } from '@mikro-orm/core';

import _ from 'lodash';

import type {
	AdminAccountOutputDto,
	AdminAccountSnapshotOutputDto,
} from '../dto/admin-account.output.dto.js';
import type { AccountWithFigures } from '../services/social-account.service.js';

import { accountUrl, shownHandle } from './accounts.js';

export const ACCOUNT_POPULATE = [
	'creator',
	'brand',
	'branch',
	'suggestedBrand',
	'rejections',
	'rejections.brand',
] as const;

export const accountOutput = ({
	account,
	latest,
	followersChange,
	stats,
}: AccountWithFigures): AdminAccountOutputDto => ({
	...(wrap(account).serialize({
		skipNull: true,
		forceObject: true,
		populate: [...ACCOUNT_POPULATE],
		exclude: [
			'brand.branches',
			'suggestedBrand.branches',
			'creator.accounts',
			'rejections.account',
			'rejections.brand.branches',
			'handleChanges',
		],
	}) as unknown as Omit<AdminAccountOutputDto, 'url' | 'latest' | 'followersChange' | 'stats'>),
	handle: shownHandle(account.handle),
	url: accountUrl(account.platform, shownHandle(account.handle)),
	...(latest && {
		latest: _.omitBy(latest, v => v == null) as unknown as AdminAccountSnapshotOutputDto,
	}),
	...(followersChange !== undefined && { followersChange }),
	stats,
});
