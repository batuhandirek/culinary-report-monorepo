import {
	type ReportPost,
	type ReportSectionDto,
	ReportSectionDtoKindEnum as Kind,
	ReportSectionDtoKpisEnum as Kpi,
	ReportSectionDtoPartsEnum as Part,
	ReportSectionDtoPlatformsEnum as Platform
} from 'client';

// A report's sections (its type's, copied at the build): which blocks it shows and in which
// order, each with its settings. The server checks a list (`toSections`): the cover first, each
// kind once.

export { Kpi as CoverKpi, Part as PlacePart, Platform as PostPlatform, Kind as SectionKind };
export type Section = ReportSectionDto;

export const SECTION_INFO: Record<Kind, { label: string; description: string }> = {
	[Kind.Cover]: {
		label: 'Cover',
		description: 'Brand, month, the key figures and the three findings.'
	},
	[Kind.Stars]: {
		label: 'What decides the stars',
		description: 'What five-star reviews praise next to what the rest criticise.'
	},
	[Kind.Branches]: {
		label: 'Branch by branch',
		description: "A chain's places side by side. Shown for chains only."
	},
	[Kind.Competitors]: {
		label: 'How you compare',
		description: 'The brand next to its competitors on the same month.'
	},
	[Kind.Actions]: {
		label: 'What to do next',
		description: "The highlights' two or three actions for next month."
	},
	[Kind.Posts]: {
		label: 'What people posted',
		description: 'Sentiment, the top posts by others and the topics they raised.'
	},
	[Kind.OwnAccounts]: {
		label: 'Your own account',
		description: "The brand's own posts and followers, apart from word of mouth."
	},
	[Kind.Comments]: {
		label: 'What viewers said',
		description: 'Comments under the top TikTok posts: intents and questions.'
	},
	[Kind.Press]: {
		label: 'In the press',
		description: 'Features, lists and passing mentions found this month.'
	},
	[Kind.Media]: {
		label: 'Media coverage',
		description:
			'Each blog article about the brand: what it says, its praise and complaints, a QR code to it.'
	},
	[Kind.Creators]: {
		label: 'Creators',
		description: 'Who posted about the brand, and who covered its neighbours.'
	},
	[Kind.Reviews]: {
		label: 'Google reviews',
		description: 'Stars, topics, noticed changes and the critical reviews.'
	},
	[Kind.Replies]: {
		label: 'Replies to post',
		description: 'Drafts for unanswered written reviews, critical first.'
	},
	[Kind.Dishes]: {
		label: 'Dishes',
		description: 'The dishes and drinks posts and reviews named.'
	},
	[Kind.Places]: {
		label: 'Each place',
		description: "Each place's own figures: popular times, prices, the neighbourhood, searches."
	},
	[Kind.Patterns]: {
		label: 'What followed what',
		description: 'Posts against reviews over time, complaint times, paid against organic.'
	},
	[Kind.City]: {
		label: 'The city',
		description: 'What the city talked about, and the brand against the month’s report brands.'
	},
	[Kind.Appendix]: {
		label: 'Appendix',
		description: 'Every post and review counted. Always printed last.'
	}
};

export const KPI_LABELS: Record<Kpi, string> = {
	[Kpi.Views]: 'Views',
	[Kpi.Creators]: 'Creators',
	[Kpi.Interactions]: 'Interactions',
	[Kpi.Stars]: 'Stars this month',
	[Kpi.Reviews]: 'Google reviews',
	[Kpi.Answered]: 'Answered'
};

export const PART_LABELS: Record<Part, string> = {
	[Part.Busyness]: 'Popular times and tables',
	[Part.Prices]: 'Delivery prices',
	[Part.Neighbourhood]: 'The neighbourhood',
	[Part.SearchRanks]: 'Google Maps searches'
};

export const PLATFORM_NAMES: Record<Platform, string> = {
	[Platform.Tiktok]: 'TikTok',
	[Platform.Instagram]: 'Instagram',
	[Platform.Blog]: 'Blogs'
};

export const MAX_POSTS_SHOWN = 24;
export const MAX_DISHES_SHOWN = 30;
export const MAX_ARTICLES_SHOWN = 20;

/** A new section of a kind with that kind's defaults (the server's, `report-section.embeddable.ts`). */
export const newSection = (kind: Kind): Section => {
	switch (kind) {
		case Kind.Cover:
			return { kind, kpis: Object.values(Kpi) };
		case Kind.Posts:
			return { kind, platforms: [], limit: 6 };
		case Kind.Creators:
			return { kind, nearby: true };
		case Kind.Media:
			return { kind, limit: 6 };
		case Kind.Dishes:
			return { kind, limit: 12 };
		case Kind.Places:
			return { kind, parts: Object.values(Part) };
		default:
			return { kind };
	}
};

/** Every section in the order reports had before types; what a report without sections shows. */
export const FULL_SECTIONS: Section[] = Object.values(Kind).map(newSection);

/** The posts' platforms in words: "TikTok and Instagram" when every platform is picked. */
export const platformsLabel = (platforms: Platform[] | undefined) => {
	const names = (platforms?.length ? platforms : [Platform.Tiktok, Platform.Instagram]).map(
		(p) => PLATFORM_NAMES[p]
	);
	return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
};

/**
 * The social counts a list of posts gives, as `ReportSocialStats` has them: sentiment per post,
 * topics once per post, themes once per post and absent when a point has no theme. What the
 * posts section shows when it keeps some platforms only.
 */
export const postsSummary = (posts: ReportPost[]) => {
	const count = (lists: string[][]) => {
		const out: Record<string, number> = {};
		for (const list of lists) for (const key of new Set(list)) out[key] = (out[key] ?? 0) + 1;
		return out;
	};
	const themes = (side: 'praise' | 'complaints') =>
		posts.some((p) => p[side].some((point) => !point.theme))
			? undefined
			: count(posts.map((p) => p[side].map((point) => point.theme!)));
	const sentiment = { positive: 0, mixed: 0, neutral: 0, negative: 0 };
	for (const p of posts) sentiment[p.sentiment as keyof typeof sentiment] += 1;
	return {
		sentiment,
		praise: count(posts.map((p) => p.praise.map((point) => point.topic))),
		complaints: count(posts.map((p) => p.complaints.map((point) => point.topic))),
		praiseThemes: themes('praise'),
		complaintThemes: themes('complaints')
	};
};

/** An editor's working copy: the cover (always first), the sections between, the appendix (last). */
export interface SectionsDraft {
	cover: Section;
	middle: Section[];
	appendix: boolean;
}

// A plain copy: what comes in may be reactive state, which structuredClone refuses
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const toSectionsDraft = (sections: Section[]): SectionsDraft => ({
	cover: copy(sections.find((s) => s.kind === Kind.Cover) ?? newSection(Kind.Cover)),
	middle: copy(sections.filter((s) => s.kind !== Kind.Cover && s.kind !== Kind.Appendix)),
	appendix: sections.some((s) => s.kind === Kind.Appendix)
});

export const fromSectionsDraft = (draft: SectionsDraft): Section[] => [
	draft.cover,
	...draft.middle,
	...(draft.appendix ? [newSection(Kind.Appendix)] : [])
];

/** A one-line outline: the sections between the cover and the appendix. */
export const sectionsOutline = (sections: Section[]) =>
	sections
		.filter((s) => s.kind !== Kind.Cover && s.kind !== Kind.Appendix)
		.map((s) => SECTION_INFO[s.kind].label)
		.join(' · ') || 'the cover only';
