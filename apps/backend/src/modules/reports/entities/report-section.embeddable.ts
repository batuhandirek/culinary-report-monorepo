import { Embeddable, Enum, Property } from '@mikro-orm/decorators/legacy';

import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';

import {
	DEFAULT_ARTICLES_SHOWN,
	DEFAULT_DISHES_SHOWN,
	DEFAULT_POSTS_SHOWN,
	REPORT_COVER_KPIS,
	REPORT_PLACE_PARTS,
	ReportCoverKpiEnum,
	ReportPlacePartEnum,
	ReportSectionKindEnum,
} from '../constants/report-section.constant.js';

/**
 * One block of a report as a report type lists it: a polymorphic embeddable, one class per
 * `kind`, each with its own settings. Stored in a jsonb array on `ReportType.sections` and, as
 * the copy a report was built with, on `Report.sections`.
 */
@Embeddable({ abstract: true, discriminatorColumn: 'kind' })
export abstract class ReportSection {
	@Enum({ items: () => ReportSectionKindEnum })
	kind!: ReportSectionKindEnum;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.COVER })
export class CoverReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.COVER as const;

	// The figure tiles, in this order
	@Enum({ items: () => ReportCoverKpiEnum, array: true })
	kpis: ReportCoverKpiEnum[] = [...REPORT_COVER_KPIS];
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.STARS })
export class StarsReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.STARS as const;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.BRANCHES })
export class BranchesReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.BRANCHES as const;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.COMPETITORS })
export class CompetitorsReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.COMPETITORS as const;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.ACTIONS })
export class ActionsReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.ACTIONS as const;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.POSTS })
export class PostsReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.POSTS as const;

	// The platforms whose posts it lists and counts; empty is every platform
	@Enum({ items: () => SocialPlatformEnum, array: true })
	platforms: SocialPlatformEnum[] = [];

	// Top posts shown as cards; the rest are summed in one line
	@Property({ type: 'int' })
	limit: number = DEFAULT_POSTS_SHOWN;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.OWN_ACCOUNTS })
export class OwnAccountsReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.OWN_ACCOUNTS as const;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.COMMENTS })
export class CommentsReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.COMMENTS as const;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.PRESS })
export class PressReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.PRESS as const;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.MEDIA })
export class MediaReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.MEDIA as const;

	// Blog articles shown, newest first; the rest are named in one line
	@Property({ type: 'int' })
	limit: number = DEFAULT_ARTICLES_SHOWN;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.CREATORS })
export class CreatorsReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.CREATORS as const;

	// Also the creators who covered the district's neighbours but not the brand
	@Property({ type: 'boolean' })
	nearby: boolean = true;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.REVIEWS })
export class ReviewsReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.REVIEWS as const;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.REPLIES })
export class RepliesReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.REPLIES as const;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.DISHES })
export class DishesReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.DISHES as const;

	@Property({ type: 'int' })
	limit: number = DEFAULT_DISHES_SHOWN;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.PLACES })
export class PlacesReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.PLACES as const;

	// Which of each place's blocks it shows, in this order
	@Enum({ items: () => ReportPlacePartEnum, array: true })
	parts: ReportPlacePartEnum[] = [...REPORT_PLACE_PARTS];
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.PATTERNS })
export class PatternsReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.PATTERNS as const;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.CITY })
export class CityReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.CITY as const;
}

@Embeddable({ discriminatorValue: ReportSectionKindEnum.APPENDIX })
export class AppendixReportSection extends ReportSection {
	override kind = ReportSectionKindEnum.APPENDIX as const;
}

/** Every section class by its kind: what `@Embedded` lists and what new sections are made from. */
export const REPORT_SECTION_CLASSES = {
	[ReportSectionKindEnum.COVER]: CoverReportSection,
	[ReportSectionKindEnum.STARS]: StarsReportSection,
	[ReportSectionKindEnum.BRANCHES]: BranchesReportSection,
	[ReportSectionKindEnum.COMPETITORS]: CompetitorsReportSection,
	[ReportSectionKindEnum.ACTIONS]: ActionsReportSection,
	[ReportSectionKindEnum.POSTS]: PostsReportSection,
	[ReportSectionKindEnum.OWN_ACCOUNTS]: OwnAccountsReportSection,
	[ReportSectionKindEnum.COMMENTS]: CommentsReportSection,
	[ReportSectionKindEnum.PRESS]: PressReportSection,
	[ReportSectionKindEnum.MEDIA]: MediaReportSection,
	[ReportSectionKindEnum.CREATORS]: CreatorsReportSection,
	[ReportSectionKindEnum.REVIEWS]: ReviewsReportSection,
	[ReportSectionKindEnum.REPLIES]: RepliesReportSection,
	[ReportSectionKindEnum.DISHES]: DishesReportSection,
	[ReportSectionKindEnum.PLACES]: PlacesReportSection,
	[ReportSectionKindEnum.PATTERNS]: PatternsReportSection,
	[ReportSectionKindEnum.CITY]: CityReportSection,
	[ReportSectionKindEnum.APPENDIX]: AppendixReportSection,
} as const satisfies Record<ReportSectionKindEnum, new () => ReportSection>;

export const REPORT_SECTION_TYPES = () => Object.values(REPORT_SECTION_CLASSES);

/** Any one section, narrowed by `kind`. */
export type AnyReportSection = InstanceType<(typeof REPORT_SECTION_CLASSES)[ReportSectionKindEnum]>;
