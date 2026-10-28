import { tags } from 'typia';

export interface AdminReflagOpeningsInputDto {
	/** The month the posts were posted in, `YYYY-MM` */
	month: string & tags.Pattern<'^\\d{4}-\\d{2}$'>;
	/** Only this city's posts */
	cityId?: string & tags.Format<'uuid'>;
	/** Only posts extracted before this moment (before the flag existed) */
	analysedBefore?: string & tags.Format<'date-time'>;
	/**
	 * Only posts with a mention flagged now: after a wording change that can only take flags away,
	 * re-reading those is enough
	 */
	onlyFlagged?: boolean;
	/** At most this many posts a call; 100 by default */
	limit?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<500>;
	/** Skip this many posts of the scope, most viewed first: the previous call's `nextOffset` */
	offset?: number & tags.Type<'uint32'>;
}
