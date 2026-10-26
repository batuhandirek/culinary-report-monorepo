import type { AdminAccountOutputDto } from 'client';

import { compact } from './culinary.js';

// How an account came to be a brand's own (`SocialAccount.brandSource`)
export const ACCOUNT_SOURCE_LABELS: Record<string, string> = {
	handle: 'its handle is the name',
	website: 'its Google website',
	site: 'linked from its website',
	profile: 'its profile names the brand',
	prospect: 'from outreach',
	admin: 'set by an admin'
};

type AccountLike = Pick<AdminAccountOutputDto, 'followers' | 'latest' | 'followersChange'>;

/** The best follower count we have: the newest snapshot's, else the account's own. */
export const accountFollowers = (account: AccountLike): number | undefined =>
	account.latest?.followers ?? account.followers;

/** "4.4K (+240)", the change over 30 days or more, or a dash when unknown. */
export const followersText = (account: AccountLike): string => {
	const followers = accountFollowers(account);
	if (followers === undefined) return '—';
	const change = account.followersChange;
	return `${compact(followers)}${change ? ` (${change > 0 ? '+' : ''}${compact(change)})` : ''}`;
};

export const branchLabel = (branch: { name: string; street?: string }) =>
	branch.street ? `${branch.name}, ${branch.street}` : branch.name;
