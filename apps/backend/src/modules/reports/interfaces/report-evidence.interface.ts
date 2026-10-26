import type { PlaybookContext } from '../util/report-playbooks.js';

/** One of the brand's reviews as the analysis tools quote it (no reviewer: the entity stores none). */
export interface EvidenceReview {
	/** `YYYY-MM-DD` */
	date: string;
	/** Its week's Monday, city time */
	week: string;
	stars?: number;
	/** At most 160 characters of the translated text, else the original */
	excerpt?: string;
	/** Theme labels of its complaints and praise */
	complaints: string[];
	praise: string[];
	/** Changes the reviewer noticed */
	changes: string[];
	replied: boolean;
	platform: 'google' | 'tripadvisor';
	/** The branch, for a chain */
	branch?: string;
}

/** Everything the playbooks and the tools read for one build: in memory, loaded once. */
export interface EvidenceContext extends PlaybookContext {
	cityId: string | null;
	cityName?: string;
	/** The month's reviews and the week after's, newest first */
	reviews: EvidenceReview[];
}
