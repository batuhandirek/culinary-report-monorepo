import type { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';

import type {
	ReportCoverKpiEnum,
	ReportPlacePartEnum,
	ReportSectionKindEnum,
} from '../constants/report-section.constant.js';

/**
 * A report section as the API reads and writes it: its kind and the settings that kind has
 * (the others absent). One flat shape for every kind, so the client gets one type; the server
 * makes it the kind's own class (`toSections`).
 */
export interface ReportSectionDto {
	kind: ReportSectionKindEnum;
	/** cover: the figure tiles, in order */
	kpis?: ReportCoverKpiEnum[];
	/** posts: the platforms it lists and counts; empty is every platform */
	platforms?: SocialPlatformEnum[];
	/** posts: top posts shown as cards; media: blog articles shown; dishes: dishes listed */
	limit?: number;
	/** creators: also the creators who covered the neighbours but not the brand */
	nearby?: boolean;
	/** places: each place's blocks, in order */
	parts?: ReportPlacePartEnum[];
}
