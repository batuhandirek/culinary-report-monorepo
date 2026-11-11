import {
	type AdminCreatorFindOutputDto,
	AdminCreatorFindOutputDtoKindEnum as FindKind,
	type AdminWatchReasonOutputDto,
	AdminWatchReasonOutputDtoKindEnum as Reason
} from 'client';

import { monthLabel } from '#lib/culinary.js';

// The creator page's words: a short day, why their profiles are scraped, and what found their posts.

/** `07 Nov`: a day in a dense row, the year left out */
export const shortDay = (date?: string | Date) =>
	date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : '—';

/** The header pill's words for the reason they are watched, and the whole reason on hover */
export const watchPill = (r: AdminWatchReasonOutputDto): { label: string; tip: string } => {
	const city = r.city.name;
	switch (r.kind) {
		case Reason.Creator:
			return {
				label: `Watched · ${city} #${r.rank} of ${r.top}`,
				tip: `On ${city}'s creator list: ${r.posts} of their ${r.readPosts} posts in ${r.windowDays} days named a place there, the last on ${shortDay(r.lastPostAt)}. Scraped daily; they leave the list by themselves.${r.instagramOff ? ` Instagram is off for ${city}.` : ''}`
			};
		case Reason.CitySource:
			return {
				label: `Watched · ${city}`,
				tip: `One of ${city}'s creator sources (its Sources tab): scraped daily.`
			};
		case Reason.Customer:
			return { label: `${r.brand?.name}'s own`, tip: `${r.brand?.name}'s own account, a paying customer in ${city}: scraped weekly.` };
		case Reason.TopBrand:
			return {
				label: `${r.brand?.name}'s own`,
				tip: `${r.brand?.name}'s own account, #${r.rank} of ${city}'s ${r.top} most talked-about brands in ${monthLabel(r.month ?? '')}: scraped weekly.`
			};
		case Reason.Rival:
			return {
				label: `${r.brand?.name}'s own`,
				tip: `${r.brand?.name}'s own account, a rival of ${(r.rivalOf ?? []).map((b) => b.name).join(', ')} in ${city}, whose report compares them: scraped weekly.`
			};
		default:
			return { label: `${r.brand?.name}'s own`, tip: `${r.brand?.name}'s own account, a brand with a place open in ${city}: scraped weekly.` };
	}
};

export const NOT_WATCHED_TIP =
	"Not watched: their posts reach us only when a city's hashtag or search, or a search for a venue, finds them. A creator joins a city's creator list by themselves once 3 of their posts in 90 days name a place there.";

/** What found their posts: a profile (theirs, or a brand's a collab sits on) is a row, the rest are chips grouped by kind */
export const FIND_GROUPS: { label: string; kinds: FindKind[] }[] = [
	{ label: 'TikTok searches', kinds: [FindKind.TiktokSearch] },
	{ label: 'Hashtags', kinds: [FindKind.TiktokHashtag, FindKind.InstagramHashtag] },
	{ label: 'Venue searches', kinds: [FindKind.VenueSearch, FindKind.VenuePlace] },
	{ label: 'Blogs', kinds: [FindKind.Blog] }
];

export const PROFILE_FINDS = [FindKind.TiktokAccount, FindKind.InstagramAccount];

export const profileFindLabel = (find: AdminCreatorFindOutputDto) =>
	`${find.kind === FindKind.TiktokAccount ? 'TikTok' : 'Instagram'} @${find.value}`;

/** A profile find's note: whose list or source read it */
export const profileFindNote = (find: AdminCreatorFindOutputDto) =>
	find.sourceId
		? `· ${find.city.name}'s source${find.sourceEnabled ? '' : ', switched off'}`
		: '· a watched profile';

export const findValue = (find: AdminCreatorFindOutputDto) =>
	find.kind === FindKind.TiktokHashtag || find.kind === FindKind.InstagramHashtag
		? `#${find.value}`
		: find.venue
			? find.venue.name
			: find.value;

export const findHref = (find: AdminCreatorFindOutputDto) =>
	find.venue ? `/admin/venues/${find.venue.id}` : find.sourceId ? `/admin/cities/${find.city.id}?tab=sources` : undefined;

export const findTip = (find: AdminCreatorFindOutputDto) =>
	`${find.posts} ${find.posts === 1 ? 'post' : 'posts'} in ${find.city.name}, the last on ${shortDay(find.lastPostedAt)}${
		find.kind === FindKind.VenuePlace ? " (the venue's Instagram place page)" : ''
	}${find.sourceId && !find.sourceEnabled ? ' · source switched off' : ''}`;
