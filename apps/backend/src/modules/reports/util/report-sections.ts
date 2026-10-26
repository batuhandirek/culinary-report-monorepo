import { BadRequestException } from '@nestjs/common';

import _ from 'lodash';

import { MAX_OBSERVATIONS_SHOWN } from '../constants/report-analysis.constant.js';
import {
	MAX_ARTICLES_SHOWN,
	MAX_DISHES_SHOWN,
	MAX_POSTS_SHOWN,
	ReportCoverKpiEnum,
	ReportPlacePartEnum,
	ReportSectionKindEnum,
} from '../constants/report-section.constant.js';
import {
	type AnyReportSection,
	CoverReportSection,
	REPORT_SECTION_CLASSES,
	type ReportSection,
} from '../entities/report-section.embeddable.js';
import type { ReportData } from '../interfaces/report-data.interface.js';
import type { ReportSectionDto } from '../interfaces/report-section.interface.js';

const Kind = ReportSectionKindEnum;

/** A new section of a kind with that kind's default settings. */
export const newSection = <K extends ReportSectionKindEnum>(kind: K) =>
	new REPORT_SECTION_CLASSES[kind]() as InstanceType<(typeof REPORT_SECTION_CLASSES)[K]>;

/**
 * The full layout, every section in the order reports had before types: what a brand gets when
 * no type is the default.
 */
export const FULL_REPORT_SECTIONS = (): AnyReportSection[] =>
	[
		Kind.COVER,
		Kind.ANALYSIS,
		Kind.STARS,
		Kind.BRANCHES,
		Kind.COMPETITORS,
		Kind.ACTIONS,
		Kind.POSTS,
		Kind.OWN_ACCOUNTS,
		Kind.COMMENTS,
		Kind.PRESS,
		Kind.MEDIA,
		Kind.CREATORS,
		Kind.REVIEWS,
		Kind.REPLIES,
		Kind.DISHES,
		Kind.PLACES,
		Kind.PATTERNS,
		Kind.CITY,
		Kind.APPENDIX,
	].map(newSection);

const uniqueList = <T>(
	values: T[] | undefined,
	what: string,
	{ allowEmpty = false } = {},
): T[] | undefined => {
	if (values === undefined) return undefined;
	if (!allowEmpty && !values.length) throw new BadRequestException(`${what}: pick at least one`);
	if (_.uniq(values).length !== values.length)
		throw new BadRequestException(`${what}: each one once`);
	return values;
};

const inRange = (value: number | undefined, max: number, what: string) => {
	if (value === undefined) return undefined;
	if (!Number.isInteger(value) || value < 1 || value > max)
		throw new BadRequestException(`${what}: a whole number from 1 to ${max}`);
	return value;
};

/**
 * An admin's section list as section objects, each its kind's class with the settings given
 * (the rest at their defaults; settings another kind has are ignored). 400 unless the cover
 * comes first and every kind is there once at most.
 */
export const toSections = (input: ReportSectionDto[]): AnyReportSection[] => {
	if (input[0]?.kind !== Kind.COVER) throw new BadRequestException('The cover comes first');
	const kinds = input.map(s => s.kind);
	const twice = kinds.find((k, i) => kinds.indexOf(k) !== i);
	if (twice) throw new BadRequestException(`A section is listed twice: ${twice}`);
	return input.map(dto => {
		const section = newSection(dto.kind);
		switch (section.kind) {
			case Kind.COVER:
				section.kpis = uniqueList(dto.kpis, 'Cover figures') ?? section.kpis;
				break;
			case Kind.ANALYSIS:
				section.limit = inRange(dto.limit, MAX_OBSERVATIONS_SHOWN, 'Moves shown') ?? section.limit;
				break;
			case Kind.POSTS:
				section.platforms =
					uniqueList(dto.platforms, 'Platforms', { allowEmpty: true }) ??
					section.platforms;
				section.limit = inRange(dto.limit, MAX_POSTS_SHOWN, 'Posts shown') ?? section.limit;
				break;
			case Kind.MEDIA:
				section.limit =
					inRange(dto.limit, MAX_ARTICLES_SHOWN, 'Articles shown') ?? section.limit;
				break;
			case Kind.DISHES:
				section.limit =
					inRange(dto.limit, MAX_DISHES_SHOWN, 'Dishes shown') ?? section.limit;
				break;
			case Kind.CREATORS:
				section.nearby = dto.nearby ?? section.nearby;
				break;
			case Kind.PLACES:
				section.parts = uniqueList(dto.parts, 'Place blocks') ?? section.parts;
				break;
		}
		return section;
	});
};

/** Sections as the API returns them: plain objects with each kind's settings. */
export const sectionsOutput = (sections: ReportSection[]): ReportSectionDto[] =>
	sections.map(s => ({ ...s }) as ReportSectionDto);

/** What the highlights prompt may talk about, beyond what `trimForSections` left in the data. */
export interface PromptScope {
	// Social figures appear (the posts section or a cover tile)
	social: boolean;
	// Review figures appear (a review section or a cover tile)
	reviews: boolean;
	// The five stars against the rest
	stars: boolean;
	// A chain's branches compared
	branches: boolean;
	// The analysis section: how many moves it shows, or false without one
	analysis: number | false;
}

const SOCIAL_KPIS = [
	ReportCoverKpiEnum.VIEWS,
	ReportCoverKpiEnum.CREATORS,
	ReportCoverKpiEnum.INTERACTIONS,
];
const REVIEW_KPIS = [
	ReportCoverKpiEnum.STARS,
	ReportCoverKpiEnum.REVIEWS,
	ReportCoverKpiEnum.ANSWERED,
];

/**
 * The report's data cut down to what its sections show, for the highlights prompt: a finding or
 * an action about a block the report leaves out would point at nothing. The stored data stays
 * whole (the portal's series read it), so this is a copy. A posts section with platforms keeps
 * only their posts; the counts stay every platform's, as the cover shows them.
 */
export const trimForSections = (
	data: ReportData,
	sections: AnyReportSection[],
): { data: ReportData; scope: PromptScope } => {
	const out = structuredClone(data);
	const of = <K extends ReportSectionKindEnum>(kind: K) =>
		sections.find(s => s.kind === kind) as
			InstanceType<(typeof REPORT_SECTION_CLASSES)[K]> | undefined;
	const has = (kind: ReportSectionKindEnum) => sections.some(s => s.kind === kind);
	const kpis = of(Kind.COVER)?.kpis ?? new CoverReportSection().kpis;

	// The posts section's platforms, plus the blog articles a media coverage section lists
	const posts = of(Kind.POSTS);
	const media = has(Kind.MEDIA);
	out.posts = out.posts.filter(
		p =>
			(media && p.platform === 'blog') ||
			(!!posts && (!posts.platforms.length || (posts.platforms as string[]).includes(p.platform))),
	);
	if (!has(Kind.DISHES)) out.dishes = [];
	if (!has(Kind.OWN_ACCOUNTS)) {
		out.ownPosts = [];
		delete out.ownAccounts;
	}
	if (!has(Kind.COMMENTS)) delete out.comments;
	if (!has(Kind.PRESS)) delete out.press;
	if (!has(Kind.REVIEWS)) {
		out.reviews.critical = [];
		out.reviews.changes = [];
		delete out.reviews.byPlatform;
		delete out.reviews.platformGaps;
	}
	const creators = of(Kind.CREATORS);
	if (!creators) out.creators = [];
	if (!creators?.nearby) out.creatorsNearby = [];
	if (!has(Kind.COMPETITORS)) out.competitors = [];
	if (!has(Kind.PATTERNS)) delete out.correlations;
	if (!has(Kind.CITY)) delete out.city;

	const parts = of(Kind.PLACES)?.parts ?? [];
	for (const branch of out.branches) {
		if (!parts.includes(ReportPlacePartEnum.BUSYNESS)) {
			delete branch.busyness;
			delete branch.demand;
		}
		if (!parts.includes(ReportPlacePartEnum.PRICES)) delete branch.prices;
		if (!parts.includes(ReportPlacePartEnum.NEIGHBOURHOOD)) {
			branch.neighbours = [];
			delete branch.neighbourhood;
		}
		if (!parts.includes(ReportPlacePartEnum.SEARCH_RANKS)) delete branch.searchRanks;
	}

	return {
		data: out,
		scope: {
			social: !!posts || kpis.some(k => SOCIAL_KPIS.includes(k)),
			reviews:
				[Kind.REVIEWS, Kind.STARS, Kind.REPLIES].some(has) ||
				kpis.some(k => REVIEW_KPIS.includes(k)),
			stars: has(Kind.STARS),
			branches: has(Kind.BRANCHES),
			analysis: of(Kind.ANALYSIS)?.limit ?? false,
		},
	};
};
